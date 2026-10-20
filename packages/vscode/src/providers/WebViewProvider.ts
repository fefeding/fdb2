import * as vscode from 'vscode';
import { DatabaseBridge } from '../service/DatabaseBridge';
import { DatabaseTreeProvider } from './DatabaseTreeProvider';
import { normalizeQueryResult } from '../protocol';

const WEBVIEW_DIR = 'resources/webview';

/**
 * 管理各类 Webview 面板（连接管理 / SQL 查询 / 数据库浏览器 / 表数据 / 表结构）。
 * 每个面板加载同一份构建产物 main.js，由 window.__PANEL_TYPE__ 决定挂载哪个 Vue 组件。
 */
export class WebViewProvider {
  private panels = new Map<string, vscode.WebviewPanel>();
  // 面板就绪（webview 发来 'ready'）后需要下发的初始化消息
  private pending = new WeakMap<vscode.WebviewPanel, any>();

  constructor(
    private context: vscode.ExtensionContext,
    private bridge: DatabaseBridge,
    private tree: DatabaseTreeProvider
  ) {
    this.watchThemeChanges();
  }

  private out = vscode.window.createOutputChannel('Database Tool');
  private log(msg: string): void {
    this.out.appendLine(`[${new Date().toISOString()}] ${msg}`);
  }

  /**
   * 通知所有面板"主题已变化"。
   * 深色主题之间切换时 body 的 vscode-dark 类不变（MutationObserver 不会触发），
   * 而 ECharts / CodeMirror 是 canvas+JS 配色，必须显式重绘才能跟上新主题。
   */
  private watchThemeChanges(): void {
    const disposable = vscode.window.onDidChangeActiveColorTheme(() => {
      for (const panel of this.panels.values()) {
        panel.webview.postMessage({ command: 'themeChanged' }).then(undefined, () => undefined);
      }
    });
    this.context.subscriptions.push(disposable);
  }

  // ---------------- 面板入口 ----------------

  showConnectionPanel(editConn?: any): void {
    const viewType = 'dbtool.connection';
    const existed = this.panels.has(viewType);
    const panel = this.createPanel(viewType, editConn ? `编辑连接: ${editConn.name || ''}` : '添加连接', 'connection');
    if (!editConn) return;
    const init = { command: 'editConnection', data: editConn };
    // 复用已存在的面板时它早已 ready，不会再发 'ready'，需直接下发；
    // 同时保留 pending：若面板恰好正在重载（ready 未到），重载完成时会重新投递
    this.pending.set(panel, init);
    if (existed) panel.webview.postMessage(init);
  }

  showQueryPanel(connectionId?: string): void {
    const viewType = 'dbtool.query';
    const existed = this.panels.has(viewType);
    const panel = this.createPanel(viewType, 'SQL 查询', 'query');
    if (!connectionId) return;
    const init = { command: 'selectConnection', data: { id: connectionId } };
    this.pending.set(panel, init);
    if (existed) panel.webview.postMessage(init);
  }

  showDatabasePanel(connectionId?: string): void {
    const viewType = 'dbtool.database';
    const existed = this.panels.has(viewType);
    const panel = this.createPanel(viewType, '数据库浏览器', 'database');
    if (!connectionId) return;
    const init = { command: 'selectConnection', data: { id: connectionId } };
    this.pending.set(panel, init);
    if (existed) panel.webview.postMessage(init);
  }

  showTableDataPanel(connectionId: string, database: string, table: string): void {
    const viewType = 'dbtool.tableData';
    const existed = this.panels.has(viewType);
    const panel = this.createPanel(viewType, `数据: ${table}`, 'tableData');
    const init = { command: 'init', data: { connectionId, database, table } };
    if (existed) {
      // 面板已就绪，不会再发 'ready'，直接下发新 init
      panel.webview.postMessage(init);
    } else {
      this.pending.set(panel, init);
    }
  }

  showTableStructurePanel(connectionId: string, database: string, table: string): void {
    const viewType = 'dbtool.tableStructure';
    const existed = this.panels.has(viewType);
    const panel = this.createPanel(viewType, `结构: ${table}`, 'tableStructure');
    const init = { command: 'init', data: { connectionId, database, table } };
    if (existed) {
      panel.webview.postMessage(init);
    } else {
      this.pending.set(panel, init);
    }
  }

