"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const DatabaseTreeProvider_1 = require("./provider/DatabaseTreeProvider");
const WebViewProvider_1 = require("./provider/WebViewProvider");
const DatabaseServiceBridge_1 = require("./service/DatabaseServiceBridge");
async function activate(context) {
    console.log('fdb2 extension is now active!');
    // 初始化数据库服务桥接
    const dbBridge = (0, DatabaseServiceBridge_1.getDatabaseServiceBridge)();
    await dbBridge.init();
    // 注册侧边栏树形视图
    const databaseProvider = new DatabaseTreeProvider_1.DatabaseTreeProvider(context, dbBridge);
    vscode.window.registerTreeDataProvider('databaseExplorer', databaseProvider);
    // 注册 WebView 提供者
    const webViewProvider = new WebViewProvider_1.WebViewProvider(context, dbBridge);
    // 注册命令
    const commands = [
        // 查询面板
        vscode.commands.registerCommand('fdb2.openQueryPanel', async () => {
            await webViewProvider.showQueryPanel();
        }),
        // 数据库管理面板
        vscode.commands.registerCommand('fdb2.openDatabasePanel', async (connection) => {
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
        vscode.commands.registerCommand('fdb2.deleteConnection', async (connection) => {
            const confirmed = await vscode.window.showWarningMessage(`确定要删除连接 "${connection.label}" 吗？`, { modal: true }, '删除');
            if (confirmed === '删除') {
                await dbBridge.connection.deleteConnection(connection.id);
                vscode.window.showInformationMessage(`连接 "${connection.label}" 已删除`);
                databaseProvider.refresh();
            }
        }),
        // 编辑连接
        vscode.commands.registerCommand('fdb2.editConnection', async (connection) => {
            await webViewProvider.showEditConnectionPanel(connection);
            databaseProvider.refresh();
        })
    ];
    commands.forEach(cmd => context.subscriptions.push(cmd));
    // 刷新树形视图
    databaseProvider.refresh();
}
function deactivate() {
    console.log('fdb2 extension is now deactivated');
}
//# sourceMappingURL=extension.js.map