/**
 * AU-OPS 后台管理 - Google Authenticator 认证
 */

// 认证配置
const AUTH_CONFIG = {
    issuer: 'PGS Admin',
    label: 'PGS Tracking System',
    algorithm: 'SHA1',
    digits: 6,
    period: 30
};

// 全局变量
let currentSecret = null;
let totp = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 页面加载完成，开始初始化...');

    // 等待更长时间确保所有库都加载完成
    setTimeout(() => {
        checkLibrariesAndInit();
    }, 500);
});

// 监听脚本加载错误
window.addEventListener('error', function(e) {
    if (e.filename && e.filename.includes('bootstrap')) {
        console.warn('Bootstrap加载失败，但不影响认证功能');
    }
    if (e.filename && (e.filename.includes('qrcode') || e.filename.includes('otpauth'))) {
        console.error('关键库加载失败:', e.filename);
        showToast('系统库加载失败，请刷新页面重试', 'error');
    }
});

/**
 * 检查库加载状态并初始化
 */
function checkLibrariesAndInit() {
    console.log('🔍 检查库加载状态...');

    let allLibrariesLoaded = true;
    const missingLibraries = [];

    if (typeof OTPAuth === 'undefined') {
        allLibrariesLoaded = false;
        missingLibraries.push('OTPAuth');
        console.error('❌ OTPAuth库未加载');
    } else {
        console.log('✅ OTPAuth库已加载');

        if (typeof OTPAuth.Secret === 'undefined') {
            console.error('❌ OTPAuth.Secret未定义');
        } else {
            console.log('✅ OTPAuth.Secret已定义');
        }
    }

    if (typeof QRCode === 'undefined') {
        console.warn('⚠️ QRCode库未加载，将使用备用方案');
    } else {
        console.log('✅ QRCode库已加载');
    }

    if (allLibrariesLoaded) {
        console.log('✅ 所有必要库已加载，开始初始化认证系统');
        initializeAuth();
    } else {
        console.error('❌ 缺少必要库:', missingLibraries.join(', '));
        showToast(`系统初始化失败：缺少${missingLibraries.join(', ')}库`, 'error');

        // 显示错误界面
        showLibraryErrorView();
    }
}

/**
 * 显示库加载错误界面
 */
