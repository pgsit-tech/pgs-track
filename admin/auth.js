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
    initializeAuth();
});

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
        // 生成随机密钥
        currentSecret = generateRandomSecret();
        
        // 创建TOTP对象
        totp = new OTPAuth.TOTP({
            issuer: AUTH_CONFIG.issuer,
            label: AUTH_CONFIG.label,
            algorithm: AUTH_CONFIG.algorithm,
            digits: AUTH_CONFIG.digits,
            period: AUTH_CONFIG.period,
            secret: currentSecret
        });
        
        // 显示密钥
        document.getElementById('secretKey').textContent = currentSecret;
        
        // 生成二维码
        const otpAuthUrl = totp.toString();
        console.log('生成的OTP URL:', otpAuthUrl);

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

        try {
            QRCode.toCanvas(qrcodeContainer, otpAuthUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#2563eb',
                    light: '#ffffff'
                }
            }, function(error) {
                if (error) {
                    console.error('二维码生成失败:', error);
                    showToast('二维码生成失败，已切换到手动模式', 'warning');
                } else {
                    console.log('✅ 二维码生成成功');
                }
            });
        } catch (error) {
            console.error('二维码库加载失败:', error);
            showFallbackQRCode(otpAuthUrl);
        }
        
    } catch (error) {
        console.error('密钥生成失败:', error);
        showToast('密钥生成失败', 'error');
    }
}

/**
 * 生成随机密钥
 */
function generateRandomSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
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
            secret: secretToUse
        });
        
        // 验证当前时间窗口和前后一个时间窗口
        const currentTime = Math.floor(Date.now() / 1000);
        const window = AUTH_CONFIG.period;
        
        for (let i = -1; i <= 1; i++) {
            const timeStep = currentTime + (i * window);
            const expectedToken = totpInstance.generate({ timestamp: timeStep * 1000 });
            
            if (token === expectedToken) {
                return true;
            }
        }
        
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
