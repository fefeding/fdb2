/**
 * VSCode WebView - Database Entry Point
 * 数据库管理面板入口
 */

import { createApp } from 'vue';
import DatabasePanel from '../components/DatabasePanel.vue';

// 创建 Vue 应用
const app = createApp(DatabasePanel);

// 挂载
app.mount('#app');
