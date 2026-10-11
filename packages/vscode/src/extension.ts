// 必须最先导入：在任何 server 模块被加载前设置 DB_TOOL_DATA_DIR。
import './prelude';

import * as vscode from 'vscode';
import { DatabaseBridge } from './service/DatabaseBridge';
import { DatabaseTreeProvider, DbTreeItem } from './providers/DatabaseTreeProvider';
import { WebViewProvider } from './providers/WebViewProvider';

let bridge: DatabaseBridge;
let treeProvider: DatabaseTreeProvider;
let webViewProvider: WebViewProvider;

/**
 * 右键菜单 / 命令行传入的参数可能是：
 *  - DbTreeItem（view/item/context 一律传 TreeItem 本身）
 *  - 原始连接对象（从 webview 或其它命令调用）
 *  - undefined
 * 统一解析为连接配置对象。
 */
async function resolveConnection(arg?: any): Promise<any | undefined> {
  if (!arg) {
    // 未在树上选择时，弹出快速选择
    const conns = (await bridge.call<any[]>('/api/database/getConnections')) || [];
    if (conns.length === 0) return undefined;
    if (conns.length === 1) return conns[0];
    const pick = await vscode.window.showQuickPick(
      conns.map((c) => ({ label: c.name, description: `${(c.type || '').toUpperCase()} ${c.host || ''}`, conn: c })),
      { placeHolder: '选择数据库连接' }
    );
    return pick?.conn;
  }
  if (arg.connection) return arg.connection;
  if (arg.id || arg.connectionId) {
    const id = arg.id || arg.connectionId;
    const conns = (await bridge.call<any[]>('/api/database/getConnections')) || [];
    return conns.find((c) => c.id === id) || { id, name: arg.label || id };
  }
  return undefined;
}

/** 树节点 -> 导航 query（与桌面端路由 query 一致） */
function queryOf(item: any): Record<string, string> {
  const q: Record<string, string> = {};
  if (!item) return q;
  if (item.connectionId) q.connectionId = item.connectionId;
  if (item.database) q.database = item.database;
  if (item.table) q.table = item.table;
  return q;
}

export function activate(context: vscode.ExtensionContext): void {
  bridge = new DatabaseBridge();
  treeProvider = new DatabaseTreeProvider(bridge);
  webViewProvider = new WebViewProvider(context, bridge, treeProvider);

  const treeView = vscode.window.createTreeView('databaseExplorer', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);

  const register = (id: string, handler: (...args: any[]) => any) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

  // 树节点点击命令：打开完整工作台并导航到对应位置（与桌面端一致）
  register('dbtool.openExplorer', (query: Record<string, string> = {}) => {
    webViewProvider.showExplorerPanel(query);
  });

  register('dbtool.addConnection', () => webViewProvider.showConnectionPanel());

  register('dbtool.editConnection', async (item?: any) => {
    const conn = await resolveConnection(item);
    if (!conn) {
      vscode.window.showWarningMessage('请在连接节点上右键选择「编辑连接」。');
      return;
    }
    webViewProvider.showConnectionPanel(conn);
  });

  register('dbtool.refreshConnections', (item?: any) => treeProvider.refresh(item instanceof DbTreeItem ? item : undefined));

  // 「数据库浏览器」与「新建查询」在树上作用于选中连接，未选中则弹快速选择
  register('dbtool.openDatabasePanel', (item?: any) => {
    const q = queryOf(item);
    if (!q.connectionId) {
      const id = item?.connection?.id || item?.id || item?.connectionId;
      if (id) q.connectionId = id;
    }
    webViewProvider.showExplorerPanel(q);
  });

  register('dbtool.openQueryPanel', async (item?: any) => {
    if (typeof item === 'string') {
      webViewProvider.showQueryPanel(item);
      return;
    }
    const conn = await resolveConnection(item);
    webViewProvider.showQueryPanel(conn?.id);
  });

  register('dbtool.testConnection', async (item?: any) => {
    let conn: any;
    try {
      conn = await resolveConnection(item);
      if (!conn) {
        vscode.window.showWarningMessage('请在连接节点上右键选择「测试连接」。');
        return;
      }
      const ok = await bridge.call<boolean>('/api/database/testConnection', conn);
      if (ok) {
        vscode.window.showInformationMessage(`连接「${conn.name}」测试成功。`);
      } else {
        vscode.window.showErrorMessage(`连接「${conn.name}」测试失败。`);
      }
    } catch (e: any) {
      vscode.window.showErrorMessage(`测试连接失败: ${e?.message || String(e)}`);
    }
  });

  register('dbtool.deleteConnection', async (item?: any) => {
    const conn = await resolveConnection(item);
    if (!conn) return;
    const pick = await vscode.window.showWarningMessage(
      `确定删除连接「${conn.name}」吗？`,
      { modal: true },
      '删除'
    );
    if (pick !== '删除') return;
    try {
      await bridge.call('/api/database/deleteConnection', { id: conn.id });
      treeProvider.refresh();
      vscode.window.showInformationMessage(`已删除连接「${conn.name}」。`);
    } catch (e: any) {
      vscode.window.showErrorMessage(`删除失败: ${e?.message || String(e)}`);
    }
  });

  // 表节点：右键传进来的是 DbTreeItem
  register('dbtool.viewTableData', (item?: any) => {
    if (!item?.connectionId || !item?.database || !item?.table) {
      vscode.window.showWarningMessage('请在表节点上右键选择「查看数据」。');
      return;
    }
    webViewProvider.showTableDataPanel(item.connectionId, item.database, item.table);
  });

  register('dbtool.viewTableStructure', (item?: any) => {
    if (!item?.connectionId || !item?.database || !item?.table) {
      vscode.window.showWarningMessage('请在表节点上右键选择「查看结构」。');
      return;
    }
    webViewProvider.showTableStructurePanel(item.connectionId, item.database, item.table);
  });

  register('dbtool.copyTableName', async (item?: any) => {
    if (!item?.table) return;
    await vscode.env.clipboard.writeText(item.table);
    vscode.window.showInformationMessage(`已复制表名: ${item.table}`);
  });

  register('dbtool.copySelectSQL', async (item?: any) => {
    if (!item?.table) return;
    const db = item.database ? `\`${item.database}\`.` : '';
    const sql = `SELECT * FROM ${db}\`${item.table}\` LIMIT 100;`;
    await vscode.env.clipboard.writeText(sql);
    vscode.window.showInformationMessage('已复制 SELECT 语句。');
  });

  // 首次激活时刷新树（加载已保存的连接）
  treeProvider.refresh();
}

export async function deactivate(): Promise<void> {
  // 关闭所有活跃数据库连接，避免资源泄漏
  try {
    const conns = (await bridge?.call<any[]>('/api/database/getConnections')) || [];
    await Promise.all(
      conns.map((c) => bridge.call('/api/database/closeConnection', { id: c.id }).catch(() => undefined))
    );
  } catch {
    /* ignore */
  }
  try {
    webViewProvider?.dispose();
  } catch {
    /* ignore */
  }
}
