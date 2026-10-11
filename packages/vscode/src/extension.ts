// 必须最先导入：在任何 server 模块被加载前设置 DB_TOOL_DATA_DIR。
import './prelude';

import * as vscode from 'vscode';
import { DatabaseBridge } from './service/DatabaseBridge';
import { DatabaseTreeProvider } from './providers/DatabaseTreeProvider';
import { WebViewProvider } from './providers/WebViewProvider';

let bridge: DatabaseBridge;
let treeProvider: DatabaseTreeProvider;
let webViewProvider: WebViewProvider;

export function activate(context: vscode.ExtensionContext): void {
  console.log('[db-tool] extension is now active!');

  bridge = new DatabaseBridge();
  treeProvider = new DatabaseTreeProvider(bridge);
  webViewProvider = new WebViewProvider(context, bridge, treeProvider);

  const treeView = vscode.window.createTreeView('databaseExplorer', { treeDataProvider: treeProvider });
  context.subscriptions.push(treeView);

  const register = (id: string, handler: (...args: any[]) => any) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

  // 树节点点击命令：打开完整工作台并导航到对应位置（与桌面端一致）
  register('dbtool.openExplorer', (query: Record<string, string> = {}) => {
    webViewProvider.showExplorerPanel(query);
  });

  register('dbtool.addConnection', () => webViewProvider.showConnectionPanel());
  register('dbtool.refreshConnections', () => treeProvider.refresh());
  register('dbtool.openQueryPanel', (connectionId?: string) => webViewProvider.showQueryPanel(connectionId));

  register('dbtool.testConnection', async (conn?: any) => {
    try {
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

  register('dbtool.deleteConnection', async (conn?: any) => {
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

  register('dbtool.viewTableData', (connectionId?: string, database?: string, table?: string) => {
    if (!connectionId || !database || !table) return;
    webViewProvider.showTableDataPanel(connectionId, database, table);
  });

  register('dbtool.viewTableStructure', (connectionId?: string, database?: string, table?: string) => {
    if (!connectionId || !database || !table) return;
    webViewProvider.showTableStructurePanel(connectionId, database, table);
  });

  // 首次激活时刷新树（加载已保存的连接）
  treeProvider.refresh();
}

export function deactivate(): void {
  // 关闭所有活跃数据库连接，避免资源泄漏
  try {
    bridge.call('/api/database/closeConnection', { id: '*' }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
