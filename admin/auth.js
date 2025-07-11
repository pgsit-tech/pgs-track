/**
 * PGS Track 后台管理认证系统
 * 使用账号密码登录
 */

// 认证配置
const AUTH_CONFIG = {
    // 预设的管理员账号（密码经过SHA-256哈希）
    admin: {
        username: 'admin',
        // admin123 的 SHA-256 哈希值
        passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
    },
    // 会话有效期（24小时）
    sessionDuration: 24 * 60 * 60 * 1000
};

// 工具函数：计算SHA-256哈希
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 显示提示消息
function showToast(message, type = 'info') {
    // 移除现有的提示
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }

    // 创建新的提示
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} toast-message`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
        ${message}
    `;

    document.body.appendChild(toast);

    // 3秒后自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// 验证登录
async function validateLogin(username, password) {
    try {
        // 检查用户名
        if (username !== 'admin') {
            return false;
        }

        // 计算密码哈希
        const passwordHash = await sha256(password);

        // 首先检查是否有自定义密码配置
        const savedConfig = localStorage.getItem('pgs_admin_credentials');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            return passwordHash === config.passwordHash;
        }

        // 使用默认密码验证
        return passwordHash === AUTH_CONFIG.admin.passwordHash;
    } catch (error) {
        console.error('登录验证失败:', error);
        return false;
    }
}

// 设置登录状态
function setLoginSession() {
    const sessionData = {
        isLoggedIn: true,
        loginTime: Date.now(),
        expiresAt: Date.now() + AUTH_CONFIG.sessionDuration
    };
    localStorage.setItem('pgs_admin_session', JSON.stringify(sessionData));
}

// 检查登录状态
function checkLoginSession() {
    try {
        const sessionData = JSON.parse(localStorage.getItem('pgs_admin_session') || '{}');
        
        if (!sessionData.isLoggedIn) {
            return false;
        }

        // 检查是否过期
        if (Date.now() > sessionData.expiresAt) {
            localStorage.removeItem('pgs_admin_session');
            return false;
        }

        return true;
    } catch (error) {
        console.error('检查登录状态失败:', error);
        return false;
    }
}

// 处理登录表单提交
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showToast('请输入用户名和密码', 'error');
        return;
    }

    // 显示加载状态
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>登录中...';
    submitBtn.disabled = true;

    try {
        // 验证登录
        const isValid = await validateLogin(username, password);
        
        if (isValid) {
            // 设置登录会话
            setLoginSession();
            
            showToast('登录成功！正在跳转...', 'success');
            
            // 延迟跳转到后台
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showToast('用户名或密码错误', 'error');
        }
    } catch (error) {
        console.error('登录失败:', error);
        showToast('登录失败，请重试', 'error');
    } finally {
        // 恢复按钮状态
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 PGS Track 认证系统初始化');

    // 检查是否已经登录
    if (checkLoginSession()) {
        showToast('您已经登录，正在跳转...', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        return;
    }

    // 绑定登录表单事件
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 输入框回车登录
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    console.log('✅ 认证系统初始化完成');
});

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
