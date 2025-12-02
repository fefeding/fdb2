import { Catch, httpError, MidwayHttpError } from '@midwayjs/core';
import { koa } from '@cicctencent/midwayjs-base';
import devopsConfig from '../config/devops.config';

@Catch(httpError.NotFoundError)
export class NotFoundFilter {
    async catch(err: MidwayHttpError, ctx: koa.Context) {
        if(devopsConfig.prefixUrl) {
            ctx.redirect(devopsConfig.prefixUrl);
            return;
        }
        // 404 错误会到这里
        ctx.redirect('/404.html');
    }
}