  /**
   * 打开完整工作台面板（复用桌面端 platform/database 视图）。
   * query 形如 { connectionId?, database?, table? }，与桌面端路由 query 一致。
   */
  showExplorerPanel(query: Record<string, string> = {}): void {
    // 同一连接复用同一 Tab；不同连接用独立 viewType 开新 Tab。
    const connId = query.connectionId || 'default';
    const viewType = `dbtool.explorer.${connId}`;
    const existed = this.panels.has(connId);
    const panel = this.createPanel(viewType, 'fdb2 数据库工作台', 'explorer', connId);
    if (existed) {
      panel.webview.postMessage({ command: 'navigate', data: query });
    } else {
      this.pending.set(panel, { command: 'navigate', data: query });
    }
    this.updateExplorerTitle(panel, query);
  }

  /**
   * 让 Tab 标题反映当前选中对象，如「server.jm47.com · db_account · users」。
   */
  private async updateExplorerTitle(
    panel: vscode.WebviewPanel,
    query: Record<string, string>
  ): Promise<void> {
    const parts: string[] = [];
    if (query.connectionId) {
      try {
        const conns = (await this.bridge.call<any[]>('/api/database/getConnections')) || [];
        const conn = conns.find((c) => c.id === query.connectionId);
        parts.push(conn?.name || query.connectionId);
      } catch {
        parts.push(query.connectionId);
      }
    } else {
      parts.push('fdb2 数据库工作台');
    }
    if (query.database) parts.push(query.database);
    if (query.table) parts.push(query.table);
    panel.title = parts.join(' · ');
  }

  // ---------------- 面板构建 ----------------

  /** 保存对话框的默认位置：工作区根目录（无工作区时落到系统下载/文档目录由 VSCode 决定） */
  private defaultSaveUri(filename: string): vscode.Uri | undefined {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
    return folder ? vscode.Uri.joinPath(folder, filename) : undefined;
  }

  /** 释放全部面板与输出通道（扩展停用时调用） */
  dispose(): void {
    for (const panel of this.panels.values()) {
      try {
        panel.dispose();
      } catch {
        /* ignore */
      }
    }
    this.panels.clear();
    this.out.dispose();
  }

  private createPanel(
    viewType: string,
    title: string,
    panelType: string,
    reuseKey?: string
  ): vscode.WebviewPanel {
    const key = reuseKey ?? viewType;
    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal();
      return existing;
    }

    const panel = vscode.window.createWebviewPanel(viewType, title, vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      enableFindWidget: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, WEBVIEW_DIR)]
    });
    panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'activity-icon.svg');

    const webview = panel.webview;
    // webview 资源目录的 asWebviewUri，作为 <base> 让动态 import() 的 chunk 相对路径
    // 正确解析到受 localResourceRoots 信任的地址（ESM 代码分割后有多文件）。
    const webviewDirUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, WEBVIEW_DIR)
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, WEBVIEW_DIR, 'main.js')
    );
    const nonce = getNonce();

    const csp = [
      `default-src 'none';`,
      `img-src ${webview.cspSource} https: data: blob:;`,
      `media-src ${webview.cspSource} https: data: blob:;`,
      `font-src ${webview.cspSource} https: data:;`,
      `style-src ${webview.cspSource} 'unsafe-inline';`,
      `script-src 'nonce-${nonce}' ${webview.cspSource};`
    ].join(' ');

    panel.webview.html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base href="${webviewDirUri.toString()}/" />
