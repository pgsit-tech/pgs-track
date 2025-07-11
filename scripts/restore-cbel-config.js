/**
 * PGS Track - CBEL配置自动恢复脚本
 * 在Worker重新部署后自动恢复CBEL API配置到KV存储
 */

const CBEL_CONFIG = {
    siteConfig: {
        site: {
            title: "PGS 物流轨迹查询系统",
            description: "专业的物流轨迹查询服务",
            keywords: "物流,轨迹,查询,PGS"
        },
        branding: {
            primaryColor: "#007bff",
            secondaryColor: "#6c757d",
            logoUrl: "assets/logo.svg",
            faviconUrl: "assets/favicon.svg"
        },
        api: {
            companies: [
                {
                    id: "company1",
                    name: "CBEL",
                    appKey: "baMccCbpHMZLTZksk5E2E^3KH#L9lvvf",
                    appToken: "^tKm71iS7eKoQaKS5y5L8ZUDjvscOV9F#sSbGSsA6eQuMuMTfvI@yMx$dKXdZtKcVe#KycHvf8sg9oyc1inM#acvAycpD@85rbEeDZMn#EBa$c3bftirsaD_XAai5u7oWL$zgQajCl@zSojZNllxO^jpNAmJXHf0GD89LRE8I~4gm5VXmT2HS~mKS#ewOqoK~eoJhuH@v#7~$rQwGlRwCnt2nXKc$3m21#KBtI2tWIygHqW37zyLN0hMWxe_3yg",
                    priority: 1,
                    enabled: true
                }
            ]
        },
        footer: {
            companyName: "PGS 物流科技有限公司",
            copyright: "© 2025 PGS 物流科技有限公司. 保留所有权利.",
            additionalInfo: "技术支持: support@pgs.com | 服务热线: 400-123-4567",
            links: [
                { text: "使用条款", url: "#" },
                { text: "隐私政策", url: "#" },
                { text: "联系我们", url: "#" }
            ]
        }
    }
};

const WORKER_URL = 'https://track-api.20990909.xyz';

/**
 * 恢复CBEL配置到KV存储
 */
async function restoreCBELConfig() {
    console.log('🔄 开始恢复CBEL配置到KV存储...');
    
    try {
        // 保存站点配置
        const siteResponse = await fetch(`${WORKER_URL}/config/site`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify(CBEL_CONFIG)
        });

        if (siteResponse.ok) {
            console.log('✅ 站点配置恢复成功');
        } else {
            throw new Error(`站点配置恢复失败: ${siteResponse.status}`);
        }

        // 同步API配置到Worker
        const apiResponse = await fetch(`${WORKER_URL}/config/api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify({
                companies: CBEL_CONFIG.siteConfig.api.companies
            })
        });

        if (apiResponse.ok) {
            console.log('✅ API配置同步成功');
        } else {
            throw new Error(`API配置同步失败: ${apiResponse.status}`);
        }

        console.log('🎉 CBEL配置恢复完成！');
        return true;

    } catch (error) {
        console.error('❌ CBEL配置恢复失败:', error);
        return false;
    }
}

/**
 * 验证配置是否正确恢复
 */
async function verifyConfig() {
    console.log('🔍 验证配置恢复状态...');
    
    try {
        const response = await fetch(`${WORKER_URL}/config/site`, {
            method: 'GET',
            headers: {
                'Origin': window.location.origin,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const companyName = data.siteConfig?.api?.companies?.[0]?.name;
            
            if (companyName === 'CBEL') {
                console.log('✅ 配置验证成功 - 数据来源: CBEL');
                return true;
            } else {
                console.log(`⚠️ 配置验证失败 - 数据来源: ${companyName || '未知'}`);
                return false;
            }
        } else {
            throw new Error(`验证请求失败: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ 配置验证失败:', error);
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 PGS Track - CBEL配置自动恢复');
    console.log('=' .repeat(50));
    
    // 恢复配置
    const restored = await restoreCBELConfig();
    
    if (restored) {
        // 等待一下让配置生效
        console.log('⏳ 等待配置生效...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 验证配置
        const verified = await verifyConfig();
        
        if (verified) {
            console.log('🎉 CBEL配置恢复并验证成功！');
            console.log('现在前端应该显示 "来源: CBEL" 而不是 "总公司"');
        } else {
            console.log('⚠️ 配置恢复成功但验证失败，请手动检查');
        }
    } else {
        console.log('❌ 配置恢复失败，请手动通过管理界面恢复');
    }
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    // 导出函数供手动调用
    window.restoreCBELConfig = restoreCBELConfig;
    window.verifyConfig = verifyConfig;
    window.runCBELRestore = main;
    
    console.log('CBEL配置恢复脚本已加载');
    console.log('手动执行: window.runCBELRestore()');
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        restoreCBELConfig,
        verifyConfig,
        main
    };
}
