
import * as requestHelper from '@/utils/request';
import type { AxiosRequestConfig } from 'axios';
import * as eventBus from '../base/eventBus';
import config from '../base/config';
import { isBrowser } from '@/base/detect';



export function getRequestUrl(api: string) {
    if(/^(http(s)?:)?\/\//.test(api)) return api;
    const apiUrl = config.apiUrl || `${location.protocol}//${location.hostname}${[80,443].includes(Number(location.port))?'':(':'+location.port)}`;
    return `${apiUrl.trim()}${config.prefix}${api}`;
}

export async function requestServer(url: string, data?: any, option?: AxiosRequestConfig) {
    // 只在浏览器环境中使用 HTTP 请求
    // 服务器端代码将在服务器启动时直接导入，而不是通过这里的动态导入
    url = getRequestUrl(url);
    const res = await requestHelper.request(url, data, option);
    return res;
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