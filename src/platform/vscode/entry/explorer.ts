/**
 * VSCode webview「完整数据库工作台」入口：
 * 直接复用桌面端 platform/database 的视图（explorer.vue 及其全部子组件），
 * 使用 vue-router 内存路由 + 桌面端同一套路由表，视图代码零改动。
 * 取数通过 base.ts 的 VSCode 分支（webview 消息桥）完成。
 */
import { createApp } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import i18n from '@/i18n';
import routes from '@/platform/database/router';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/assets/database.css';

import toastPlugin from '@/components/toast/index';
import Modal from '@/components/modal/index.vue';
import DataGrid from '@/components/dataGrid/index.vue';
import modalPlugin from '@/components/modal/index';

export function mountExplorer(): void {
    const router = createRouter({
        history: createMemoryHistory(),
        routes
    });
    router.push('/database/index');

    const app = createApp({
        template: '<router-view />'
    });

    const pinia = createPinia();
    try {
        pinia.use(piniaPluginPersistedstate);
    } catch (e) {
        // webview 中 localStorage 可能受限，降级为无持久化
        console.warn('pinia persist unavailable:', e);
    }

    app.use(router);
    app.use(pinia);
    app.use(i18n);
    app.use(toastPlugin);
    app.use(modalPlugin);
    app.component('Modal', Modal);
    app.component('DataGrid', DataGrid);

    // 宿主树选中时导航到对应连接/库/表（query 形式，与桌面端一致）
    window.addEventListener('message', (event) => {
        const m = event.data;
        if (!m || m.command !== 'navigate' || typeof m.data !== 'object') return;
        router.push({ path: '/database/explorer', query: m.data });
    });

    app.mount('#app');
}
