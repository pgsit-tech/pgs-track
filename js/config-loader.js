/**
 * PGS Tracking System - 配置加载器
 * 动态加载配置文件并应用到页面
 */

// 调试模式开关
const CONFIG_DEBUG_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 配置调试日志函数
const configDebugLog = CONFIG_DEBUG_MODE ? console.log : () => {};
const configDebugWarn = console.warn;
const configDebugError = console.error;

// 全局配置对象
window.SITE_CONFIG = {};

/**
 * 加载站点配置
 */
async function loadSiteConfig() {
    try {
        configDebugLog('🔧 加载站点配置...');

        // 1. 首先尝试从Workers代理获取配置（添加缓存破坏参数）
        try {
            const kvResponse = await fetch(`https://pgs-tracking-proxy.itsupport-5c8.workers.dev/config/site?t=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Origin': window.location.origin,
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (kvResponse.ok) {
                const kvData = await kvResponse.json();
                if (kvData.siteConfig) {
                    window.SITE_CONFIG = kvData.siteConfig;
                    configDebugLog('✅ 从KV存储加载配置成功:', window.SITE_CONFIG);
                    applySiteConfig();
                    return;
                }
            }
        } catch (kvError) {
            configDebugWarn('⚠️ KV存储配置获取失败，尝试其他方式:', kvError);
        }

        // 2. 检查是否有管理端保存的配置（回退方案）
        const adminConfig = localStorage.getItem('pgs_admin_config');
        if (adminConfig) {
            try {
                window.SITE_CONFIG = JSON.parse(adminConfig);
                configDebugLog('✅ 使用管理端本地配置:', window.SITE_CONFIG);
                applySiteConfig();
                return;
            } catch (error) {
                configDebugWarn('⚠️ 管理端配置解析失败，尝试加载文件配置:', error);
            }
        }

        // 3. 加载默认配置文件（最后回退）
        const response = await fetch('config/site-config.json');
        if (!response.ok) {
            throw new Error(`配置文件加载失败: ${response.status}`);
        }

        window.SITE_CONFIG = await response.json();
        configDebugLog('✅ 站点配置文件加载成功:', window.SITE_CONFIG);

        // 应用配置到页面
        applySiteConfig();

    } catch (error) {
        configDebugWarn('⚠️ 所有配置加载方式都失败，使用默认配置:', error);

        // 使用默认配置
        window.SITE_CONFIG = getDefaultSiteConfig();
        applySiteConfig();
    }
}

/**
 * 获取默认配置
 */
function getDefaultSiteConfig() {
    return {
        site: {
            title: "PGS Tracking System",
            subtitle: "专业的物流轨迹查询平台",
            description: "PGS专业物流轨迹查询系统，支持多种单号格式查询",
            keywords: "物流查询,轨迹查询,PGS,快递查询",
            author: "PGS Team",
            version: "1.0.0"
        },
        branding: {
            logoUrl: "assets/logo.svg",
            faviconUrl: "assets/favicon.svg",
            primaryColor: "#2563eb",
            secondaryColor: "#10b981",
            companyName: "PGS",
            companyFullName: "PGS 物流科技有限公司"
        },
        footer: {
            copyright: "© 2025 PGS 物流科技有限公司. 保留所有权利.",
            links: [
                { text: "使用条款", url: "#" },
                { text: "隐私政策", url: "#" },
                { text: "联系我们", url: "mailto:support@pgs.com" }
            ],
            additionalInfo: "技术支持: support@pgs.com | 服务热线: 400-123-4567"
        },
        help: {
            supportedFormats: [
                { name: "JobNum", description: "作业单号", example: "KD2412002091" },
                { name: "PO号", description: "采购订单号", example: "BESH2412170032" },
                { name: "跟踪号", description: "物流跟踪号", example: "43005822480" },
                { name: "Reference ID", description: "参考编号", example: "REF123456789" },
                { name: "Shipment ID", description: "货运编号", example: "SHP-2024-001" }
            ],
            features: [
                "自动识别单号类型，无需手动选择",
                "支持多个单号同时查询，最多50个",
                "多公司API汇聚查询，提高成功率",
                "实时轨迹信息，5分钟智能缓存",
                "支持多种分隔符：换行、逗号、分号",
                "查询结果支持导出CSV格式"
            ],
            tips: [
                "可以直接粘贴Excel中的单号列表",
                "支持中英文标点符号分隔",
                "自动去除重复单号",
                "查询失败时会自动重试"
            ]
        },
        api: {
            companies: [
                { id: "company1", name: "总公司", priority: 1, enabled: true },
                { id: "company2", name: "分公司A", priority: 2, enabled: true },
                { id: "company3", name: "分公司B", priority: 3, enabled: true }
            ]
        }
    };
}

/**
 * 应用配置到页面
 */
function applySiteConfig() {
    const config = window.SITE_CONFIG;
    
    // 更新页面标题和meta信息
    updatePageMeta(config.site);
    
    // 更新品牌元素
    updateBranding(config.branding);
    
    // 更新页脚信息
    updateFooter(config.footer);
    
    // 更新CSS变量
    updateCSSVariables(config.branding);
    
    configDebugLog('✅ 站点配置已应用到页面');
}

/**
 * 更新页面meta信息
 */
function updatePageMeta(siteConfig) {
    if (!siteConfig) return;
    
    // 更新标题
    if (siteConfig.title) {
        document.title = siteConfig.title;
        
        // 更新导航栏标题
        const navbarBrand = document.querySelector('.navbar-brand');
        if (navbarBrand) {
            const titleElement = navbarBrand.querySelector('.ms-2');
            if (titleElement) {
                titleElement.textContent = siteConfig.title;
                configDebugLog('✅ 导航栏标题已更新为:', siteConfig.title);
            } else {
                configDebugWarn('❌ 未找到导航栏标题元素 (.ms-2)');
            }
        } else {
            configDebugWarn('❌ 未找到导航栏品牌元素 (.navbar-brand)');
        }
    }
    
    // 更新meta标签
    updateMetaTag('description', siteConfig.description);
    updateMetaTag('keywords', siteConfig.keywords);
    updateMetaTag('author', siteConfig.author);
    
    // 更新Hero区域
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle && siteConfig.title) {
        heroTitle.textContent = siteConfig.title;
    }
    
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle && siteConfig.subtitle) {
        heroSubtitle.textContent = siteConfig.subtitle;
    }
}

/**
 * 更新meta标签
 */
function updateMetaTag(name, content) {
    if (!content) return;
    
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
    }
    meta.content = content;
}

/**
 * 更新品牌元素
 */
function updateBranding(brandingConfig) {
    if (!brandingConfig) return;
    
    // 更新Logo
    if (brandingConfig.logoUrl) {
        const logos = document.querySelectorAll('.navbar-brand img, .hero-logo');
        logos.forEach(logo => {
            logo.src = brandingConfig.logoUrl;
            logo.onerror = function() {
                this.src = 'assets/logo.svg'; // 回退到默认logo
            };
        });
    }
    
    // 更新Favicon
    if (brandingConfig.faviconUrl) {
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = brandingConfig.faviconUrl;
    }
    
    // 更新公司名称
    if (brandingConfig.companyName) {
        const companyElements = document.querySelectorAll('.company-name');
        companyElements.forEach(element => {
            element.textContent = brandingConfig.companyName;
        });
    }
}

/**
 * 更新页脚信息
 */
function updateFooter(footerConfig) {
    if (!footerConfig) return;
    
    // 更新版权信息
    if (footerConfig.copyright) {
        const copyrightElement = document.querySelector('.footer-copyright');
        if (copyrightElement) {
            copyrightElement.textContent = footerConfig.copyright;
        }
    }
    
    // 更新附加信息
    if (footerConfig.additionalInfo) {
        const additionalInfoElement = document.querySelector('.footer-additional-info');
        if (additionalInfoElement) {
            additionalInfoElement.textContent = footerConfig.additionalInfo;
        }
    }
    
    // 更新链接
    if (footerConfig.links && Array.isArray(footerConfig.links)) {
        const linksContainer = document.querySelector('.footer-links');
        if (linksContainer) {
            let linksHtml = '';
            footerConfig.links.forEach((link, index) => {
                if (index > 0) linksHtml += ' | ';
                linksHtml += `<a href="${link.url}" class="text-muted">${link.text}</a>`;
            });
            linksContainer.innerHTML = linksHtml;
        }
    }
}

/**
 * 更新CSS变量
 */
function updateCSSVariables(brandingConfig) {
    if (!brandingConfig) return;
    
    const root = document.documentElement;
    
    if (brandingConfig.primaryColor) {
        root.style.setProperty('--primary-color', brandingConfig.primaryColor);
        root.style.setProperty('--bs-primary', brandingConfig.primaryColor);
    }
    
    if (brandingConfig.secondaryColor) {
        root.style.setProperty('--secondary-color', brandingConfig.secondaryColor);
        root.style.setProperty('--success-color', brandingConfig.secondaryColor);
    }
}

/**
 * 更新帮助信息
 */
function updateHelpContent() {
    const helpConfig = window.SITE_CONFIG?.help;
    if (!helpConfig) return;
    
    // 这个函数会在showHelp()中调用，动态生成帮助内容
    return helpConfig;
}

/**
 * 获取API公司配置
 */
function getAPICompanies() {
    return window.SITE_CONFIG?.api?.companies || [];
}

// 页面加载时自动加载配置
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteConfig);
} else {
    loadSiteConfig();
}

// 导出函数供其他模块使用
window.ConfigLoader = {
    loadSiteConfig,
    applySiteConfig,
    updateHelpContent,
    getAPICompanies
};