function showLibraryErrorView() {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <h4><i class="fas fa-exclamation-triangle me-2"></i>系统初始化失败</h4>
                <p>认证系统所需的库文件加载失败，请检查网络连接或联系管理员。</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>重新加载页面
                </button>
            </div>
        `;
    }
}

/**
 * 初始化认证系统
 */
function initializeAuth() {
    console.log('🔐 初始化认证系统...');
    
    // 检查是否已经设置过认证
    const savedSecret = localStorage.getItem('au_ops_auth_secret');
    const isAuthenticated = sessionStorage.getItem('au_ops_authenticated');
    
    if (savedSecret && isAuthenticated === 'true') {
        // 已认证，直接跳转到后台
        redirectToAdmin();
        return;
    }
    
    if (savedSecret) {
        // 已设置但未认证，显示登录界面
        showLoginView();
    } else {
        // 首次访问，显示设置界面
        showSetupView();
    }
}

/**
 * 显示设置界面
 */
function showSetupView() {
    hideAllViews();
    document.getElementById('setupView').classList.remove('d-none');
    
    // 生成新的密钥
    generateSecret();
    
    // 更新步骤指示器
    updateStepIndicator(1);
}

/**
 * 显示验证界面
 */
function showVerifyStep() {
    hideAllViews();
    document.getElementById('verifyView').classList.remove('d-none');
    
    // 更新步骤指示器
    updateStepIndicator(2);
    
    // 聚焦到验证码输入框
    document.getElementById('verifyCode').focus();
}

/**
 * 显示登录界面
 */
function showLoginView() {
    hideAllViews();
    document.getElementById('loginView').classList.remove('d-none');
    
    // 聚焦到验证码输入框
    document.getElementById('loginCode').focus();
}

/**
 * 显示设置步骤
 */
function showSetupStep() {
    showSetupView();
}

/**
 * 隐藏所有视图
 */
function hideAllViews() {
    document.getElementById('setupView').classList.add('d-none');
    document.getElementById('verifyView').classList.add('d-none');
    document.getElementById('loginView').classList.add('d-none');
}

/**
 * 更新步骤指示器
 */
function updateStepIndicator(currentStep) {
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById(`step${i}`);
        step.classList.remove('active', 'completed');
        
        if (i < currentStep) {
            step.classList.add('completed');
        } else if (i === currentStep) {
            step.classList.add('active');
        }
    }
}

/**
 * 生成密钥和二维码
 */
function generateSecret() {
    try {
        console.log('🔑 开始生成密钥...');

        // 检查必要的库是否加载
        if (typeof OTPAuth === 'undefined') {
            throw new Error('OTPAuth库未加载');
        }

        if (typeof QRCode === 'undefined') {
            console.warn('⚠️ QRCode库未加载，将使用备用方案');
        }

        // 生成随机密钥
        currentSecret = generateRandomSecret();
        console.log('✅ 密钥生成成功:', currentSecret);

        // 保存到全局变量供其他函数使用
        window.currentSecret = currentSecret;

        // 创建TOTP对象
        totp = new OTPAuth.TOTP({
            issuer: AUTH_CONFIG.issuer,
            label: `${AUTH_CONFIG.issuer}:${AUTH_CONFIG.label}`,
            algorithm: AUTH_CONFIG.algorithm,
            digits: AUTH_CONFIG.digits,
            period: AUTH_CONFIG.period,
            secret: OTPAuth.Secret.fromBase32(currentSecret)
        });

        console.log('✅ TOTP对象创建成功');
        
        // 显示密钥
        document.getElementById('secretKey').textContent = currentSecret;
        
        // 生成二维码
        const otpAuthUrl = totp.toString();
        console.log('生成的OTP URL:', otpAuthUrl);

        // 验证URL格式
        if (!otpAuthUrl.startsWith('otpauth://totp/')) {
            console.error('OTP URL格式错误:', otpAuthUrl);
            showFallbackQRCode(otpAuthUrl);
            return;
        }

        // 显示加载状态
        const qrcodeContainer = document.getElementById('qrcode');
        qrcodeContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px;">
                <div style="margin-bottom: 15px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #2563eb;"></i>
                </div>
                <p style="margin: 0; color: #6b7280;">正在生成二维码...</p>
            </div>
        `;

        // 等待一下确保DOM准备好
        setTimeout(() => {
            try {
                // 检查QRCode库是否可用
                if (typeof QRCode === 'undefined') {
                    console.error('QRCode库未加载');
                    showFallbackQRCode(otpAuthUrl);
                    return;
                }

                // 清空容器并创建canvas
                qrcodeContainer.innerHTML = '';

                // 尝试生成QR码
                try {
                    // 使用toCanvas方法
                    QRCode.toCanvas(qrcodeContainer, otpAuthUrl, {
                        width: 200,
                        height: 200,
                        margin: 2,
                        color: {
                            dark: '#2563eb',
                            light: '#ffffff'
                        },
                        errorCorrectionLevel: 'M'
                    }, function(error) {
                        if (error) {
                            console.error('QR码生成失败:', error);
                            showFallbackQRCode(otpAuthUrl);
                        } else {
                            console.log('✅ 二维码生成成功');
                            // 添加说明文字
                            const description = document.createElement('p');
                            description.style.cssText = 'margin: 10px 0 0 0; font-size: 14px; color: #6b7280; text-align: center;';
                            description.textContent = '使用Google Authenticator扫描';
                            qrcodeContainer.appendChild(description);
                        }
                    });
                } catch (canvasError) {
                    console.error('QR码生成异常:', canvasError);
                    showFallbackQRCode(otpAuthUrl);
                }
            } catch (error) {
                console.error('二维码生成异常:', error);
                showFallbackQRCode(otpAuthUrl);
            }
        }, 100);


    } catch (error) {
        console.error('❌ 密钥生成失败:', error);

        // 显示详细错误信息
        let errorMessage = '密钥生成失败';
        if (error.message.includes('OTPAuth')) {
            errorMessage = '认证库加载失败，请刷新页面重试';
        } else if (error.message.includes('QRCode')) {
            errorMessage = '二维码生成失败，但可以手动输入密钥';
        }

        showToast(errorMessage, 'error');

        // 显示备用界面
        showFallbackSetup();
    }
}

/**
 * 显示备用设置界面
 */
