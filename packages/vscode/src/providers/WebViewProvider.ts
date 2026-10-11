import * as vscode from 'vscode';
import { DatabaseBridge } from '../service/DatabaseBridge';
import { DatabaseTreeProvider } from './DatabaseTreeProvider';
import { normalizeResult, normalizeQueryResult } from '../protocol';

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
  ) {}

  private out = vscode.window.createOutputChannel('Database Tool');
  private log(msg: string): void {
    this.out.appendLine(`[${new Date().toISOString()}] ${msg}`);
  }

  // ---------------- 面板入口 ----------------

  showConnectionPanel(editConn?: any): void {
    const panel = this.createPanel('dbtool.connection', editConn ? '编辑连接' : '添加连接', 'connection');
    if (editConn) this.pending.set(panel, { command: 'editConnection', data: editConn });
  }

  showQueryPanel(connectionId?: string): void {
    const panel = this.createPanel('dbtool.query', 'SQL 查询', 'query');
    if (connectionId) this.pending.set(panel, { command: 'selectConnection', data: { id: connectionId } });
  }

  showDatabasePanel(connectionId?: string): void {
    const panel = this.createPanel('dbtool.database', '数据库浏览器', 'database');
    if (connectionId) this.pending.set(panel, { command: 'selectConnection', data: { id: connectionId } });
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
    const viewType = 'dbtool.explorer';
    const existed = this.panels.has(viewType);
    const panel = this.createPanel(viewType, 'fdb2 数据库工作台', 'explorer');
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

  private createPanel(viewType: string, title: string, panelType: string): vscode.WebviewPanel {
    const existing = this.panels.get(viewType);
    if (existing) {
      existing.reveal();
      return existing;
    }

    const panel = vscode.window.createWebviewPanel(viewType, title, vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, WEBVIEW_DIR)]
    });

    const webview = panel.webview;
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
<title>${title}</title>
</head>
<body>
<div id="app"></div>
<script nonce="${nonce}">window.__PANEL_TYPE__ = ${JSON.stringify(panelType)};</script>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(
      (message: any) => this.handleMessage(message, panel),
      undefined,
      this.context.subscriptions
    );

    panel.onDidDispose(
      () => this.panels.delete(viewType),
      undefined,
      this.context.subscriptions
    );

    this.panels.set(viewType, panel);
    return panel;
  }

  // ---------------- 消息路由 ----------------

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
            const data = await this.bridge.call(message.path, message.data || {});
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
          post({ command: 'databases', data: await this.bridge.call('/api/database/getDatabases', message.data) });
          return;
        case 'getTables':
          post({ command: 'tables', data: await this.bridge.call('/api/database/getTables', message.data) });
          return;
        case 'getViews':
          post({ command: 'views', data: await this.bridge.call('/api/database/getViews', message.data) });
          return;
        case 'getTableData': {
          const res = await this.bridge.call<{ data: any[]; total: number }>('/api/database/getTableData', message.data);
          const norm = normalizeResult(res.data || []); // data 为对象数组
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
          post({ command: 'tableInfo', data: await this.bridge.call('/api/database/getTableInfo', message.data) });
          return;
        case 'executeQuery': {
          const start = Date.now();
          const res = await this.bridge.call('/api/database/executeQuery', message.data);
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

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
