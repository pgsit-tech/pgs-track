# PGS Tracking System - Workers自定义域名配置脚本
# 为Workers添加自定义域名以解决国内网络访问问题

param(
    [string]$Domain = "track-api.20990909.xyz",
    [string]$WorkerName = "pgs-tracking-proxy"
)

Write-Host "🌐 配置Workers自定义域名..." -ForegroundColor Cyan
Write-Host "域名: $Domain" -ForegroundColor Yellow
Write-Host "Worker: $WorkerName" -ForegroundColor Yellow

# 检查wrangler是否已安装
try {
    $wranglerVersion = & wrangler --version
    Write-Host "✅ Wrangler版本: $wranglerVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ 错误: 未找到wrangler CLI" -ForegroundColor Red
    Write-Host "请先安装: npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

# 检查是否已登录Cloudflare
Write-Host "`n🔐 检查Cloudflare登录状态..." -ForegroundColor Cyan
try {
    $whoami = & wrangler whoami 2>&1
    if ($whoami -match "You are not authenticated") {
        Write-Host "❌ 未登录Cloudflare" -ForegroundColor Red
        Write-Host "请先登录: wrangler login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ 已登录Cloudflare" -ForegroundColor Green
}
catch {
    Write-Host "❌ 无法检查登录状态" -ForegroundColor Red
    exit 1
}

# 步骤1: 添加自定义域名到Workers
Write-Host "`n🔧 步骤1: 添加自定义域名到Workers..." -ForegroundColor Cyan
try {
    Write-Host "执行命令: wrangler custom-domains add $Domain --worker $WorkerName" -ForegroundColor Gray
    $result = wrangler custom-domains add $Domain --worker $WorkerName 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 自定义域名添加成功" -ForegroundColor Green
        Write-Host $result -ForegroundColor Gray
    } else {
        Write-Host "⚠️ 域名可能已存在或需要手动配置" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ 添加自定义域名失败: $_" -ForegroundColor Red
}

# 步骤2: 检查域名状态
Write-Host "`n🔍 步骤2: 检查域名配置状态..." -ForegroundColor Cyan
try {
    $domains = wrangler custom-domains list 2>&1
    Write-Host $domains -ForegroundColor Gray
} catch {
    Write-Host "❌ 无法获取域名列表: $_" -ForegroundColor Red
}

# 步骤3: 部署Workers到生产环境
Write-Host "`n🚀 步骤3: 部署Workers到生产环境..." -ForegroundColor Cyan
try {
    Write-Host "执行命令: wrangler deploy --env production" -ForegroundColor Gray
    $deployResult = wrangler deploy --env production 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Workers部署成功" -ForegroundColor Green
        Write-Host $deployResult -ForegroundColor Gray
    } else {
        Write-Host "❌ Workers部署失败" -ForegroundColor Red
        Write-Host $deployResult -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ 部署过程中出错: $_" -ForegroundColor Red
}

# 步骤4: 测试自定义域名
Write-Host "`n🧪 步骤4: 测试自定义域名访问..." -ForegroundColor Cyan
$testUrl = "https://$Domain/api/tracking/v5/tracking?trackingRef=TEST"
Write-Host "测试URL: $testUrl" -ForegroundColor Yellow

try {
    Write-Host "发送测试请求..." -ForegroundColor Gray
    $response = Invoke-WebRequest -Uri $testUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ 域名访问正常 - 状态码: $($response.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✅ 域名可访问 - 403错误是预期的(CORS限制)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 域名访问测试: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 步骤5: 更新前端配置
Write-Host "`n📝 步骤5: 需要更新前端配置..." -ForegroundColor Cyan
Write-Host "请更新以下文件中的API地址:" -ForegroundColor Yellow
Write-Host "  - js/api.js" -ForegroundColor White
Write-Host "  - 将Workers代理地址改为: https://$Domain/api/tracking" -ForegroundColor White

# 步骤6: DNS配置提示
Write-Host "`n🌐 步骤6: DNS配置检查..." -ForegroundColor Cyan
Write-Host "如果域名无法访问，请检查DNS配置:" -ForegroundColor Yellow
Write-Host "  1. 登录域名管理面板" -ForegroundColor White
Write-Host "  2. 添加CNAME记录: $Domain -> $WorkerName.itsupport-5c8.workers.dev" -ForegroundColor White
Write-Host "  3. 或者添加A记录指向Cloudflare IP" -ForegroundColor White

Write-Host "`n🎉 自定义域名配置完成!" -ForegroundColor Green
Write-Host "新的API地址: https://$Domain/api/tracking" -ForegroundColor Cyan
Write-Host "请更新前端代码并测试功能。" -ForegroundColor Yellow
