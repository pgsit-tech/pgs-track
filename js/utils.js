/**
 * PGS Tracking System - 工具函数模块
 * 提供单号验证、格式化、存储等工具函数
 */

// ===================================
// 单号格式验证和识别
// ===================================

/**
 * 单号类型枚举
 */
const TRACKING_TYPES = {
    AUTO: 'auto',
    JOB_NUM: 'jobNum',
    PO_NUM: 'poNum',
    TRACKING_NUM: 'trackingNum',
    REFERENCE_ID: 'referenceId',
    SHIPMENT_ID: 'shipmentId'
};

/**
 * 单号格式正则表达式
 */
const TRACKING_PATTERNS = {
    [TRACKING_TYPES.JOB_NUM]: /^[A-Z]{2}\d{10}$/,           // KD2412002091
    [TRACKING_TYPES.PO_NUM]: /^[A-Z]{4}\d{10}$/,           // BESH2412170032
    [TRACKING_TYPES.TRACKING_NUM]: /^\d{8,15}$/,            // 43005822480
    [TRACKING_TYPES.REFERENCE_ID]: /^[A-Z0-9]{8,20}$/,     // 通用Reference ID
    [TRACKING_TYPES.SHIPMENT_ID]: /^[A-Z0-9\-]{10,30}$/    // 通用Shipment ID
};

/**
 * 自动识别单号类型
 * @param {string} trackingNumber - 单号
 * @returns {string} 识别的单号类型
 */
function detectTrackingType(trackingNumber) {
    if (!trackingNumber || typeof trackingNumber !== 'string') {
        return TRACKING_TYPES.AUTO;
    }
    
    const cleanNumber = trackingNumber.trim().toUpperCase();
    
    // 按优先级检查各种格式
    for (const [type, pattern] of Object.entries(TRACKING_PATTERNS)) {
        if (pattern.test(cleanNumber)) {
            return type;
        }
    }
    
    return TRACKING_TYPES.AUTO;
}

/**
 * 验证单号格式
 * @param {string} trackingNumber - 单号
 * @param {string} expectedType - 期望的单号类型
 * @returns {Object} 验证结果
 */
function validateTrackingNumber(trackingNumber, expectedType = TRACKING_TYPES.AUTO) {
    if (!trackingNumber || typeof trackingNumber !== 'string') {
        return {
            isValid: false,
            type: null,
            message: '请输入有效的单号'
        };
    }
    
    const cleanNumber = trackingNumber.trim().toUpperCase();
    
    if (cleanNumber.length < 3) {
        return {
            isValid: false,
            type: null,
            message: '单号长度不能少于3位'
        };
    }
    
    if (cleanNumber.length > 30) {
        return {
            isValid: false,
            type: null,
            message: '单号长度不能超过30位'
        };
    }
    
    // 自动检测类型
    const detectedType = detectTrackingType(cleanNumber);
    
    // 如果指定了期望类型，验证是否匹配
    if (expectedType !== TRACKING_TYPES.AUTO && expectedType !== detectedType) {
        return {
            isValid: false,
            type: detectedType,
            message: `单号格式不匹配期望类型 ${expectedType}`
        };
    }
    
    return {
        isValid: true,
        type: detectedType,
        cleanNumber: cleanNumber,
        message: '单号格式正确'
    };
}

/**
 * 批量验证单号
 * @param {string} input - 输入的单号（多行或逗号分隔）
 * @returns {Array} 验证结果数组
 */
function validateBatchTrackingNumbers(input) {
    if (!input || typeof input !== 'string') {
        return [];
    }
    
    // 分割单号（支持换行、逗号、分号分隔）
    const numbers = input
        .split(/[\n,;，；\s]+/)
        .map(num => num.trim())
        .filter(num => num.length > 0);
    
    return numbers.map((number, index) => {
        const validation = validateTrackingNumber(number);
        return {
            index: index + 1,
            originalNumber: number,
            ...validation
        };
    });
}

// ===================================
// 时间格式化函数
// ===================================

/**
 * 格式化时间戳
 * @param {string|number|Date} timestamp - 时间戳
 * @param {string} format - 格式类型
 * @returns {string} 格式化后的时间
 */
