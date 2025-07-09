@echo off
echo 正在配置Git和推送到GitHub...

echo.
echo 1. 配置Git用户信息...
git config --global user.name "PGS-IT"
git config --global user.email "itsupport@parisigs.com"

echo.
echo 2. 初始化Git仓库...
git init

echo.
echo 3. 添加远程仓库...
git remote add origin https://github.com/pgsit-tech/pgs-track.git

echo.
echo 4. 添加所有文件...
git add .

echo.
echo 5. 创建初始提交...
git commit -m "Initial commit: PGS Tracking System"

echo.
echo 6. 推送到GitHub...
git branch -M main
git push -u origin main

echo.
echo Git配置和推送完成！
pause
