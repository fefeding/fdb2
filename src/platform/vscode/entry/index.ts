/**
 * VSCode WebView 统一入口。
 * 宿主在 HTML 中注入 window.__PANEL_TYPE__，据此挂载对应的 Vue 面板组件。
 */
import { createApp } from 'vue';
import ConnectionPanel from '../components/ConnectionPanel.vue';
import QueryPanel from '../components/QueryPanel.vue';
import DatabasePanel from '../components/DatabasePanel.vue';
import TableDataPanel from '../components/TableDataPanel.vue';
import TableStructurePanel from '../components/TableStructurePanel.vue';
import { mountExplorer } from './explorer';
import '../style.css';

const type = (window as any).__PANEL_TYPE__ || 'database';

const registry: Record<string, any> = {
  connection: ConnectionPanel,
  query: QueryPanel,
  database: DatabasePanel,
  tableData: TableDataPanel,
  tableStructure: TableStructurePanel
};

if (type === 'explorer') {
  // 完整工作台：复用桌面端视图
  mountExplorer();
} else {
  const component = registry[type] || DatabasePanel;
  createApp(component).mount('#app');
}