function formatTimestamp(timestamp, format = 'datetime') {
    if (!timestamp) return '-';
    
    let date;
    if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
    } else {
        return '-';
    }
    
    if (isNaN(date.getTime())) {
        return '-';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    switch (format) {
        case 'relative':
            if (diffDays === 0) return '今天';
            if (diffDays === 1) return '昨天';
            if (diffDays === 2) return '前天';
            if (diffDays < 7) return `${diffDays}天前`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
            return `${Math.floor(diffDays / 365)}年前`;
            
        case 'date':
            return date.toLocaleDateString('zh-CN');
            
        case 'time':
            return date.toLocaleTimeString('zh-CN');
            
        case 'datetime':
        default:
            return date.toLocaleString('zh-CN');
    }
}

/**
 * 获取相对时间描述
 * @param {string|Date} timestamp - 时间戳
 * @returns {string} 相对时间描述
 */
function getRelativeTime(timestamp) {
    return formatTimestamp(timestamp, 'relative');
}

// ===================================
// 本地存储管理
// ===================================

/**
 * 本地存储键名
 */
const STORAGE_KEYS = {
    QUERY_HISTORY: 'au_ops_query_history',
    USER_PREFERENCES: 'au_ops_user_preferences',
    CACHE_DATA: 'au_ops_cache_data'
};

/**
 * 保存查询历史
 * @param {Object} queryData - 查询数据
 */
function saveQueryHistory(queryData) {
    try {
        const history = getQueryHistory();
        const newEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            ...queryData
        };
        
        // 添加到历史记录开头
        history.unshift(newEntry);
        
        // 限制历史记录数量（最多50条）
        const limitedHistory = history.slice(0, 50);
        
        localStorage.setItem(STORAGE_KEYS.QUERY_HISTORY, JSON.stringify(limitedHistory));
    } catch (error) {
        console.warn('保存查询历史失败:', error);
    }
}

/**
 * 获取查询历史
 * @returns {Array} 查询历史数组
 */
