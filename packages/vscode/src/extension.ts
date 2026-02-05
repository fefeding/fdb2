import * as vscode from 'vscode';
import { DatabaseTreeProvider } from './provider/DatabaseTreeProvider';
import { WebViewProvider } from './provider/WebViewProvider';
import { getDatabaseServiceBridge } from './service/DatabaseServiceBridge';

export async function activate(context: vscode.ExtensionContext) {
    console.log('fdb2 extension is now active!');

    // 初始化数据库服务桥接
    const dbBridge = getDatabaseServiceBridge();
    await dbBridge.init();

    // 注册侧边栏树形视图
    const databaseProvider = new DatabaseTreeProvider(context, dbBridge);
    vscode.window.registerTreeDataProvider(
        'databaseExplorer',
        databaseProvider
    );

    // 注册 WebView 提供者
    const webViewProvider = new WebViewProvider(context, dbBridge);

    // 注册命令
    const commands = [
        // 查询面板
        vscode.commands.registerCommand('fdb2.openQueryPanel', async () => {
            await webViewProvider.showQueryPanel();
        }),

        // 数据库管理面板
        vscode.commands.registerCommand('fdb2.openDatabasePanel', async (connection?: any) => {
            await webViewProvider.showDatabasePanel(connection);
        }),

        // 刷新连接
        vscode.commands.registerCommand('fdb2.refreshConnections', () => {
            databaseProvider.refresh();
        }),

        // 添加连接
        vscode.commands.registerCommand('fdb2.addConnection', async () => {
            await webViewProvider.showAddConnectionPanel();
            databaseProvider.refresh();
        }),

        // 删除连接
        vscode.commands.registerCommand('fdb2.deleteConnection', async (connection: any) => {
            const confirmed = await vscode.window.showWarningMessage(
                `确定要删除连接 "${connection.label}" 吗？`,
                { modal: true },
                '删除'
            );

            if (confirmed === '删除') {
                await dbBridge.connection.deleteConnection(connection.id);
                vscode.window.showInformationMessage(`连接 "${connection.label}" 已删除`);
                databaseProvider.refresh();
            }
        }),

        // 编辑连接
        vscode.commands.registerCommand('fdb2.editConnection', async (connection: any) => {
            await webViewProvider.showEditConnectionPanel(connection);
            databaseProvider.refresh();
        })
    ];

    commands.forEach(cmd => context.subscriptions.push(cmd));

    // 刷新树形视图
    databaseProvider.refresh();
}

export function deactivate() {
    console.log('fdb2 extension is now deactivated');
}
