/**
 * PGS Tracking System - 后台管理JavaScript
 */

// 全局配置对象
let siteConfig = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    initializeColorPickers();
    initializeLogoPreview();
});

// ===================================
// 页面切换功能
// ===================================

function showSection(sectionId) {
    // 隐藏所有区域
    document.querySelectorAll('.config-section').forEach(section => {
        section.classList.add('d-none');
    });
    
    // 显示目标区域
    document.getElementById(sectionId).classList.remove('d-none');
    
    // 更新导航状态
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
    
    // 特殊处理
    if (sectionId === 'preview') {
        refreshPreview();
    } else if (sectionId === 'api-config') {
        renderCompaniesConfig();
    } else if (sectionId === 'help-config') {
        renderHelpConfig();
    } else if (sectionId === 'footer-config') {
        renderFooterConfig();
    }
}

// ===================================
// 配置加载和保存
// ===================================

async function loadConfig() {
    try {
        const response = await fetch('../config/site-config.json');
        siteConfig = await response.json();
        
        // 填充表单数据
        populateForm();
        
        console.log('配置加载成功');
    } catch (error) {
        console.error('配置加载失败:', error);
        // 使用默认配置
        siteConfig = getDefaultConfig();
        populateForm();
    }
}

function populateForm() {
    // 网站配置
    if (siteConfig.site) {
        document.getElementById('siteTitle').value = siteConfig.site.title || '';
        document.getElementById('siteSubtitle').value = siteConfig.site.subtitle || '';
        document.getElementById('siteDescription').value = siteConfig.site.description || '';
        document.getElementById('siteKeywords').value = siteConfig.site.keywords || '';
        document.getElementById('siteAuthor').value = siteConfig.site.author || '';
    }
    
    // 品牌配置
    if (siteConfig.branding) {
        document.getElementById('logoUrl').value = siteConfig.branding.logoUrl || '';
        document.getElementById('faviconUrl').value = siteConfig.branding.faviconUrl || '';
        document.getElementById('primaryColor').value = siteConfig.branding.primaryColor || '#2563eb';
        document.getElementById('primaryColorText').value = siteConfig.branding.primaryColor || '#2563eb';
        document.getElementById('secondaryColor').value = siteConfig.branding.secondaryColor || '#10b981';
        document.getElementById('secondaryColorText').value = siteConfig.branding.secondaryColor || '#10b981';
        document.getElementById('companyName').value = siteConfig.branding.companyName || '';
        document.getElementById('companyFullName').value = siteConfig.branding.companyFullName || '';
    }

    // 页脚配置
    if (siteConfig.footer) {
        const footerCopyright = document.getElementById('footerCopyright');
        const supportEmail = document.getElementById('supportEmail');
        const supportPhone = document.getElementById('supportPhone');

        if (footerCopyright) footerCopyright.value = siteConfig.footer.copyright || '';
        if (supportEmail) supportEmail.value = siteConfig.footer.supportEmail || '';
        if (supportPhone) supportPhone.value = siteConfig.footer.supportPhone || '';
    }
}

function getDefaultConfig() {
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
            additionalInfo: "技术支持: support@pgs.com | 服务热线: 400-123-4567"
        },
        help: {
            supportedFormats: [
                { name: "JobNum", description: "作业单号", example: "KD2412002091" },
                { name: "PO号", description: "采购订单号", example: "BESH2412170032" },
                { name: "跟踪号", description: "物流跟踪号", example: "43005822480" }
            ],
            features: [
                "自动识别单号类型，无需手动选择",
                "支持多个单号同时查询，最多50个",
                "多公司API汇聚查询，提高成功率"
            ],
            tips: [
                "可以直接粘贴Excel中的单号列表",
                "支持中英文标点符号分隔",
                "自动去除重复单号"
            ]
        }
    };
}

// ===================================
// 网站配置保存
// ===================================

