# PGS Tracking System - GitHub 更新脚本

Write-Host "🔄 PGS Tracking System - 推送最新修改到GitHub" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# 1. 检查Git状态
Write-Host "1. 检查Git状态..." -ForegroundColor Yellow
try {
    $gitStatus = git status --porcelain 2>$null
    if ($gitStatus) {
        Write-Host "   📝 发现以下修改的文件:" -ForegroundColor Cyan
        $gitStatus | ForEach-Object { Write-Host "      $_" -ForegroundColor White }
    } else {
        Write-Host "   ✅ 没有发现修改的文件" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ 检查Git状态失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2. 添加所有修改的文件
Write-Host "2. 添加修改的文件..." -ForegroundColor Yellow
try {
    git add .
    Write-Host "   ✅ 文件添加成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 文件添加失败: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "按Enter键退出..."
    exit 1
}

Write-Host ""

# 3. 检查要提交的文件
Write-Host "3. 检查要提交的文件..." -ForegroundColor Yellow
try {
    $stagedFiles = git diff --cached --name-only 2>$null
    if ($stagedFiles) {
        Write-Host "   📋 将要提交的文件:" -ForegroundColor Cyan
        $stagedFiles | ForEach-Object { Write-Host "      $_" -ForegroundColor White }
    } else {
        Write-Host "   ⚠️  没有文件需要提交" -ForegroundColor Yellow
        Read-Host "按Enter键退出..."
        exit 0
    }
} catch {
    Write-Host "   ❌ 检查暂存文件失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 4. 创建提交
Write-Host "4. 创建提交..." -ForegroundColor Yellow
$commitMessage = "Update: Fix QR code generation and prepare Workers deployment

- Fix Google Authenticator QR code generation with standard APIs
- Add multiple fallback QR code services (QR Server, Google Charts, QuickChart)
- Implement manual input fallback for QR code failures
- Add Workers deployment scripts (PowerShell and Batch)
- Update CORS configuration for pgs-track.pages.dev
- Add comprehensive deployment documentation
- Update .gitignore to exclude deployment scripts"

try {
    git commit -m $commitMessage
    Write-Host "   ✅ 提交创建成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 提交创建失败: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "按Enter键退出..."
    exit 1
}

Write-Host ""

# 5. 推送到GitHub
Write-Host "5. 推送到GitHub..." -ForegroundColor Yellow
Write-Host "   🔐 如果需要认证，请输入GitHub凭据" -ForegroundColor Cyan
try {
    git push origin main
    Write-Host "   ✅ 推送到GitHub成功！" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 推送失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 可能需要Personal Access Token或检查网络连接" -ForegroundColor Yellow
    Read-Host "按Enter键继续..."
}

Write-Host ""
Write-Host "🎉 GitHub更新完成！" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：部署Cloudflare Workers" -ForegroundColor Cyan
Write-Host "运行: .\deploy-workers.ps1" -ForegroundColor White
Write-Host ""

Read-Host "按Enter键继续Workers部署..."

# 自动启动Workers部署
Write-Host "🚀 开始部署Cloudflare Workers..." -ForegroundColor Green
Write-Host ""

try {
    & ".\deploy-workers.ps1"
} catch {
    Write-Host "❌ 无法启动Workers部署脚本" -ForegroundColor Red
    Write-Host "请手动运行: .\deploy-workers.ps1" -ForegroundColor Yellow
    Read-Host "按Enter键退出..."
}
