
import * as requestHelper from '@/utils/request';
import type { AxiosRequestConfig } from 'axios';
import * as eventBus from '../base/eventBus';
import config from '../base/config';
import { isElectron } from '@/base/detect';



export function getRequestUrl(api: string) {
    if(/^(http(s)?:)?\/\//.test(api)) return api;
    const apiUrl = config.apiUrl || `${location.protocol}//${location.hostname}${[80,443].includes(Number(location.port))?'':(':'+location.port)}`;
    return `${apiUrl.trim()}${config.prefix}${api}`;
}

export async function requestServer(url: string, data?: any, option?: AxiosRequestConfig) {
    // 检查是否在 Electron 环境中运行
    const electronAPI = (window as any).electronAPI;
    if (isElectron && electronAPI?.api && electronAPI?.isPackaged) {
        // 在 Electron 生产环境中，通过 IPC 通信调用后端 API
        try {
            const apiPath = url.replace(/^(http(s)?:)?\/\//, '').replace(/.*?\/api\//, '/api/');
            // Vue 响应式对象（Proxy）无法被 Electron IPC 的 structured clone 序列化
            // 通过 JSON 序列化/反序列化转为纯对象
            const plainData = data != null ? JSON.parse(JSON.stringify(data)) : data;
            const res = await electronAPI.api.request(apiPath, plainData);

            // 模拟 HTTP 响应格式
            return {
                status: 200,
                statusText: 'OK',
                data: res
            };
        } catch (error: any) {
            console.error('Electron IPC 调用失败:', error);
            return {
                status: 500,
                statusText: 'Internal Server Error',
                data: {
                    ret: 500,
                    msg: error?.message || '执行失败'
                }
            };
        }
    } else {
        // 在浏览器环境或 Electron 开发模式中使用 HTTP 请求
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
            msg: res.data?.msg || res.statusText,
            message: res.data?.msg || res.statusText,
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