<title>${escapeHtml(title)}</title>
</head>
<body>
<div id="app"></div>
<script nonce="${nonce}">window.__PANEL_TYPE__ = ${JSON.stringify(panelType)};</script>
<script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(
      (message: any) => this.handleMessage(message, panel),
      undefined,
      this.context.subscriptions
    );

    panel.onDidDispose(
      () => this.panels.delete(key),
      undefined,
      this.context.subscriptions
    );

    this.panels.set(key, panel);
    return panel;
  }

  // ---------------- 消息路由 ----------------

  /**
   * 统一后端入参：
   *  - 兼容老面板的 connectionId / id 两种写法（后端只认 id）
   *  - 未指定分页大小时套用 dbtool.queryLimit
   */
  private withDefaults(path: string, body: any): any {
    const out = { ...(body || {}) };
    if (!out.id && out.connectionId) out.id = out.connectionId;
    if (path === '/api/database/getTableData' && !out.pageSize) {
      const limit = vscode.workspace.getConfiguration('dbtool').get<number>('queryLimit');
      if (limit && limit > 0) out.pageSize = limit;
    }
    return out;
  }

  private async handleMessage(message: any, panel: vscode.WebviewPanel): Promise<void> {
    const post = (m: any) => {
      this.log(`=> ${m.command} ${m.command === 'tableData' || m.command === 'tableInfo' ? JSON.stringify(m.data).slice(0, 300) : ''}`);
      panel.webview.postMessage(m);
    };
    this.log(`<= ${message.command} ${message.data ? JSON.stringify(message.data).slice(0, 300) : ''}`);
    try {
      switch (message.command) {
        case 'apiRequest': {
          // 完整工作台的通用 API 通道：响应格式与桌面端 vite dev server 一致（{ ret, msg, data }）
          try {
            const data = await this.bridge.call(message.path, this.withDefaults(message.path, message.data || {}));
            post({ command: 'apiResponse', id: message.id, body: { ret: 0, msg: 'success', data } });
          } catch (e: any) {
            this.log(`apiRequest ${message.path} 失败: ${e?.message || e}`);
            post({ command: 'apiResponse', id: message.id, body: { ret: 500, msg: e?.message || String(e) } });
          }
          return;
        }
        case 'ready': {
          const init = this.pending.get(panel);
          if (init) {
            this.pending.delete(panel);
            post(init);
          }
          return;
        }
        case 'getConnections':
          post({ command: 'connections', data: await this.bridge.call('/api/database/getConnections') });
          return;
        case 'addConnection':
          await this.bridge.call('/api/database/addConnection', message.data);
          this.tree.refresh();
          post({ command: 'saved' });
          panel.dispose();
          return;
        case 'updateConnection': {
          const { id, ...updates } = message.data;
          await this.bridge.call('/api/database/updateConnection', { id, ...updates });
          this.tree.refresh();
          post({ command: 'saved' });
          panel.dispose();
          return;
        }
        case 'deleteConnection':
          await this.bridge.call('/api/database/deleteConnection', message.data);
          this.tree.refresh();
          post({ command: 'deleted' });
          return;
        case 'testConnection': {
          const ok = await this.bridge.call<boolean>('/api/database/testConnection', message.data);
          post({ command: 'testResult', data: { success: !!ok } });
          return;
        }
        case 'getDatabases':
          post({ command: 'databases', data: await this.bridge.call('/api/database/getDatabases', this.withDefaults('/api/database/getDatabases', message.data)) });
          return;
        case 'getTables':
          post({ command: 'tables', data: await this.bridge.call('/api/database/getTables', this.withDefaults('/api/database/getTables', message.data)) });
          return;
        case 'getViews':
          post({ command: 'views', data: await this.bridge.call('/api/database/getViews', this.withDefaults('/api/database/getViews', message.data)) });
          return;
        case 'getTableData': {
          const res = await this.bridge.call<{ data: any[]; total: number }>(
            '/api/database/getTableData',
            this.withDefaults('/api/database/getTableData', message.data)
          );
          // 重新对齐：getTableData 返回对象数组，需还原为 columns/rows
          const aligned = alignRows(res.data || []);
          post({
            command: 'tableData',
            data: {
              columns: aligned.columns,
              rows: aligned.rows,
              total: res.total || aligned.rows.length,
              page: message.data.page || 1,
              pageSize: message.data.pageSize || 100
            }
          });
          return;
        }
        case 'getTableInfo':
          post({ command: 'tableInfo', data: await this.bridge.call('/api/database/getTableInfo', this.withDefaults('/api/database/getTableInfo', message.data)) });
          return;
        case 'executeQuery': {
          const start = Date.now();
          const res = await this.bridge.call('/api/database/executeQuery', this.withDefaults('/api/database/executeQuery', message.data));
          const result = normalizeQueryResult(res, Date.now() - start);
          post({ command: 'queryResult', data: result });
          return;
        }
        case 'refreshTree':
          this.tree.refresh();
          return;
        case 'close':
          panel.dispose();
          return;
        case 'pickSaveFolder': {
          // 在 VSCode 中弹出系统文件夹选择器，让用户决定导出文件保存位置
          const opts: vscode.OpenDialogOptions = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: '选择保存位置'
          };
          if (message.data?.defaultUri) {
            try {
              opts.defaultUri = vscode.Uri.file(message.data.defaultUri);
            } catch {
              /* ignore */
            }
          }
          const uris = await vscode.window.showOpenDialog(opts);
          const folderPath = uris && uris[0] ? uris[0].fsPath : null;
          post({ command: 'pickSaveFolderResult', id: message.id, data: { path: folderPath } });
          return;
        }
        case 'saveFile': {
          // webview 内无法用 <a download> 落盘，改由宿主弹出保存对话框后写文件
          const { filename, content, base64, filters } = message.data || {};
          if (!filename) {
            post({ command: 'saveFileResult', id: message.id, data: { path: null, error: 'missing filename' } });
            return;
          }
          const target = await vscode.window.showSaveDialog({
            defaultUri: this.defaultSaveUri(filename),
            filters,
            saveLabel: '保存'
          });
          if (!target) {
            post({ command: 'saveFileResult', id: message.id, data: { path: null, cancelled: true } });
            return;
          }
          const buf = base64
            ? Buffer.from(base64, 'base64')
            : Buffer.from(typeof content === 'string' ? content : JSON.stringify(content ?? ''), 'utf8');
          await vscode.workspace.fs.writeFile(target, buf);
          this.log(`已保存文件 ${target.fsPath} (${buf.length} bytes)`);
          post({ command: 'saveFileResult', id: message.id, data: { path: target.fsPath } });
          return;
        }
        case 'openPath': {
          // 打开导出结果（reveal=true 时在系统的文件管理器中定位）
          const p = message.data?.path;
          if (!p) return;
          const uri = vscode.Uri.file(p);
          if (message.data?.reveal) {
            await vscode.commands.executeCommand('revealFileInOS', uri);
          } else {
            await vscode.env.openExternal(uri);
          }
          return;
        }
        case 'showExportedFile': {
          // 导出完成后给出「打开 / 在资源管理器中显示」的宿主提示
          const p = message.data?.path;
          if (!p) return;
          const pick = await vscode.window.showInformationMessage(`已导出到 ${p}`, '打开文件', '在资源管理器中显示');
          if (!pick) return;
          const uri = vscode.Uri.file(p);
          if (pick === '打开文件') {
            await vscode.env.openExternal(uri);
          } else {
            await vscode.commands.executeCommand('revealFileInOS', uri);
          }
          return;
        }
        case 'openConnectionPanel':
          this.showConnectionPanel();
          return;
        case 'openQuery':
          this.showQueryPanel(message.data?.id);
          return;
        case 'openTableData':
          if (message.data?.connectionId && message.data?.database && message.data?.table) {
            this.showTableDataPanel(message.data.connectionId, message.data.database, message.data.table);
          }
          return;
        case 'openTableStructure':
          if (message.data?.connectionId && message.data?.database && message.data?.table) {
            this.showTableStructurePanel(message.data.connectionId, message.data.database, message.data.table);
          }
          return;
        default:
          post({ command: 'error', data: `未知命令: ${message.command}` });
      }
    } catch (e: any) {
      this.log(`ERROR ${message.command}: ${e && (e.stack || e.message) || e}`);
      post({ command: 'error', data: e?.message || String(e) });
    }
  }
}

/** 将服务端返回的对象数组对齐为 { columns, rows } */
function alignRows(data: any[]): { columns: string[]; rows: any[][] } {
  if (!Array.isArray(data)) return { columns: [], rows: [] };
  if (data.length === 0) return { columns: [], rows: [] };
  if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
    const columns = Object.keys(data[0]);
    const rows = data.map((r) => columns.map((c) => (r ? r[c] : null)));
    return { columns, rows };
  }
  if (Array.isArray(data[0])) {
    const n = (data[0] as any[]).length;
    return { columns: Array.from({ length: n }, (_, i) => `column${i + 1}`), rows: data as any[][] };
  }
  return { columns: ['result'], rows: data.map((r) => [r]) };
}

/** 表/库名来自数据库，插入 HTML 前必须转义 */
function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
