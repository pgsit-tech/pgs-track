/**
 * PGS Tracking System - Cloudflare Workers 代理
 * 解决CORS跨域问题并保护API密钥
 */

// ===================================
// 配置常量
// ===================================

// AU-OPS API配置
const AU_OPS_CONFIG = {
    // 支持两个API地址，优先使用官方地址
    baseUrls: [
        'https://prod.au-ops.com/edi/web-services',
        'https://ws.ai-ops.vip/edi/web-services'
    ],
    timeout: 30000
};

// 允许的来源域名（CORS配置）
const ALLOWED_ORIGINS = [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:8000',
    'https://pgs-track.pages.dev',
    'https://pgs-track-pages.pages.dev'  // 可能的实际域名
];

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
        return handleCORS(request);
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

    if (!isOriginAllowed(origin)) {
        console.log('来源被拒绝:', origin);
        return createErrorResponse('访问被拒绝', 403);
    }

    console.log('CORS验证通过，开始处理API请求');

    // 解析API路径
    const apiPath = url.pathname.replace('/api/tracking', '');

    // 路由到相应的处理函数
    if (apiPath.startsWith('/v5/tracking') || apiPath.startsWith('/v3/tracking')) {
        return handleTrackingRequest(request, apiPath, env);
    } else if (apiPath.startsWith('/fms/')) {
        return handleFMSRequest(request, apiPath, env);
    } else {
        return createErrorResponse('服务暂时不可用', 404);
    }
}

/**
 * 处理轨迹查询请求
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

        // 从环境变量获取API密钥
        const appKey = env.COMPANY1_APP_KEY || env.APP_KEY;
        const appToken = env.COMPANY1_APP_TOKEN || env.APP_TOKEN;

        if (!appKey || !appToken) {
            console.error('API密钥未配置');
            return createErrorResponse('服务配置错误', 500);
        }

        // 尝试多个API地址，使用官方推荐的认证方式
        let auOpsResponse = null;
        let lastError = null;

        for (const baseUrl of AU_OPS_CONFIG.baseUrls) {
            try {
                const auOpsUrl = `${baseUrl}${apiPath}?trackingRef=${encodeURIComponent(trackingRef)}`;

                console.log('🎯 尝试AU-OPS API:', baseUrl);
                console.log('🔑 API密钥长度:', appKey ? appKey.length : 'undefined');
                console.log('🔑 Token长度:', appToken ? appToken.length : 'undefined');
                console.log('🔑 API密钥前缀:', appKey ? appKey.substring(0, 10) + '...' : 'undefined');

                auOpsResponse = await fetch(auOpsUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'appKey': appKey,
                        'appToken': appToken,
                        'Request-Origion': 'SwaggerBootstrapUi',
                        'accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Referer': 'https://prod.au-ops.com/',
                        'Origin': 'https://prod.au-ops.com'
                    },
                    signal: AbortSignal.timeout(AU_OPS_CONFIG.timeout)
                });

                // 如果请求成功，跳出循环
                if (auOpsResponse.ok) {
                    console.log('✅ API调用成功:', baseUrl);
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
        
        // 添加代理信息
        const responseData = {
            success: true,
            trackingRef: trackingRef,
            apiVersion: apiPath.includes('v5') ? 'v5' : 'v3',
            data: data,
            timestamp: new Date().toISOString(),
            proxy: {
                version: '1.0.0',
                endpoint: apiPath
            }
        };
        
        return createSuccessResponse(responseData, request.headers.get('Origin'));
        
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
        
        // 构建AU-OPS API请求（使用第一个地址）
        const auOpsUrl = `${AU_OPS_CONFIG.baseUrls[0]}${apiPath}?${queryParams}`;
        
        const auOpsResponse = await fetch(auOpsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'appKey': AU_OPS_CONFIG.credentials.appKey,
                'appToken': AU_OPS_CONFIG.credentials.appToken
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
        
        return createSuccessResponse(responseData, request.headers.get('Origin'));
        
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
 * @returns {Response} CORS响应
 */
function handleCORS(request) {
    const origin = request.headers.get('Origin');

    console.log('处理OPTIONS预检请求, Origin:', origin);

    if (!isOriginAllowed(origin)) {
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
 * @returns {boolean} 是否允许
 */
function isOriginAllowed(origin) {
    if (!origin) {
        console.log('CORS检查: 无Origin头');
        return false;
    }

    console.log('CORS检查: Origin =', origin);
    console.log('CORS检查: 允许的域名 =', ALLOWED_ORIGINS);

    // 检查精确匹配
    if (ALLOWED_ORIGINS.includes(origin)) {
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
 * @returns {Response} 响应对象
 */
function createSuccessResponse(data, origin) {
    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5分钟缓存
    };
    
    if (isOriginAllowed(origin)) {
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

export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env);
    }
};