function getQueryHistory() {
    try {
        const history = localStorage.getItem(STORAGE_KEYS.QUERY_HISTORY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.warn('获取查询历史失败:', error);
        return [];
    }
}

/**
 * 清空查询历史
 */
function clearQueryHistory() {
    try {
        localStorage.removeItem(STORAGE_KEYS.QUERY_HISTORY);
    } catch (error) {
        console.warn('清空查询历史失败:', error);
    }
}

/**
 * 获取简单查询历史
 * @returns {Array} 简单查询历史数组
 */
function getSimpleQueryHistory() {
    try {
        const history = localStorage.getItem('pgs_simple_query_history');
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.warn('获取简单查询历史失败:', error);
        return [];
    }
}

/**
 * 保存简单查询历史
 * @param {Array} history - 查询历史数组
 */
function saveSimpleQueryHistory(history) {
    try {
        localStorage.setItem('pgs_simple_query_history', JSON.stringify(history));
    } catch (error) {
        console.error('保存简单查询历史失败:', error);
    }
}

/**
 * 清除简单查询历史
 */
function clearSimpleQueryHistory() {
    try {
        localStorage.removeItem('pgs_simple_query_history');
        console.log('✅ 简单查询历史已清除');
    } catch (error) {
        console.error('清除简单查询历史失败:', error);
    }
}

/**
 * 保存查询到简单历史记录
 * @param {string} trackingRef - 查询单号
 */
function saveToHistory(trackingRef) {
    if (!trackingRef || trackingRef.trim() === '') return;

    const history = getSimpleQueryHistory();
    const newItem = {
        trackingRef: trackingRef.trim(),
        timestamp: Date.now()
    };

    // 避免重复
    const existingIndex = history.findIndex(item => item.trackingRef === newItem.trackingRef);
    if (existingIndex !== -1) {
        history.splice(existingIndex, 1);
    }

    history.push(newItem);

    // 只保留最近20个
    if (history.length > 20) {
        history.splice(0, history.length - 20);
    }

    saveSimpleQueryHistory(history);
}

/**
 * 保存用户偏好设置
 * @param {Object} preferences - 偏好设置
 */
function saveUserPreferences(preferences) {
    try {
        const current = getUserPreferences();
        const updated = { ...current, ...preferences };
        localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
    } catch (error) {
        console.warn('保存用户偏好失败:', error);
    }
}

/**
 * 获取用户偏好设置
 * @returns {Object} 用户偏好设置
 */
function getUserPreferences() {
    try {
        const preferences = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
        return preferences ? JSON.parse(preferences) : {
            defaultSearchType: TRACKING_TYPES.AUTO,
            selectedCompany: 'default',
            autoRefresh: false,
            theme: 'light'
        };
    } catch (error) {
        console.warn('获取用户偏好失败:', error);
        return {};
    }
}

// ===================================
// 数据缓存管理
// ===================================

/**
 * 缓存查询结果
 * @param {string} key - 缓存键
 * @param {Object} data - 缓存数据
 * @param {number} ttl - 缓存时间（毫秒）
 */
function cacheData(key, data, ttl = 5 * 60 * 1000) { // 默认5分钟
    try {
        const cacheEntry = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
        
        const cache = getCacheData();
        cache[key] = cacheEntry;
        
        localStorage.setItem(STORAGE_KEYS.CACHE_DATA, JSON.stringify(cache));
    } catch (error) {
        console.warn('缓存数据失败:', error);
    }
}

/**
 * 获取缓存数据
 * @param {string} key - 缓存键
 * @returns {Object|null} 缓存的数据或null
 */
function getCachedData(key) {
    try {
        const cache = getCacheData();
        const entry = cache[key];
        
        if (!entry) return null;
        
        // 检查是否过期
        if (Date.now() - entry.timestamp > entry.ttl) {
            delete cache[key];
            localStorage.setItem(STORAGE_KEYS.CACHE_DATA, JSON.stringify(cache));
            return null;
        }
        
        return entry.data;
    } catch (error) {
        console.warn('获取缓存数据失败:', error);
        return null;
    }
}

/**
 * 获取所有缓存数据
 * @returns {Object} 缓存对象
 */
function getCacheData() {
    try {
        const cache = localStorage.getItem(STORAGE_KEYS.CACHE_DATA);
        return cache ? JSON.parse(cache) : {};
    } catch (error) {
        console.warn('获取缓存失败:', error);
        return {};
    }
}

/**
 * 清理过期缓存
 */
function cleanExpiredCache() {
    try {
        const cache = getCacheData();
        const now = Date.now();
        let hasExpired = false;
        
        for (const [key, entry] of Object.entries(cache)) {
            if (now - entry.timestamp > entry.ttl) {
                delete cache[key];
                hasExpired = true;
            }
        }
        
        if (hasExpired) {
            localStorage.setItem(STORAGE_KEYS.CACHE_DATA, JSON.stringify(cache));
        }
    } catch (error) {
        console.warn('清理过期缓存失败:', error);
    }
}

// ===================================
// 工具函数
// ===================================

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 复制是否成功
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const result = document.execCommand('copy');
            textArea.remove();
            return result;
        }
    } catch (error) {
        console.error('复制失败:', error);
        return false;
    }
}

/**
 * 显示提示消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (success, error, warning, info)
 * @param {number} duration - 显示时长（毫秒）
 */
function showToast(message, type = 'info', duration = 3000) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    
    // 添加样式
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '9999',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'all 0.3s ease-in-out'
    });
    
    // 设置背景色
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#2563eb'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// 导出所有函数到全局作用域（用于浏览器环境）
if (typeof window !== 'undefined') {
    window.TrackingUtils = {
        // 单号验证
        TRACKING_TYPES,
        detectTrackingType,
        validateTrackingNumber,
        validateBatchTrackingNumbers,

        // 时间格式化
        formatTimestamp,
        getRelativeTime,

        // 本地存储
        saveQueryHistory,
        getQueryHistory,
        clearQueryHistory,
        saveUserPreferences,
        getUserPreferences,

        // 新的查询历史管理
        saveToHistory: saveToHistory,
        getSimpleQueryHistory: getSimpleQueryHistory,
        clearSimpleQueryHistory: clearSimpleQueryHistory,

        // 数据缓存
        cacheData,
        getCachedData,
        cleanExpiredCache,

        // 工具函数
        generateId,
        debounce,
        throttle,
        copyToClipboard,
        showToast
    };
}

// 初始化时清理过期缓存
cleanExpiredCache();
