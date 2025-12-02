import { Controller, Get, Inject, Provide, Config } from '@midwayjs/core';
import { SessionService, decorators, utils, koa } from '@cicctencent/midwayjs-base';

@Provide()
@Controller('/')
export class HomeController {
    @Inject()
    ctx: koa.Context;

    @Inject()
    sessionService: SessionService;
    @Config('sso')
    ssoOption: any;

    @Get('/admin/login')
    @Get('/admin/logout')
    @decorators.checkLogin(false)
    async login(): Promise<string> {
        console.log('admin login render', this.ctx.path, this.ctx.auth_token);
        if(this.ctx.auth_token && this.ctx.path.includes('/logout')) {
            const res = await this.sessionService.logout(this.ctx.auth_token);
            console.log('logout', res);
            if(res.ret === 0) {
                utils.setAuthToken(this.ctx, '');
            }
        }
        return utils.getDefaultTemplate(this.ctx, 'index.html', {            
            config: {
                apiUrl: process.env.API_URL || ''
            },
        });
    }

    @Get('/admin/*')
    @Get('/admin')
    @decorators.checkLogin(true)// 需要登陆态的接口
    async admin(): Promise<string> {
        return utils.getDefaultTemplate(this.ctx, 'index.html', {
            sso: this.ssoOption,
            config: {
                apiUrl: process.env.API_URL || ''
            },
      	    title: process.env.TITLE || '系统',
        });
    }

    @Get('/*')
    @Get('/')
    @decorators.checkLogin(false)// 需要登陆态的接口
    async home(): Promise<string> {
        return utils.getDefaultTemplate(this.ctx, 'index.html', {
            sso: this.ssoOption,
            config: {
                apiUrl: process.env.API_URL || ''
            },
      	    title: process.env.TITLE || '系统',
        });
    }
}

