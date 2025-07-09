/**
 * PGS Tracking System - 主应用逻辑
 * 处理用户交互和页面状态管理
 */

// ===================================
// 应用状态管理
// ===================================

/**
 * 应用状态对象
 */
const AppState = {
    currentQuery: null,
    isLoading: false,
    currentResults: null,
    isMultiQuery: false,
    queryCount: 0
};

/**
 * DOM元素引用
 */
const Elements = {
    // 表单元素
    searchForm: null,
    searchInput: null,
    searchBtn: null,

    // 快速搜索按钮
    quickSearchBtns: null,

    // 结果显示区域
    loadingSection: null,
    resultsSection: null,
    errorSection: null,
    resultsContent: null,

    // 结果信息
    resultJobNum: null,
    resultApiVersion: null,
    resultTimestamp: null,

    // 操作按钮
    exportBtn: null,
    shareBtn: null,
    retryBtn: null,

    // 错误信息
    errorMessage: null
};

// ===================================
// 应用初始化
// ===================================

/**
 * 初始化应用
 */
function initializeApp() {
    console.log('🚀 AU-OPS 轨迹查询系统初始化');
    
    // 获取DOM元素引用
    initializeElements();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 加载用户偏好设置
    loadUserPreferences();
    
    // 加载查询历史
    loadQueryHistory();
    
    // 初始化完成
    console.log('✅ 应用初始化完成');
    TrackingUtils.showToast('应用初始化完成', 'success', 2000);
}

/**
 * 初始化DOM元素引用
 */
function initializeElements() {
    // 表单元素
    Elements.searchForm = document.getElementById('searchForm');
    Elements.searchInput = document.getElementById('searchInput');
    Elements.searchBtn = document.getElementById('searchBtn');

    // 快速搜索按钮
    Elements.quickSearchBtns = document.querySelectorAll('.quick-search');

    // 结果显示区域
    Elements.loadingSection = document.getElementById('loadingSection');
    Elements.resultsSection = document.getElementById('resultsSection');
    Elements.errorSection = document.getElementById('errorSection');
    Elements.resultsContent = document.getElementById('resultsContent');

    // 结果信息
    Elements.resultJobNum = document.getElementById('resultJobNum');
    Elements.resultApiVersion = document.getElementById('resultApiVersion');
    Elements.resultTimestamp = document.getElementById('resultTimestamp');

    // 操作按钮
    Elements.exportBtn = document.getElementById('exportBtn');
    Elements.shareBtn = document.getElementById('shareBtn');
    Elements.retryBtn = document.getElementById('retryBtn');

    // 错误信息
    Elements.errorMessage = document.getElementById('errorMessage');

    console.log('📋 DOM元素引用初始化完成');
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 搜索表单提交
    if (Elements.searchForm) {
        Elements.searchForm.addEventListener('submit', handleSearchSubmit);
    }

    // 搜索输入框变化
    if (Elements.searchInput) {
        Elements.searchInput.addEventListener('input', TrackingUtils.debounce(handleSearchInputChange, 300));
        Elements.searchInput.addEventListener('keypress', handleSearchKeyPress);
    }

    // 快速搜索按钮
    Elements.quickSearchBtns.forEach(btn => {
        btn.addEventListener('click', handleQuickSearch);
    });

    // 操作按钮
    if (Elements.exportBtn) {
        Elements.exportBtn.addEventListener('click', handleExport);
    }

    if (Elements.shareBtn) {
        Elements.shareBtn.addEventListener('click', handleShare);
    }

    if (Elements.retryBtn) {
        Elements.retryBtn.addEventListener('click', handleRetry);
    }

    console.log('🔗 事件监听器绑定完成');
}

// ===================================
// 事件处理函数
// ===================================

/**
 * 处理搜索表单提交
 * @param {Event} event - 表单提交事件
 */
async function handleSearchSubmit(event) {
    event.preventDefault();

    const searchValue = Elements.searchInput.value.trim();

    if (!searchValue) {
        TrackingUtils.showToast('请输入要查询的单号', 'warning');
        Elements.searchInput.focus();
        return;
    }

    // 检查是否为多单号输入
    const trackingNumbers = parseMultipleTrackingNumbers(searchValue);

    if (trackingNumbers.length === 1) {
        // 单个单号查询
        const validation = TrackingUtils.validateTrackingNumber(trackingNumbers[0]);
        if (!validation.isValid) {
            TrackingUtils.showToast(validation.message, 'error');
            Elements.searchInput.focus();
            return;
        }

        await performSingleSearch(validation.cleanNumber, validation.type);
    } else if (trackingNumbers.length > 1) {
        // 多单号查询
        if (trackingNumbers.length > 50) {
            TrackingUtils.showToast('最多支持50个单号同时查询', 'error');
            return;
        }

        await performMultiSearch(trackingNumbers);
    } else {
        TrackingUtils.showToast('没有找到有效的单号', 'error');
        Elements.searchInput.focus();
    }
}

/**
 * 处理搜索输入框变化
 * @param {Event} event - 输入事件
 */
function handleSearchInputChange(event) {
    const value = event.target.value.trim();
    
    if (value.length > 0) {
        // 自动检测单号类型
        const detectedType = TrackingUtils.detectTrackingType(value);
        if (detectedType !== TrackingUtils.TRACKING_TYPES.AUTO && Elements.searchType.value === 'auto') {
            // 可以选择是否自动更新选择框
            // Elements.searchType.value = detectedType;
        }
        
        // 实时验证
        const validation = TrackingUtils.validateTrackingNumber(value);
        updateInputValidation(validation);
    } else {
        clearInputValidation();
    }
}

/**
 * 处理搜索按键事件
 * @param {Event} event - 按键事件
 */
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        Elements.searchForm.dispatchEvent(new Event('submit'));
    }
}

/**
 * 处理搜索类型变化
 * @param {Event} event - 选择变化事件
 */
