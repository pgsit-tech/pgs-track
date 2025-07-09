# PGS Tracking System

> 专业的物流轨迹查询系统，支持多种单号格式查询

## 🎯 项目简介

PGS Tracking System 是一个基于现代Web技术构建的物流轨迹查询系统，提供简洁高效的查询界面和强大的后台管理功能。

### ✨ 核心特性

- 🔍 **智能识别**: 自动识别JobNum、PO号、跟踪号等多种单号格式
- 🚀 **批量查询**: 支持最多50个单号同时查询
- 🌐 **多公司汇聚**: 自动查询所有分公司API，提高成功率
- 📱 **响应式设计**: 完美适配桌面、平板、手机设备
- 🔒 **安全认证**: Google Authenticator双重认证保护
- ⚙️ **可视化配置**: 完整的后台管理和配置系统

## 🏗️ 技术架构

### 前端技术栈
- **HTML5 + CSS3**: 现代化的页面结构和样式
- **Bootstrap 5.3**: 响应式UI框架
- **JavaScript ES6+**: 原生JavaScript，无框架依赖
- **Font Awesome**: 图标库

### 后端架构
- **Cloudflare Pages**: 静态网站托管
- **Cloudflare Workers**: API代理和跨域处理
- **JSON配置**: 灵活的配置管理系统

### 安全特性
- **Google Authenticator**: TOTP双重认证
- **API密钥保护**: Workers环境变量安全存储
- **CORS控制**: 严格的跨域访问控制

## 📁 项目结构

```
pgs-tracking-system/
├── index.html              # 主查询页面
├── admin/                  # 后台管理
│   ├── index.html         # 管理界面
│   ├── auth.html          # 认证页面
│   ├── admin.js           # 管理逻辑
│   └── auth.js            # 认证逻辑
├── config/                 # 配置文件
│   ├── site-config.json   # 网站配置
│   └── api-config.example.json # API配置示例
├── css/                    # 样式文件
├── js/                     # JavaScript文件
├── assets/                 # 静态资源
├── workers/                # Cloudflare Workers
├── archive/                # 存档文件
├── .gitignore             # Git忽略文件
├── wrangler.toml          # Workers配置
└── README.md              # 项目说明
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/pgs-tracking-system.git
cd pgs-tracking-system
```

### 2. 本地开发

```bash
# 启动本地服务器（Python 3）
python -m http.server 8080

# 访问系统
# 前端: http://localhost:8080
# 后台: http://localhost:8080/admin/
```

### 3. 配置系统

1. **复制配置文件**
   ```bash
   cp config/api-config.example.json config/api-config.json
   ```

2. **编辑配置**
   - 修改 `config/site-config.json` 中的网站信息
   - 配置 `config/api-config.json` 中的API密钥

3. **访问后台管理**
   - 访问 `/admin/` 进行可视化配置
   - 首次访问需要设置Google Authenticator

## 🌐 生产部署

### 1. Cloudflare Workers部署

```bash
# 安装Wrangler CLI
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 设置API密钥
wrangler secret put COMPANY1_APP_KEY
wrangler secret put COMPANY1_APP_TOKEN

# 部署Workers
wrangler deploy --env production
```

### 2. Cloudflare Pages部署

1. 连接GitHub仓库到Cloudflare Pages
2. 配置构建设置：
   - **Framework**: None
   - **Build command**: (留空)
   - **Build output directory**: /
3. 设置环境变量
4. 部署完成

## ⚙️ 配置管理

### 网站配置 (`config/site-config.json`)

```json
{
  "site": {
    "title": "PGS Tracking System",
    "subtitle": "专业的物流轨迹查询平台"
  },
  "branding": {
    "logoUrl": "assets/logo.svg",
    "companyName": "PGS"
  }
}
```

## 🔒 安全认证

### Google Authenticator设置

1. 访问后台管理页面
2. 扫描二维码或手动输入密钥
3. 输入验证码完成设置
4. 日常访问需要输入验证码

### API密钥安全

- 使用Cloudflare Workers Secrets存储
- 不在代码中硬编码密钥
- 定期轮换API密钥

## 📱 功能特性

### 查询功能
- **自动识别**: 支持6种单号格式自动识别
- **批量查询**: 最多50个单号同时查询
- **多公司汇聚**: 自动查询所有分公司API
- **智能展示**: 根据查询数量智能选择展示方式

### 管理功能
- **网站配置**: 标题、描述、关键词等
- **品牌设置**: Logo、颜色、公司信息
- **页脚配置**: 版权、联系方式、链接
- **帮助信息**: 支持格式、功能特性、使用技巧

## 📞 支持

- 📧 邮箱: support@pgs.com
- 📱 电话: 400-123-4567
- 🌐 网站: https://pgs.com

## 📄 许可证

本项目采用 MIT 许可证。

---

**PGS Tracking System** - 让物流轨迹查询更简单、更高效！ 🚀
