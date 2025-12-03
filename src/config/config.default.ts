import type { MidwayConfig, MidwayAppInfo } from '@midwayjs/core';
import devopsConfig from './devops.config';
export default (appInfo: MidwayAppInfo) => {
    console.log('prefix', devopsConfig.prefixUrl);
    const config = {    
        // use for cookie sign key, should change to your own and keep security
        keys: appInfo.name + '_1641910879296_0612',    
        koa: {
            // 全局路由前缀
            globalPrefix: `${devopsConfig.prefixUrl}`,
            port: Number(process.env.PORT) || 7001,
            hostname: process.env.IP || '0.0.0.0',
        },
        typeorm: {
            dataSource: {
                // default: {
                //     type: 'mysql',
                //     host: process.env.DB_HOST||'',
                //     port: process.env.DB_PORT||3306,
                //     username: process.env.DB_USERNAME||'',
                //     password: process.env.DB_PASSWORD||'password',
                //     database: process.env.DB_DATABASE||'db_myproject',
                //     synchronize: false,
                //     // 启用延迟连接
                //     lazyConnect: true,
                //     // 或者扫描形式
                //     entities: ['**/model/**/*.entity{.ts,.js}'],
                // },
            },
        },
        session: {
            // session 过期设置
            timeout: Number(process.env.SESSION_TIMEOUT) || 20 * 60 * 1000,
            //serviceKey: 'session:service',
        },
      // 静态文件服务  
      staticFile: {
            dirs: {
                default: {
                    prefix: `${devopsConfig.prefixUrl}/public`,
                },
            },
            gzip: true,
        },
        // 登陆态校验配置
        auth: {
            // 忽略登陆态校验
            ignores: [
                /\/api\/test\//i,
                "/api/test/action"
            ]
        },
        // 基础服务
        baseService: {
            manager: ['admin'],// 管理员帐号
        },
        busboy: {
            mode: 'file',
            cleanTimeout: 5 * 60 * 1000,
          },
        tencentCosOption: {
            default: {
                /** 存储桶的名称，格式为<bucketname-appid>，例如examplebucket-1250000000 */
                Bucket: '',
                // /** 存储桶所在地域，如果有传入只返回该地域的存储桶列表 */
                Region: 'ap-guangzhou',
                url: '',
                // /** 请求的对象键，最前面不带 / */
                // Key: Key;
                // /** 发请求时带上的 Header 字段 */
                // Headers?: Headers;
            },
        },
    } as MidwayConfig;
    return config;
};
