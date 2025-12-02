
import { useSessionStore } from '@/stores/session';
import Axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const axios = Axios.create();

export async function request(url: string, data?: any, option?: AxiosRequestConfig) {
    
    const session = useSessionStore();
    option = {
        ...(option || {})
    }
    
    option = {
        method: 'POST',
        withCredentials: true,
        ...option,
        headers: {
            ...(option.headers || {}),
            'x-auth-token': (session.id || ''),
        }
    };
    let res;
    if(option.method === 'GET' || option.method === 'get') {
        res = await axios.get(url, {
            ...option,
            params: {
                ...(option.params||{}),
                ...data||{}
            }
        });
    }
    else {
        res = await axios.post(url, data, option);
    }
    return res;
}

export async function post(url: string, data?: any, option?: AxiosRequestConfig) {
    return request(url, data, {
        method: 'post',
        ...option,
    });
}



export async function get(url: string, data?: any, option?: AxiosRequestConfig) {
    return request(url, data, {
        method: 'get',
        ...option,
    });
}

