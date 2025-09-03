# PGS Tracking System - 版本更新脚本
# 自动更新所有JS文件的版本号以强制清除缓存

param(
    [string]$NewVersion = $null
)

# 如果没有提供版本号，使用当前时间戳
if (-not $NewVersion) {
    $NewVersion = Get-Date -Format "yyyyMMddHHmmss"
}

Write-Host "🔄 PGS Tracking System - 版本更新工具" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📅 新版本号: $NewVersion" -ForegroundColor Yellow
Write-Host ""

# 定义需要更新的文件
$filesToUpdate = @(
    @{
        Path = "index.html"
        Pattern = '\?v=\d{14}'
        Replacement = "?v=$NewVersion"
        Description = "主页面JS文件版本"
    }
)

# 更新文件
foreach ($file in $filesToUpdate) {
    $filePath = $file.Path
    
    if (Test-Path $filePath) {
        Write-Host "🔧 更新文件: $filePath" -ForegroundColor Green
        
        try {
            # 读取文件内容
            $content = Get-Content $filePath -Raw -Encoding UTF8
            
            # 执行替换
            $newContent = $content -replace $file.Pattern, $file.Replacement
            
            # 写回文件
            Set-Content $filePath -Value $newContent -Encoding UTF8 -NoNewline
            
            Write-Host "   ✅ $($file.Description) 已更新" -ForegroundColor White
        }
        catch {
            Write-Host "   ❌ 更新失败: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "   ⚠️ 文件不存在: $filePath" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎯 版本更新完成!" -ForegroundColor Green
Write-Host ""

# 显示更新后的版本信息
Write-Host "📋 更新摘要:" -ForegroundColor Cyan
Write-Host "   - 版本号: $NewVersion" -ForegroundColor White
Write-Host "   - 更新时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host ""

# 提示下一步操作
Write-Host "🚀 下一步操作建议:" -ForegroundColor Yellow
Write-Host "   1. 检查更新结果" -ForegroundColor White
Write-Host "   2. 测试网站功能" -ForegroundColor White
Write-Host "   3. 部署到生产环境" -ForegroundColor White
Write-Host "   4. 通知用户清理缓存" -ForegroundColor White
Write-Host ""

# 询问是否要打开清理缓存页面
$openCache = Read-Host "是否要打开清理缓存页面进行测试? (y/N)"
if ($openCache -eq 'y' -or $openCache -eq 'Y') {
    Start-Process "clear-cache.html"
}

Write-Host "✨ 脚本执行完成!" -ForegroundColor Green