function showFallbackSetup() {
    try {
        // 尝试生成一个简单的密钥
        const fallbackSecret = generateRandomSecret();

        // 显示密钥
        document.getElementById('secretKey').textContent = fallbackSecret;

        // 显示备用二维码信息
        const qrcodeContainer = document.getElementById('qrcode');
        qrcodeContainer.innerHTML = `
            <div style="padding: 20px; border: 2px dashed #e5e7eb; border-radius: 8px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f59e0b; margin-bottom: 15px;"></i>
                <h6 style="color: #374151; margin-bottom: 10px;">二维码生成失败</h6>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">请手动在Google Authenticator中添加账户</p>
            </div>
        `;

        // 保存密钥到全局变量
        currentSecret = fallbackSecret;
        window.currentSecret = fallbackSecret;

        console.log('✅ 备用设置界面已显示');

    } catch (error) {
        console.error('❌ 备用设置也失败:', error);
        showToast('系统错误，请联系管理员', 'error');
    }
}

/**
 * 生成随机密钥 (Base32格式)
 */
function generateRandomSecret() {
    // Base32字符集 (RFC 4648)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';

    // 生成160位(20字节)的密钥，转换为32个Base32字符
    for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    console.log('生成的密钥:', secret);
    return secret;
}

/**
 * 测试二维码生成 (调试用)
 */
function testQRGeneration() {
    console.log('🧪 测试二维码生成...');

    if (typeof QRCode === 'undefined') {
        console.error('❌ QRCode库未加载');
        return false;
    }

    if (typeof OTPAuth === 'undefined') {
        console.error('❌ OTPAuth库未加载');
        return false;
    }

    try {
        const testSecret = 'JBSWY3DPEHPK3PXP';
        const testTotp = new OTPAuth.TOTP({
            issuer: 'Test',
            label: 'Test:TestAccount',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(testSecret)
        });

        const testUrl = testTotp.toString();
        console.log('测试URL:', testUrl);

        return testUrl.startsWith('otpauth://totp/');
    } catch (error) {
        console.error('❌ 测试失败:', error);
        return false;
    }
}

/**
 * 验证TOTP代码
 */
function verifyTOTP(token, secret = null) {
    try {
        const secretToUse = secret || currentSecret;
        
        if (!secretToUse) {
            throw new Error('密钥不存在');
        }
        
        const totpInstance = new OTPAuth.TOTP({
            issuer: AUTH_CONFIG.issuer,
            label: AUTH_CONFIG.label,
            algorithm: AUTH_CONFIG.algorithm,
            digits: AUTH_CONFIG.digits,
            period: AUTH_CONFIG.period,
            secret: OTPAuth.Secret.fromBase32(secretToUse)
        });
        
        // 验证当前时间窗口和前后一个时间窗口
        const currentTime = Math.floor(Date.now() / 1000); // 转换为秒级时间戳
        const window = AUTH_CONFIG.period; // 时间窗口（秒）

        console.log('🔍 TOTP验证调试信息:');
        console.log('当前时间戳(秒):', currentTime);
        console.log('输入验证码:', token);

        for (let i = -1; i <= 1; i++) {
            const timestamp = currentTime + (i * window);
            const expectedToken = totpInstance.generate({ timestamp: timestamp });

            console.log(`时间窗口 ${i}: 时间戳=${timestamp}, 期望验证码=${expectedToken}`);

            if (token === expectedToken) {
                console.log('✅ 验证成功！匹配的时间窗口:', i);
                return true;
            }
        }

        console.log('❌ 验证失败，所有时间窗口都不匹配');
        
        return false;
        
    } catch (error) {
        console.error('TOTP验证失败:', error);
        return false;
    }
}

/**
 * 处理验证表单提交
 */
document.getElementById('verifyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const code = document.getElementById('verifyCode').value.trim();
    const btn = document.getElementById('verifyBtn');
    
    if (!code || code.length !== 6) {
        showToast('请输入6位验证码', 'warning');
        return;
    }
    
    // 更新按钮状态
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>验证中...';
    
    setTimeout(() => {
        if (verifyTOTP(code)) {
            // 验证成功，保存密钥
            localStorage.setItem('au_ops_auth_secret', currentSecret);
            sessionStorage.setItem('au_ops_authenticated', 'true');
            
            showToast('认证设置成功！', 'success');
            
            // 更新步骤指示器
            updateStepIndicator(3);
            
            // 延迟跳转
            setTimeout(() => {
                redirectToAdmin();
            }, 1500);
            
        } else {
            showToast('验证码错误，请重试', 'error');
            document.getElementById('verifyCode').value = '';
            document.getElementById('verifyCode').focus();
        }
        
        // 恢复按钮状态
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check me-2"></i>验证并进入后台';
        
    }, 1000);
});

