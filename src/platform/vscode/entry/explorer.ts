/**
 * VSCode webview「完整数据库工作台」入口：
 * 直接复用桌面端 platform/database 的视图（explorer.vue 及其全部子组件），
 * 使用 vue-router 内存路由，视图代码零改动。
 * 取数通过 base.ts 的 VSCode 分支（webview 消息桥）完成。
 *
 * 注意：
 *  - vite 产物是 runtime-only Vue（无运行时模板编译器），根组件必须用 render 函数；
 *  - IIFE 单文件打包下不能用动态 import()，路由组件一律静态导入。
 */
import { createApp, h, defineComponent } from 'vue';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import i18n from '@/i18n';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/assets/database.css';

import toastPlugin from '@/components/toast/index';
import Modal from '@/components/modal/index.vue';
import DataGrid from '@/components/dataGrid/index.vue';
import modalPlugin from '@/components/modal/index';

import Layout from '@/platform/database/layout.vue';
import Explorer from '@/platform/database/explorer.vue';

export function mountExplorer(): void {
    const routes = [
        {
            path: '/database',
            component: Layout,
            redirect: '/database/index',
            children: [
                { path: 'index', name: 'database-index', component: Explorer },
                { path: 'explorer', name: 'database-explorer', component: Explorer }
            ]
        }
    ];

    const router = createRouter({
        history: createMemoryHistory(),
        routes
    });
    router.push('/database/index');

    const App = defineComponent({
        name: 'ExplorerRoot',
        render: () => h(RouterView)
    });

    const app = createApp(App);

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

    // 纯原生导航：隐藏 webview 内自带的连接/库/表树（.explorer-sidebar），
    // 左侧导航完全由 VSCode 原生 TreeView（Activity Bar）承担。仅作用于 webview，不影响桌面端。
    const style = document.createElement('style');
    style.textContent = `
      body.vscode-native-nav .explorer-sidebar { display: none !important; }
      body.vscode-native-nav .explorer-layout { display: block !important; }
      body.vscode-native-nav .explorer-main { height: 100%; }
    `;
    document.head.appendChild(style);
    document.body.classList.add('vscode-native-nav');
}
