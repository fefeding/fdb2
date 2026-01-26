
import * as requestHelper from '@/utils/request';
import type { AxiosRequestConfig } from 'axios';
import * as eventBus from '../base/eventBus';
import config from '../base/config';
import { isNWjs } from '@/base/detect';



export function getRequestUrl(api: string) {
    if(/^(http(s)?:)?\/\//.test(api)) return api;
    const apiUrl = config.apiUrl || `${location.protocol}//${location.hostname}${[80,443].includes(Number(location.port))?'':(':'+location.port)}`;
    return `${apiUrl.trim()}${config.prefix}${api}`;
}

export async function requestServer(url: string, data?: any, option?: AxiosRequestConfig) {
    // 检查是否在 nw.js 环境中运行
    if (isNWjs()) {
        // 在 nw.js 环境中，直接 require 后端服务代码并执行
        try {
            // 提取 API 路径，去掉前缀和协议等
            const apiPath = url.replace(/^(http(s)?:)?\/\//, '').replace(/.*?\/api\//, '/api/');
            
            // 在 nw.js 环境中，使用 Node.js 的 require 方法加载服务端代码
            // 服务端代码现在是 CommonJS 模块，使用 .cjs 扩展名
            let server;
            
            // 尝试使用 Node.js 的 require 方法
            try {
                // 路径 1: 直接从项目根目录加载
                server = require('../server/index.cjs');
            } catch (e) {
                try {
                    // 路径 2: 使用 Node.js 的 path 模块获取正确路径
                    const path = require('path');
                    const fs = require('fs');
                    const appPath = process.cwd();
                    const serverFilePath = path.join(appPath, 'server', 'index.cjs');
                    
                    console.log('尝试加载服务端代码:', serverFilePath);
                    
                    if (fs.existsSync(serverFilePath)) {
                        server = require(serverFilePath);
                    } else {
                        // 路径 3: 尝试相对路径
                        server = require('./server/index.cjs');
                    }
                } catch (err) {
                    console.error('所有路径尝试失败:', err);
                    throw new Error('无法加载服务端代码');
                }
            }
            
            const res = await server.handleDatabaseRoutes(apiPath, data);
            // 模拟 HTTP 响应格式
            return {
                status: 200,
                statusText: 'OK',
                data: {
                    ret: 0,
                    msg: 'success',
                    data: res
                }
            };
        } catch (error) {
            console.error('NW.js 环境下执行后端代码失败:', error);
            // 模拟错误响应
            return {
                status: 500,
                statusText: 'Internal Server Error',
                data: {
                    ret: 500,
                    // @ts-ignore
                    msg: error.message || '执行失败'
                }
            };
        }
    } else {
        // 在浏览器环境中使用 HTTP 请求
        url = getRequestUrl(url);
        const res = await requestHelper.request(url, data, option);
        return res;
    }
}

// 请求服务
export async function request<T = any>(url: string, data?: any, option?: AxiosRequestConfig) {    
    const res = await requestServer(url, data, option);
    
    // 处理服务器直接返回的数据（如数组）
    if (!res || res instanceof Array) {
        return res as T;
    }
    
    // 确保res是对象类型
    if (typeof res !== 'object') {
        return res as T;
    }
    
    // 检查HTTP状态码
    if(res.status !== 200) {
        throw {
            ret: res.status,
            msg: res.statusText,
        };
    }
    
    // 处理新的响应格式 {ret:0,msg:'',data:any}
    const responseData = res.data;
    
        
    // 特殊处理登录态失效的情况
    if(responseData.ret === 50001) {
        console.error('登陆态失效，请重新登陆后再试');
        eventBus.publish(eventBus.AUTHTIMEOUT, { message: responseData.msg || '登陆态失效，请重新登陆后再试' });
    }
    
    // 返回data字段内容
    return responseData as T;
}

// 请求管理端接口代理
export async function requestBaseServerApi(api: string, data?: any): Promise<any> {
    return request('/admin/requestBaseServer', {
        api,
        data,
    });
}