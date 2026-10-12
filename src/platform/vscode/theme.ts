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

  /* 表详情页：webview 面板较窄，顶部信息条 / 工具栏 / 页签整体收紧，
     按钮改为更紧凑的尺寸（桌面端不受影响） */
  body.vscode-native-nav .table-header { padding: 10px 14px !important; }
  body.vscode-native-nav .table-icon { font-size: 22px !important; }
  body.vscode-native-nav .table-name { font-size: 1.05rem !important; }
  body.vscode-native-nav .table-breadcrumb { font-size: 0.78rem !important; }
  body.vscode-native-nav .table-stats { gap: 12px !important; }
  body.vscode-native-nav .table-toolbar { padding: 8px 12px !important; gap: 8px !important; flex-wrap: wrap !important; }
  body.vscode-native-nav .toolbar-left,
  body.vscode-native-nav .toolbar-right { gap: 6px !important; flex-wrap: wrap !important; }
  body.vscode-native-nav .table-toolbar .btn {
    padding: 3px 8px !important;
    font-size: 12px !important;
    line-height: 1.4 !important;
    border-radius: 4px !important;
  }
  body.vscode-native-nav .table-toolbar .btn i { font-size: 12px !important; }
  body.vscode-native-nav .table-toolbar .dropdown-menu { font-size: 12px !important; }
  body.vscode-native-nav .table-toolbar .dropdown-item { padding: 4px 10px !important; font-size: 12px !important; }
  body.vscode-native-nav .nav-tabs { padding: 0 0.5rem !important; }
  body.vscode-native-nav .nav-tabs .nav-link {
    padding: 6px 12px !important;
    font-size: 12px !important;
  }
  body.vscode-native-nav .nav-tabs .nav-link .badge { font-size: 10px !important; padding: 2px 5px !important; }
  body.vscode-native-nav .tab-content { padding: 12px !important; }

  /* ---------------- 配色降噪 ----------------
   * 桌面端 UI 用的是「语义色按钮 + 数据库品牌渐变块」，在编辑器面板里过于花哨。
   * webview 内统一收敛为中性观感：操作按钮改为主题色描边，仅破坏性操作保留红色，
   * 数据库卡片的大色块改为中性面，品牌色只保留 32px 的 logo 小方块。
   */
  body.vscode-native-nav .btn-primary,
  body.vscode-native-nav .btn-info,
  body.vscode-native-nav .btn-success,
  body.vscode-native-nav .btn-secondary {
    background-color: var(--db-bg-soft) !important;
    border-color: var(--db-border-light) !important;
    color: var(--db-text-body) !important;
  }
  body.vscode-native-nav .btn-primary:hover,
  body.vscode-native-nav .btn-info:hover,
  body.vscode-native-nav .btn-success:hover,
  body.vscode-native-nav .btn-secondary:hover,
  body.vscode-native-nav .btn-primary:focus,
  body.vscode-native-nav .btn-info:focus,
  body.vscode-native-nav .btn-success:focus,
  body.vscode-native-nav .btn-secondary:focus {
    background-color: var(--db-border-soft) !important;
    border-color: var(--db-border-light) !important;
    color: var(--db-text-body) !important;
  }
  /* 破坏性操作保留语义色，但降低饱和度 */
  body.vscode-native-nav .btn-danger,
  body.vscode-native-nav .btn-outline-danger {
    background-color: transparent !important;
    border-color: rgba(239, 68, 68, 0.55) !important;
    color: #ef4444 !important;
  }
  body.vscode-native-nav .btn-warning,
  body.vscode-native-nav .btn-outline-warning {
    background-color: transparent !important;
    border-color: rgba(245, 158, 11, 0.5) !important;
    color: #f59e0b !important;
  }
  /* 徽章统一中性（主键 / 行数 / 类型） */
  body.vscode-native-nav .badge {
    background-color: var(--db-bg-soft) !important;
    color: var(--db-text-muted) !important;
    font-weight: 500 !important;
  }
  /* 数据库卡片的大块品牌渐变改为中性面 */
  body.vscode-native-nav .db-mysql-bg,
  body.vscode-native-nav .db-postgres-bg,
  body.vscode-native-nav .db-sqlite-bg,
  body.vscode-native-nav .db-mssql-bg,
  body.vscode-native-nav .db-oracle-bg,
  body.vscode-native-nav .db-default-bg {
    background: var(--db-bg-soft) !important;
    color: var(--db-text-body) !important;
    border: 1px solid var(--db-border) !important;
  }
  /* 进度/加载指示器也收敛为主题色 */
  body.vscode-native-nav .spinner-border.text-primary,
  body.vscode-native-nav .text-primary.spinner-border {
    color: var(--db-text-muted) !important;
  }
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
