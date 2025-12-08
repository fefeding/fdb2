import Entity from '../base/entity';
import config from '@/base/config';

/**
 *  系统配置Domain
 */

export interface SysConfigState {
    title?: string;
    url?: string;
    config?: {
        prefix?: string;
        apiUrl?: string;
        adapter?: string;
    };
    sso?: any;
    user?: UserInfo;
    session?: any;
    isManager: boolean;
}

export default class SysConfig extends Entity<SysConfigState> {
    constructor(state?: any) {
        super(state);
    }

    /**
     *  获取系统标题
     */
    get title() {
        return this.state.title;
    }
    get url() {
        return this.state?.url;
    }
    get sso() {
        return this.state?.sso;
    }
    get config() {
        return this.state?.config;
    }
    get user() {
        return this.state.session?.user;
    }
    get session() {
        return this.state.session;
    }

    get isManager() {
        return this.state.isManager;
    }

    get rootUrl() {
        return location.origin + (this.config?.prefix || '');
    }
    
    get baseUrl() {
        if(this.sso?.baseUrl) return this.sso.baseUrl;
        else {
            return this.rootUrl;
        }
    }

    getLoginUrl(redirectUrl = location.href) {
        if(this.baseUrl === this.rootUrl) return this.baseUrl + '/login';
        return this.baseUrl + '/login?url=' + encodeURIComponent(redirectUrl);
    }

    getLogoutUrl(redirectUrl = location.href) {
        if(this.baseUrl === this.rootUrl) return this.baseUrl + '/logout';
        return this.baseUrl + '/logout?url=' + encodeURIComponent(redirectUrl);
    }
}
export const sysConfig = new SysConfig(config.state);
