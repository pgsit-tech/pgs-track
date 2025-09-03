/**
 * PGS Tracking System - 生产环境配置
 * 此文件包含生产环境的特定配置
 */

// 生产环境Workers代理URL
window.WORKERS_PROXY_URL = 'https://track-api.20990909.xyz/api/au-ops';

// 生产环境配置
window.PRODUCTION_CONFIG = {
    // API配置
    api: {
        baseUrl: 'https://track-api.20990909.xyz/api/au-ops',
        timeout: 30000,
        retryAttempts: 3
    },
    
    // 功能开关
    features: {
        batchQuery: true,
        multiCompany: false, // 🚫 屏蔽多公司API查询，只使用官网API
        exportData: true,
        queryHistory: true,
        realTimeUpdates: true
    },
    
    // 性能配置
    performance: {
        cacheEnabled: true,
        cacheDuration: 300000, // 5分钟
        maxConcurrentRequests: 10
    },
    
    // 安全配置
    security: {
        corsEnabled: true,
        allowedOrigins: [
            'https://pgs-track.pages.dev',
            'https://localhost:8080'
        ]
    },
    
    // 监控配置
    monitoring: {
        enabled: true,
        errorReporting: true,
        performanceTracking: true
    }
};

// 应用生产配置
if (typeof window !== 'undefined') {
    // 合并到全局配置
    window.SITE_CONFIG = window.SITE_CONFIG || {};
    Object.assign(window.SITE_CONFIG, window.PRODUCTION_CONFIG);

    // 🔇 生产环境不显示配置加载日志
    // console.log('✅ 生产环境配置已加载');
    // console.log('🔗 Workers代理URL:', window.WORKERS_PROXY_URL);
}
