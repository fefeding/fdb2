/**
 * WebView 外壳样式（仅 VSCode webview 生效）。
 *
 * 要点：
 *  - 必须在 Vue 挂载**之前**注入，否则首帧会闪一下自带侧边栏/顶部栏；
 *  - 内容区配色不再强制浅色：database.css 的 --db-* 令牌会根据宿主维护的
 *    body.vscode-light / vscode-dark / vscode-high-contrast 类自动切换明暗，
 *    整个工作台跟随编辑器主题；
 *  - 这里只负责隐藏自带侧边栏/顶部栏、让外层框架透明并压缩紧凑布局。
 */
const SHELL_CSS = `
  /* 左侧导航完全交给 VSCode 原生 TreeView，隐藏 webview 自带树与顶部大 header */
  body.vscode-native-nav .explorer-sidebar { display: none !important; }
  body.vscode-native-nav .top-toolbar { display: none !important; }
  body.vscode-native-nav .explorer-layout { display: block !important; }
  body.vscode-native-nav .explorer-main { height: 100%; }
  /* 外层框架跟随 VSCode 主题背景；内容区由 --db-* 令牌负责明暗 */
  body.vscode-native-nav,
  body.vscode-native-nav .database-layout,
  body.vscode-native-nav .database-explorer { background: transparent !important; }
  body.vscode-native-nav { background-color: var(--dbt-editor-background, var(--db-surface, #1e1e1e)) !important; }
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
`;

export function installVscodeShellStyle(): void {
  if (typeof document === 'undefined') return;
  document.body.classList.add('vscode-native-nav');
  const style = document.createElement('style');
  style.setAttribute('data-vscode-shell', '1');
  style.textContent = SHELL_CSS;
  document.head.appendChild(style);
  syncBootstrapTheme();
}

/**
 * 同步 Bootstrap 5.3 的明暗模式（data-bs-theme）：
 * 弹窗 / 下拉 / tooltip 等组件的配色由 bootstrap 自身的 --bs-* 变量驱动，
 * 宿主切换主题时 body 上的 vscode-light/dark 类会实时变化，用 MutationObserver 跟随。
 */
function syncBootstrapTheme(): void {
  const apply = () => {
    const dark =
      document.body.classList.contains('vscode-dark') ||
      document.body.classList.contains('vscode-high-contrast');
    document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  };
  apply();
  try {
    new MutationObserver(apply).observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  } catch {
    /* 主题切换不跟随仅在极端环境出现，忽略 */
  }
}
