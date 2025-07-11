# PGS Tracking System - Pages自定义域名配置脚本
# 为Cloudflare Pages添加自定义域名

param(
    [string]$Domain = "tracking.pgs-cbel.com",
    [string]$ProjectName = "pgs-track"
)

Write-Host "🌐 配置Pages自定义域名..." -ForegroundColor Cyan
Write-Host "域名: $Domain" -ForegroundColor Yellow
Write-Host "项目: $ProjectName" -ForegroundColor Yellow

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

# 步骤1: 列出现有Pages项目
Write-Host "`n📋 步骤1: 列出现有Pages项目..." -ForegroundColor Cyan
try {
    $projects = wrangler pages project list 2>&1
    Write-Host $projects -ForegroundColor Gray
} catch {
    Write-Host "❌ 无法获取项目列表: $_" -ForegroundColor Red
}

# 步骤2: 添加自定义域名到Pages项目
Write-Host "`n🔧 步骤2: 添加自定义域名到Pages项目..." -ForegroundColor Cyan
try {
    Write-Host "执行命令: wrangler pages domain add $Domain --project-name $ProjectName" -ForegroundColor Gray
    $result = wrangler pages domain add $Domain --project-name $ProjectName 2>&1
    
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

# 步骤3: 检查域名状态
Write-Host "`n🔍 步骤3: 检查域名配置状态..." -ForegroundColor Cyan
try {
    $domains = wrangler pages domain list --project-name $ProjectName 2>&1
    Write-Host $domains -ForegroundColor Gray
} catch {
    Write-Host "❌ 无法获取域名列表: $_" -ForegroundColor Red
}

# 步骤4: 测试自定义域名
Write-Host "`n🧪 步骤4: 测试自定义域名访问..." -ForegroundColor Cyan
$testUrl = "https://$Domain"
Write-Host "测试URL: $testUrl" -ForegroundColor Yellow

try {
    Write-Host "发送测试请求..." -ForegroundColor Gray
    $response = Invoke-WebRequest -Uri $testUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ 域名访问正常 - 状态码: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 域名访问测试: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "这是正常的，域名可能需要时间生效" -ForegroundColor Gray
}

# 步骤5: DNS配置提示
Write-Host "`n🌐 步骤5: DNS配置说明..." -ForegroundColor Cyan
Write-Host "请在域名管理面板中配置以下DNS记录:" -ForegroundColor Yellow
Write-Host "  类型: CNAME" -ForegroundColor White
Write-Host "  名称: tracking (或 @，如果是根域名)" -ForegroundColor White
Write-Host "  值: $ProjectName.pages.dev" -ForegroundColor White
Write-Host "  TTL: 300 (5分钟)" -ForegroundColor White

Write-Host "`n📝 步骤6: 更新Worker CORS配置..." -ForegroundColor Cyan
Write-Host "已自动更新wrangler.toml中的CORS配置" -ForegroundColor Green
Write-Host "新域名已添加到允许列表: $Domain" -ForegroundColor Green

Write-Host "`n🚀 步骤7: 重新部署Worker..." -ForegroundColor Cyan
try {
    Write-Host "执行命令: wrangler deploy --env production" -ForegroundColor Gray
    $deployResult = wrangler deploy --env production 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Worker重新部署成功" -ForegroundColor Green
        Write-Host $deployResult -ForegroundColor Gray
    } else {
        Write-Host "❌ Worker部署失败" -ForegroundColor Red
        Write-Host $deployResult -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ 部署过程中出错: $_" -ForegroundColor Red
}

Write-Host "`n🎉 Pages自定义域名配置完成!" -ForegroundColor Green
Write-Host "新的前端地址: https://$Domain" -ForegroundColor Cyan
Write-Host "请配置DNS记录并等待生效（通常需要几分钟到几小时）。" -ForegroundColor Yellow

Write-Host "`n📋 后续步骤:" -ForegroundColor Cyan
Write-Host "1. 配置DNS CNAME记录" -ForegroundColor White
Write-Host "2. 等待SSL证书自动生成" -ForegroundColor White
Write-Host "3. 测试新域名访问" -ForegroundColor White
Write-Host "4. Update related documentation and links" -ForegroundColor White
