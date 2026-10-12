import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import i18n from '@/i18n';

// @ts-ignore入 vconsole 进行调试
if(window.__INITIAL_STATE__?.dev) {
    import('vconsole').then((VConsole) => {
        new VConsole.default();
    });
}

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/assets/database.css';
import 'bootstrap';

import toastPlugin from '@/components/toast/index';
import Modal from '@/components/modal/index.vue';
import DataGrid from '@/components/dataGrid/index.vue';
import modalPlugin from '@/components/modal/index';

// 桌面端标记：用于加载一套「紧凑 + 降噪」的开发者工具观感（与 VSCode webview 的
// body.vscode-native-nav 规则同源，互不影响）
if (typeof document !== 'undefined') document.body.classList.add('platform-desktop');

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(router);
app.use(pinia);
app.use(i18n);
app.use(toastPlugin);
app.use(modalPlugin);

app.component('Modal', Modal)
app.component('DataGrid', DataGrid)

app.mount('#app');