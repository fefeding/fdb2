import { sysConfig } from '@/domain/SysConfig';
import { request } from './base';
import { type RouteLocationNormalizedGeneric } from 'vue-router';
import Cookies from 'js-cookie';
import { useSessionStore } from '@/stores/session';



// 登陆
export async function login(account: string, password: string) {
    try {
        const res = await request('/api/session/loginByAccount', {
            account,
            password,
        });
        const sessionStorre = useSessionStore();
        sessionStorre.setSession(res);
        return { ret: 0, msg: '登录成功', data: res };
    } catch (error) {
        return { ret: error.ret || -1, msg: error.msg || '登录失败' };
    }
}


export async function getLoginSession(token: string) {
    try {
        const res = await request('/api/session/getLoginSession', {
            token
        });
        return { ret: 0, msg: '获取成功', data: res };
    } catch (error) {
        return { ret: error.ret || -1, msg: error.msg || '获取登录会话失败' };
    }
}


export async function loginByCode(authCode: string,) {
    try {
        const res = await request('/api/session/loginByCode', {
            authCode,
        });
        return { ret: 0, msg: '登录成功', data: res };
    } catch (error) {
        return { ret: error.ret || -1, msg: error.msg || '登录失败' };
    }
}

export async function logout() {
    try {
        const sessionStorre = useSessionStore();
        sessionStorre.clearSession();
        Cookies.remove('token');
        const res = await request('/api/session/logout');
        return { ret: 0, msg: '登出成功', data: res };
    } catch (error) {
        return { ret: error.ret || -1, msg: error.msg || '登出失败' };
    }
}

export function getLoginUrl(redirectUrl = location.href) {
    return sysConfig.getLoginUrl(redirectUrl);
}

export function getLogoutUrl(redirectUrl = location.href) {
    return sysConfig.getLogoutUrl(redirectUrl);
}

export async function redirectToLogin() {
    const url = getLoginUrl();
    location.replace(url);
    return false;
}

// 如果没有登陆则跳去
export async function checkLogin() {    
    const sessionStore = useSessionStore();
    console.log('Current state:', sessionStore.$state);
    if(!sessionStore.isLoggedIn) return await redirectToLogin();    
    return sessionStore;
}

// 如果没有session,但有cookie或auth_code登陆码，则去验证
export async function initLoginState(to?: RouteLocationNormalizedGeneric) {
    const sessionStore = useSessionStore();
    if(sessionStore.isLoggedIn) return true;

    try {
        const token = Cookies.get('token');
        if(token) {
            const res = await getLoginSession(token);
            if(res.ret === 0 && res.data) {
                sessionStore.setSession(res.data);
            }
        }
        
        if(sessionStore.isLoggedIn) return true;

        // 获取当前 URL 的查询参数
        const currentUrl = new URL(window.location.href);
        const authCode = currentUrl.searchParams.get('auth_code');
        // 删除 URL 中的 auth_code 参数
        if (authCode) {
            
            const res = await loginByCode(authCode);

            if(res.ret === 0 && res.data) {
                sessionStore.setSession(res.data);
                Cookies.set('token', res.data.id);
            }
            currentUrl.searchParams.delete('auth_code');  
            const noauthUrl = currentUrl.toString();
            console.log(noauthUrl);
            window.location.replace(noauthUrl);
            return false;
        }
    }
    catch(e) {
        console.error(e);
    }
    return true;
}