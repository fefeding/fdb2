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

    // 纯原生导航：隐藏 webview 内自带的连接/库/表树（.explorer-sidebar）与顶部大 header（.top-toolbar），
    // 左侧导航完全由 VSCode 原生 TreeView（Activity Bar）承担。仅作用于 webview，不影响桌面端。
    // 内容区沿用桌面端固定浅色主题；输入控件显式指定浅色，避免深色 webview 下 UA 默认样式渲染成黑块。
    const style = document.createElement('style');
    style.textContent = `
      body.vscode-native-nav .explorer-sidebar { display: none !important; }
      body.vscode-native-nav .top-toolbar { display: none !important; }
      body.vscode-native-nav .explorer-layout { display: block !important; }
      body.vscode-native-nav .explorer-main { height: 100%; }
      /* 外层框架跟随 VSCode 主题背景；内部卡片沿用桌面端浅色设计 */
      body.vscode-native-nav,
      body.vscode-native-nav .database-layout,
      body.vscode-native-nav .database-explorer { background: transparent !important; }
      body.vscode-native-nav { background-color: var(--vscode-editor-background, #1e1e1e) !important; }
      /* 压缩入口尺寸：webview 面板较窄，连接头卡片与快捷操作改为紧凑布局 */
      body.vscode-native-nav .connection-detail { gap: 12px !important; }
      body.vscode-native-nav .connection-header { margin-bottom: 0 !important; padding: 10px 14px !important; }
      body.vscode-native-nav .connection-info { gap: 10px !important; }
      body.vscode-native-nav .quick-actions { margin-bottom: 0 !important; padding: 10px 14px !important; }
      body.vscode-native-nav .actions-grid { gap: 8px !important; }
      body.vscode-native-nav .action-btn {
        flex-direction: row !important;
        justify-content: flex-start !important;
        gap: 8px !important;
        padding: 8px 10px !important;
      }
      body.vscode-native-nav .action-icon { font-size: 14px !important; }
      body.vscode-native-nav input,
      body.vscode-native-nav textarea,
      body.vscode-native-nav select {
        background-color: #ffffff !important;
        color: #1e293b !important;
        border-color: #cbd5e1 !important;
        color-scheme: light !important;
      }
      body.vscode-native-nav input::placeholder,
      body.vscode-native-nav textarea::placeholder { color: #94a3b8 !important; }
    `;
    document.head.appendChild(style);
    document.body.classList.add('vscode-native-nav');
}