function handleSearchTypeChange(event) {
    const selectedType = event.target.value;
    const currentValue = Elements.searchInput.value.trim();
    
    if (currentValue) {
        // 重新验证当前输入
        const validation = TrackingUtils.validateTrackingNumber(currentValue, selectedType);
        updateInputValidation(validation);
    }
    
    // 更新输入框提示文本
    updateInputPlaceholder(selectedType);
}

/**
 * 处理快速搜索
 * @param {Event} event - 点击事件
 */
async function handleQuickSearch(event) {
    event.preventDefault();
    
    const searchValue = event.target.getAttribute('data-value');
    if (!searchValue) return;
    
    // 设置输入框值
    Elements.searchInput.value = searchValue;
    
    // 自动检测类型
    const detectedType = TrackingUtils.detectTrackingType(searchValue);
    if (detectedType !== TrackingUtils.TRACKING_TYPES.AUTO) {
        Elements.searchType.value = detectedType;
    }
    
    // 执行查询
    await performSearch(searchValue, detectedType);
}

/**
 * 处理公司选择
 * @param {Event} event - 点击事件
 */
function handleCompanySelect(event) {
    event.preventDefault();
    
    const companyId = event.target.getAttribute('data-company');
    if (!companyId) return;
    
    AppState.selectedCompany = companyId;
    
    // 更新UI显示
    const companyConfig = TrackingAPI.COMPANY_CONFIGS[companyId];
    if (companyConfig) {
        const dropdownText = Elements.companyDropdown.querySelector('.nav-link');
        if (dropdownText) {
            dropdownText.innerHTML = `<i class="fas fa-building me-1"></i>${companyConfig.name}`;
        }
    }
    
    // 保存用户偏好
    TrackingUtils.saveUserPreferences({ selectedCompany: companyId });
    
    TrackingUtils.showToast(`已切换到${companyConfig.name}`, 'success');
}

/**
 * 处理导出功能
 * @param {Event} event - 点击事件
 */
function handleExport(event) {
    event.preventDefault();
    
    if (!AppState.currentResults) {
        TrackingUtils.showToast('没有可导出的数据', 'warning');
        return;
    }
    
    try {
        exportResults(AppState.currentResults);
        TrackingUtils.showToast('导出成功', 'success');
    } catch (error) {
        console.error('导出失败:', error);
        TrackingUtils.showToast('导出失败', 'error');
    }
}

/**
 * 处理分享功能
 * @param {Event} event - 点击事件
 */
