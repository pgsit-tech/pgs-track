# PGS Track - 部署后自动恢复CBEL配置脚本
# 在Worker部署后自动恢复KV存储中的CBEL配置

param(
    [string]$Environment = "production"
)

Write-Host "🔄 Worker部署后自动恢复CBEL配置..." -ForegroundColor Cyan
Write-Host "环境: $Environment" -ForegroundColor Yellow

# CBEL配置数据
$CBELConfig = @{
    siteConfig = @{
        site = @{
            title = "PGS 物流轨迹查询系统"
            description = "专业的物流轨迹查询服务"
            keywords = "物流,轨迹,查询,PGS"
        }
        branding = @{
            primaryColor = "#007bff"
            secondaryColor = "#6c757d"
            logoUrl = "assets/logo.svg"
            faviconUrl = "assets/favicon.svg"
        }
        api = @{
            companies = @(
                @{
                    id = "company1"
                    name = "CBEL"
                    appKey = "baMccCbpHMZLTZksk5E2E^3KH#L9lvvf"
                    appToken = "^tKm71iS7eKoQaKS5y5L8ZUDjvscOV9F#sSbGSsA6eQuMuMTfvI@yMx$dKXdZtKcVe#KycHvf8sg9oyc1inM#acvAycpD@85rbEeDZMn#EBa$c3bftirsaD_XAai5u7oWL$zgQajCl@zSojZNllxO^jpNAmJXHf0GD89LRE8I~4gm5VXmT2HS~mKS#ewOqoK~eoJhuH@v#7~$rQwGlRwCnt2nXKc$3m21#KBtI2tWIygHqW37zyLN0hMWxe_3yg"
                    priority = 1
                    enabled = $true
                }
            )
        }
        footer = @{
            companyName = "PGS 物流科技有限公司"
            copyright = "© 2025 PGS 物流科技有限公司. 保留所有权利."
            additionalInfo = "技术支持: support@pgs.com | 服务热线: 400-123-4567"
            links = @(
                @{ text = "使用条款"; url = "#" },
                @{ text = "隐私政策"; url = "#" },
                @{ text = "联系我们"; url = "#" }
            )
        }
    }
}

$WorkerUrl = "https://track-api.20990909.xyz"

# 等待Worker部署完成
Write-Host "`n⏳ 等待Worker部署完成..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 恢复站点配置
Write-Host "`n🔧 恢复站点配置到KV存储..." -ForegroundColor Cyan
try {
    $jsonBody = $CBELConfig | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Uri "$WorkerUrl/config/site" -Method POST -Body $jsonBody -ContentType "application/json" -Headers @{
        "Origin" = "https://pgs-track.pages.dev"
    }
    Write-Host "✅ 站点配置恢复成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 站点配置恢复失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 同步API配置
Write-Host "`n🔧 同步API配置..." -ForegroundColor Cyan
try {
    $apiConfig = @{
        companies = $CBELConfig.siteConfig.api.companies
    }
    $jsonBody = $apiConfig | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Uri "$WorkerUrl/config/api" -Method POST -Body $jsonBody -ContentType "application/json" -Headers @{
        "Origin" = "https://pgs-track.pages.dev"
    }
    Write-Host "✅ API配置同步成功" -ForegroundColor Green
} catch {
    Write-Host "❌ API配置同步失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 验证配置
Write-Host "`n🔍 验证配置恢复状态..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

try {
    $response = Invoke-RestMethod -Uri "$WorkerUrl/config/site" -Method GET -Headers @{
        "Origin" = "https://pgs-track.pages.dev"
        "Accept" = "application/json"
    }
    
    $companyName = $response.siteConfig.api.companies[0].name
    if ($companyName -eq "CBEL") {
        Write-Host "✅ 配置验证成功 - 数据来源: $companyName" -ForegroundColor Green
        Write-Host "`n🎉 CBEL配置自动恢复完成！" -ForegroundColor Green
        Write-Host "前端现在应该显示 '来源: CBEL' 而不是 '总公司'" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️ 配置验证失败 - 数据来源: $companyName" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ 配置验证失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 后续步骤:" -ForegroundColor Cyan
Write-Host "1. 清除浏览器缓存" -ForegroundColor White
Write-Host "2. 访问前端页面测试查询功能" -ForegroundColor White
Write-Host "3. 确认显示 '来源: CBEL'" -ForegroundColor White
