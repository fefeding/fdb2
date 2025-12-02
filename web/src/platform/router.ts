import { createRouter, createWebHistory } from 'vue-router';
import { useTitle } from '@vueuse/core';
import { abortAllPending } from '@/adapter/ajax';
import { checkLogin, initLoginState } from '@/service/login';

import userRouters from './user/router';
import adminRouters from './admin/router';
import databaseRouters from './database/router';

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        // 用户功能页
        ...userRouters,
        // 管理端
        ...adminRouters,
        // 数据库管理
        ...databaseRouters,
        {
            path: '/:pathMatch(.*)*',
            name: 'not-found',
            redirect: '/database/index',
        },
    ],
});

router.beforeEach(async (to, from, next) => {
    // 切换路由取消请求
    abortAllPending();
    
    const ret = await initLoginState(to);
    if(ret === false) return;

    // 校验登陆态
    if(to.meta?.needAuth) {
        await checkLogin();
    }
    next();
});

router.afterEach((to) => {
    if (to.meta?.title) {
        useTitle(to.meta.title as string);
    }
  });

export default router;