async function handleShare(event) {
    event.preventDefault();
    
    if (!AppState.currentQuery) {
        TrackingUtils.showToast('没有可分享的查询', 'warning');
        return;
    }
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(AppState.currentQuery)}`;
    
    try {
        const success = await TrackingUtils.copyToClipboard(shareUrl);
        if (success) {
            TrackingUtils.showToast('分享链接已复制到剪贴板', 'success');
        } else {
            TrackingUtils.showToast('复制失败，请手动复制链接', 'error');
        }
    } catch (error) {
        console.error('分享失败:', error);
        TrackingUtils.showToast('分享失败', 'error');
    }
}

/**
 * 处理重试功能
 * @param {Event} event - 点击事件
 */
async function handleRetry(event) {
    event.preventDefault();
    
    if (!AppState.currentQuery) {
        TrackingUtils.showToast('没有可重试的查询', 'warning');
        return;
    }
    
    // 重新执行上次查询
    const detectedType = TrackingUtils.detectTrackingType(AppState.currentQuery);
    await performSearch(AppState.currentQuery, detectedType);
}

// ===================================
// 工具函数
// ===================================

/**
 * 解析多个单号输入
 * @param {string} input - 输入文本
 * @returns {Array<string>} 单号数组
 */
function parseMultipleTrackingNumbers(input) {
    if (!input || typeof input !== 'string') {
        return [];
    }

    // 分割单号（支持换行、逗号、分号分隔）
    const numbers = input
        .split(/[\n,;，；\s]+/)
        .map(num => num.trim())
        .filter(num => num.length > 0);

    // 去重
    return [...new Set(numbers)];
}

// ===================================
// 核心查询功能
// ===================================

/**
 * 执行单个单号查询
 * @param {string} trackingNumber - 查询单号
 * @param {string} trackingType - 单号类型
 */
async function performSingleSearch(trackingNumber, trackingType) {
    if (AppState.isLoading) {
        TrackingUtils.showToast('查询进行中，请稍候...', 'info');
        return;
    }

    try {
        // 更新应用状态
        AppState.isLoading = true;
        AppState.currentQuery = trackingNumber;
        AppState.isMultiQuery = false;
        AppState.queryCount = 1;

        // 显示加载状态
        showLoadingState();

        console.log(`🔍 开始单号查询: ${trackingNumber} (类型: ${trackingType})`);

        // 调用多公司API汇聚查询
        const result = await TrackingAPI.queryTrackingInfoFromAllCompanies(trackingNumber);

        // 格式化结果数据
        const formattedData = TrackingAPI.formatTrackingData(
            result.primaryResult.data,
            result.primaryResult.apiVersion
        );

        // 显示查询结果
        showSingleSearchResults({
            trackingNumber,
            trackingType,
            result: result.primaryResult,
            formattedData: formattedData,
            summary: result.summary
        });

        console.log('✅ 单号查询成功');

    } catch (error) {
        console.error('❌ 单号查询失败:', error);
        showErrorState(error.message);

    } finally {
        AppState.isLoading = false;
    }
}

/**
 * 执行多单号查询
 * @param {Array<string>} trackingNumbers - 单号数组
 */
async function performMultiSearch(trackingNumbers) {
    if (AppState.isLoading) {
        TrackingUtils.showToast('查询进行中，请稍候...', 'info');
        return;
    }

    try {
        // 更新应用状态
        AppState.isLoading = true;
        AppState.currentQuery = trackingNumbers.join(', ');
        AppState.isMultiQuery = true;
        AppState.queryCount = trackingNumbers.length;

        // 显示加载状态
        showLoadingState();

        console.log(`🔍 开始多单号查询: ${trackingNumbers.length} 个单号`);

        // 验证所有单号
        const validationResults = trackingNumbers.map(num => {
            const validation = TrackingUtils.validateTrackingNumber(num);
            return {
                originalNumber: num,
                ...validation
            };
        });

        // 获取有效单号
        const validNumbers = validationResults
            .filter(r => r.isValid)
            .map(r => r.cleanNumber);

        if (validNumbers.length === 0) {
            throw new Error('没有有效的单号可以查询');
        }

        // 调用批量查询API
        const results = await TrackingAPI.queryBatchTrackingInfo(
            validNumbers,
            updateMultiSearchProgress
        );

        // 显示多单号查询结果
        showMultiSearchResults({
            originalNumbers: trackingNumbers,
            validationResults: validationResults,
            queryResults: results
        });

        console.log('✅ 多单号查询完成');

    } catch (error) {
        console.error('❌ 多单号查询失败:', error);
        showErrorState(error.message);

    } finally {
        AppState.isLoading = false;
    }
}

// ===================================
// UI状态管理
// ===================================

/**
 * 显示加载状态
 */
function showLoadingState() {
    hideAllSections();
    Elements.loadingSection.classList.remove('d-none');
    Elements.loadingSection.classList.add('fade-in');
    
    // 禁用搜索按钮
    if (Elements.searchBtn) {
        Elements.searchBtn.disabled = true;
        Elements.searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>查询中...';
    }
}

/**
 * 显示单号查询结果
 * @param {Object} data - 查询数据
 */
function showSingleSearchResults(data) {
    hideAllSections();

    // 更新应用状态
    AppState.currentResults = data;

    // 更新结果信息
    if (Elements.resultJobNum) {
        Elements.resultJobNum.textContent = `单号: ${data.trackingNumber}`;
    }

    if (Elements.resultApiVersion) {
        Elements.resultApiVersion.textContent = `来源: ${data.result.companyName} (${data.result.apiVersion})`;
    }

    if (Elements.resultTimestamp) {
        Elements.resultTimestamp.textContent = `查询时间: ${TrackingUtils.formatTimestamp(data.result.timestamp, 'datetime')}`;
    }

    // 渲染轨迹时间线
    renderTrackingTimeline(data.formattedData);

    // 显示结果区域
    Elements.resultsSection.classList.remove('d-none');
    Elements.resultsSection.classList.add('fade-in');

    // 恢复搜索按钮
    resetSearchButton();
}

/**
 * 显示多单号查询结果
 * @param {Object} data - 查询数据
 */
function showMultiSearchResults(data) {
    hideAllSections();

    // 更新应用状态
    AppState.currentResults = data;

    const successCount = data.queryResults.filter(r => r.success).length;
    const totalCount = data.queryResults.length;

    // 更新结果信息
    if (Elements.resultJobNum) {
        Elements.resultJobNum.textContent = `批量查询: ${totalCount} 个单号`;
    }

    if (Elements.resultApiVersion) {
        Elements.resultApiVersion.textContent = `成功: ${successCount}/${totalCount}`;
    }

    if (Elements.resultTimestamp) {
        Elements.resultTimestamp.textContent = `查询时间: ${TrackingUtils.formatTimestamp(new Date(), 'datetime')}`;
    }

    // 渲染多结果展示
    renderMultiResults(data);

    // 显示结果区域
    Elements.resultsSection.classList.remove('d-none');
    Elements.resultsSection.classList.add('fade-in');

    // 恢复搜索按钮
    resetSearchButton();
}

/**
 * 显示错误状态
 * @param {string} errorMsg - 错误信息
 */
function showErrorState(errorMsg) {
    hideAllSections();
    
    if (Elements.errorMessage) {
        Elements.errorMessage.textContent = errorMsg;
    }
    
    Elements.errorSection.classList.remove('d-none');
    Elements.errorSection.classList.add('fade-in');
    
    // 恢复搜索按钮
    resetSearchButton();
}

/**
 * 更新多单号查询进度
 * @param {Object} progress - 进度信息
 */
function updateMultiSearchProgress(progress) {
    // 在加载状态中显示进度信息
    const loadingText = document.querySelector('#loadingSection .text-center p');
    if (loadingText) {
        loadingText.textContent = `正在查询: ${progress.currentItem} (${progress.current}/${progress.total})`;
    }
}

/**
 * 渲染多结果展示
 * @param {Object} data - 查询数据
 */
function renderMultiResults(data) {
    if (!Elements.resultsContent) return;

    const { queryResults } = data;
    const successCount = queryResults.filter(r => r.success).length;
    const failedCount = queryResults.length - successCount;

    let html = '';

    // 汇总信息
    html += `
        <div class="results-summary mb-4">
            <div class="row g-3">
                <div class="col-md-3">
                    <div class="summary-item">
                        <div class="summary-number text-primary">${queryResults.length}</div>
                        <div class="summary-label">总查询数</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="summary-item">
                        <div class="summary-number text-success">${successCount}</div>
                        <div class="summary-label">成功查询</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="summary-item">
                        <div class="summary-number text-danger">${failedCount}</div>
                        <div class="summary-label">失败查询</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="summary-item">
                        <div class="summary-number text-info">${Math.round((successCount / queryResults.length) * 100)}%</div>
                        <div class="summary-label">成功率</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 多结果展示
    html += '<div class="multi-results">';

    queryResults.forEach((result, index) => {
        if (result.success && result.primaryResult) {
            // 成功的结果
            const formattedData = TrackingAPI.formatTrackingData(
                result.primaryResult.data,
                result.primaryResult.apiVersion
            );

            html += `
                <div class="result-item">
                    <div class="result-header">
                        <div class="result-tracking-number">${result.trackingRef}</div>
                        <div class="result-status-badge result-status-success">查询成功</div>
                    </div>
                    <div class="result-body">
                        <div class="mb-3">
                            <small class="text-muted">数据来源:</small>
                            <strong>${result.primaryResult.companyName}</strong>
                            <span class="badge bg-info ms-2">${result.primaryResult.apiVersion}</span>
                        </div>
                        ${renderCompactTimeline(formattedData)}
                    </div>
                </div>
            `;
        } else {
            // 失败的结果
            html += `
                <div class="result-item">
                    <div class="result-header">
                        <div class="result-tracking-number">${result.trackingRef}</div>
                        <div class="result-status-badge result-status-error">查询失败</div>
                    </div>
                    <div class="result-body">
                        <div class="alert alert-danger mb-0">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            ${result.error || '查询失败，请稍后重试'}
                        </div>
                    </div>
                </div>
            `;
        }
    });

    html += '</div>';

    Elements.resultsContent.innerHTML = html;
}

