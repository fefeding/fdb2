/**
 * VSCode WebView - Connection Entry Point
 * 连接管理面板入口
 */

import { createApp } from 'vue';
import ConnectionPanel from '../components/ConnectionPanel.vue';

// 创建 Vue 应用
const app = createApp(ConnectionPanel);

// 挂载
app.mount('#app');
