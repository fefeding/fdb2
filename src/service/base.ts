
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
    if(!isBrowser) {
        const serverRoute = await import('../../server/index');
        return await serverRoute.handleDatabaseRoutes(url, data);
    }
    url = getRequestUrl(url);
    const res = await requestHelper.request(url, data, option);
    return res;
}

// 请求服务
export async function request<T = any>(url: string, data?: any, option?: AxiosRequestConfig) {    
    const res = await requestServer(url, data, option);
    
    // 检查HTTP状态码
    if(res.status !== 200) {
        throw {
            ret: res.status,
            msg: res.statusText,
        };
    }
    
    // 处理新的响应格式 {ret:0,msg:'',data:any}
    const responseData = res.data;
    
    // 检查ret字段，非0表示异常
    if(responseData.ret !== undefined && responseData.ret !== 0) {
        throw {
            ret: responseData.ret,
            msg: responseData.msg || '请求失败',
        };
    }
    
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