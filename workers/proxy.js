/**
 * PGS Tracking System - Cloudflare Workers 代理
 * 解决CORS跨域问题并保护API密钥
 */

// ===================================
// 调试配置
// ===================================

/**
 * 调试模式开关
 */
const WORKER_DEBUG_MODE = false; // 生产环境设为false

/**
 * Workers调试日志函数
 */
const workerDebugLog = WORKER_DEBUG_MODE ? console.log : () => {};
const workerDebugWarn = console.warn;
const workerDebugError = console.error;

// ===================================
// 配置常量
// ===================================



// 官网API配置（优先数据源）
const OFFICIAL_API_CONFIG = {
    baseUrl: 'http://cbel.pgs-log.com/edi/pubTracking',
    timeout: 5000, // 5秒超时，快速切换到备选方案
    params: {
        host: 'cbel.pgs-log.com',
        noSubTracking: 'false', // 获取完整的subTrackings数据
        url: '/public-tracking'
    }
};



// 获取允许的来源域名（从环境变量或默认值）
function getAllowedOrigins(env) {
    const corsOrigins = env.CORS_ORIGINS || '';
    const defaultOrigins = [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:8000',
        'https://pgs-track.pages.dev'
    ];

    if (corsOrigins) {
        const envOrigins = corsOrigins.split(',').map(origin => origin.trim());
        return [...new Set([...defaultOrigins, ...envOrigins])];
    }

    return defaultOrigins;
}



// ===================================
// 主要处理函数
// ===================================

/**
 * 处理所有请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
async function handleRequest(request, env) {
    const url = new URL(request.url);

    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return handleCORS(request, env);
    }

    // 只允许GET请求
    if (request.method !== 'GET') {
        console.log('不支持的请求方法:', request.method);
        return createErrorResponse('服务暂时不可用', 405);
    }

    console.log('收到GET请求:', request.method, request.url);

    // 验证来源
    const origin = request.headers.get('Origin');
    console.log('请求来源:', origin);
    console.log('User-Agent:', request.headers.get('User-Agent'));

    if (!isOriginAllowed(origin, env)) {
        console.log('来源被拒绝:', origin);
        return createErrorResponse('访问被拒绝', 403);
    }

    console.log('CORS验证通过，开始处理API请求');

    // 解析API路径 - 支持多种路径格式
    let apiPath = url.pathname;

    // 移除可能的前缀
    if (apiPath.startsWith('/api/tracking')) {
        apiPath = apiPath.replace('/api/tracking', '');
    } else if (apiPath.startsWith('/api/au-ops')) {
        apiPath = apiPath.replace('/api/au-ops', '');
    }

    console.log('🛣️ 解析后的API路径:', apiPath);

    // 路由到相应的处理函数
    if (apiPath.startsWith('/v5/tracking') || apiPath.startsWith('/v3/tracking')) {
        return handleTrackingRequest(request, apiPath, env);
    } else if (apiPath.startsWith('/fms/')) {
        return handleFMSRequest(request, apiPath, env);
    } else {
        console.log('❌ 不支持的API路径:', apiPath);
        return createErrorResponse('服务暂时不可用', 404);
    }
}

/**
 * 调用官网API获取完整数据（包含subTrackings）
 */
