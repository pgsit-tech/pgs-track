# PGS Tracking System - GitHub 设置指南

## 📋 GitHub账号和仓库信息

- **GitHub账号**: itsupport@parisigs.com
- **用户名**: PGS-IT
- **仓库地址**: https://github.com/pgsit-tech/pgs-track.git
- **仓库名称**: pgs-track

## 🚀 快速部署方法

### 方法1: 使用批处理文件（推荐）

1. **运行自动化脚本**
   ```bash
   # 在项目目录中运行
   setup-git.bat
   ```

2. **按提示操作**
   - 脚本会自动配置Git用户信息
   - 初始化仓库并添加远程地址
   - 提交所有文件并推送到GitHub

### 方法2: 手动执行命令

如果批处理文件无法运行，请手动执行以下命令：

#### 步骤1: 配置Git用户信息
```bash
git config --global user.name "PGS-IT"
git config --global user.email "itsupport@parisigs.com"
```

#### 步骤2: 初始化Git仓库
```bash
git init
```

#### 步骤3: 添加远程仓库
```bash
git remote add origin https://github.com/pgsit-tech/pgs-track.git
```

#### 步骤4: 添加文件并提交
```bash
git add .
git commit -m "Initial commit: PGS Tracking System"
```

#### 步骤5: 推送到GitHub
```bash
git branch -M main
git push -u origin main
```

## 🔐 认证设置

### 如果需要身份验证

1. **使用Personal Access Token**
   - 在GitHub设置中生成Personal Access Token
   - 推送时使用Token作为密码

2. **或者使用GitHub CLI**
   ```bash
   gh auth login
   ```

## 📁 确认文件结构

推送前请确认以下文件存在：

```
pgs-track/
├── README.md                    ✅
├── DEPLOYMENT_CHECKLIST.md     ✅
├── index.html                   ✅
├── admin/                       ✅
├── config/                      ✅
├── css/                         ✅
├── js/                          ✅
├── assets/                      ✅
├── workers/                     ✅
├── .gitignore                   ✅
└── wrangler.toml               ✅
```

## ⚠️ 重要提醒

### 推送前检查

- [ ] 确认 `.gitignore` 文件存在
- [ ] 确认敏感文件（API密钥）不在仓库中
- [ ] 确认所有开发文件已清理
- [ ] 确认项目名称已更新为PGS

### 推送后验证

1. **访问GitHub仓库**
   - https://github.com/pgsit-tech/pgs-track

2. **检查文件完整性**
   - 确认所有必要文件已上传
   - 确认敏感文件未上传

3. **检查README显示**
   - 确认README.md正确显示

## 🌐 Cloudflare Pages 部署

推送成功后，继续Cloudflare Pages部署：

### 1. 连接GitHub仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Pages** 页面
3. 点击 **Create a project**
4. 选择 **Connect to Git**
5. 选择 `pgsit-tech/pgs-track` 仓库

### 2. 配置构建设置

```
Project name: pgs-tracking-system
Production branch: main
Framework preset: None
Build command: (留空)
Build output directory: /
Root directory: (留空)
```

### 3. 部署完成

- Pages会自动部署
- 获得URL如：`https://pgs-tracking-system.pages.dev`

## 🔧 Workers 部署

### 1. 安装Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录Cloudflare

```bash
wrangler login
```

### 3. 设置API密钥

```bash
wrangler secret put COMPANY1_APP_KEY
wrangler secret put COMPANY1_APP_TOKEN
wrangler secret put COMPANY2_APP_KEY
wrangler secret put COMPANY2_APP_TOKEN
```

### 4. 部署Workers

```bash
wrangler deploy --env production
```

## 📞 故障排除

### 常见问题

1. **Git命令不识别**
   - 确认Git已安装
   - 重启命令行工具

2. **推送被拒绝**
   - 检查仓库权限
   - 确认GitHub账号正确

3. **认证失败**
   - 使用Personal Access Token
   - 或使用GitHub CLI登录

### 获取帮助

如果遇到问题，请：
1. 检查错误信息
2. 参考GitHub官方文档
3. 联系技术支持

---

**完成GitHub设置后，PGS Tracking System即可投入生产使用！** 🎉
