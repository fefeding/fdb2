import { Provide, Scope, ScopeEnum, Config, Inject } from '@midwayjs/core';
import { ISessionService, TencentService } from '@cicctencent/midwayjs-base';
import { Session, GetLoginSessionReq, GetLoginSessionRes, LogoutReq, LogoutRes, LoginByWxReq, LoginByWxRsp, LoginByAccountReq, LoginByAccountRsp } from '@fefeding/common/dist/models/account/session';

@Provide('session:service')
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class SessionService extends ISessionService { 
    @Config('loginOption')
    loginOption: any;

    @Inject()
    tencentService: TencentService;

    /**
     * 根据ID获取session
     * 并判断session是否在有效期
     * @param id token唯一
     */
    async getLoginSession(id: string): Promise<Session> {
        const req = new GetLoginSessionReq();
        req.id = id;
        const res = await this.requestBaseApi<GetLoginSessionRes>(req);
        return res?.data || null;
    }
    /**
     * 下线
     * @param id 需要下线的id或者session
     */
    async logout(id: string): Promise<any> {
        const req = new LogoutReq();
        req.id = id;
        const res = await this.requestBaseApi<LogoutRes>(req);
        this.ctx.currentSession = null;
        return res;
    }

    /**
     * 登录接口
     * @param loginParams 登录参数
     * @returns 
     */
    async loginByWx(loginParams: LoginByWxReq) {
        const req = new LoginByWxReq();
        req.fromJSON(loginParams);
        const res = await this.requestBaseApi<LoginByWxRsp>(req);
        return res;
    }

    /**
     * 帐号登陆
     * @param loginParams 
     * @returns 
     */
    async loginByAccount(loginParams: LoginByAccountReq) {
        loginParams.appId = '0';//this.baseServiceOption.appId?.toString() || '0';
        
        const req = new LoginByAccountReq();
        req.fromJSON(loginParams);
        const res = await this.requestBaseApi<LoginByAccountRsp>(req);
        return res;
    }

    /**
     * 用临时码登陆
     * @param code 登陆临时码
     * @returns 
     */
    async loginByCode(code: string) {
        const res = await this.requestBaseApi('/api/session/loginByAuthCode', {
            data: {
                code
            }
        });
        return res?.data || null;
    }

    /**
     * 生成临时登陆码
     * @param id 登陆token 
     * @returns 
     */
    async createAuthCode(id: string) {
        const res = await this.requestBaseApi('/api/session/createAuthCode', {
            data: {
                id
            }
        });
        return res;
    }

    // 生成登陆用公众号二维码
    // 先生成一个验证码，当用户扫码后，事件回调获取验证码后再生成session
    async createWxLoginQrcode() {

        const res = await this.requestBaseApi('/api/session/createWxLoginQrcode', {
            data: {
                appId: this.loginOption.wxAppId
            }
        });
        //console.log(res);
        return res;
    }

    // 验证码登陆
    async loginByVerifyCode(code: string, appId?: number,prefix?: string) {
        if(!code) throw Error('code不可为空');
        appId = appId || this.loginOption.wxAppId;

        const res = await this.requestBaseApi('/api/session/loginByVerifyCode', {
            data: {
                appId,
                code,
                prefix
            }
        });
        return res;
    }

    // 更新用户信息
    async updateUser(user: any) {
        const userId = this.ctx.currentSession?.userId || 0;
        if(!userId) return;
        //console.log(loginParams, req);
        const res = await this.requestBaseApi('/api/account/updateUser', {
            data: {
                user: {
                    ...user,
                    id: userId,
                }
            },
            params: {
                token: this.ctx.currentSession?.id
            }
        });
        console.log('updateUser', res);
        return res;
    }

    // 上传头像图片
    async uploadAvatar(file: any) {

        const userId = this.ctx.currentSession?.userId || 0;
        if(!userId) return;

        let filename = file['filename'] as string || '1.png';

        const key = `avator/${userId}/${filename}`;
         
        const res = await this.tencentService.uploadCosFile(key, file.data);
        console.log(res);
        const user = {
            id: userId,
            avatar: res.url || key,
        }

        return await this.updateUser(user);
    }
}