/**
 * 处理登录表单提交
 */
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const code = document.getElementById('loginCode').value.trim();
    const btn = document.getElementById('loginBtn');
    const savedSecret = localStorage.getItem('au_ops_auth_secret');
    
    if (!code || code.length !== 6) {
        showToast('请输入6位验证码', 'warning');
        return;
    }
    
    if (!savedSecret) {
        showToast('认证配置丢失，请重新设置', 'error');
        resetAuth();
        return;
    }
    
    // 更新按钮状态
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>验证中...';
    
    setTimeout(() => {
        if (verifyTOTP(code, savedSecret)) {
            // 验证成功
            sessionStorage.setItem('au_ops_authenticated', 'true');
            showToast('登录成功！', 'success');
            
            // 延迟跳转
            setTimeout(() => {
                redirectToAdmin();
            }, 1000);
            
        } else {
            showToast('验证码错误，请重试', 'error');
            document.getElementById('loginCode').value = '';
            document.getElementById('loginCode').focus();
        }
        
        // 恢复按钮状态
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>登录后台';
        
    }, 1000);
});

/**
 * 重置认证设置
 */
function resetAuth() {
    if (confirm('确定要重置认证设置吗？这将清除当前的Google Authenticator配置。')) {
        localStorage.removeItem('au_ops_auth_secret');
        sessionStorage.removeItem('au_ops_authenticated');
        
        showToast('认证设置已重置', 'info');
        
        // 重新初始化
        setTimeout(() => {
            initializeAuth();
        }, 1000);
    }
}

/**
 * 跳转到后台管理
 */
function redirectToAdmin() {
    console.log('🚀 跳转到后台管理...');
    window.location.href = 'index.html';
}

/**
 * 显示提示消息
 */
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

/**
 * 显示降级二维码方案
 */
function showFallbackQRCode(otpAuthUrl) {
    const qrcodeContainer = document.getElementById('qrcode');
    if (qrcodeContainer) {
        qrcodeContainer.innerHTML = `
            <div style="border: 2px dashed #e5e7eb; padding: 20px; text-align: center; border-radius: 8px; background: #f9fafb;">
                <div style="margin-bottom: 15px;">
                    <i class="fas fa-qrcode" style="font-size: 48px; color: #6b7280;"></i>
                </div>
                <p style="margin: 0 0 15px 0; color: #374151; font-weight: 500;">
                    无法生成二维码，请手动添加账户
                </p>
                <div style="background: #ffffff; border: 1px solid #d1d5db; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <p style="margin: 0 0 10px 0; font-weight: 500; color: #374151;">账户信息：</p>
                    <div style="text-align: left; font-family: monospace; font-size: 12px; line-height: 1.5;">
                        <div><strong>账户名称：</strong> PGS Tracking System</div>
                        <div><strong>发行者：</strong> PGS Admin</div>
                        <div><strong>密钥：</strong> <span style="word-break: break-all; background: #f3f4f6; padding: 2px 4px; border-radius: 3px;">${currentSecret}</span></div>
                    </div>
                </div>
                <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">
                    <p style="margin: 0;">在Google Authenticator中：</p>
                    <p style="margin: 5px 0 0 0;">点击"+"→"手动输入密钥"→输入上方信息</p>
                </div>
            </div>
        `;
    }

    showToast('已切换到手动输入模式', 'info');
}

/**
 * 复制密钥到剪贴板
 */
function copySecret() {
    if (currentSecret) {
        navigator.clipboard.writeText(currentSecret).then(() => {
            showToast('密钥已复制到剪贴板', 'success');
        }).catch(() => {
            showToast('复制失败，请手动复制', 'warning');
        });
    }
}

// 输入框自动格式化
document.getElementById('verifyCode').addEventListener('input', function(e) {
    this.value = this.value.replace(/\D/g, '').substring(0, 6);
});

document.getElementById('loginCode').addEventListener('input', function(e) {
    this.value = this.value.replace(/\D/g, '').substring(0, 6);
});