function saveSiteConfig() {
    siteConfig.site = {
        title: document.getElementById('siteTitle').value,
        subtitle: document.getElementById('siteSubtitle').value,
        description: document.getElementById('siteDescription').value,
        keywords: document.getElementById('siteKeywords').value,
        author: document.getElementById('siteAuthor').value,
        version: siteConfig.site?.version || "1.0.0"
    };
    
    showToast('网站配置已保存', 'success');
    console.log('网站配置已更新:', siteConfig.site);
}

function resetSiteConfig() {
    if (confirm('确定要重置网站配置吗？')) {
        const defaultConfig = getDefaultConfig();
        siteConfig.site = defaultConfig.site;
        populateForm();
        showToast('网站配置已重置', 'info');
    }
}

// ===================================
// 品牌设置保存
// ===================================

function saveBrandingConfig() {
    siteConfig.branding = {
        logoUrl: document.getElementById('logoUrl').value,
        faviconUrl: document.getElementById('faviconUrl').value,
        primaryColor: document.getElementById('primaryColor').value,
        secondaryColor: document.getElementById('secondaryColor').value,
        companyName: document.getElementById('companyName').value,
        companyFullName: document.getElementById('companyFullName').value
    };
    
    showToast('品牌设置已保存', 'success');
    console.log('品牌设置已更新:', siteConfig.branding);
}

function resetBrandingConfig() {
    if (confirm('确定要重置品牌设置吗？')) {
        const defaultConfig = getDefaultConfig();
        siteConfig.branding = defaultConfig.branding;
        populateForm();
        showToast('品牌设置已重置', 'info');
    }
}

// ===================================
// 颜色选择器初始化
// ===================================

function initializeColorPickers() {
    // 主色调
    const primaryColor = document.getElementById('primaryColor');
    const primaryColorText = document.getElementById('primaryColorText');
    
    primaryColor.addEventListener('change', function() {
        primaryColorText.value = this.value;
    });
    
    primaryColorText.addEventListener('change', function() {
        if (/^#[0-9A-F]{6}$/i.test(this.value)) {
            primaryColor.value = this.value;
        }
    });
    
    // 辅助色
    const secondaryColor = document.getElementById('secondaryColor');
    const secondaryColorText = document.getElementById('secondaryColorText');
    
    secondaryColor.addEventListener('change', function() {
        secondaryColorText.value = this.value;
    });
    
    secondaryColorText.addEventListener('change', function() {
        if (/^#[0-9A-F]{6}$/i.test(this.value)) {
            secondaryColor.value = this.value;
        }
    });
}

// ===================================
// Logo预览功能
// ===================================

function initializeLogoPreview() {
    const logoUrl = document.getElementById('logoUrl');
    const logoPreview = document.getElementById('logoPreview');
    
    logoUrl.addEventListener('change', function() {
        const url = this.value;
        if (url) {
            // 处理相对路径
            const fullUrl = url.startsWith('http') ? url : `../${url}`;
            logoPreview.src = fullUrl;
            logoPreview.onerror = function() {
                this.src = '../assets/logo.svg';
                showToast('Logo加载失败，请检查URL', 'warning');
            };
        }
    });
}

// ===================================
// API配置管理
// ===================================

