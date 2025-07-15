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
    // 根据环境选择API基础URL - 智能选择直接调用或代理
    baseUrl: (() => {
        const hostname = window.location.hostname;
        console.log('🌐 当前域名:', hostname);

        // 本地开发环境使用Worker代理（避免CORS问题）
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            const proxyUrl = 'https://track-api.20990909.xyz/api/au-ops';
            console.log('🏠 本地开发环境，使用Worker代理:', proxyUrl);
            return proxyUrl;
        }

        // 检查是否有环境变量配置的代理URL
        if (typeof window !== 'undefined' && window.WORKERS_PROXY_URL) {
            console.log('🔧 使用环境变量配置的代理URL:', window.WORKERS_PROXY_URL);
            return window.WORKERS_PROXY_URL;
        }

        // 生产环境优先使用直接API调用
        if (hostname.includes('pages.dev') || hostname.includes('pgs-cbel.com')) {
            console.log('🎯 生产环境，使用直接API调用 ws.ai-ops.vip');
            return 'https://ws.ai-ops.vip/edi/web-services';
        }

        // 默认使用Worker代理
        const proxyUrl = 'https://track-api.20990909.xyz/api/au-ops';
        console.log('🔄 默认使用Worker代理:', proxyUrl);
        return proxyUrl;
    })(),
    
    // API版本配置
    versions: {
        primary: 'v5',
        fallback: 'v3'
    },
    
    // 请求超时时间
    timeout: 30000,
    
    // 重试配置 - 减少重试次数以加快查询速度
    retry: {
        maxAttempts: 1,
        delay: 1000,
        backoff: 2
    },
    
    // API凭据（使用系统方确认可用的密钥）
    credentials: {
        appKey: 'baMccCbpHMZLTZksk5E2E^3KH#L9lvvf',
        appToken: '^tKm71iS7eKoQaKS5y5L8ZUDjvscOV9F#sSbGSsA6eQuMuMTfvI@yMx$dKXdZtKcVe#KycHvf8sg9oyc1inM#acvAycpD@85rbEeDZMn#EBa$c3bftirsaD_XAai5u7oWL$zgQajCl@zSojZNllxO^jpNAmJXHf0GD89LRE8I~4gm5VXmT2HS~mKS#ewOqoK~eoJhuH@v#7~$rQwGlRwCnt2nXKc$3m21#KBtI2tWIygHqW37zyLN0hMWxe_3yg'
    }
};

/**
 * 获取动态公司配置
 * 优先使用从KV存储加载的配置，回退到硬编码配置
 */
function getCompanyConfigs() {
    // 优先使用从KV存储加载的配置
    if (window.SITE_CONFIG?.api?.companies) {
        const dynamicConfigs = {};
        window.SITE_CONFIG.api.companies.forEach(company => {
            dynamicConfigs[company.id] = {
                name: company.name,
                appKey: company.appKey,
                appToken: company.appToken,
                priority: company.priority,
                enabled: company.enabled !== false
            };
        });
        console.log('✅ 使用动态公司配置:', Object.keys(dynamicConfigs));
        return dynamicConfigs;
    }

    // 回退到硬编码配置（兼容性）
    console.log('⚠️ 使用硬编码公司配置（回退）');
    return {
        company1: {
            name: '总公司',
            appKey: 'baMccCbpHMZLTZksk5E2E^3KH#L9lvvf',
            appToken: '^tKm71iS7eKoQaKS5y5L8ZUDjvscOV9F#sSbGSsA6eQuMuMTfvI@yMx$dKXdZtKcVe#KycHvf8sg9oyc1inM#acvAycpD@85rbEeDZMn#EBa$c3bftirsaD_XAai5u7oWL$zgQajCl@zSojZNllxO^jpNAmJXHf0GD89LRE8I~4gm5VXmT2HS~mKS#ewOqoK~eoJhuH@v#7~$rQwGlRwCnt2nXKc$3m21#KBtI2tWIygHqW37zyLN0hMWxe_3yg',
            priority: 1
        }
    };
}

/**
 * 多公司配置 - 各分公司API汇聚
 * @deprecated 使用 getCompanyConfigs() 获取动态配置
 */
