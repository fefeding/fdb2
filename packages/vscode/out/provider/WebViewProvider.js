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
exports.WebViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * WebView 提供者
 * 负责创建和管理 WebView 面板
 */
class WebViewProvider {
    constructor(context, dbBridge) {
        this.context = context;
        this.dbBridge = dbBridge;
        this.panels = new Map();
    }
    /**
     * 显示查询面板
     */
    async showQueryPanel() {
        const panel = vscode.window.createWebviewPanel('fdb2.query', 'SQL 查询', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'webview'))
            ]
        });
        panel.webview.html = this.getWebviewContent(panel.webview, 'query');
        this.setupMessageHandler(panel, 'query');
        this.panels.set('query', panel);
        // 发送连接列表
        this.sendConnections(panel);
    }
    /**
     * 显示数据库管理面板
     */
    async showDatabasePanel(connection) {
        const panel = vscode.window.createWebviewPanel('fdb2.database', '数据库管理', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'webview'))
            ]
        });
        panel.webview.html = this.getWebviewContent(panel.webview, 'database');
        this.setupMessageHandler(panel, 'database');
        this.panels.set('database', panel);
        // 如果指定了连接，发送连接信息
        if (connection) {
            panel.webview.postMessage({ command: 'selectConnection', data: connection });
        }
    }
    /**
     * 显示添加连接面板
     */
    async showAddConnectionPanel() {
        const panel = vscode.window.createWebviewPanel('fdb2.connection', '添加数据库连接', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this.getWebviewContent(panel.webview, 'connection');
        this.setupMessageHandler(panel, 'connection');
        panel.onDidDispose(() => {
            // 面板关闭后刷新树形视图
            vscode.commands.executeCommand('fdb2.refreshConnections');
        });
    }
    /**
     * 显示编辑连接面板
     */
    async showEditConnectionPanel(connection) {
        const panel = vscode.window.createWebviewPanel('fdb2.connection', '编辑数据库连接', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this.getWebviewContent(panel.webview, 'connection');
        this.setupMessageHandler(panel, 'connection');
        // 发送连接数据用于编辑
        setTimeout(() => {
            panel.webview.postMessage({ command: 'editConnection', data: connection });
        }, 100);
        panel.onDidDispose(() => {
            vscode.commands.executeCommand('fdb2.refreshConnections');
        });
    }
    /**
     * 获取 WebView 内容
     */
    getWebviewContent(webview, type) {
        const scriptPath = path.join(this.context.extensionPath, 'resources', 'webview', `${type}.js`);
        const stylePath = path.join(this.context.extensionPath, 'resources', 'webview', `${type}.css`);
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(scriptPath));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(stylePath));
        // 获取数据库类型列表
        const databaseTypes = this.getDatabaseTypes();
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Tool</title>
    <link rel="stylesheet" href="${styleUri}">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        #app {
            height: 100vh;
            overflow: auto;
        }
    </style>
</head>
<body>
    <div id="app"></div>
    <script>
        // VSCode API
        const vscode = acquireVsCodeApi();

        // 数据库类型配置
        window.DATABASE_TYPES = ${JSON.stringify(databaseTypes)};
    </script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
    /**
     * 设置消息处理器
     */
    setupMessageHandler(panel, type) {
        panel.webview.onDidReceiveMessage(async (message) => {
            await this.handleMessage(panel, message);
        }, undefined, this.context.subscriptions);
        panel.onDidDispose(() => {
            this.panels.delete(type);
        });
    }
    /**
     * 处理来自 WebView 的消息
     */
    async handleMessage(panel, message) {
        try {
            switch (message.command) {
                case 'getConnections':
                    this.sendConnections(panel);
                    break;
                case 'addConnection':
                    await this.dbBridge.connection.addConnection(message.data);
                    panel.webview.postMessage({ command: 'connectionAdded', data: message.data });
                    vscode.window.showInformationMessage('连接添加成功');
                    break;
                case 'updateConnection':
                    await this.dbBridge.connection.updateConnection(message.data.id, message.data);
                    panel.webview.postMessage({ command: 'connectionUpdated', data: message.data });
                    vscode.window.showInformationMessage('连接更新成功');
                    break;
                case 'testConnection':
                    const success = await this.dbBridge.connection.testConnection(message.data);
                    panel.webview.postMessage({ command: 'testResult', data: { success } });
                    if (success) {
                        vscode.window.showInformationMessage('连接测试成功');
                    }
                    else {
                        vscode.window.showErrorMessage('连接测试失败');
                    }
                    break;
                case 'executeQuery':
                    const queryResult = await this.dbBridge.database.executeQuery(message.data.connectionId, message.data.sql, message.data.database);
                    panel.webview.postMessage({
                        command: 'queryResult',
                        data: queryResult
                    });
                    break;
                case 'getTables':
                    const tables = await this.dbBridge.database.getTables(message.data.connectionId, message.data.database);
                    panel.webview.postMessage({
                        command: 'tables',
                        data: tables
                    });
                    break;
                case 'getDatabases':
                    const databases = await this.dbBridge.database.getDatabases(message.data.connectionId);
                    panel.webview.postMessage({
                        command: 'databases',
                        data: databases
                    });
                    break;
                default:
                    console.warn('Unknown command:', message.command);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`操作失败: ${error.message}`);
            panel.webview.postMessage({
                command: 'error',
                data: error.message
            });
        }
    }
    /**
     * 发送连接列表到 WebView
     */
    async sendConnections(panel) {
        const connections = await this.dbBridge.connection.getAllConnections();
        panel.webview.postMessage({ command: 'connections', data: connections });
    }
    /**
     * 获取数据库类型列表
     */
    getDatabaseTypes() {
        return [
            { type: 'mysql', name: 'MySQL', defaultPort: 3306 },
            { type: 'postgresql', name: 'PostgreSQL', defaultPort: 5432 },
            { type: 'sqlite', name: 'SQLite', defaultPort: 0 },
            { type: 'sqlserver', name: 'SQL Server', defaultPort: 1433 },
            { type: 'oracle', name: 'Oracle', defaultPort: 1521 },
            { type: 'cockroachdb', name: 'CockroachDB', defaultPort: 26257 },
            { type: 'mongodb', name: 'MongoDB', defaultPort: 27017 },
            { type: 'sap_hana', name: 'SAP HANA', defaultPort: 39013 }
        ];
    }
}
exports.WebViewProvider = WebViewProvider;
//# sourceMappingURL=WebViewProvider.js.map