function renderCompaniesConfig() {
    const container = document.getElementById('companiesConfig');
    const companies = siteConfig.api?.companies || [];
    
    let html = '';
    companies.forEach((company, index) => {
        html += `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">公司 ${index + 1}</h6>
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeCompany(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">公司名称</label>
                            <input type="text" class="form-control" value="${company.name}" onchange="updateCompany(${index}, 'name', this.value)">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">优先级</label>
                            <input type="number" class="form-control" value="${company.priority}" onchange="updateCompany(${index}, 'priority', parseInt(this.value))">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">状态</label>
                            <select class="form-select" onchange="updateCompany(${index}, 'enabled', this.value === 'true')">
                                <option value="true" ${company.enabled ? 'selected' : ''}>启用</option>
                                <option value="false" ${!company.enabled ? 'selected' : ''}>禁用</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function addCompany() {
    if (!siteConfig.api) siteConfig.api = {};
    if (!siteConfig.api.companies) siteConfig.api.companies = [];
    
    const newCompany = {
        id: `company${siteConfig.api.companies.length + 1}`,
        name: `分公司${siteConfig.api.companies.length + 1}`,
        priority: siteConfig.api.companies.length + 1,
        enabled: true
    };
    
    siteConfig.api.companies.push(newCompany);
    renderCompaniesConfig();
    showToast('公司已添加', 'success');
}

function removeCompany(index) {
    if (confirm('确定要删除这个公司配置吗？')) {
        siteConfig.api.companies.splice(index, 1);
        renderCompaniesConfig();
        showToast('公司已删除', 'info');
    }
}

function updateCompany(index, field, value) {
    if (siteConfig.api && siteConfig.api.companies && siteConfig.api.companies[index]) {
        siteConfig.api.companies[index][field] = value;
    }
}

function saveAPIConfig() {
    showToast('API配置已保存', 'success');
    console.log('API配置已更新:', siteConfig.api);
}

// ===================================
// 帮助信息配置
// ===================================

function renderHelpConfig() {
    renderSupportedFormats();
    renderFeatures();
    renderTips();
}

function renderSupportedFormats() {
    const container = document.getElementById('supportedFormats');
    const formats = siteConfig.help?.supportedFormats || [];
    
    let html = '';
    formats.forEach((format, index) => {
        html += `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <input type="text" class="form-control" placeholder="格式名称" value="${format.name}" onchange="updateFormat(${index}, 'name', this.value)">
                        </div>
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="描述" value="${format.description}" onchange="updateFormat(${index}, 'description', this.value)">
                        </div>
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="示例" value="${format.example}" onchange="updateFormat(${index}, 'example', this.value)">
                        </div>
                        <div class="col-md-1">
                            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeFormat(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function addFormat() {
    if (!siteConfig.help) siteConfig.help = {};
    if (!siteConfig.help.supportedFormats) siteConfig.help.supportedFormats = [];
    
    siteConfig.help.supportedFormats.push({
        name: "新格式",
        description: "格式描述",
        example: "示例"
    });
    
    renderSupportedFormats();
}

function removeFormat(index) {
    siteConfig.help.supportedFormats.splice(index, 1);
    renderSupportedFormats();
}

function updateFormat(index, field, value) {
    if (siteConfig.help && siteConfig.help.supportedFormats && siteConfig.help.supportedFormats[index]) {
        siteConfig.help.supportedFormats[index][field] = value;
    }
}

// 类似的功能特性和使用技巧函数...
function renderFeatures() {
    const container = document.getElementById('features');
    const features = siteConfig.help?.features || [];
    
    let html = '';
    features.forEach((feature, index) => {
        html += `
            <div class="input-group mb-2">
                <input type="text" class="form-control" value="${feature}" onchange="updateFeature(${index}, this.value)">
                <button type="button" class="btn btn-outline-danger" onclick="removeFeature(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function addFeature() {
    if (!siteConfig.help) siteConfig.help = {};
    if (!siteConfig.help.features) siteConfig.help.features = [];
    
    siteConfig.help.features.push("新功能特性");
    renderFeatures();
}

function removeFeature(index) {
    siteConfig.help.features.splice(index, 1);
    renderFeatures();
}

function updateFeature(index, value) {
    if (siteConfig.help && siteConfig.help.features && siteConfig.help.features[index] !== undefined) {
        siteConfig.help.features[index] = value;
    }
}

function renderTips() {
    const container = document.getElementById('tips');
    const tips = siteConfig.help?.tips || [];
    
    let html = '';
    tips.forEach((tip, index) => {
        html += `
            <div class="input-group mb-2">
                <input type="text" class="form-control" value="${tip}" onchange="updateTip(${index}, this.value)">
                <button type="button" class="btn btn-outline-danger" onclick="removeTip(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function addTip() {
    if (!siteConfig.help) siteConfig.help = {};
    if (!siteConfig.help.tips) siteConfig.help.tips = [];
    
    siteConfig.help.tips.push("新使用技巧");
    renderTips();
}

function removeTip(index) {
    siteConfig.help.tips.splice(index, 1);
    renderTips();
}

function updateTip(index, value) {
    if (siteConfig.help && siteConfig.help.tips && siteConfig.help.tips[index] !== undefined) {
        siteConfig.help.tips[index] = value;
    }
}

function saveHelpConfig() {
    showToast('帮助信息已保存', 'success');
    console.log('帮助信息已更新:', siteConfig.help);
}

function resetHelpConfig() {
    if (confirm('确定要重置帮助信息吗？')) {
        const defaultConfig = getDefaultConfig();
        siteConfig.help = defaultConfig.help;
        renderHelpConfig();
        showToast('帮助信息已重置', 'info');
    }
}

// ===================================
// 预览和导出功能
// ===================================

function refreshPreview() {
    const preview = document.getElementById('configPreview');
    preview.textContent = JSON.stringify(siteConfig, null, 2);
}

function downloadConfig() {
    const configJson = JSON.stringify(siteConfig, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site-config.json';
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('配置文件已下载', 'success');
}

function applyConfig() {
    // 这里可以实现配置应用逻辑
    // 在实际部署中，需要将配置保存到服务器或更新静态文件
    showToast('配置已应用（需要重新部署生效）', 'info');
    console.log('应用配置:', siteConfig);
}

// ===================================
// 工具函数
// ===================================

// ===================================
// 页脚配置管理
// ===================================

function renderFooterConfig() {
    renderFooterLinks();
}

function renderFooterLinks() {
    const container = document.getElementById('footerLinks');
    const links = siteConfig.footer?.links || [];

    let html = '';
    links.forEach((link, index) => {
        html += `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="链接文字" value="${link.text}" onchange="updateFooterLink(${index}, 'text', this.value)">
                        </div>
                        <div class="col-md-6">
                            <input type="text" class="form-control" placeholder="链接地址" value="${link.url}" onchange="updateFooterLink(${index}, 'url', this.value)">
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="removeFooterLink(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function addFooterLink() {
    if (!siteConfig.footer) siteConfig.footer = {};
    if (!siteConfig.footer.links) siteConfig.footer.links = [];

    siteConfig.footer.links.push({
        text: "新链接",
        url: "#",
        target: "_self"
    });

    renderFooterLinks();
}

function removeFooterLink(index) {
    if (siteConfig.footer && siteConfig.footer.links) {
        siteConfig.footer.links.splice(index, 1);
        renderFooterLinks();
    }
}

function updateFooterLink(index, field, value) {
    if (siteConfig.footer && siteConfig.footer.links && siteConfig.footer.links[index]) {
        siteConfig.footer.links[index][field] = value;
    }
}

function saveFooterConfig() {
    siteConfig.footer = {
        ...siteConfig.footer,
        copyright: document.getElementById('footerCopyright').value,
        supportEmail: document.getElementById('supportEmail').value,
        supportPhone: document.getElementById('supportPhone').value,
        additionalInfo: `技术支持: ${document.getElementById('supportEmail').value} | 服务热线: ${document.getElementById('supportPhone').value}`
    };

    showToast('页脚配置已保存', 'success');
    console.log('页脚配置已更新:', siteConfig.footer);
}

function resetFooterConfig() {
    if (confirm('确定要重置页脚配置吗？')) {
        const defaultConfig = getDefaultConfig();
        siteConfig.footer = defaultConfig.footer;
        populateForm();
        renderFooterConfig();
        showToast('页脚配置已重置', 'info');
    }
}

function showToast(message, type = 'info') {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'} position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        ${message}
    `;

    document.body.appendChild(toast);

    // 3秒后自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}