async function callOfficialAPI(trackingRef) {
    console.log('🌐 尝试官网API:', OFFICIAL_API_CONFIG.baseUrl);

    try {
        const url = new URL(OFFICIAL_API_CONFIG.baseUrl);
        url.searchParams.set('host', OFFICIAL_API_CONFIG.params.host);
        url.searchParams.set('noSubTracking', OFFICIAL_API_CONFIG.params.noSubTracking);
        url.searchParams.set('soNum', trackingRef);
        url.searchParams.set('url', OFFICIAL_API_CONFIG.params.url);

        console.log('🔗 官网API完整URL:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PGS-Tracking-System/1.0'
            },
            signal: AbortSignal.timeout(OFFICIAL_API_CONFIG.timeout)
        });

        console.log('📡 官网API响应状态:', response.status);

        if (!response.ok) {
            throw new Error(`官网API调用失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📦 官网API返回数据类型:', typeof data);

        // 检查是否是数组格式（官网API返回数组）
        if (Array.isArray(data) && data.length > 0) {
            const trackingData = data[0]; // 取第一个结果
            console.log('✅ 官网API返回有效数据');
            console.log('📦 包含subTrackings:', trackingData.subTrackings ? trackingData.subTrackings.length : 0, '个');

            // 🔍 详细调试：查看官网API返回的完整数据结构
            console.log('🔍 官网API完整数据结构:');
            console.log('🔍 主要字段:', Object.keys(trackingData));
            console.log('🔍 dataList:', trackingData.dataList ? trackingData.dataList.length : 0, '个主轨迹事件');
            console.log('🔍 orderNodes:', trackingData.orderNodes ? trackingData.orderNodes.length : 0, '个订单节点');
            console.log('🔍 subTrackings:', trackingData.subTrackings ? trackingData.subTrackings.length : 0, '个小单');

            // 显示前3个主轨迹事件的结构
            if (trackingData.dataList && trackingData.dataList.length > 0) {
                console.log('🔍 主轨迹事件示例:', trackingData.dataList.slice(0, 3));
            }

            // 显示前2个小单的结构
            if (trackingData.subTrackings && trackingData.subTrackings.length > 0) {
                console.log('🔍 小单结构示例:', trackingData.subTrackings.slice(0, 2));
            }
            return {
                success: true,
                data: trackingData,
                source: 'official'
            };
        } else {
            throw new Error('官网API返回空数据');
        }

    } catch (error) {
        console.error('❌ 官网API调用失败:', error.message);
        return {
            success: false,
            error: error.message,
            source: 'official'
        };
    }
}

/**
 * 处理轨迹查询请求（智能切换方案）
 * @param {Request} request - 请求对象
 * @param {string} apiPath - API路径
 * @returns {Response} 响应对象
 */
async function handleTrackingRequest(request, apiPath, env) {
    try {
        const url = new URL(request.url);
        const trackingRef = url.searchParams.get('trackingRef');

        if (!trackingRef) {
            return createErrorResponse('查询参数无效', 400);
        }

        // 验证trackingRef格式
        if (!isValidTrackingRef(trackingRef)) {
            return createErrorResponse('查询参数格式错误', 400);
        }

        // 🚀 使用官网API进行查询（屏蔽备选API）
        console.log('🚀 开始官网API查询');

        // 1. 尝试官网API（5秒超时）
        const officialResult = await callOfficialAPI(trackingRef);

        if (officialResult.success) {
            console.log('✅ 官网API查询成功，返回完整数据');

            const responseData = {
                success: true,
                trackingRef: trackingRef,
                apiVersion: 'official',
                data: officialResult.data,
                timestamp: new Date().toISOString(),
                companyId: 'official',
                companyName: 'CBEL官网',
                proxy: {
                    version: '1.0.0',
                    endpoint: 'official-api',
                    source: 'official'
                }
            };

            return createSuccessResponse(responseData, request.headers.get('Origin'), env);
        }

        // 2. 官网API失败，直接返回错误（不使用备选API）
        console.log('❌ 官网API查询失败，返回错误');
        return createErrorResponse(officialResult.error || '查询失败，请稍后重试', 503);
        
    } catch (error) {
        console.error('轨迹查询处理错误:', error);

        if (error.name === 'TimeoutError') {
            return createErrorResponse('查询超时，请稍后重试', 408);
        }

        return createErrorResponse('查询失败，请稍后重试', 500);
    }
}

/**
 * 处理FMS相关请求
 * @param {Request} request - 请求对象
 * @param {string} apiPath - API路径
 * @returns {Response} 响应对象
 */
async function handleFMSRequest(request, apiPath, env) {
    try {
        const url = new URL(request.url);
        let queryParams = '';
        
        // 根据不同的FMS端点处理参数
        if (apiPath.includes('getOneShipment')) {
            const shipmentId = url.searchParams.get('shipmentId');
            if (!shipmentId) {
                return createErrorResponse('缺少shipmentId参数', 400);
            }
            queryParams = `shipmentId=${encodeURIComponent(shipmentId)}`;
        } else if (apiPath.includes('getSoInfo')) {
            const soNum = url.searchParams.get('soNum');
            if (!soNum) {
                return createErrorResponse('缺少soNum参数', 400);
            }
            queryParams = `soNum=${encodeURIComponent(soNum)}`;
        } else if (apiPath.includes('getShipmentInfo')) {
            const shipmentId = url.searchParams.get('shipmentId');
            if (!shipmentId) {
                return createErrorResponse('缺少shipmentId参数', 400);
            }
            queryParams = `shipmentId=${encodeURIComponent(shipmentId)}`;
        }
        
        console.log('FMS API请求 (仅官网):', apiPath, '参数:', queryParams);

        // 直接使用官网API
        const officialUrl = `${OFFICIAL_API_CONFIG.baseUrl}${apiPath}?${queryParams}`;

        const response = await fetch(officialUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(OFFICIAL_API_CONFIG.timeout)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`官网FMS API错误 (${response.status}):`, errorText);
            return createErrorResponse(`官网FMS API调用失败: ${response.statusText}`, response.status);
        }

        const data = await response.json();
        
        // 添加代理信息
        const responseData = {
            success: true,
            data: data,
            proxy: {
                source: '官网FMS API',
                timestamp: new Date().toISOString(),
                endpoint: apiPath
            }
        };
        
        return createSuccessResponse(responseData, request.headers.get('Origin'), env);
        
    } catch (error) {
        console.error('FMS请求处理错误:', error);
        
        if (error.name === 'TimeoutError') {
            return createErrorResponse('请求超时', 408);
        }
        
        return createErrorResponse(`处理错误: ${error.message}`, 500);
    }
}

// ===================================
// 工具函数
// ===================================

/**
 * 处理CORS预检请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} CORS响应
 */
function handleCORS(request, env) {
    const origin = request.headers.get('Origin');

    console.log('处理OPTIONS预检请求, Origin:', origin);

    if (!isOriginAllowed(origin, env)) {
        console.log('OPTIONS请求被拒绝');
        return new Response(null, { status: 403 });
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent',
        'Access-Control-Allow-Credentials': 'false',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };

    console.log('OPTIONS响应头:', corsHeaders);

    return new Response(null, {
        status: 204, // 使用204 No Content而不是200
        headers: corsHeaders
    });
}

/**
 * 检查来源是否被允许
 * @param {string} origin - 来源域名
 * @param {Object} env - 环境变量
 * @returns {boolean} 是否允许
 */
function isOriginAllowed(origin, env) {
    // 允许没有Origin头的请求（如直接API调用、curl等）
    if (!origin) {
        console.log('CORS检查: 无Origin头，允许直接API调用');
        return true;
    }

    const allowedOrigins = getAllowedOrigins(env);
    console.log('CORS检查: Origin =', origin);
    console.log('CORS检查: 允许的域名 =', allowedOrigins);

    // 检查精确匹配
    if (allowedOrigins.includes(origin)) {
        console.log('CORS检查: 精确匹配通过');
        return true;
    }

    // 检查localhost（开发环境）
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        console.log('CORS检查: localhost匹配通过');
        return true;
    }

    // 检查pages.dev域名（Cloudflare Pages）
    if (origin.includes('pages.dev') && origin.includes('pgs-track')) {
        console.log('CORS检查: pages.dev匹配通过');
        return true;
    }

    console.log('CORS检查: 所有检查都失败');
    return false;
}

/**
 * 验证trackingRef格式
 * @param {string} trackingRef - 跟踪参考号
 * @returns {boolean} 是否有效
 */
function isValidTrackingRef(trackingRef) {
    if (!trackingRef || typeof trackingRef !== 'string') {
        return false;
    }
    
    const cleaned = trackingRef.trim();
    
    // 基本长度检查
    if (cleaned.length < 3 || cleaned.length > 30) {
        return false;
    }
    
    // 基本字符检查（字母、数字、连字符）
    if (!/^[A-Za-z0-9\-]+$/.test(cleaned)) {
        return false;
    }
    
    return true;
}

/**
 * 创建成功响应
 * @param {Object} data - 响应数据
 * @param {string} origin - 来源域名
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
function createSuccessResponse(data, origin, env) {
    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5分钟缓存
    };

    if (isOriginAllowed(origin, env)) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
        headers['Access-Control-Allow-Headers'] = 'Content-Type';
    }
    
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: headers
    });
}

/**
 * 创建错误响应
 * @param {string} message - 错误信息
 * @param {number} status - HTTP状态码
 * @returns {Response} 错误响应
 */
function createErrorResponse(message, status = 400) {
    const errorData = {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(errorData), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

// ===================================
// Workers事件监听器
// ===================================



/**
 * 处理配置更新请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
async function handleConfigUpdate(request, env) {
    try {
        // 验证请求来源
        const origin = request.headers.get('Origin');
        if (!isOriginAllowed(origin, env)) {
            return createErrorResponse('未授权的请求来源', 403);
        }

        // 验证管理员权限（简单的token验证）
        const authToken = request.headers.get('Authorization');
        const expectedToken = env.ADMIN_TOKEN || 'admin-token-here';

        if (!authToken || authToken !== `Bearer ${expectedToken}`) {
            return createErrorResponse('未授权的操作', 401);
        }

        const configData = await request.json();

        // 保存配置到KV存储
        if (env.CONFIG_KV) {
            // 获取现有的完整站点配置
            let siteConfig = {};
            try {
                const existingConfig = await env.CONFIG_KV.get('siteConfig');
                if (existingConfig) {
                    siteConfig = JSON.parse(existingConfig);
                }
            } catch (e) {
                console.log('获取现有配置失败，使用空配置');
            }

            // 更新API配置部分
            if (!siteConfig.api) siteConfig.api = {};

            // 转换对象格式为数组格式（前端期望的格式）
            const companiesArray = [];
            if (configData.companies) {
                Object.entries(configData.companies).forEach(([id, config]) => {
                    companiesArray.push({
                        id: id,
                        name: config.name,
                        appKey: config.appKey,
                        appToken: config.appToken,
                        priority: config.priority,
                        enabled: config.enabled
                    });
                });
            }
            siteConfig.api.companies = companiesArray;

            // 保存完整配置
            await env.CONFIG_KV.put('siteConfig', JSON.stringify(siteConfig));

            // 清除缓存，强制重新加载
            DYNAMIC_COMPANY_CONFIGS = null;

            return new Response(JSON.stringify({
                success: true,
                message: '配置更新成功',
                timestamp: new Date().toISOString()
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        } else {
            return createErrorResponse('KV存储未配置', 500);
        }

    } catch (error) {
        console.error('配置更新失败:', error);
        return createErrorResponse('配置更新失败', 500);
    }
}

/**
 * 处理网站配置更新请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
async function handleSiteConfigUpdate(request, env) {
    try {
        // 验证请求来源
        const origin = request.headers.get('Origin');
        if (!isOriginAllowed(origin, env)) {
            return createErrorResponse('未授权的请求来源', 403);
        }

        // 验证管理员Token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return createErrorResponse('缺少授权Token', 401);
        }

        const token = authHeader.substring(7);
        if (token !== env.ADMIN_TOKEN) {
            return createErrorResponse('无效的授权Token', 401);
        }

        const configData = await request.json();

        // 保存网站配置到KV存储
        if (env.CONFIG_KV) {
            await env.CONFIG_KV.put('siteConfig', JSON.stringify(configData));

            return new Response(JSON.stringify({
                success: true,
                message: '网站配置已保存到KV存储',
                timestamp: Date.now()
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        } else {
            return createErrorResponse('KV存储未配置', 500);
        }

    } catch (error) {
        console.error('网站配置更新失败:', error);
        return createErrorResponse('网站配置更新失败: ' + error.message, 500);
    }
}

/**
 * 处理网站配置获取请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
async function handleSiteConfigGet(request, env) {
    try {
        const origin = request.headers.get('Origin');

        // 从KV存储获取网站配置
        if (env.CONFIG_KV) {
            console.log('KV绑定存在，尝试获取siteConfig');
            const configData = await env.CONFIG_KV.get('siteConfig');
            console.log('KV获取结果:', configData ? '有数据' : '无数据');

            if (configData) {
                return new Response(configData, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': origin || '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            } else {
                console.log('KV中没有找到siteConfig数据');
                return new Response(JSON.stringify({
                    error: '网站配置不存在'
                }), {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': origin || '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }
        } else {
            return createErrorResponse('KV存储未配置', 500);
        }

    } catch (error) {
        console.error('获取网站配置失败:', error);
        return createErrorResponse('获取网站配置失败: ' + error.message, 500);
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 处理配置更新请求
        if (url.pathname === '/config/update' && request.method === 'POST') {
            return handleConfigUpdate(request, env);
        }



        // 调试端点：显示当前API配置
        if (url.pathname === '/debug/api-config' && request.method === 'GET') {
            return new Response(JSON.stringify({
                success: true,
                message: '当前仅使用官网API',
                officialApi: {
                    baseUrl: OFFICIAL_API_CONFIG.baseUrl,
                    timeout: OFFICIAL_API_CONFIG.timeout
                },
                timestamp: new Date().toISOString()
            }, null, 2), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 处理网站配置更新请求
        if (url.pathname === '/config/site/update' && request.method === 'POST') {
            return handleSiteConfigUpdate(request, env);
        }

        // 处理网站配置获取请求
        if (url.pathname === '/config/site' && request.method === 'GET') {
            return handleSiteConfigGet(request, env);
        }

        return handleRequest(request, env);
    }
};