/**
 * 渲染紧凑的时间线
 * @param {Object} trackingData - 轨迹数据
 * @returns {string} HTML字符串
 */
function renderCompactTimeline(trackingData) {
    const { events, summary } = trackingData;

    if (!events || events.length === 0) {
        return '<p class="text-muted">暂无轨迹信息</p>';
    }

    // 只显示最近的3个事件
    const recentEvents = events.slice(0, 3);

    let html = '<div class="compact-timeline">';

    recentEvents.forEach((event, index) => {
        const statusStyle = TrackingAPI.getStatusStyle(event.status, event.statusName);

        html += `
            <div class="compact-timeline-item ${index === 0 ? 'current' : ''}">
                <div class="d-flex align-items-start">
                    <div class="compact-timeline-icon me-3">
                        <i class="${statusStyle.icon}" style="color: ${statusStyle.color}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="compact-timeline-status">${event.statusName || event.status}</div>
                        <div class="compact-timeline-time text-muted">
                            <small>${TrackingUtils.getRelativeTime(event.timestamp)}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    if (events.length > 3) {
        html += `
            <div class="compact-timeline-more text-center">
                <small class="text-muted">还有 ${events.length - 3} 个轨迹节点...</small>
            </div>
        `;
    }

    html += '</div>';

    return html;
}

/**
 * 隐藏所有结果区域
 */
function hideAllSections() {
    [
        Elements.loadingSection,
        Elements.resultsSection,
        Elements.errorSection
    ].forEach(section => {
        if (section) {
            section.classList.add('d-none');
            section.classList.remove('fade-in');
        }
    });
}

/**
 * 重置搜索按钮状态
 */
function resetSearchButton() {
    if (Elements.searchBtn) {
        Elements.searchBtn.disabled = false;
        Elements.searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>查询';
    }
}

// ===================================
// UI辅助函数
// ===================================

/**
 * 更新输入框验证状态
 * @param {Object} validation - 验证结果
 */
function updateInputValidation(validation) {
    if (!Elements.searchInput) return;

    // 清除之前的验证状态
    Elements.searchInput.classList.remove('is-valid', 'is-invalid');

    if (validation.isValid) {
        Elements.searchInput.classList.add('is-valid');
    } else {
        Elements.searchInput.classList.add('is-invalid');
    }
}

/**
 * 清除输入框验证状态
 */
function clearInputValidation() {
    if (!Elements.searchInput) return;
    Elements.searchInput.classList.remove('is-valid', 'is-invalid');
}

/**
 * 更新输入框提示文本
 * @param {string} searchType - 搜索类型
 */
function updateInputPlaceholder(searchType) {
    if (!Elements.searchInput) return;

    const placeholders = {
        [TrackingUtils.TRACKING_TYPES.AUTO]: '请输入单号，如：KD2412002091',
        [TrackingUtils.TRACKING_TYPES.JOB_NUM]: '请输入JobNum，如：KD2412002091',
        [TrackingUtils.TRACKING_TYPES.PO_NUM]: '请输入PO号，如：BESH2412170032',
        [TrackingUtils.TRACKING_TYPES.TRACKING_NUM]: '请输入跟踪号，如：43005822480',
        [TrackingUtils.TRACKING_TYPES.REFERENCE_ID]: '请输入Reference ID',
        [TrackingUtils.TRACKING_TYPES.SHIPMENT_ID]: '请输入Shipment ID'
    };

    Elements.searchInput.placeholder = placeholders[searchType] || placeholders[TrackingUtils.TRACKING_TYPES.AUTO];
}

/**
 * 渲染轨迹时间线
 * @param {Object} trackingData - 格式化的轨迹数据
 */
function renderTrackingTimeline(trackingData) {
    if (!Elements.resultsContent || !trackingData) return;

    const { events, summary } = trackingData;

    let html = '';

    // 如果没有轨迹事件
    if (!events || events.length === 0) {
        html = `
            <div class="text-center py-5">
                <i class="fas fa-info-circle text-muted" style="font-size: 3rem;"></i>
                <h5 class="text-muted mt-3">暂无轨迹信息</h5>
                <p class="text-muted">该订单暂时没有可用的轨迹记录</p>
            </div>
        `;
    } else {
        // 渲染时间线
        html = '<div class="tracking-timeline">';

        events.forEach((event, index) => {
            const statusStyle = TrackingAPI.getStatusStyle(event.status, event.statusName);
            const isCurrentClass = event.isCurrent ? ' current' : '';

            html += `
                <div class="timeline-item${isCurrentClass}">
                    <div class="timeline-content">
                        <div class="timeline-status">
                            <i class="${statusStyle.icon} me-2" style="color: ${statusStyle.color}"></i>
                            ${event.statusName || event.status || '未知状态'}
                        </div>
                        ${event.description ? `
                            <div class="timeline-description">
                                ${event.description}
                            </div>
                        ` : ''}
                        <div class="timeline-meta">
                            <div class="timeline-time">
                                <i class="fas fa-clock me-1"></i>
                                ${TrackingUtils.formatTimestamp(event.timestamp, 'datetime')}
                                <small class="text-muted ms-2">
                                    (${TrackingUtils.getRelativeTime(event.timestamp)})
                                </small>
                            </div>
                            ${event.location ? `
                                <div class="timeline-location">
                                    <i class="fas fa-map-marker-alt me-1"></i>
                                    ${event.location}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // 添加汇总信息
        if (summary && summary.totalEvents > 0) {
            html += `
                <div class="mt-4 p-3 bg-light rounded">
                    <h6 class="mb-2">
                        <i class="fas fa-chart-line me-2"></i>
                        轨迹汇总
                    </h6>
                    <div class="row g-3">
                        <div class="col-md-3">
                            <small class="text-muted">当前状态</small>
                            <div class="fw-bold">${summary.statusName || '未知'}</div>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">轨迹节点</small>
                            <div class="fw-bold">${summary.totalEvents} 个</div>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">最后更新</small>
                            <div class="fw-bold">
                                ${summary.lastUpdate ? TrackingUtils.getRelativeTime(summary.lastUpdate) : '未知'}
                            </div>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">数据来源</small>
                            <div class="fw-bold">AU-OPS API</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    Elements.resultsContent.innerHTML = html;
}

/**
 * 导出查询结果
 * @param {Object} results - 查询结果
 */
function exportResults(results) {
    if (!results || !results.formattedData) {
        throw new Error('没有可导出的数据');
    }

    const { trackingRef, formattedData, timestamp, apiVersion } = results;
    const { events, summary } = formattedData;

    // 创建CSV内容
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += '订单号,时间,状态,描述,位置\n';

    events.forEach(event => {
        const row = [
            trackingRef,
            TrackingUtils.formatTimestamp(event.timestamp, 'datetime'),
            event.statusName || event.status || '',
            (event.description || '').replace(/,/g, '，'), // 替换逗号避免CSV格式问题
            event.location || ''
        ];
        csvContent += row.join(',') + '\n';
    });

    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `轨迹查询_${trackingRef}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * 加载用户偏好设置
 */
function loadUserPreferences() {
    const preferences = TrackingUtils.getUserPreferences();

    // 设置默认公司
    if (preferences.selectedCompany) {
        AppState.selectedCompany = preferences.selectedCompany;

        // 更新UI
        const companyConfig = TrackingAPI.COMPANY_CONFIGS[preferences.selectedCompany];
        if (companyConfig && Elements.companyDropdown) {
            const dropdownText = Elements.companyDropdown.querySelector('.nav-link');
            if (dropdownText) {
                dropdownText.innerHTML = `<i class="fas fa-building me-1"></i>${companyConfig.name}`;
            }
        }
    }

    // 设置默认搜索类型
    if (preferences.defaultSearchType && Elements.searchType) {
        Elements.searchType.value = preferences.defaultSearchType;
    }
}

// ===================================
// 全局辅助函数（供HTML调用）
// ===================================

/**
 * 清空查询结果
 */
function clearResults() {
    hideAllSections();
    AppState.currentResults = null;
    AppState.currentQuery = null;
    AppState.isMultiQuery = false;
    AppState.queryCount = 0;

    if (Elements.searchInput) {
        Elements.searchInput.value = '';
        Elements.searchInput.focus();
    }

    TrackingUtils.showToast('结果已清空', 'info');
}

/**
 * 显示使用帮助
 */
function showHelp() {
    const helpConfig = window.SITE_CONFIG?.help || {};

    let helpContent = '<div class="help-modal">';

    // 支持的单号格式
    if (helpConfig.supportedFormats && helpConfig.supportedFormats.length > 0) {
        helpContent += `
            <div class="help-section">
                <h5>支持的单号格式</h5>
        `;

        helpConfig.supportedFormats.forEach(format => {
            helpContent += `<div class="help-example">${format.name}: ${format.example}</div>`;
        });

        helpContent += '</div>';
    }

    // 多单号查询说明
    helpContent += `
        <div class="help-section">
            <h5>多单号查询</h5>
            <p>支持同时查询多个单号，使用以下分隔符：</p>
            <ul>
                <li>换行符（每行一个单号）</li>
                <li>逗号分隔：KD2412002091,KD2412002092</li>
                <li>分号分隔：KD2412002091;KD2412002092</li>
                <li>空格分隔：KD2412002091 KD2412002092</li>
            </ul>
            <p><strong>最多支持50个单号同时查询</strong></p>
        </div>
    `;

    // 功能特性
    if (helpConfig.features && helpConfig.features.length > 0) {
        helpContent += `
            <div class="help-section">
                <h5>功能特性</h5>
                <ul>
        `;

        helpConfig.features.forEach(feature => {
            helpContent += `<li>${feature}</li>`;
        });

        helpContent += '</ul></div>';
    }

    // 使用技巧
    if (helpConfig.tips && helpConfig.tips.length > 0) {
        helpContent += `
            <div class="help-section">
                <h5>使用技巧</h5>
                <ul>
        `;

        helpConfig.tips.forEach(tip => {
            helpContent += `<li>${tip}</li>`;
        });

        helpContent += '</ul></div>';
    }

    helpContent += '</div>';

    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-question-circle text-primary me-2"></i>
                        使用帮助
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    ${helpContent}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 显示模态框
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // 模态框关闭后移除元素
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// ===================================
// 页面切换功能
// ===================================

/**
 * 显示批量查询页面
 */
function showBatchQuery() {
    hideAllSections();
    if (Elements.batchSection) {
        Elements.batchSection.classList.remove('d-none');
        Elements.batchSection.classList.add('fade-in');
    }

    // 更新导航状态
    updateNavigation('batch');
}

/**
 * 显示查询历史页面
 */
function showQueryHistory() {
    hideAllSections();
    if (Elements.historySection) {
        Elements.historySection.classList.remove('d-none');
        Elements.historySection.classList.add('fade-in');

        // 加载历史记录
        renderQueryHistory();
    }

    // 更新导航状态
    updateNavigation('history');
}

/**
 * 显示主页面
 */
function showMainPage() {
    hideAllSections();

    // 更新导航状态
    updateNavigation('home');
}

/**
 * 更新导航状态
 * @param {string} activeSection - 当前激活的区域
 */
function updateNavigation(activeSection) {
    // 移除所有导航项的active类
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // 添加当前区域的active类
    const activeLink = document.querySelector(`[href="#${activeSection}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// ===================================
// 批量查询功能
// ===================================

/**
 * 处理批量查询表单提交
 * @param {Event} event - 表单提交事件
 */
async function handleBatchSubmit(event) {
    event.preventDefault();

    const batchInput = Elements.batchInput.value.trim();

    if (!batchInput) {
        TrackingUtils.showToast('请输入要查询的单号', 'warning');
        Elements.batchInput.focus();
        return;
    }

    // 验证批量单号
    const validationResults = TrackingUtils.validateBatchTrackingNumbers(batchInput);

    if (validationResults.length === 0) {
        TrackingUtils.showToast('没有找到有效的单号', 'error');
        return;
    }

    if (validationResults.length > 50) {
        TrackingUtils.showToast('最多支持50个单号，请减少输入数量', 'error');
        return;
    }

    // 检查无效单号
    const invalidNumbers = validationResults.filter(r => !r.isValid);
    if (invalidNumbers.length > 0) {
        const invalidList = invalidNumbers.map(r => r.originalNumber).join(', ');
        TrackingUtils.showToast(`发现无效单号: ${invalidList}`, 'warning');
    }

    // 获取有效单号
    const validNumbers = validationResults.filter(r => r.isValid).map(r => r.cleanNumber);

    if (validNumbers.length === 0) {
        TrackingUtils.showToast('没有有效的单号可以查询', 'error');
        return;
    }

    // 执行批量查询
    await performBatchSearch(validNumbers);
}

/**
 * 执行批量查询
 * @param {Array<string>} trackingNumbers - 单号数组
 */
async function performBatchSearch(trackingNumbers) {
    if (AppState.isLoading) {
        TrackingUtils.showToast('查询进行中，请稍候...', 'info');
        return;
    }

    try {
        // 更新应用状态
        AppState.isLoading = true;
        AppState.batchMode = true;

        // 显示进度条
        showBatchProgress();

        console.log(`🔍 开始批量查询: ${trackingNumbers.length} 个单号`);

        // 调用批量查询API
        const results = await TrackingAPI.queryBatchTrackingInfo(
            trackingNumbers,
            AppState.selectedCompany,
            updateBatchProgress
        );

        // 显示批量结果
        showBatchResults(results);

        console.log('✅ 批量查询完成');

    } catch (error) {
        console.error('❌ 批量查询失败:', error);
        TrackingUtils.showToast(`批量查询失败: ${error.message}`, 'error');

    } finally {
        // 重置状态
        AppState.isLoading = false;
        AppState.batchMode = false;
        hideBatchProgress();
    }
}

/**
 * 显示批量查询进度
 */
function showBatchProgress() {
    if (Elements.batchProgress) {
        Elements.batchProgress.classList.remove('d-none');
    }

    if (Elements.batchResults) {
        Elements.batchResults.classList.add('d-none');
    }

    // 禁用查询按钮
    if (Elements.batchSearchBtn) {
        Elements.batchSearchBtn.disabled = true;
        Elements.batchSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>查询中...';
    }
}

/**
 * 隐藏批量查询进度
 */
function hideBatchProgress() {
    if (Elements.batchProgress) {
        Elements.batchProgress.classList.add('d-none');
    }

    // 恢复查询按钮
    if (Elements.batchSearchBtn) {
        Elements.batchSearchBtn.disabled = false;
        Elements.batchSearchBtn.innerHTML = '<i class="fas fa-search me-2"></i>开始批量查询';
    }
}

/**
 * 更新批量查询进度
 * @param {Object} progress - 进度信息
 */
function updateBatchProgress(progress) {
    if (Elements.batchProgressBar) {
        Elements.batchProgressBar.style.width = `${progress.percentage}%`;
        Elements.batchProgressBar.textContent = `${progress.percentage}%`;
    }

    if (Elements.batchProgressText) {
        Elements.batchProgressText.textContent =
            `正在查询: ${progress.currentItem} (${progress.current}/${progress.total})`;
    }
}

/**
 * 显示批量查询结果
 * @param {Array} results - 查询结果数组
 */
function showBatchResults(results) {
    if (!Elements.batchResults || !results || results.length === 0) {
        return;
    }

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    // 显示汇总信息
    if (Elements.batchSummary) {
        Elements.batchSummary.innerHTML = `
            <div class="col-md-3">
                <div class="card border-primary">
                    <div class="card-body text-center">
                        <h5 class="card-title text-primary">${results.length}</h5>
                        <p class="card-text">总查询数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-success">
                    <div class="card-body text-center">
                        <h5 class="card-title text-success">${successCount}</h5>
                        <p class="card-text">成功查询</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-danger">
                    <div class="card-body text-center">
                        <h5 class="card-title text-danger">${failedCount}</h5>
                        <p class="card-text">失败查询</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-info">
                    <div class="card-body text-center">
                        <h5 class="card-title text-info">${Math.round((successCount / results.length) * 100)}%</h5>
                        <p class="card-text">成功率</p>
                    </div>
                </div>
            </div>
        `;
    }

    // 显示结果表格
    if (Elements.batchResultsTable) {
        let tableHtml = '';

        results.forEach((result, index) => {
            const statusBadge = result.success
                ? '<span class="badge bg-success">成功</span>'
                : '<span class="badge bg-danger">失败</span>';

            const detectedType = TrackingUtils.detectTrackingType(result.trackingRef);
            const typeText = detectedType === 'auto' ? '未知' : detectedType;

            tableHtml += `
                <tr class="${result.success ? 'table-success' : 'table-danger'}">
                    <td>${result.index}</td>
                    <td>
                        <code>${result.trackingRef}</code>
                        ${result.success ? `<br><small class="text-muted">查询成功</small>` : ''}
                    </td>
                    <td>${typeText}</td>
                    <td>${statusBadge}</td>
                    <td>${result.apiVersion || '-'}</td>
                    <td>
                        <small>${TrackingUtils.formatTimestamp(result.timestamp, 'time')}</small>
                    </td>
                    <td>
                        ${result.success ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="viewBatchDetail('${result.trackingRef}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-outline-danger" onclick="retryBatchItem('${result.trackingRef}')">
                                <i class="fas fa-redo"></i>
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });

        Elements.batchResultsTable.innerHTML = tableHtml;
    }

    // 显示结果区域
    Elements.batchResults.classList.remove('d-none');
    Elements.batchResults.classList.add('fade-in');

    // 保存批量结果到应用状态
    AppState.currentResults = {
        type: 'batch',
        results: results,
        timestamp: new Date().toISOString()
    };
}

// ===================================
// 查询历史功能
// ===================================

/**
 * 渲染查询历史
 */
function renderQueryHistory() {
    if (!Elements.historyContent) return;

    const history = TrackingUtils.getQueryHistory();

    if (history.length === 0) {
        Elements.historyContent.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-history text-muted" style="font-size: 3rem;"></i>
                <h5 class="text-muted mt-3">暂无查询历史</h5>
                <p class="text-muted">开始查询后，历史记录将显示在这里</p>
            </div>
        `;
        return;
    }

    let historyHtml = '<div class="row g-3">';

    history.forEach((item, index) => {
        const statusIcon = item.success
            ? '<i class="fas fa-check-circle text-success"></i>'
            : '<i class="fas fa-times-circle text-danger"></i>';

        const companyName = TrackingAPI.COMPANY_CONFIGS[item.companyId]?.name || '未知公司';

        historyHtml += `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 ${item.success ? 'border-success' : 'border-danger'}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">
                                <code>${item.trackingNumber}</code>
                            </h6>
                            ${statusIcon}
                        </div>

                        <div class="mb-2">
                            <small class="text-muted">类型:</small>
                            <span class="badge bg-secondary ms-1">${item.trackingType || '未知'}</span>
                        </div>

                        <div class="mb-2">
                            <small class="text-muted">公司:</small>
                            <span class="ms-1">${companyName}</span>
                        </div>

                        ${item.success ? `
                            <div class="mb-2">
                                <small class="text-muted">API版本:</small>
                                <span class="badge bg-info ms-1">${item.apiVersion}</span>
                            </div>
                        ` : `
                            <div class="mb-2">
                                <small class="text-danger">错误:</small>
                                <small class="text-muted">${item.error || '未知错误'}</small>
                            </div>
                        `}

                        <div class="mb-3">
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                ${TrackingUtils.getRelativeTime(item.timestamp)}
                            </small>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-fill"
                                    onclick="reQueryFromHistory('${item.trackingNumber}')">
                                <i class="fas fa-redo me-1"></i>重新查询
                            </button>
                            <button class="btn btn-sm btn-outline-danger"
                                    onclick="removeHistoryItem('${item.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    historyHtml += '</div>';

    Elements.historyContent.innerHTML = historyHtml;
}

/**
 * 筛选查询历史
 */
function filterHistory() {
    const filterValue = Elements.historyFilter?.value || 'all';
    const searchValue = Elements.historySearch?.value.toLowerCase() || '';

    let history = TrackingUtils.getQueryHistory();

    // 按状态筛选
    if (filterValue === 'success') {
        history = history.filter(item => item.success);
    } else if (filterValue === 'failed') {
        history = history.filter(item => !item.success);
    } else if (filterValue === 'today') {
        const today = new Date().toDateString();
        history = history.filter(item => new Date(item.timestamp).toDateString() === today);
    } else if (filterValue === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        history = history.filter(item => new Date(item.timestamp) >= weekAgo);
    }

    // 按单号搜索
    if (searchValue) {
        history = history.filter(item =>
            item.trackingNumber.toLowerCase().includes(searchValue)
        );
    }

    // 重新渲染
    renderFilteredHistory(history);
}

/**
 * 渲染筛选后的历史记录
 * @param {Array} filteredHistory - 筛选后的历史记录
 */
function renderFilteredHistory(filteredHistory) {
    if (!Elements.historyContent) return;

    if (filteredHistory.length === 0) {
        Elements.historyContent.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search text-muted" style="font-size: 3rem;"></i>
                <h5 class="text-muted mt-3">没有找到匹配的记录</h5>
                <p class="text-muted">请尝试调整筛选条件</p>
            </div>
        `;
        return;
    }

    // 使用相同的渲染逻辑，但传入筛选后的数据
    const originalHistory = TrackingUtils.getQueryHistory();

    // 临时替换历史数据
    TrackingUtils.saveQueryHistory = () => {}; // 临时禁用保存

    // 渲染筛选结果（这里需要重构renderQueryHistory以接受参数）
    renderQueryHistoryWithData(filteredHistory);
}

/**
 * 使用指定数据渲染查询历史
 * @param {Array} historyData - 历史数据
 */
function renderQueryHistoryWithData(historyData) {
    if (!Elements.historyContent) return;

    if (historyData.length === 0) {
        Elements.historyContent.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-history text-muted" style="font-size: 3rem;"></i>
                <h5 class="text-muted mt-3">暂无查询历史</h5>
                <p class="text-muted">开始查询后，历史记录将显示在这里</p>
            </div>
        `;
        return;
    }

    let historyHtml = '<div class="row g-3">';

    historyData.forEach((item, index) => {
        const statusIcon = item.success
            ? '<i class="fas fa-check-circle text-success"></i>'
            : '<i class="fas fa-times-circle text-danger"></i>';

        const companyName = TrackingAPI.COMPANY_CONFIGS[item.companyId]?.name || '未知公司';

        historyHtml += `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 ${item.success ? 'border-success' : 'border-danger'}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">
                                <code>${item.trackingNumber}</code>
                            </h6>
                            ${statusIcon}
                        </div>

                        <div class="mb-2">
                            <small class="text-muted">类型:</small>
                            <span class="badge bg-secondary ms-1">${item.trackingType || '未知'}</span>
                        </div>

                        <div class="mb-2">
                            <small class="text-muted">公司:</small>
                            <span class="ms-1">${companyName}</span>
                        </div>

                        ${item.success ? `
                            <div class="mb-2">
                                <small class="text-muted">API版本:</small>
                                <span class="badge bg-info ms-1">${item.apiVersion}</span>
                            </div>
                        ` : `
                            <div class="mb-2">
                                <small class="text-danger">错误:</small>
                                <small class="text-muted">${item.error || '未知错误'}</small>
                            </div>
                        `}

                        <div class="mb-3">
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                ${TrackingUtils.getRelativeTime(item.timestamp)}
                            </small>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-fill"
                                    onclick="reQueryFromHistory('${item.trackingNumber}')">
                                <i class="fas fa-redo me-1"></i>重新查询
                            </button>
                            <button class="btn btn-sm btn-outline-danger"
                                    onclick="removeHistoryItem('${item.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    historyHtml += '</div>';

    Elements.historyContent.innerHTML = historyHtml;
}

// ===================================
// 全局辅助函数（供HTML调用）
// ===================================

/**
 * 清空批量输入
 */
function clearBatchInput() {
    if (Elements.batchInput) {
        Elements.batchInput.value = '';
        Elements.batchInput.focus();
    }
}

/**
 * 清空批量结果
 */
function clearBatchResults() {
    if (Elements.batchResults) {
        Elements.batchResults.classList.add('d-none');
    }

    AppState.currentResults = null;
    TrackingUtils.showToast('批量结果已清空', 'info');
}

/**
 * 导出批量结果
 */
function exportBatchResults() {
    if (!AppState.currentResults || AppState.currentResults.type !== 'batch') {
        TrackingUtils.showToast('没有可导出的批量结果', 'warning');
        return;
    }

    try {
        const results = AppState.currentResults.results;

        // 创建CSV内容
        let csvContent = '\uFEFF'; // BOM for UTF-8
        csvContent += '序号,单号,类型,状态,API版本,查询时间,错误信息\n';

        results.forEach(result => {
            const detectedType = TrackingUtils.detectTrackingType(result.trackingRef);
            const row = [
                result.index,
                result.trackingRef,
                detectedType === 'auto' ? '未知' : detectedType,
                result.success ? '成功' : '失败',
                result.apiVersion || '-',
                TrackingUtils.formatTimestamp(result.timestamp, 'datetime'),
                result.error || ''
            ];
            csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });

        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `批量查询结果_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        TrackingUtils.showToast('批量结果导出成功', 'success');

    } catch (error) {
        console.error('导出批量结果失败:', error);
        TrackingUtils.showToast('导出失败', 'error');
    }
}

/**
 * 查看批量查询详情
 * @param {string} trackingRef - 单号
 */
function viewBatchDetail(trackingRef) {
    // 切换到主页面并执行查询
    showMainPage();

    setTimeout(() => {
        if (Elements.searchInput) {
            Elements.searchInput.value = trackingRef;
            Elements.searchForm.dispatchEvent(new Event('submit'));
        }
    }, 300);
}

/**
 * 重试批量查询项
 * @param {string} trackingRef - 单号
 */
async function retryBatchItem(trackingRef) {
    try {
        TrackingUtils.showToast(`正在重试查询: ${trackingRef}`, 'info');

        const result = await TrackingAPI.queryTrackingInfo(trackingRef, AppState.selectedCompany);

        TrackingUtils.showToast(`重试成功: ${trackingRef}`, 'success');

        // 可以选择更新批量结果中的对应项

    } catch (error) {
        TrackingUtils.showToast(`重试失败: ${error.message}`, 'error');
    }
}

/**
 * 清空所有历史
 */
function clearAllHistory() {
    if (confirm('确定要清空所有查询历史吗？此操作不可恢复。')) {
        TrackingUtils.clearQueryHistory();
        renderQueryHistory();
        TrackingUtils.showToast('查询历史已清空', 'success');
    }
}

/**
 * 导出查询历史
 */
function exportHistory() {
    const history = TrackingUtils.getQueryHistory();

    if (history.length === 0) {
        TrackingUtils.showToast('没有可导出的历史记录', 'warning');
        return;
    }

    try {
        // 创建CSV内容
        let csvContent = '\uFEFF'; // BOM for UTF-8
        csvContent += '单号,类型,公司,状态,API版本,查询时间,错误信息\n';

        history.forEach(item => {
            const companyName = TrackingAPI.COMPANY_CONFIGS[item.companyId]?.name || '未知公司';
            const row = [
                item.trackingNumber,
                item.trackingType || '未知',
                companyName,
                item.success ? '成功' : '失败',
                item.apiVersion || '-',
                TrackingUtils.formatTimestamp(item.timestamp, 'datetime'),
                item.error || ''
            ];
            csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });

        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `查询历史_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        TrackingUtils.showToast('查询历史导出成功', 'success');

    } catch (error) {
        console.error('导出查询历史失败:', error);
        TrackingUtils.showToast('导出失败', 'error');
    }
}

/**
 * 从历史记录重新查询
 * @param {string} trackingNumber - 单号
 */
async function reQueryFromHistory(trackingNumber) {
    // 切换到主页面并执行查询
    showMainPage();

    setTimeout(() => {
        if (Elements.searchInput) {
            Elements.searchInput.value = trackingNumber;
            Elements.searchForm.dispatchEvent(new Event('submit'));
        }
    }, 300);
}

/**
 * 删除历史记录项
 * @param {string} itemId - 记录ID
 */
function removeHistoryItem(itemId) {
    if (confirm('确定要删除这条历史记录吗？')) {
        const history = TrackingUtils.getQueryHistory();
        const filteredHistory = history.filter(item => item.id !== itemId);

        // 更新本地存储
        localStorage.setItem('au_ops_query_history', JSON.stringify(filteredHistory));

        // 重新渲染
        renderQueryHistory();

        TrackingUtils.showToast('历史记录已删除', 'success');
    }
}

// ===================================
// 页面加载完成后初始化
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保所有资源加载完成
    setTimeout(initializeApp, 100);

    // 检查URL参数中是否有查询参数
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    if (queryParam) {
        setTimeout(() => {
            if (Elements.searchInput) {
                Elements.searchInput.value = queryParam;
                Elements.searchForm.dispatchEvent(new Event('submit'));
            }
        }, 500);
    }
});