const COMPANY_CONFIGS = getCompanyConfigs();

// ===================================
// HTTP请求工具
// ===================================

/**
 * 创建HTTP请求头
 * @param {string} companyId - 公司ID
 * @returns {Object} 请求头对象
 */
function createHeaders(companyId = 'company1') {
    const companyConfigs = getCompanyConfigs();
    const config = companyConfigs[companyId] || Object.values(companyConfigs)[0];
    const hostname = window.location.hostname;

    // 如果使用Worker代理，只需要基本的请求头
    if (hostname === 'localhost' || hostname === '127.0.0.1' || API_CONFIG.baseUrl.includes('track-api.20990909.xyz')) {
        return {
            'Content-Type': 'application/json',
            'accept': 'application/json'
        };
    }

    // 直接API调用时使用完整的认证头
    return {
        'appKey': config.appKey,
        'appToken': config.appToken,
        'Request-Origion': 'SwaggerBootstrapUi',
        'accept': 'application/json'
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
    
    // 临时禁用缓存以测试智能切换功能 - 版本标识: 2025-07-15-10:00
    console.log('🔄🔄🔄 缓存已禁用，强制调用API (新版本):', trackingRef);
    console.log('🚀🚀🚀 智能切换功能已激活！');

    // TODO: 恢复缓存功能
    // const cacheKey = `tracking_${trackingRef}_${companyId}`;
    // const cachedData = TrackingUtils.getCachedData(cacheKey);
    // if (cachedData) {
    //     console.log('使用缓存数据:', trackingRef);
    //     return {
    //         ...cachedData,
    //         fromCache: true
    //     };
    // }
    
    const headers = createHeaders(companyId);
    
    // 使用v5 API（官方推荐版本）
    try {
        console.log(`尝试v5 API查询: ${trackingRef} (公司: ${companyId})`);
        const url = `${API_CONFIG.baseUrl}/v5/tracking?trackingRef=${encodeURIComponent(trackingRef)}&companyId=${encodeURIComponent(companyId)}`;

        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();

        // 🔍 调试：查看Worker返回的完整数据结构
        console.log('🔍 Worker返回的完整数据:', JSON.stringify(data, null, 2));
        console.log('🔍 data.apiVersion:', data.apiVersion);
        console.log('🔍 data.data:', data.data);

        // 检查API响应是否成功
        if (data && (data.success === false || data.code === 404 || data.code >= 400)) {
            throw new Error(data.error || data.description || '查询失败');
        }

        // 检查是否有有效数据
        if (!data || (data.code && data.code !== 200)) {
            throw new Error('未找到有效的轨迹数据');
        }

        const result = {
            success: true,
            trackingRef: trackingRef,
            apiVersion: data.apiVersion || 'v5', // 使用Worker返回的实际API版本
            data: data,
            timestamp: new Date().toISOString(),
            companyId: companyId
        };

        // 临时禁用缓存存储以测试智能切换功能
        console.log('🔄 缓存存储已禁用');
        // TODO: 恢复缓存功能
        // TrackingUtils.cacheData(cacheKey, result, 5 * 60 * 1000); // 5分钟缓存

        return result;

    } catch (error) {
        console.error('v5 API查询失败:', error.message);
        throw new Error('查询失败，请检查单号格式或稍后重试');
    }
}

/**
 * 多公司API轮询查询单个订单轨迹（方案A：依次尝试直到成功）
 * @param {string} trackingRef - 查询参数（JobNum）
 * @returns {Promise<Object>} 查询结果
 */
async function queryTrackingInfoFromAllCompanies(trackingRef) {
    if (!trackingRef) {
        throw new Error('查询参数不能为空');
    }

    console.log(`🔍 开始多公司轮询查询: ${trackingRef}`);

    // 按优先级排序公司配置
    const companyConfigs = getCompanyConfigs();
    const companies = Object.entries(companyConfigs)
        .filter(([,config]) => config.enabled !== false)
        .sort(([,a], [,b]) => a.priority - b.priority);

    const attemptResults = [];
    let successResult = null;

    // 依次尝试每个公司API，直到找到成功的结果
    for (const [companyId, config] of companies) {
        try {
            console.log(`🔄 尝试查询 ${config.name} (${companyId})...`);
            const result = await queryTrackingInfo(trackingRef, companyId);

            const companyResult = {
                companyId,
                companyName: result.companyName || config.name, // 优先使用Worker返回的公司名称
                success: true,
                attemptOrder: attemptResults.length + 1,
                ...result
            };

            attemptResults.push(companyResult);
            successResult = companyResult;

            console.log(`✅ 查询成功 - 来源: ${companyResult.companyName} (第${companyResult.attemptOrder}次尝试)`);
            break; // 找到成功结果，停止尝试其他公司

        } catch (error) {
            console.warn(`❌ ${config.name} 查询失败:`, error.message);
            attemptResults.push({
                companyId,
                companyName: config.name,
                success: false,
                error: error.message,
                attemptOrder: attemptResults.length + 1,
                timestamp: new Date().toISOString()
            });

            // 继续尝试下一个公司
            continue;
        }
    }

    // 汇总结果
    const summary = {
        trackingRef,
        totalCompanies: companies.length,
        attemptedCompanies: attemptResults.length,
        successCount: attemptResults.filter(r => r.success).length,
        failedCount: attemptResults.filter(r => !r.success).length,
        attemptResults: attemptResults,
        queryStrategy: 'sequential', // 标识使用顺序查询策略
        timestamp: new Date().toISOString()
    };

    if (successResult) {
        return {
            success: true,
            primaryResult: successResult,
            summary: summary
        };
    } else {
        console.log(`❌ 所有公司查询均失败 (尝试了${attemptResults.length}个公司)`);
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
    console.log('🔍 formatTrackingData 输入数据:', rawData);
    console.log('🔍 API版本:', apiVersion);

    if (!rawData) {
        console.log('❌ rawData 为空');
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
        
        if (apiVersion === 'v5' || apiVersion === 'official') {
            // 处理 AU-OPS API (v5) 或官网API (official) 数据格式
            console.log('🔍 处理API数据，版本:', apiVersion);

            if (apiVersion === 'official') {
                // 官网API数据结构处理
                console.log('🌐 处理官网API数据结构');

                // 官网API数据结构：trackings(主轨迹), headNodes, subTrackings(小单)
                const trackingsEvents = rawData.trackings || [];
                const headNodesEvents = rawData.headNodes || [];
                const subTrackings = rawData.subTrackings || [];

                console.log('🔍 官网API数据结构分析:');
                console.log('🔍 trackings(主轨迹):', trackingsEvents.length, '个事件');
                console.log('🔍 headNodes:', headNodesEvents.length, '个节点');
                console.log('🔍 subTrackings(小单):', subTrackings.length, '个快递单号');
                console.log('🚀 NEW CODE VERSION 20250715104800 - 使用新的字段名称');

                // 主要轨迹数据：使用trackings和headNodes，不包含subTrackings
                events = [...trackingsEvents];

                // 处理 headNodes 数据，转换为统一格式
                if (headNodesEvents && headNodesEvents.length > 0) {
                    const convertedHeadNodes = headNodesEvents.map((node, index) => {
                        const statusName = node.context || node.nodeName || node.description || node.statusName;
                        const timestamp = node.time || node.nodeTime || node.timestamp || node.eventTime;

                        // 跳过没有时间或时间为空字符串的节点
                        if (!timestamp || timestamp === '' || (typeof timestamp === 'string' && timestamp.trim() === '')) {
                            return null;
                        }

                        return {
                            time: timestamp,
                            context: statusName || `节点: ${node.node}`,
                            node: node.node || 'main',
                            location: node.location || node.eventLocation || '',
                            source: 'headNodes',
                            originalData: node
                        };
                    }).filter(Boolean);

                    events = [...events, ...convertedHeadNodes];
                    console.log('🔍 添加headNodes后的主轨迹events:', events.length, '个事件');
                }

                // 处理 subTrackings 数据（小单列表），但不混合到主轨迹中
                let subTrackingsList = [];
                if (subTrackings && subTrackings.length > 0) {
                    console.log('🔍 处理subTrackings数据:', subTrackings.length, '个快递单号');

                    subTrackingsList = subTrackings.map((subTracking, index) => {
                        const trackingNum = subTracking.trackingNum;
                        const trackings = subTracking.trackings || [];

                        // 获取最新状态（第一个事件通常是最新的）
                        const latestEvent = trackings.length > 0 ? trackings[0] : null;
                        const status = latestEvent ? latestEvent.context : '未知状态';
                        const lastUpdate = latestEvent ? latestEvent.time : null;

                        return {
                            trackingNum: trackingNum,
                            status: status,
                            lastUpdate: lastUpdate,
                            totalEvents: trackings.length,
                            trackings: trackings, // 保留完整轨迹数据，供点击查看详情使用
                            source: 'subTrackings'
                        };
                    });

                    console.log('🔍 处理后的小单列表:', subTrackingsList.length, '个小单');
                }

                // 将小单列表添加到结果中，但不混合到主轨迹events中
                summary.subTrackings = subTrackingsList;

            } else {
                // AU-OPS API (v5) 数据结构处理
                console.log('🔧 处理AU-OPS API数据结构');

                // 合并 dataList、orderNodes 和 subTrackings 三个数据源
                const dataListEvents = rawData.dataList || [];
                const orderNodesEvents = rawData.orderNodes || [];
                const subTrackings = rawData.subTrackings || [];

                // 将数据源合并
                events = [...dataListEvents];

                // 处理 orderNodes 数据，转换为统一格式
                if (orderNodesEvents && orderNodesEvents.length > 0) {
                    console.log('🔍 发现orderNodes数据:', orderNodesEvents.length, '个节点');

                    const convertedOrderNodes = orderNodesEvents.map((node, index) => {
                        // orderNodes使用不同的字段名：nodeName 和 nodeTime
                        const statusName = node.nodeName || node.context || node.description || node.statusName;
                        const timestamp = node.nodeTime || node.time || node.timestamp || node.eventTime;

                        // 只处理有意义的节点（有名称且有时间的）
                        if (!statusName || !timestamp || timestamp === '' || (typeof timestamp === 'string' && timestamp.trim() === '')) {
                            return null;
                        }

                        return {
                            time: timestamp,
                            context: statusName,
                            node: node.node || node.status || node.eventCode || node.statusCode,
                            location: node.location || node.eventLocation,
                            // 标记这是来自orderNodes的数据
                            source: 'orderNodes',
                            // 保留原始数据
                            originalData: node
                        };
                    }).filter(node => node !== null); // 过滤掉空节点

                    // 将转换后的orderNodes数据添加到events中
                    events = [...events, ...convertedOrderNodes];
                }

                // 处理 subTrackings 数据（小单列表）- AU-OPS API格式，但不混合到主轨迹中
                let subTrackingsList = [];
                if (subTrackings && subTrackings.length > 0) {
                    console.log('🔍 处理subTrackings数据:', subTrackings.length, '个快递单号');

                    subTrackingsList = subTrackings.map((subTracking, index) => {
                        const trackingNum = subTracking.trackingNum;
                        const trackings = subTracking.trackings || [];

                        console.log(`🔍 处理快递单号 ${trackingNum}:`, trackings.length, '个事件');

                        // 获取最新状态（第一个事件通常是最新的）
                        const latestEvent = trackings.length > 0 ? trackings[0] : null;
                        const status = latestEvent ? latestEvent.context : '未知状态';
                        const lastUpdate = latestEvent ? latestEvent.time : null;

                        return {
                            trackingNum: trackingNum,
                            status: status,
                            lastUpdate: lastUpdate,
                            totalEvents: trackings.length,
                            trackings: trackings, // 保留完整轨迹数据，供点击查看详情使用
                            source: 'subTrackings'
                        };
                    });

                    console.log('🔍 处理后的小单列表:', subTrackingsList.length, '个小单');
                }

                // 将小单列表添加到结果中，但不混合到主轨迹events中
                summary.subTrackings = subTrackingsList;
            }

            console.log('🔍 提取的events数据:', events);

            summary = {
                status: rawData.status || rawData.currentStatus,
                statusName: rawData.statusName || rawData.currentStatusName || rawData.status,
                lastUpdate: rawData.lastUpdate || rawData.lastUpdateTime,
                totalEvents: events.length,
                jobNum: rawData.jobNum,
                destCountryCode: rawData.destCountryCode,
                packages: rawData.packages
            };
            console.log('🔍 生成的summary:', summary);
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
        
        // 格式化事件数据 - 适配AU-OPS API格式
        const formattedEvents = events.map((event, index) => {
            const statusName = event.context || event.statusName || event.eventDescription || event.description;
            const formatted = {
                id: index + 1,
                timestamp: event.time || event.eventTime || event.timestamp,
                status: event.node || event.status || event.eventCode,
                statusName: statusName,
                location: event.location || event.eventLocation,
                description: event.context || event.description || event.remark || event.note,
                isCurrent: false, // 稍后根据状态优先级设置
                nodeTime: event.nodeTime,
                // 添加状态优先级，用于正确排序
                priority: getStatusPriority(statusName)
            };
            console.log(`🔍 格式化事件 ${index + 1}:`, formatted);
            return formatted;
        });

        // 按状态优先级和时间排序（派送完成优先，然后按时间排序）
        formattedEvents.sort((a, b) => {
            // 首先按优先级排序（数字越大优先级越高）
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // 优先级相同时按时间排序（最新的在前）
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeB - timeA;
        });

        // 设置当前状态（优先级最高的为当前状态）
        if (formattedEvents.length > 0) {
            formattedEvents[0].isCurrent = true;
        }
        
        const result = {
            events: formattedEvents,
            summary: summary,
            rawData: rawData
        };

        console.log('🔍 formatTrackingData 最终结果:', result);
        console.log('🔍 events数量:', formattedEvents.length);

        return result;
        
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
 * 获取状态优先级（用于排序）
 * @param {string} statusName - 状态名称
 * @returns {number} 优先级（数字越大优先级越高）
 */
function getStatusPriority(statusName = '') {
    const nameLower = (statusName || '').toLowerCase();

    // 派送完成 - 最高优先级
    if (nameLower.includes('actual delivery') || nameLower.includes('卡车实际派送') ||
        nameLower.includes('派送完成') || nameLower.includes('delivered') ||
        nameLower.includes('delivered-dl') || nameLower.includes('已送达') ||
        nameLower.includes('签收') || nameLower.includes('已提取')) {
        return 100;
    }

    // 预约派送
    if (nameLower.includes('appointment') || nameLower.includes('预约派送')) {
        return 90;
    }

    // 提柜/取货
    if (nameLower.includes('pick up') || nameLower.includes('提柜')) {
        return 80;
    }

    // 卸柜
    if (nameLower.includes('discharged') || nameLower.includes('卸柜')) {
        return 70;
    }

    // 到港
    if (nameLower.includes('arrival') || nameLower.includes('到港')) {
        return 60;
    }

    // 离港
    if (nameLower.includes('departure') || nameLower.includes('离港')) {
        return 50;
    }

    // 预计时间
    if (nameLower.includes('estimated') || nameLower.includes('预计')) {
        return 40;
    }

    // 入仓
    if (nameLower.includes('warehouse') || nameLower.includes('入仓')) {
        return 30;
    }

    // 订舱/提货
    if (nameLower.includes('booking') || nameLower.includes('订舱') ||
        nameLower.includes('提货')) {
        return 20;
    }

    // 默认优先级
    return 10;
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
    
    // 已送达/派送完成
    if (statusLower.includes('delivered') || nameLower.includes('delivered') ||
        nameLower.includes('送达') || nameLower.includes('签收') ||
        nameLower.includes('actual delivery') || nameLower.includes('卡车实际派送') ||
        nameLower.includes('派送完成') || nameLower.includes('delivered-dl') ||
        nameLower.includes('已送达') || nameLower.includes('已提取')) {
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
        get COMPANY_CONFIGS() {
            return getCompanyConfigs();
        },
        getCompanyConfigs,

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
