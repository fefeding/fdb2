/**
 * VSCode WebView 统一入口。
 * 宿主在 HTML 中注入 window.__PANEL_TYPE__，据此挂载对应的 Vue 面板组件。
 *
 * 采用 ESM 动态 import() 做代码分割：每个面板 / 完整工作台各自成为独立 chunk，
 * 仅在对应面板首次打开时才下载执行，避免初始即加载整个桌面端应用栈
 * （bootstrap / pinia / i18n 双语文案 / 全部子组件 / SQL 编辑器等 heaviest 部分）。
 */
import { createApp } from 'vue';
import { installVscodeShellStyle } from '../theme';
import '../style.css';

// 必须在挂载前注入，避免首帧闪烁
installVscodeShellStyle();

const type = (window as any).__PANEL_TYPE__ || 'database';

// 面板按需加载：键为 __PANEL_TYPE__，值为返回组件模块的动态导入函数
const registry: Record<string, () => Promise<{ default: any }>> = {
  connection: () => import('../components/ConnectionPanel.vue'),
  query: () => import('../components/QueryPanel.vue'),
  database: () => import('../components/DatabasePanel.vue'),
  tableData: () => import('../components/TableDataPanel.vue'),
  tableStructure: () => import('../components/TableStructurePanel.vue')
};

async function mount(): Promise<void> {
  if (type === 'explorer') {
    // 完整工作台：复用桌面端视图（含 bootstrap/pinia/i18n/全部子组件，按需此时才加载）
    const { mountExplorer } = await import('./explorer');
    mountExplorer();
    return;
  }
  const loader = registry[type] || registry.database;
  const mod = await loader();
  createApp(mod.default).mount('#app');
}

mount();
