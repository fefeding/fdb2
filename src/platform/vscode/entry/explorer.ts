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
// 必须作为第一个 import：先安装全局错误捕获，才能捕获后续模块求值阶段的错误
import '../error-capture';
import { setVueErrorHandler } from '../error-capture';
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
import { getVSCodeBridge } from '@/platform/vscode/bridge';

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
    setVueErrorHandler(app);

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

    // 通知宿主 webview 已就绪，使其下发首开时缓存在 pending 中的 navigate 消息。
    // 否则新面板首次打开会停在默认空屏（宿主需收到 ready 才 flush pending）。
    getVSCodeBridge().postMessage({ command: 'ready' });

    // 外壳样式（隐藏自带侧边栏、主题适配）已在 entry/index.ts 挂载前注入，见 platform/vscode/theme.ts
    }
