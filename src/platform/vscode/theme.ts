/**
 * WebView 外壳样式（仅 VSCode webview 生效）。
 *
 * 要点：
 *  - 必须在 Vue 挂载**之前**注入，否则首帧会闪一下自带侧边栏/顶部栏；
 *  - 明暗适配不靠 JS 判断，而是直接挂在 VSCode 自动维护的 body.vscode-dark / vscode-light
 *    类上，主题切换时浏览器自动跟随，无需重建面板；
 *  - 内容区沿用桌面端浅色设计（表格表头白字白底等问题由下面的规则兜住）。
 */
const SHELL_CSS = `
  body.vscode-native-nav { background-color: var(--dbt-editor-background, #1e1e1e) !important; }
  /* 左侧导航完全交给 VSCode 原生 TreeView，隐藏 webview 自带树与顶部大 header */
  body.vscode-native-nav .explorer-sidebar { display: none !important; }
  body.vscode-native-nav .top-toolbar { display: none !important; }
  body.vscode-native-nav .explorer-layout { display: block !important; }
  body.vscode-native-nav .explorer-main { height: 100%; }
  body.vscode-native-nav,
  body.vscode-native-nav .database-layout,
  body.vscode-native-nav .database-explorer { background: transparent !important; }
  /* 面板较窄：连接头卡片与快捷操作改为紧凑布局 */
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

  /* 深色宿主主题下：内容区仍是浅色卡片，需显式指定控件浅色，
     否则 UA 默认样式会把 input/select/textarea 渲染成黑块 */
  body.vscode-native-nav.vscode-dark input,
  body.vscode-native-nav.vscode-dark textarea,
  body.vscode-native-nav.vscode-dark select,
  body.vscode-native-nav.vscode-high-contrast input,
  body.vscode-native-nav.vscode-high-contrast textarea,
  body.vscode-native-nav.vscode-high-contrast select {
    background-color: #ffffff !important;
    color: #1e293b !important;
    border-color: #cbd5e1 !important;
    color-scheme: light !important;
  }
  body.vscode-native-nav.vscode-dark input::placeholder,
  body.vscode-native-nav.vscode-dark textarea::placeholder { color: #94a3b8 !important; }
  /* 抵消 database.css 的 prefers-color-scheme: dark 覆盖，保持浅色表格（表头白字白底问题） */
  @media (prefers-color-scheme: dark) {
    body.vscode-native-nav table.table { background-color: #ffffff; }
    body.vscode-native-nav .table th { background-color: #f8f9fa; color: #1e293b; }
    body.vscode-native-nav .table th .column-name,
    body.vscode-native-nav .table th .column-type,
    body.vscode-native-nav .table th .sort-icon { color: inherit; }
  }
`;

export function installVscodeShellStyle(): void {
  if (typeof document === 'undefined') return;
  document.body.classList.add('vscode-native-nav');
  const style = document.createElement('style');
  style.setAttribute('data-vscode-shell', '1');
  style.textContent = SHELL_CSS;
  document.head.appendChild(style);
}
