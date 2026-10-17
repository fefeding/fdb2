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

  /* ---------------- 表格密度 ----------------
   * 与 database.css「基础组件密度 → .table」段（body.platform-desktop）逐条对应。
   * 桌面端入口会给 body 加 platform-desktop 拿到这套密度，webview 不加该类，
   * 表头/单元格便退回 Bootstrap 默认（1rem 字号 + .5rem 内边距），在面板里显得很大。
   *
   * 刻意不加 !important：table-editor.vue 等组件的 scoped 规则靠 important 覆盖
   * 通用密度（弹窗内表格要更紧凑），一旦这里也加 important 会把那些特例一起打掉。
   * 表头额外限定 thead，是为了压过 database.css:1135 同特异性的 body.vscode-dark .table th。
   */
  body.vscode-native-nav .table {
    border-radius: 0;
    box-shadow: none;
    --bs-table-bg: transparent;
    --bs-table-color: var(--db-text-body);
    --bs-table-border-color: var(--db-border);
    --bs-table-striped-bg: var(--db-bg-soft2);
    --bs-table-striped-color: var(--db-text-body);
    --bs-table-hover-bg: var(--db-bg-soft);
  }
  body.vscode-native-nav .table thead th {
    padding: 0.375rem 0.625rem;
    background-color: var(--db-bg-soft);
    border-color: var(--db-border);
    color: var(--db-text-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  body.vscode-native-nav .table td {
    padding: 0.3rem 0.625rem;
    border-color: var(--db-border);
    font-size: 12px;
  }
  body.vscode-native-nav .table-dark {
    --bs-table-bg: var(--db-bg-soft);
    --bs-table-color: var(--db-text-muted);
  }
  body.vscode-native-nav .table-striped tbody tr:nth-of-type(odd) { background-color: transparent; }
  body.vscode-native-nav .table-hover tbody tr:hover { background-color: var(--db-bg-soft); transform: none; }
  body.vscode-native-nav .table-responsive { border-radius: 0; box-shadow: none; }

  /* 关闭按钮：database.css 给它铺了 var(--db-gray-light) 实心底 + 黑色 svg，
   * webview 深色背景下 svg 看不见，只剩一个灰色圆角方块（标题栏右上角那个）。
   * 对齐 platform-desktop 改透明底，让 svg 可见（data-bs-theme=dark 时 Bootstrap 会反白）。
   * 刻意不动 background-image / 尺寸：modal 组件里有改用字形图标的特例，不能被打掉。
   */
  body.vscode-native-nav .btn-close {
    width: 22px;
    height: 22px;
    padding: 0;
    background-color: transparent;
    border-radius: 4px;
    opacity: 0.7;
  }
  body.vscode-native-nav .btn-close:hover {
    background-color: var(--db-bg-soft);
    opacity: 1;
    transform: none;
  }

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

  /* ---------------- 弹窗内不做降噪 ----------------
   * 上面的降噪针对的是「面板里一排操作按钮太花哨」，而弹窗是聚焦场景：
   * 表新增/修改结构弹窗里的「保存(蓝)」「添加字段(绿)」「删除列(红)」必须与桌面端一致，
   * 否则同一套 table-editor 组件在两个环境里观感不同。
   *
   * Bootstrap 5.3 的按钮本身就由 --bs-btn-* 变量驱动（随 data-bs-theme 切明暗），
   * 所以这里只需把被降噪压平的三个属性还原回变量取值，不重新指定具体色值。
   */
  body.vscode-native-nav .modal .btn-primary,
  body.vscode-native-nav .modal .btn-success,
  body.vscode-native-nav .modal .btn-info,
  body.vscode-native-nav .modal .btn-secondary,
  body.vscode-native-nav .modal .btn-danger {
    background-color: var(--bs-btn-bg) !important;
    border-color: var(--bs-btn-border-color) !important;
    color: var(--bs-btn-color) !important;
  }
  body.vscode-native-nav .modal .btn-primary:hover,
  body.vscode-native-nav .modal .btn-primary:focus,
  body.vscode-native-nav .modal .btn-success:hover,
  body.vscode-native-nav .modal .btn-success:focus,
  body.vscode-native-nav .modal .btn-info:hover,
  body.vscode-native-nav .modal .btn-info:focus,
  body.vscode-native-nav .modal .btn-secondary:hover,
  body.vscode-native-nav .modal .btn-secondary:focus,
  body.vscode-native-nav .modal .btn-danger:hover,
  body.vscode-native-nav .modal .btn-danger:focus {
    background-color: var(--bs-btn-hover-bg) !important;
    border-color: var(--bs-btn-hover-border-color) !important;
    color: var(--bs-btn-hover-color) !important;
  }
  /* 描边类：基础态透明底 + 自身边框色，hover 回填自身 hover 底色 */
  body.vscode-native-nav .modal .btn-outline-danger,
  body.vscode-native-nav .modal .btn-outline-warning {
    background-color: transparent !important;
    border-color: var(--bs-btn-border-color) !important;
    color: var(--bs-btn-color) !important;
  }
  body.vscode-native-nav .modal .btn-outline-danger:hover,
  body.vscode-native-nav .modal .btn-outline-danger:focus,
  body.vscode-native-nav .modal .btn-outline-warning:hover,
  body.vscode-native-nav .modal .btn-outline-warning:focus {
    background-color: var(--bs-btn-hover-bg) !important;
    border-color: var(--bs-btn-hover-border-color) !important;
    color: var(--bs-btn-hover-color) !important;
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
