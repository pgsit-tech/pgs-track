/**
 * PGS Tracking System - Cloudflare Workers 代理
 * 解决CORS跨域问题并保护API密钥
 */

// ===================================
// 配置常量
// ===================================

// AU-OPS API配置
const AU_OPS_CONFIG = {
    baseUrl: 'https://ws.ai-ops.vip/edi/web-services',
    timeout: 30000
};

// 允许的来源域名（CORS配置）
const ALLOWED_ORIGINS = [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://pgs-track.pages.dev'
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
        return createErrorResponse('服务暂时不可用', 405);
    }

    // 验证来源
    const origin = request.headers.get('Origin');
    if (!isOriginAllowed(origin)) {
        return createErrorResponse('访问被拒绝', 403);
    }

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

        // 构建AU-OPS API请求
        const auOpsUrl = `${AU_OPS_CONFIG.baseUrl}${apiPath}?trackingRef=${encodeURIComponent(trackingRef)}`;

        const auOpsResponse = await fetch(auOpsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'appKey': appKey,
                'appToken': appToken
            },
            signal: AbortSignal.timeout(AU_OPS_CONFIG.timeout)
        });
        
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
        
        // 构建AU-OPS API请求
        const auOpsUrl = `${AU_OPS_CONFIG.baseUrl}${apiPath}?${queryParams}`;
        
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
    
    if (!isOriginAllowed(origin)) {
        return new Response(null, { status: 403 });
    }
    
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        }
    });
}

/**
 * 检查来源是否被允许
 * @param {string} origin - 来源域名
 * @returns {boolean} 是否允许
 */
function isOriginAllowed(origin) {
    if (!origin) return false;
    return ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost');
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
