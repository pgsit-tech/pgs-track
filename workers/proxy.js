/**
 * PGS Tracking System - Cloudflare Workers 代理
 * 解决CORS跨域问题并保护API密钥
 */

// ===================================
// 配置常量
// ===================================

// AU-OPS API配置
const AU_OPS_CONFIG = {
    // 支持两个API地址，优先使用ws.ai-ops.vip（系统方确认的API调用域名）
    baseUrls: [
        'https://ws.ai-ops.vip/edi/web-services',
        'https://prod.au-ops.com/edi/web-services'
    ],
    timeout: 30000
};

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

// 动态公司配置 - 从KV存储或环境变量获取
let DYNAMIC_COMPANY_CONFIGS = null;

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

// 支持的API端点
const SUPPORTED_ENDPOINTS = [
    '/v5/tracking',
    '/v3/tracking',
    '/fms/v2/getOneShipment',
    '/fms/getSoInfo',
    '/fms/getShipmentInfo'
];

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
        const companyId = url.searchParams.get('companyId'); // 获取指定的公司ID

        if (!trackingRef) {
            return createErrorResponse('查询参数无效', 400);
        }

        // 验证trackingRef格式
        if (!isValidTrackingRef(trackingRef)) {
            return createErrorResponse('查询参数格式错误', 400);
        }

        // 🚀 智能切换方案：优先官网API，失败则切换AU-OPS API
        console.log('🚀 开始智能切换查询方案');

        // 1. 优先尝试官网API（5秒超时）
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

        // 2. 官网API失败，切换到AU-OPS API备选方案
        console.log('⚠️ 官网API失败，切换到AU-OPS API备选方案');

        // 从KV存储获取动态公司配置
        const companyConfigs = await getDynamicCompanyConfigs(env);
        console.log('获取到的公司配置:', Object.keys(companyConfigs));

        let selectedCompany = null;
        let selectedCompanyId = null;

        // 如果指定了公司ID，优先使用指定的公司
        if (companyId && companyConfigs[companyId]) {
            const company = companyConfigs[companyId];
            if (company.enabled && company.appKey && company.appToken) {
                selectedCompany = company;
                selectedCompanyId = companyId;
                console.log('使用指定公司配置:', company.name);
            }
        }

        // 如果没有指定公司或指定的公司不可用，选择第一个可用的公司
        if (!selectedCompany) {
            const availableCompanies = Object.entries(companyConfigs)
                .filter(([id, company]) => company.enabled && company.appKey && company.appToken)
                .sort(([,a], [,b]) => a.priority - b.priority);

            if (availableCompanies.length > 0) {
                [selectedCompanyId, selectedCompany] = availableCompanies[0];
                console.log('使用默认公司配置:', selectedCompany.name);
            }
        }

        if (!selectedCompany) {
            console.error('没有找到可用的API配置，配置详情:', companyConfigs);
            return createErrorResponse('API配置未完成，请联系管理员', 500);
        }

        const appKey = selectedCompany.appKey;
        const appToken = selectedCompany.appToken;

        // 尝试多个API地址，使用官方推荐的认证方式
        let auOpsResponse = null;
        let lastError = null;

        for (const baseUrl of AU_OPS_CONFIG.baseUrls) {
            try {
                const auOpsUrl = `${baseUrl}${apiPath}?trackingRef=${encodeURIComponent(trackingRef)}`;

                console.log('🎯 尝试AU-OPS API:', baseUrl);
                console.log('🔗 完整URL:', auOpsUrl);
                console.log('🔑 API密钥长度:', appKey ? appKey.length : 'undefined');
                console.log('🔑 Token长度:', appToken ? appToken.length : 'undefined');
                console.log('🔑 API密钥前缀:', appKey ? appKey.substring(0, 10) + '...' : 'undefined');
                console.log('🔑 Token前缀:', appToken ? appToken.substring(0, 10) + '...' : 'undefined');
                console.log('🔑 Token后缀:', appToken ? '...' + appToken.substring(appToken.length - 10) : 'undefined');

                auOpsResponse = await fetch(auOpsUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'appKey': appKey,
                        'appToken': appToken,
                        'Request-Origion': 'SwaggerBootstrapUi',
                        'accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Referer': baseUrl.includes('ws.ai-ops.vip') ? 'https://ws.ai-ops.vip/' : 'https://prod.au-ops.com/',
                        'Origin': baseUrl.includes('ws.ai-ops.vip') ? 'https://ws.ai-ops.vip' : 'https://prod.au-ops.com'
                    },
                    signal: AbortSignal.timeout(AU_OPS_CONFIG.timeout)
                });

                // 如果请求成功，跳出循环
                if (auOpsResponse.ok) {
                    console.log('✅ API调用成功:', baseUrl);
                    // 检查响应内容
                    const responseText = await auOpsResponse.text();
                    console.log('📄 API响应内容:', responseText.substring(0, 200));

                    // 重新创建Response对象，因为已经读取了body
                    auOpsResponse = new Response(responseText, {
                        status: auOpsResponse.status,
                        statusText: auOpsResponse.statusText,
                        headers: auOpsResponse.headers
                    });
                    break;
                } else {
                    console.log(`❌ API调用失败 (${auOpsResponse.status}):`, baseUrl);
                    lastError = `${baseUrl} returned ${auOpsResponse.status}`;
                }
            } catch (error) {
                console.log(`❌ API调用异常:`, baseUrl, error.message);
                lastError = error.message;
                auOpsResponse = null;
            }
        }

        // 如果所有API地址都失败
        if (!auOpsResponse || !auOpsResponse.ok) {
            console.error('所有AU-OPS API地址都失败');
            return createErrorResponse('查询失败', 503);
        }
        
        if (!auOpsResponse.ok) {
            const errorText = await auOpsResponse.text();
            console.error(`AU-OPS API错误 (${auOpsResponse.status}):`, errorText);
            return createErrorResponse('查询失败，请稍后重试', auOpsResponse.status);
        }
        
        const data = await auOpsResponse.json();

        // 检查AU-OPS API响应内容，判断是否为有效数据
        const isValidData = data &&
            data.code !== 404 &&
            data.code !== 400 &&
            !(data.code >= 400) &&
            data.description !== "Not found!" &&
            !(data.error && data.error.includes('not found'));

        if (!isValidData) {
            console.log(`❌ AU-OPS API返回无效数据: ${JSON.stringify(data)}`);
            return createErrorResponse(
                data.description || data.error || '未找到轨迹数据',
                data.code || 404
            );
        }

        // 添加代理信息
        const responseData = {
            success: true,
            trackingRef: trackingRef,
            apiVersion: apiPath.includes('v5') ? 'v5' : 'v3',
            data: data,
            timestamp: new Date().toISOString(),
            companyId: selectedCompanyId,
            companyName: selectedCompany.name,
            proxy: {
                version: '1.0.0',
                endpoint: apiPath,
                source: 'au-ops-fallback' // 标记这是备选方案
            }
        };

        return createSuccessResponse(responseData, request.headers.get('Origin'), env);
        
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
        
        // 从KV存储获取动态公司配置
        const companyConfigs = await getDynamicCompanyConfigs(env);
        console.log('FMS获取到的公司配置:', Object.keys(companyConfigs));

        // 获取第一个启用且有完整API密钥的公司配置
        const enabledCompany = Object.values(companyConfigs).find(company =>
            company.enabled && company.appKey && company.appToken
        );

        if (!enabledCompany) {
            console.error('FMS没有找到可用的API配置，配置详情:', companyConfigs);
            return createErrorResponse('FMS API配置未完成，请联系管理员', 500);
        }

        console.log('FMS使用公司配置:', enabledCompany.name);

        // 构建AU-OPS API请求（使用第一个地址）
        const auOpsUrl = `${AU_OPS_CONFIG.baseUrls[0]}${apiPath}?${queryParams}`;

        const auOpsResponse = await fetch(auOpsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'appKey': enabledCompany.appKey,
                'appToken': enabledCompany.appToken
            },
            signal: AbortSignal.timeout(AU_OPS_CONFIG.timeout)
        });
        
        if (!auOpsResponse.ok) {
            const errorText = await auOpsResponse.text();
            console.error(`FMS API错误 (${auOpsResponse.status}):`, errorText);
            return createErrorResponse(`FMS API调用失败: ${auOpsResponse.statusText}`, auOpsResponse.status);
        }
        
        const data = await auOpsResponse.json();
        
        // 添加代理信息
        const responseData = {
            success: true,
            data: data,
            timestamp: new Date().toISOString(),
            proxy: {
                version: '1.0.0',
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
    if (!origin) {
        console.log('CORS检查: 无Origin头');
        return false;
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
 * 获取动态公司配置
 * @param {Object} env - 环境变量
 * @returns {Object} 公司配置
 */
async function getDynamicCompanyConfigs(env) {
    if (DYNAMIC_COMPANY_CONFIGS) {
        return DYNAMIC_COMPANY_CONFIGS;
    }

    try {
        // 1. 尝试从KV存储获取完整站点配置
        if (env.CONFIG_KV) {
            const siteConfigData = await env.CONFIG_KV.get('siteConfig');
            if (siteConfigData) {
                const rawData = JSON.parse(siteConfigData);
                console.log('KV原始数据结构:', Object.keys(rawData));

                // 处理两种可能的数据格式
                let siteConfig;
                if (rawData.siteConfig) {
                    // 格式: { "siteConfig": { "api": { "companies": [...] } } }
                    siteConfig = rawData.siteConfig;
                } else {
                    // 格式: { "api": { "companies": [...] } }
                    siteConfig = rawData;
                }

                if (siteConfig.api && siteConfig.api.companies) {
                    // 转换为Worker期望的格式
                    DYNAMIC_COMPANY_CONFIGS = {};
                    siteConfig.api.companies.forEach(company => {
                        DYNAMIC_COMPANY_CONFIGS[company.id] = {
                            name: company.name,
                            appKey: company.appKey,
                            appToken: company.appToken,
                            priority: company.priority,
                            enabled: company.enabled
                        };
                    });
                    console.log('✅ 从KV存储加载公司配置:', Object.keys(DYNAMIC_COMPANY_CONFIGS));
                    return DYNAMIC_COMPANY_CONFIGS;
                }
            }
        }

        // 2. KV配置不存在时返回空配置
        console.log('⚠️ KV配置不存在，返回空配置');
        DYNAMIC_COMPANY_CONFIGS = {};
        return DYNAMIC_COMPANY_CONFIGS;

    } catch (error) {
        console.error('❌ 获取动态配置失败:', error);

        // 返回空配置，强制使用KV存储
        return {};
    }
}

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
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 处理配置更新请求
        if (url.pathname === '/config/update' && request.method === 'POST') {
            return handleConfigUpdate(request, env);
        }

        // 处理配置获取请求
        if (url.pathname === '/config/companies' && request.method === 'GET') {
            const configs = await getDynamicCompanyConfigs(env);
            return new Response(JSON.stringify(configs), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }

        // 调试端点：查看动态公司配置详情
        if (url.pathname === '/debug/company-configs' && request.method === 'GET') {
            try {
                const configs = await getDynamicCompanyConfigs(env);
                const enabledCompanies = Object.values(configs).filter(c => c.enabled);
                const validCompanies = Object.values(configs).filter(c => c.enabled && c.appKey && c.appToken);

                return new Response(JSON.stringify({
                    success: true,
                    totalConfigs: Object.keys(configs).length,
                    configs: configs,
                    enabledCompanies: enabledCompanies.map(c => ({
                        name: c.name,
                        hasAppKey: !!c.appKey,
                        hasAppToken: !!c.appToken,
                        enabled: c.enabled
                    })),
                    validCompanies: validCompanies.map(c => c.name),
                    validCount: validCompanies.length
                }, null, 2), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } catch (error) {
                return new Response(JSON.stringify({
                    success: false,
                    error: error.message,
                    stack: error.stack
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
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
