
import * as requestHelper from '@/utils/request';
import type { AxiosRequestConfig } from 'axios';
import * as eventBus from '../base/eventBus';
import config from '../base/config';

export function getRequestUrl(api: string) {
    if(/^(http(s)?:)?\/\//.test(api)) return api;
    const apiUrl = config.apiUrl || `${location.protocol}//${location.hostname}${[80,443].includes(Number(location.port))?'':(':'+location.port)}`;
    return `${apiUrl.trim()}${config.prefix}${api}`;
}

export async function requestServer(url: string, data?: any, option?: AxiosRequestConfig) {
    url = getRequestUrl(url);
    const res = await requestHelper.request(url, data, option);
    return res;
}

// 请求服务
export async function request<T = any>(url: string, data?: any, option?: AxiosRequestConfig) {    
    const res = await requestServer(url, data, option);
    if(res?.data.ret === 50001) {
        console.error('登陆态失效，请重新登陆后再试');
        res.data.msg = '登陆态失效，请重新登陆后再试';
        eventBus.publish(eventBus.AUTHTIMEOUT, { message: res.data.msg });
    }
    if(res.status !== 200) {
        throw {
            ret: res.status,
            msg: res.statusText,
        };
    }
    return res?.data as T;
}

// 请求管理端接口代理
export async function requestBaseServerApi(api: string, data?: any): Promise<any> {
    return request('/admin/requestBaseServer', {
        api,
        data,
    });
}