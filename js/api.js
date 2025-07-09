/**
 * PGS Tracking System - API调用模块
 * 处理与PGS API的所有交互
 */

// ===================================
// API配置
// ===================================

/**
 * API配置对象
 */
const API_CONFIG = {
    // 根据环境选择API基础URL
    baseUrl: (() => {
        const hostname = window.location.hostname;

        // 本地开发环境
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'https://ws.ai-ops.vip/edi/web-services';
        }

        // 检查是否有环境变量配置的代理URL
        if (typeof window !== 'undefined' && window.WORKERS_PROXY_URL) {
            return window.WORKERS_PROXY_URL;
        }

        // 生产环境使用Cloudflare Workers代理
        // 使用实际部署的Workers域名
        if (hostname.includes('pages.dev') || hostname.includes('your-domain.com')) {
            return 'https://pgs-tracking-proxy.itsupport-5c8.workers.dev/api/tracking';
        }

        // 默认回退到直接调用（可能会有CORS问题）
        return 'https://ws.ai-ops.vip/edi/web-services';
    })(),
    
    // API版本配置
    versions: {
        primary: 'v5',
        fallback: 'v3'
    },
    
    // 请求超时时间
    timeout: 30000,
    
    // 重试配置
    retry: {
        maxAttempts: 3,
        delay: 1000,
        backoff: 2
    },
    
    // API凭据（生产环境中应该通过代理保护）
    credentials: {
        appKey: 'kBYt^jva4shvx#xJ8yVlg7iJJW6_xHFL',
        appToken: 'ImB4ir2Z9tezm3b^FX3eYhJay@WwA5jJB7cgrwqRTV7^@ziL#FaacJaOgCes#r9bjc4JNO6B76BQPtspjF@HA6X@gxmyLl6eeCkgsCZN#CQs#SLckea@VvrEp$vf@2dAsMjXmfDm8M05eEjVq5C~XGKN_yrd4L5hWP~8EBr0aqx~LPNDYaV5$9h8JkxZrG#k9wgEJosRpbMfNe619HuQreu5SfC@9UGVoi1_I08~tcvlt8OSb~3FrJ7m@x568M1'
    }
};

/**
 * 多公司配置 - 各分公司API汇聚
 */
const COMPANY_CONFIGS = {
    company1: {
        name: '总公司',
        appKey: 'kBYt^jva4shvx#xJ8yVlg7iJJW6_xHFL',
        appToken: 'ImB4ir2Z9tezm3b^FX3eYhJay@WwA5jJB7cgrwqRTV7^@ziL#FaacJaOgCes#r9bjc4JNO6B76BQPtspjF@HA6X@gxmyLl6eeCkgsCZN#CQs#SLckea@VvrEp$vf@2dAsMjXmfDm8M05eEjVq5C~XGKN_yrd4L5hWP~8EBr0aqx~LPNDYaV5$9h8JkxZrG#k9wgEJosRpbMfNe619HuQreu5SfC@9UGVoi1_I08~tcvlt8OSb~3FrJ7m@x568M1',
        priority: 1
    },
    company2: {
        name: '分公司A',
        appKey: 'company2-app-key-here',
        appToken: 'company2-app-token-here',
        priority: 2
    },
    company3: {
        name: '分公司B',
        appKey: 'company3-app-key-here',
        appToken: 'company3-app-token-here',
        priority: 3
    },
    company4: {
        name: '分公司C',
        appKey: 'company4-app-key-here',
        appToken: 'company4-app-token-here',
        priority: 4
    }
};

// ===================================
// HTTP请求工具
// ===================================

/**
 * 创建HTTP请求头
 * @param {string} companyId - 公司ID
 * @returns {Object} 请求头对象
 */
function createHeaders(companyId = 'default') {
    const config = COMPANY_CONFIGS[companyId] || COMPANY_CONFIGS.default;
    
    return {
        'Content-Type': 'application/json',
        'appKey': config.appKey,
        'appToken': config.appToken,
        'Accept': 'application/json'
    };
}

/**
 * 带重试的HTTP请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @param {number} attempt - 当前尝试次数
 * @returns {Promise<Response>} 响应对象
 */
