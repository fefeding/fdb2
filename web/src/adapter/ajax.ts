import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import baseConf from '@/base/config';
export const pendingMap = new Map();
export const service = axios.create({
    baseURL: `${baseConf.baseURL}`, // 设置统一的请求前缀// http://localhost:8888
    timeout: 30000, // 设置统一的超时时长
});
service.interceptors.request.use(
    config => {
        const pendingKey = getPendingKey(config);
        if (pendingMap.has(pendingKey)) {
            const controller = pendingMap.get(pendingKey);
            controller.abort();
        } else {
            addPending(config);
        }

        return config;
    },
    error => {
        return Promise.reject(error);
    }
);
service.interceptors.response.use(
    response => {
        removePending(response.config);
        return response;
    },
    error => {
        error.config && removePending(error.config);
        error.message = getHttpErrorMsg(error);
        return Promise.reject(error);
    }
);
type Config = AxiosRequestConfig & { debounceRequest?: boolean };
export function request(axiosConfig: Config): Promise<AxiosResponse<any, any>> {
    // 自定义配置
    const options = Object.assign(
        {
            debounceRequest: true, // 是否开启取消重复请求, 默认为 true
        },
        axiosConfig
    );

    return service(options);
}

/**
 * 生成每个请求唯一的键
 * @param {*} config
 * @returns string
 */
function getPendingKey(config: AxiosRequestConfig) {
    const { url, method, params } = config;
    let { data } = config;
    if (typeof data === 'string') {
        data = JSON.parse(data);
    }
    // 以url和...组成字符串作为储存的key值
    return [url, method, JSON.stringify(params), JSON.stringify(data)].join(
        '&'
    );
}
/**
 * 储存每个请求唯一值, 也就是cancel()方法, 用于取消请求
 *
 * @param {*} config
 */
function addPending(config: AxiosRequestConfig) {
    const pendingKey = getPendingKey(config);
    const controller = new AbortController();
    config.signal = controller.signal;
    pendingMap.set(pendingKey, controller);
}
/**
 * 删除重复的请求key
 * @param {*} config
 */
function removePending(config: AxiosRequestConfig) {
    const pendingKey = getPendingKey(config);
    if (pendingMap.has(pendingKey)) {
        pendingMap.delete(pendingKey);
    }
}
/**
 * 取消所有请求
 * @param {*} config
 */
export function abortAllPending() {
    for (const [key, value] of pendingMap.entries()) {
        value.abort();
        pendingMap.delete(key);
    }
}
/**
 * 处理异常
 * @param {*} error
 */
function getHttpErrorMsg(error: any) {
    let message = '';
    // 处理被取消的请求
    if (axios.isCancel(error)) {
        console.error(
            `重复请求：${(error as any).config.url} ${error.message}`
        );
    }

    if (error && error.response) {
        switch (error.response.status) {
            case 302:
                message = '接口重定向了！';
                break;
            case 400:
                message = '参数不正确！';
                break;
            case 401:
                message = '您未登录，或者登录已经超时，请先登录！';
                break;
            case 403:
                message = '您没有权限操作！';
                break;
            case 504:
                message = '服务暂时无法访问，请稍后再试！';
                break;
            default:
                message = '异常问题，请联系管理员！';
                break;
        }
    }
    if (error.message.includes('timeout')) message = '网络请求超时！';
    if (error.message.includes('Network'))
        message = window.navigator.onLine ? '服务端异常！' : '您断网了！';
    return message;
}
