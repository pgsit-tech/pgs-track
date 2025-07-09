# PGS Tracking System - Cloudflare Workers 部署指南

## 🎯 当前状态

- ✅ **GitHub仓库**: https://github.com/pgsit-tech/pgs-track.git
- ✅ **Cloudflare Pages**: https://pgs-track.pages.dev
- ⏳ **Cloudflare Workers**: 待部署

## 🚀 Workers 部署步骤

### 方法1: 使用自动化脚本（推荐）

#### PowerShell脚本
```powershell
.\deploy-workers.ps1
```

#### 批处理脚本
```batch
deploy-workers.bat
```

### 方法2: 手动部署

#### 1. 安装Wrangler CLI
```bash
npm install -g wrangler
```

#### 2. 登录Cloudflare
```bash
wrangler login
```
> 这会打开浏览器，请完成登录

#### 3. 验证登录
```bash
wrangler whoami
```

#### 4. 设置API密钥
```bash
# 公司1 API密钥
wrangler secret put COMPANY1_APP_KEY
wrangler secret put COMPANY1_APP_TOKEN

# 公司2 API密钥（如果有）
wrangler secret put COMPANY2_APP_KEY
wrangler secret put COMPANY2_APP_TOKEN
```

#### 5. 部署Workers
```bash
wrangler deploy --env production
```

## 🔧 配置说明

### Workers配置文件 (`wrangler.toml`)
```toml
name = "pgs-tracking-proxy"
main = "workers/proxy.js"
compatibility_date = "2024-01-01"

[env.production]
name = "pgs-tracking-proxy"

[vars]
ENVIRONMENT = "production"
API_BASE_URL = "https://prod.au-ops.com/edi/web-services"
CORS_ORIGINS = "https://pgs-track.pages.dev,https://localhost:8080"
```

### CORS配置
Workers已配置允许以下域名访问：
- `https://pgs-track.pages.dev` (生产环境)
- `http://localhost:8080` (本地开发)

## 🔐 API密钥管理

### 密钥格式
- `COMPANY1_APP_KEY`: 公司1的应用密钥
- `COMPANY1_APP_TOKEN`: 公司1的应用令牌
- `COMPANY2_APP_KEY`: 公司2的应用密钥（可选）
- `COMPANY2_APP_TOKEN`: 公司2的应用令牌（可选）

### 安全提醒
- ✅ API密钥通过Wrangler Secrets安全存储
- ✅ 密钥不会出现在代码中
- ✅ 只有授权域名可以访问API

## 📱 二维码问题修复

### 修复内容
1. **使用标准QR码API**: 
   - QR Server API (主要)
   - Google Charts API (备用)
   - QuickChart API (备用)

2. **多重降级方案**:
   - 在线API失败 → 手动输入界面
   - 提供完整的账户信息
   - 一键复制密钥功能

3. **用户体验优化**:
   - 清晰的扫描说明
   - 手动输入切换按钮
   - 友好的错误处理

### 测试二维码
1. 访问: https://pgs-track.pages.dev/admin/auth.html
2. 查看二维码是否正常生成
3. 使用Google Authenticator扫描测试
4. 如果扫描失败，点击"手动输入"

## 🌐 部署后验证

### 1. 检查Workers状态
```bash
wrangler deployments list --env production
```

### 2. 测试API代理
```bash
curl "https://pgs-tracking-proxy.your-account.workers.dev/api/tracking/v5/tracking?trackingRef=test"
```

### 3. 测试前端功能
- 访问: https://pgs-track.pages.dev
- 测试查询功能
- 检查API调用是否正常

### 4. 测试后台管理
- 访问: https://pgs-track.pages.dev/admin/
- 测试Google Authenticator认证
- 检查配置管理功能

## ⚠️ 故障排除

### 常见问题

#### 1. Wrangler登录失败
```bash
# 清除缓存重新登录
wrangler logout
wrangler login
```

#### 2. API密钥设置失败
```bash
# 检查密钥列表
wrangler secret list

# 重新设置密钥
wrangler secret put COMPANY1_APP_KEY
```

#### 3. Workers部署失败
- 检查 `wrangler.toml` 配置
- 确认账户权限
- 检查网络连接

#### 4. CORS错误
- 确认域名在 `ALLOWED_ORIGINS` 中
- 检查Workers部署状态
- 验证API调用路径

### 获取帮助
- Cloudflare Workers文档: https://developers.cloudflare.com/workers/
- Wrangler CLI文档: https://developers.cloudflare.com/workers/wrangler/

## 🎉 部署完成检查清单

部署完成后，请确认：

- [ ] Workers成功部署
- [ ] API密钥正确设置
- [ ] CORS配置正确
- [ ] 前端可以正常调用API
- [ ] Google Authenticator二维码可以扫描
- [ ] 后台管理功能正常
- [ ] 查询功能正常工作

---

**完成Workers部署后，PGS Tracking System将完全投入生产使用！** 🚀
