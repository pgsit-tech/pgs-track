const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// 启用CORS
app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
    credentials: true
}));

// 静态文件服务
app.use(express.static('.'));

// API代理配置
const apiProxy = createProxyMiddleware({
    target: 'https://ws.ai-ops.vip',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/edi/web-services'
    },
    onProxyReq: (proxyReq, req, res) => {
        // 添加必要的请求头
        proxyReq.setHeader('appKey', 'baMccCbpHMZLTZksk5E2E^3KH#L9lvvf');
        proxyReq.setHeader('appToken', 'your-token-here'); // 需要替换为实际token
        proxyReq.setHeader('Request-Origion', 'SwaggerBootstrapUi');
        proxyReq.setHeader('accept', 'application/json');
        
        console.log('🔄 代理请求:', req.method, req.url);
        console.log('🎯 目标地址:', proxyReq.getHeader('host') + proxyReq.path);
    },
    onError: (err, req, res) => {
        console.error('❌ 代理错误:', err.message);
        res.status(500).json({ error: '代理服务器错误' });
    }
});

// 应用API代理
app.use('/api', apiProxy);

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 代理服务器启动成功！`);
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    console.log(`🔧 API代理: /api/* -> https://ws.ai-ops.vip/edi/web-services/*`);
});
