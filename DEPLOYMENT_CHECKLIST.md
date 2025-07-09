# PGS Tracking System - 部署前检查清单

## 📋 部署前必检项目

### ✅ **文件结构检查**

#### **生产文件（必须包含）**
- [ ] `index.html` - 主查询页面
- [ ] `admin/` - 后台管理系统
  - [ ] `index.html` - 管理界面
  - [ ] `auth.html` - 认证页面
  - [ ] `admin.js` - 管理逻辑
  - [ ] `auth.js` - 认证逻辑
- [ ] `config/` - 配置文件
  - [ ] `site-config.json` - 网站配置
  - [ ] `api-config.example.json` - API配置示例
- [ ] `css/` - 样式文件
- [ ] `js/` - JavaScript文件
- [ ] `assets/` - 静态资源
- [ ] `workers/` - Cloudflare Workers
- [ ] `README.md` - 项目说明
- [ ] `.gitignore` - Git忽略文件
- [ ] `wrangler.toml` - Workers配置

#### **开发文件（已移除）**
- [ ] ✅ 开发文档（*.md 报告文件）
- [ ] ✅ 测试文件（test-*.html）
- [ ] ✅ 临时脚本（start-server.py, deploy.sh）
- [ ] ✅ 开发配置（config-production.js）

### ✅ **配置文件检查**

#### **网站配置 (`config/site-config.json`)**
- [ ] 网站标题已更新为 "PGS Tracking System"
- [ ] 公司名称已更新为 "PGS"
- [ ] 联系邮箱已更新为 "support@pgs.com"
- [ ] 品牌信息完整

#### **API配置准备**
- [ ] `api-config.example.json` 存在且格式正确
- [ ] 实际的 `api-config.json` 不在仓库中（被.gitignore排除）
- [ ] Workers配置文件 `wrangler.toml` 已更新项目名称

#### **安全配置**
- [ ] `.gitignore` 包含所有敏感文件
- [ ] API密钥文件被正确排除
- [ ] 环境变量文件被排除
- [ ] 开发文件被排除

### ✅ **代码检查**

#### **品牌统一性**
- [ ] 所有 "AU-OPS" 已更新为 "PGS"
- [ ] 页面标题统一
- [ ] 导航栏品牌信息正确
- [ ] 页脚信息正确
- [ ] JavaScript注释已更新

#### **功能完整性**
- [ ] 主查询页面功能正常
- [ ] 后台管理页面可访问
- [ ] Google Authenticator认证功能正常
- [ ] 二维码生成功能正常
- [ ] 配置加载功能正常

### ✅ **安全检查**

#### **认证系统**
- [ ] Google Authenticator设置页面正常
- [ ] 二维码可以正常生成和扫描
- [ ] 验证码验证功能正常
- [ ] 后台管理需要认证才能访问

#### **API安全**
- [ ] API密钥不在代码中硬编码
- [ ] Workers代理配置正确
- [ ] CORS设置合理

### ✅ **部署准备**

#### **GitHub仓库准备**
- [ ] 仓库名称：`pgs-tracking-system`
- [ ] 分支：`main`
- [ ] 所有文件已提交
- [ ] .gitignore生效，敏感文件未提交

#### **Cloudflare Workers准备**
- [ ] Wrangler CLI已安装
- [ ] Cloudflare账户已登录
- [ ] Workers名称：`pgs-tracking-proxy`
- [ ] API密钥准备就绪

#### **Cloudflare Pages准备**
- [ ] GitHub仓库已连接
- [ ] 构建设置：Framework = None
- [ ] 构建命令：留空
- [ ] 输出目录：/

## 🚀 **部署步骤**

### **1. 创建GitHub仓库**
```bash
git init
git add .
git commit -m "Initial commit: PGS Tracking System"
git remote add origin https://github.com/your-username/pgs-tracking-system.git
git push -u origin main
```

### **2. 配置API密钥**
```bash
# 复制配置文件
cp config/api-config.example.json config/api-config.json

# 编辑API密钥（本地配置，不提交到Git）
# 在config/api-config.json中填入真实的API密钥
```

### **3. 部署Cloudflare Workers**
```bash
# 登录Cloudflare
wrangler login

# 设置API密钥（安全存储）
wrangler secret put COMPANY1_APP_KEY
wrangler secret put COMPANY1_APP_TOKEN
wrangler secret put COMPANY2_APP_KEY
wrangler secret put COMPANY2_APP_TOKEN

# 部署到生产环境
wrangler deploy --env production
```

### **4. 部署Cloudflare Pages**
1. 在Cloudflare Dashboard中连接GitHub仓库
2. 选择 `pgs-tracking-system` 仓库
3. 配置构建设置
4. 部署完成

### **5. 测试部署**
- [ ] 前端页面可正常访问
- [ ] 后台管理需要认证
- [ ] Google Authenticator设置正常
- [ ] API查询功能正常

## ⚠️ **注意事项**

### **安全提醒**
- 🔒 **绝不提交API密钥**到Git仓库
- 🔒 **定期轮换API密钥**
- 🔒 **监控访问日志**
- 🔒 **启用Cloudflare安全功能**

### **维护提醒**
- 📅 **定期备份配置**
- 📅 **监控系统性能**
- 📅 **更新依赖库**
- 📅 **检查安全补丁**

## ✅ **部署完成确认**

部署完成后，请确认以下功能：

- [ ] 主页面可以正常访问
- [ ] 查询功能正常工作
- [ ] 后台管理需要Google Authenticator认证
- [ ] 配置管理功能正常
- [ ] 所有链接和资源正常加载
- [ ] 移动端显示正常
- [ ] API代理功能正常

---

**检查完成后，PGS Tracking System即可投入生产使用！** 🎉
