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

# 检查现有worker状态
Write-Host "🔍 检查现有worker状态..." -ForegroundColor Yellow
try {
    $deployments = wrangler deployments list --name pgs-tracking-proxy 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 找到现有worker: pgs-tracking-proxy" -ForegroundColor Green
        Write-Host "   - 将更新现有worker，保留所有环境变量" -ForegroundColor White
    } else {
        Write-Host "ℹ️ 未找到现有worker，将创建新的worker" -ForegroundColor Blue
    }
} catch {
    Write-Host "⚠️ 无法检查worker状态，继续部署..." -ForegroundColor Yellow
}

# 显示当前修改说明
Write-Host "📝 当前版本修改内容:" -ForegroundColor Cyan
Write-Host "   1. 🌐 修复CDN资源加载问题（使用bootcdn.net）" -ForegroundColor White
Write-Host "   2. 🔇 优化控制台日志输出" -ForegroundColor White
Write-Host "   3. 🚫 屏蔽备选API查询，只使用官网API" -ForegroundColor White
Write-Host "   4. 🐛 修复JavaScript错误（loadQueryHistory未定义）" -ForegroundColor White
Write-Host ""

Write-Host "⚠️ 重要提醒:" -ForegroundColor Yellow
Write-Host "   - 此部署将更新现有worker代码" -ForegroundColor White
Write-Host "   - 现有环境变量和KV存储将被保留" -ForegroundColor White
Write-Host "   - 不会影响现有的配置数据" -ForegroundColor White
Write-Host ""

# 询问是否继续部署
$continue = Read-Host "确认更新现有worker? (y/N)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "❌ 部署已取消" -ForegroundColor Red
    exit 1
}

# 部署到生产环境
Write-Host "🚀 开始更新worker..." -ForegroundColor Yellow
Write-Host "   - 使用配置文件: wrangler.toml" -ForegroundColor White
Write-Host "   - 保留现有环境变量和KV绑定" -ForegroundColor White
Write-Host ""

try {
    # 使用生产环境配置部署
    wrangler deploy --env production
    Write-Host "✅ Worker更新成功!" -ForegroundColor Green
} catch {
    Write-Host "❌ Worker更新失败: $_" -ForegroundColor Red
    Write-Host "💡 可能的解决方案:" -ForegroundColor Yellow
    Write-Host "   1. 检查网络连接" -ForegroundColor White
    Write-Host "   2. 确认Cloudflare账户权限" -ForegroundColor White
    Write-Host "   3. 检查wrangler.toml配置" -ForegroundColor White
    exit 1
}

# 验证部署
Write-Host "🔍 验证worker更新状态..." -ForegroundColor Yellow
try {
    $latestDeployment = wrangler deployments list --name pgs-tracking-proxy | Select-Object -First 5
    Write-Host "✅ Worker更新验证完成" -ForegroundColor Green
    Write-Host "📊 最新部署信息:" -ForegroundColor Cyan
    Write-Host $latestDeployment -ForegroundColor White
} catch {
    Write-Host "⚠️ 无法验证部署状态，但更新可能已成功" -ForegroundColor Yellow
}

# 检查KV存储状态
Write-Host "🗂️ 检查KV存储状态..." -ForegroundColor Yellow
try {
    wrangler kv namespace list | Where-Object { $_ -match "CONFIG_KV" } | ForEach-Object {
        Write-Host "✅ KV存储正常: $_" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ 无法检查KV存储状态" -ForegroundColor Yellow
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
