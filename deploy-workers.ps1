# PGS Tracking System - Cloudflare Workers 部署脚本
# 更新日期: 2025-01-03

Write-Host "🚀 PGS Tracking System - Workers 部署脚本" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# 检查Wrangler是否已安装
Write-Host "📋 检查Wrangler CLI..." -ForegroundColor Yellow
try {
    $wranglerVersion = wrangler --version
    Write-Host "✅ Wrangler已安装: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler未安装，正在安装..." -ForegroundColor Red
    npm install -g wrangler
    Write-Host "✅ Wrangler安装完成" -ForegroundColor Green
}

# 检查登录状态
Write-Host "🔐 检查Cloudflare登录状态..." -ForegroundColor Yellow
try {
    $whoami = wrangler whoami
    Write-Host "✅ 已登录Cloudflare: $whoami" -ForegroundColor Green
} catch {
    Write-Host "❌ 未登录Cloudflare，请先登录..." -ForegroundColor Red
    wrangler login
    Write-Host "✅ 登录完成" -ForegroundColor Green
}

# 显示当前修改说明
Write-Host "📝 当前版本修改内容:" -ForegroundColor Cyan
Write-Host "   1. 🌐 替换CDN资源为国内可访问链接" -ForegroundColor White
Write-Host "   2. 🔇 优化控制台日志输出" -ForegroundColor White
Write-Host "   3. 🚫 屏蔽备选API查询，只使用官网API" -ForegroundColor White
Write-Host ""

# 询问是否继续部署
$continue = Read-Host "是否继续部署到生产环境? (y/N)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "❌ 部署已取消" -ForegroundColor Red
    exit 1
}

# 部署到生产环境
Write-Host "🚀 开始部署到生产环境..." -ForegroundColor Yellow
try {
    wrangler deploy --env production
    Write-Host "✅ Workers部署成功!" -ForegroundColor Green
} catch {
    Write-Host "❌ Workers部署失败: $_" -ForegroundColor Red
    exit 1
}

# 验证部署
Write-Host "🔍 验证部署状态..." -ForegroundColor Yellow
try {
    wrangler deployments list --env production
    Write-Host "✅ 部署验证完成" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 无法验证部署状态，但部署可能已成功" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 部署完成!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "📋 后续步骤:" -ForegroundColor Cyan
Write-Host "   1. 访问 https://pgs-track.pages.dev 测试前端功能" -ForegroundColor White
Write-Host "   2. 测试物流轨迹查询功能" -ForegroundColor White
Write-Host "   3. 检查控制台日志是否已优化" -ForegroundColor White
Write-Host "   4. 确认只使用官网API进行查询" -ForegroundColor White
Write-Host ""
Write-Host "⚠️ 注意事项:" -ForegroundColor Yellow
Write-Host "   - 已屏蔽AU-OPS API备选查询" -ForegroundColor White
Write-Host "   - 只使用官网API: cbel.pgs-log.com" -ForegroundColor White
Write-Host "   - 生产环境日志已优化，只显示错误信息" -ForegroundColor White
Write-Host ""

# 询问是否打开测试页面
$openTest = Read-Host "是否打开测试页面? (y/N)"
if ($openTest -eq "y" -or $openTest -eq "Y") {
    Start-Process "https://pgs-track.pages.dev"
}

Write-Host "✅ 脚本执行完成!" -ForegroundColor Green
