/**
 * VSCode WebView - Query Entry Point
 * SQL 查询面板入口
 */

import { createApp } from 'vue';
import QueryPanel from '../components/QueryPanel.vue';

// 创建 Vue 应用
const app = createApp(QueryPanel);

// 挂载
app.mount('#app');
