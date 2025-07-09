# PGS Tracking System - Git Setup PowerShell Script

Write-Host "正在配置Git和推送到GitHub..." -ForegroundColor Green
Write-Host ""

# 1. 配置Git用户信息
Write-Host "1. 配置Git用户信息..." -ForegroundColor Yellow
try {
    git config --global user.name "PGS-IT"
    git config --global user.email "itsupport@parisigs.com"
    Write-Host "   ✅ Git用户信息配置成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Git用户信息配置失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2. 初始化Git仓库
Write-Host "2. 初始化Git仓库..." -ForegroundColor Yellow
try {
    git init
    Write-Host "   ✅ Git仓库初始化成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Git仓库初始化失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. 添加远程仓库
Write-Host "3. 添加远程仓库..." -ForegroundColor Yellow
try {
    git remote add origin https://github.com/pgsit-tech/pgs-track.git
    Write-Host "   ✅ 远程仓库添加成功" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  远程仓库可能已存在，继续..." -ForegroundColor Yellow
}

Write-Host ""

# 4. 添加所有文件
Write-Host "4. 添加所有文件..." -ForegroundColor Yellow
try {
    git add .
    Write-Host "   ✅ 文件添加成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 文件添加失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 5. 创建初始提交
Write-Host "5. 创建初始提交..." -ForegroundColor Yellow
try {
    git commit -m "Initial commit: PGS Tracking System"
    Write-Host "   ✅ 初始提交创建成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 初始提交创建失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 6. 设置主分支
Write-Host "6. 设置主分支..." -ForegroundColor Yellow
try {
    git branch -M main
    Write-Host "   ✅ 主分支设置成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 主分支设置失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 7. 推送到GitHub
Write-Host "7. 推送到GitHub..." -ForegroundColor Yellow
Write-Host "   注意：如果需要认证，请输入GitHub用户名和Personal Access Token" -ForegroundColor Cyan
try {
    git push -u origin main
    Write-Host "   ✅ 推送到GitHub成功！" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 推送失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 可能需要设置Personal Access Token或检查网络连接" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Git配置和推送完成！" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. 访问 https://github.com/pgsit-tech/pgs-track 确认文件已上传" -ForegroundColor White
Write-Host "2. 配置Cloudflare Pages连接到此仓库" -ForegroundColor White
Write-Host "3. 部署Cloudflare Workers" -ForegroundColor White
Write-Host ""

# 暂停以查看结果
Read-Host "按Enter键退出..."