async function fetchWithRetry(url, options = {}, attempt = 1) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
        
    } catch (error) {
        console.warn(`API请求失败 (尝试 ${attempt}/${API_CONFIG.retry.maxAttempts}):`, error.message);
        
        // 如果还有重试机会且不是用户取消的请求
        if (attempt < API_CONFIG.retry.maxAttempts && error.name !== 'AbortError') {
            const delay = API_CONFIG.retry.delay * Math.pow(API_CONFIG.retry.backoff, attempt - 1);
            console.log(`${delay}ms后重试...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, attempt + 1);
        }
        
        throw error;
    }
}

// ===================================
// 轨迹查询API
// ===================================

/**
 * 查询单个订单轨迹
 * @param {string} trackingRef - 查询参数（JobNum）
 * @param {string} companyId - 公司ID
 * @returns {Promise<Object>} 查询结果
 */
async function queryTrackingInfo(trackingRef, companyId = 'default') {
    if (!trackingRef) {
        throw new Error('查询参数不能为空');
    }
    
    // 检查缓存
    const cacheKey = `tracking_${trackingRef}_${companyId}`;
    const cachedData = TrackingUtils.getCachedData(cacheKey);
    if (cachedData) {
        console.log('使用缓存数据:', trackingRef);
        return {
            ...cachedData,
            fromCache: true
        };
    }
    
    const headers = createHeaders(companyId);
    let lastError = null;
    
    // 尝试v5 API
    try {
        console.log(`尝试v5 API查询: ${trackingRef}`);
        const url = `${API_CONFIG.baseUrl}/v5/tracking?trackingRef=${encodeURIComponent(trackingRef)}`;
        
        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: headers
        });
        
        const data = await response.json();
        
        const result = {
            success: true,
            trackingRef: trackingRef,
            apiVersion: 'v5',
            data: data,
            timestamp: new Date().toISOString(),
            companyId: companyId
        };
        
        // 缓存成功的结果
        TrackingUtils.cacheData(cacheKey, result, 5 * 60 * 1000); // 5分钟缓存
        
        return result;
        
    } catch (error) {
        console.warn('v5 API查询失败:', error.message);
        lastError = error;
    }
    
    // 尝试v3 API作为备用
    try {
        console.log(`尝试v3 API查询: ${trackingRef}`);
        const url = `${API_CONFIG.baseUrl}/v3/tracking?trackingRef=${encodeURIComponent(trackingRef)}`;
        
        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: headers
        });
        
        const data = await response.json();
        
        const result = {
            success: true,
            trackingRef: trackingRef,
            apiVersion: 'v3',
            data: data,
            timestamp: new Date().toISOString(),
            companyId: companyId
        };
        
        // 缓存成功的结果
        TrackingUtils.cacheData(cacheKey, result, 5 * 60 * 1000); // 5分钟缓存
        
        return result;
        
    } catch (error) {
        console.error('v3 API查询也失败:', error.message);
        lastError = error;
    }
    
    // 所有API都失败
    throw new Error('查询失败，请检查单号格式或稍后重试');
}

/**
 * 多公司API汇聚查询单个订单轨迹
 * @param {string} trackingRef - 查询参数（JobNum）
 * @returns {Promise<Object>} 查询结果
 */
async function queryTrackingInfoFromAllCompanies(trackingRef) {
    if (!trackingRef) {
        throw new Error('查询参数不能为空');
    }

    console.log(`🔍 开始多公司汇聚查询: ${trackingRef}`);

    // 按优先级排序公司配置
    const companies = Object.entries(COMPANY_CONFIGS)
        .sort(([,a], [,b]) => a.priority - b.priority);

    const results = [];
    let successResult = null;

    // 并发查询所有公司API
    const queryPromises = companies.map(async ([companyId, config]) => {
        try {
            console.log(`查询 ${config.name} (${companyId})...`);
            const result = await queryTrackingInfo(trackingRef, companyId);

            return {
                companyId,
                companyName: config.name,
                success: true,
                ...result
            };
        } catch (error) {
            console.warn(`${config.name} 查询失败:`, error.message);
            return {
                companyId,
                companyName: config.name,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    });

    // 等待所有查询完成
    const allResults = await Promise.all(queryPromises);

    // 找到第一个成功的结果
    successResult = allResults.find(result => result.success);

    // 汇总结果
    const summary = {
        trackingRef,
        totalCompanies: companies.length,
        successCount: allResults.filter(r => r.success).length,
        failedCount: allResults.filter(r => !r.success).length,
        allResults: allResults,
        timestamp: new Date().toISOString()
    };

    if (successResult) {
        console.log(`✅ 查询成功 - 来源: ${successResult.companyName}`);
        return {
            success: true,
            primaryResult: successResult,
            summary: summary
        };
    } else {
        console.log(`❌ 所有公司查询均失败`);
        // 根据用户要求，不显示内部API架构细节
        throw new Error('查询失败');
    }
}

/**
 * 批量查询轨迹信息（支持多公司汇聚）
 * @param {Array<string>} trackingRefs - 查询参数数组
 * @param {Function} progressCallback - 进度回调函数
 * @returns {Promise<Array>} 查询结果数组
 */
async function queryBatchTrackingInfo(trackingRefs, progressCallback = null) {
    if (!Array.isArray(trackingRefs) || trackingRefs.length === 0) {
        throw new Error('查询参数数组不能为空');
    }

    const results = [];
    const total = trackingRefs.length;

    console.log(`🔍 开始批量多公司汇聚查询 ${total} 个单号`);

    for (let i = 0; i < trackingRefs.length; i++) {
        const trackingRef = trackingRefs[i];

        try {
            const result = await queryTrackingInfoFromAllCompanies(trackingRef);
            results.push({
                index: i + 1,
                trackingRef: trackingRef,
                ...result
            });

            console.log(`查询进度: ${i + 1}/${total} - ${trackingRef} 成功`);

        } catch (error) {
            console.error(`查询失败: ${trackingRef} - ${error.message}`);
            results.push({
                index: i + 1,
                trackingRef: trackingRef,
                success: false,
                error: '查询失败，请检查单号格式',
                timestamp: new Date().toISOString()
            });
        }

        // 调用进度回调
        if (progressCallback && typeof progressCallback === 'function') {
            progressCallback({
                current: i + 1,
                total: total,
                percentage: Math.round(((i + 1) / total) * 100),
                currentItem: trackingRef
            });
        }

        // 批量查询时添加延迟，避免API限流
        if (i < trackingRefs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800)); // 800ms延迟（多公司查询需要更长间隔）
        }
    }

    console.log(`批量查询完成: ${results.filter(r => r.success).length}/${total} 成功`);
    return results;
}

// ===================================
// 数据处理和格式化
// ===================================

/**
 * 格式化轨迹数据
 * @param {Object} rawData - 原始API数据
 * @param {string} apiVersion - API版本
 * @returns {Object} 格式化后的轨迹数据
 */
function formatTrackingData(rawData, apiVersion = 'v5') {
    if (!rawData) {
        return {
            events: [],
            summary: {
                status: 'unknown',
                statusName: '未知状态',
                lastUpdate: null,
                totalEvents: 0
            }
        };
    }
    
    try {
        // 根据API版本处理不同的数据结构
        let events = [];
        let summary = {};
        
        if (apiVersion === 'v5') {
            // v5 API数据结构处理
            events = rawData.events || rawData.trackingEvents || [];
            summary = {
                status: rawData.status || rawData.currentStatus,
                statusName: rawData.statusName || rawData.currentStatusName,
                lastUpdate: rawData.lastUpdate || rawData.lastUpdateTime,
                totalEvents: events.length
            };
        } else if (apiVersion === 'v3') {
            // v3 API数据结构处理
            events = rawData.trackingInfo || rawData.events || [];
            summary = {
                status: rawData.status,
                statusName: rawData.statusDescription,
                lastUpdate: rawData.lastUpdateTime,
                totalEvents: events.length
            };
        }
        
        // 格式化事件数据
        const formattedEvents = events.map((event, index) => ({
            id: index + 1,
            timestamp: event.eventTime || event.time || event.timestamp,
            status: event.status || event.eventCode,
            statusName: event.statusName || event.eventDescription || event.description,
            location: event.location || event.eventLocation,
            description: event.description || event.remark || event.note,
            isCurrent: index === 0 // 第一个事件为当前状态
        }));
        
        // 按时间排序（最新的在前）
        formattedEvents.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeB - timeA;
        });
        
        return {
            events: formattedEvents,
            summary: summary,
            rawData: rawData
        };
        
    } catch (error) {
        console.error('格式化轨迹数据失败:', error);
        return {
            events: [],
            summary: {
                status: 'error',
                statusName: '数据格式错误',
                lastUpdate: null,
                totalEvents: 0
            },
            error: error.message
        };
    }
}

/**
 * 获取状态显示样式
 * @param {string} status - 状态代码
 * @param {string} statusName - 状态名称
 * @returns {Object} 样式配置
 */
function getStatusStyle(status, statusName = '') {
    const statusLower = (status || '').toLowerCase();
    const nameLower = (statusName || '').toLowerCase();
    
    // 已送达
    if (statusLower.includes('delivered') || nameLower.includes('delivered') || 
        nameLower.includes('送达') || nameLower.includes('签收')) {
        return {
            class: 'success',
            icon: 'fas fa-check-circle',
            color: '#10b981'
        };
    }
    
    // 运输中
    if (statusLower.includes('transit') || statusLower.includes('shipped') ||
        nameLower.includes('运输') || nameLower.includes('在途')) {
        return {
            class: 'primary',
            icon: 'fas fa-truck',
            color: '#2563eb'
        };
    }
    
    // 已发出
    if (statusLower.includes('printed') || statusLower.includes('dispatched') ||
        nameLower.includes('发出') || nameLower.includes('打印')) {
        return {
            class: 'info',
            icon: 'fas fa-shipping-fast',
            color: '#06b6d4'
        };
    }
    
    // 异常
    if (statusLower.includes('exception') || statusLower.includes('failed') ||
        nameLower.includes('异常') || nameLower.includes('失败')) {
        return {
            class: 'danger',
            icon: 'fas fa-exclamation-triangle',
            color: '#ef4444'
        };
    }
    
    // 默认
    return {
        class: 'secondary',
        icon: 'fas fa-circle',
        color: '#6b7280'
    };
}

// ===================================
// 导出API模块
// ===================================

// 导出到全局作用域（用于浏览器环境）
if (typeof window !== 'undefined') {
    window.TrackingAPI = {
        // 配置
        API_CONFIG,
        COMPANY_CONFIGS,

        // 核心查询功能
        queryTrackingInfo,
        queryTrackingInfoFromAllCompanies,
        queryBatchTrackingInfo,

        // 数据处理
        formatTrackingData,
        getStatusStyle,

        // 工具函数
        createHeaders,
        fetchWithRetry
    };
}
