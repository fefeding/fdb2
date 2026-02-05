# db_tool VSCode 扩展开发方案

## 1. 初始化 VSCode 扩展

### 1.1 安装脚手架
```bash
cd db_tool
npm install -g yo generator-code
yo code
```

### 1.2 项目结构
```
db_tool/
├── packages/
│   ├── core/           # 核心数据库服务（共享）
│   ├── web/            # Vue 前端（现有）
│   ├── nwjs/           # NW.js 桌面应用（现有）
│   └── vscode/         # VSCode 扩展
│       ├── src/
│       │   ├── extension.ts          # 扩展入口
│       │   ├── provider/
│       │   │   ├── DatabaseTreeProvider.ts  # 侧边栏树形视图
│       │   │   └── WebViewProvider.ts      # WebView 提供者
│       │   ├── webview/
│       │   │   ├── DatabasePanel.ts        # 数据库面板
│       │   │   ├── QueryPanel.ts          # 查询面板
│       │   │   └── StructurePanel.ts      # 结构面板
│       │   ├── service/
│       │   │   ├── DatabaseService.ts     # 数据库服务（复用现有）
│       │   │   └── ConnectionService.ts   # 连接服务
│       │   └── models/
│       │       └── Connection.ts          # 连接配置模型
│       ├── resources/
│       │   └── webview/           # WebView 资源（构建后的 Vue）
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
```

## 2. 核心功能实现

### 2.1 扩展入口 (extension.ts)

```typescript
import * as vscode from 'vscode';
import { DatabaseTreeProvider } from './provider/DatabaseTreeProvider';
import { WebViewProvider } from './provider/WebViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('db_tool extension is now active!');

    // 注册侧边栏树形视图
    const databaseProvider = new DatabaseTreeProvider(context);
    vscode.window.registerTreeDataProvider(
        'databaseExplorer',
        databaseProvider
    );

    // 注册 WebView 提供者
    const webViewProvider = new WebViewProvider(context);

    // 注册命令
    const commands = [
        vscode.commands.registerCommand('dbtool.openQueryPanel', () => {
            webViewProvider.showQueryPanel();
        }),
        vscode.commands.registerCommand('dbtool.openDatabasePanel', () => {
            webViewProvider.showDatabasePanel();
        }),
        vscode.commands.registerCommand('dbtool.refreshConnections', () => {
            databaseProvider.refresh();
        }),
        vscode.commands.registerCommand('dbtool.addConnection', () => {
            // 打开添加连接的 WebView
        })
    ];

    commands.forEach(cmd => context.subscriptions.push(cmd));
}

export function deactivate() {}
```

### 2.2 package.json 配置

```json
{
  "name": "db-tool-vscode",
  "displayName": "Database Tool (fdb2)",
  "description": "强大的数据库管理工具，支持多种数据库类型",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.75.0"
  },
  "categories": [
    "Other",
    "Data Science"
  ],
  "activationEvents": [
    "onView:databaseExplorer",
    "onCommand:dbtool.openQueryPanel"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "dbtool",
          "title": "Database Tool",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "dbtool": [
        {
          "id": "databaseExplorer",
          "name": "数据库连接"
        }
      ]
    },
    "commands": [
      {
        "command": "dbtool.addConnection",
        "title": "添加连接",
        "icon": "$(add)"
      },
      {
        "command": "dbtool.refreshConnections",
        "title": "刷新",
        "icon": "$(refresh)"
      },
      {
        "command": "dbtool.openQueryPanel",
        "title": "打开查询面板",
        "icon": "$(terminal)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "dbtool.addConnection",
          "when": "view == databaseExplorer",
          "group": "navigation"
        },
        {
          "command": "dbtool.refreshConnections",
          "when": "view == databaseExplorer",
          "group": "navigation"
        }
      ]
    },
    "configuration": {
      "title": "Database Tool",
      "properties": {
        "dbtool.defaultPort": {
          "type": "number",
          "default": 3306,
          "description": "默认数据库端口"
        },
        "dbtool.queryLimit": {
          "type": "number",
          "default": 100,
          "description": "查询结果限制"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/vscode": "^1.75.0",
    "typescript": "^4.9.5"
  },
  "dependencies": {
    "mysql2": "^3.16.3",
    "pg": "^8.18.0",
    "sqlite3": "^5.1.7",
    "typeorm": "^0.3.28"
  }
}
```

### 2.3 数据库树形视图提供者

```typescript
import * as vscode from 'vscode';

export interface DatabaseConnection {
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
}

export class DatabaseTreeProvider implements vscode.TreeDataProvider<DatabaseItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<DatabaseItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private connections: DatabaseConnection[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadConnections();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: DatabaseItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DatabaseItem): Promise<DatabaseItem[]> {
        if (!element) {
            // 根节点：显示所有连接
            return this.connections.map(conn => {
                const item = new DatabaseItem(
                    conn.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    conn.type
                );
                item.iconPath = new vscode.ThemeIcon('database');
                item.contextValue = 'connection';
                item.command = {
                    command: 'dbtool.openDatabasePanel',
                    title: '打开数据库',
                    arguments: [conn]
                };
                return item;
            });
        } else if (element.contextValue === 'connection') {
            // 连接节点：显示数据库列表
            return await this.getDatabases(element.connection);
        } else if (element.contextValue === 'database') {
            // 数据库节点：显示表列表
            return await this.getTables(element.database, element.parent?.connection);
        } else if (element.contextValue === 'table') {
            // 表节点：显示操作按钮
            return [
                new DatabaseItem('查看数据', vscode.TreeItemCollapsibleState.None, 'data'),
                new DatabaseItem('查看结构', vscode.TreeItemCollapsibleState.None, 'structure')
            ];
        }

        return [];
    }

    private async getDatabases(connection: DatabaseConnection): Promise<DatabaseItem[]> {
        // TODO: 从数据库获取数据库列表
        return [new DatabaseItem('db1', vscode.TreeItemCollapsibleState.Collapsed, 'database')];
    }

    private async getTables(database: string, connection?: DatabaseConnection): Promise<DatabaseItem[]> {
        // TODO: 从数据库获取表列表
        return [
            new DatabaseItem('users', vscode.TreeItemCollapsibleState.Collapsed, 'table'),
            new DatabaseItem('orders', vscode.TreeItemCollapsibleState.Collapsed, 'table')
        ];
    }

    private async loadConnections(): Promise<void> {
        // 从 VSCode globalState 加载连接
        this.connections = this.context.globalState.get<DatabaseConnection[]>('dbtool.connections', []);
    }

    async saveConnection(connection: DatabaseConnection): Promise<void> {
        this.connections.push(connection);
        await this.context.globalState.update('dbtool.connections', this.connections);
        this.refresh();
    }
}

export class DatabaseItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public connection?: DatabaseConnection,
        public database?: string
    ) {
        super(label, collapsibleState);
    }
}
```

### 2.4 WebView 提供者

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class WebViewProvider {
    private panels: Map<string, vscode.WebviewPanel> = new Map();

    constructor(private context: vscode.ExtensionContext) {}

    showQueryPanel(): void {
        const panel = vscode.window.createWebviewPanel(
            'dbtool.query',
            'SQL 查询',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'webview'))
                ]
            }
        );

        panel.webview.html = this.getWebViewContent(panel.webview, 'query');
        this.setupMessageHandler(panel);

        this.panels.set('query', panel);
    }

    showDatabasePanel(): void {
        const panel = vscode.window.createWebviewPanel(
            'dbtool.database',
            '数据库管理',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getWebViewContent(panel.webview, 'database');
        this.setupMessageHandler(panel);

        this.panels.set('database', panel);
    }

    private getWebViewContent(webview: vscode.Webview, type: string): string {
        // 加载 Vue 构建后的资源
        const scriptPath = path.join(this.context.extensionPath, 'resources', 'webview', `${type}.js`);
        const stylePath = path.join(this.context.extensionPath, 'resources', 'webview', `${type}.css`);

        const scriptUri = webview.asWebviewUri(vscode.Uri.file(scriptPath));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(stylePath));

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Tool</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div id="app"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    private setupMessageHandler(panel: vscode.WebviewPanel): void {
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'query':
                        // 执行 SQL 查询
                        const result = await this.executeQuery(message.sql);
                        panel.webview.postMessage({
                            command: 'queryResult',
                            data: result
                        });
                        break;
                    case 'getTables':
                        // 获取表列表
                        const tables = await this.getTables(message.connection);
                        panel.webview.postMessage({
                            command: 'tables',
                            data: tables
                        });
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private async executeQuery(sql: string): Promise<any> {
        // TODO: 执行查询并返回结果
        return { columns: [], rows: [] };
    }

    private async getTables(connection: any): Promise<any> {
        // TODO: 获取表列表
        return [];
    }
}
```

## 3. 前端适配

### 3.1 修改 Vue 项目以支持 VSCode WebView

在 Vue 项目中添加 VSCode API 适配层：

```typescript
// src/platform/vscode/bridge.ts
export class VSCodeBridge {
    private acquireVsCodeApi: any;

    constructor() {
        this.acquireVsCodeApi = (window as any).acquireVsCodeApi();
    }

    postMessage(message: any): void {
        this.acquireVsCodeApi.postMessage(message);
    }

    onMessage(callback: (message: any) => void): void {
        window.addEventListener('message', event => {
            callback(event.data);
        });
    }

    getState(): any {
        return this.acquireVsCodeApi.getState();
    }

    setState(state: any): void {
        this.acquireVsCodeApi.setState(state);
    }
}

// 在 Vue 应用中判断运行环境
export const isVSCodeEnvironment = (): boolean => {
    return typeof (window as any).acquireVsCodeApi === 'function';
};
```

### 3.2 修改 API 调用

```typescript
// src/api/database.ts
import { VSCodeBridge, isVSCodeEnvironment } from '@/platform/vscode/bridge';
import axios from 'axios';

const vscodeBridge = isVSCodeEnvironment() ? new VSCodeBridge() : null;

export async function executeQuery(sql: string, connection: any) {
    if (isVSCodeEnvironment() && vscodeBridge) {
        // VSCode 环境：通过 WebView 消息通信
        return new Promise((resolve, reject) => {
            const handler = (message: any) => {
                if (message.command === 'queryResult') {
                    resolve(message.data);
                }
            };
            vscodeBridge.onMessage(handler);
            vscodeBridge.postMessage({ command: 'query', sql, connection });
        });
    } else {
        // Web 环境：通过 HTTP API
        return axios.post('/api/database/query', { sql, connection });
    }
}
```

## 4. 构建流程

### 4.1 构建 Vue 资源

```json
{
  "scripts": {
    "build:vscode": "vite build --mode vscode",
    "build:all": "npm run build && npm run build:vscode"
  }
}
```

### 4.2 配置 Vite 输出

```typescript
// vite.config.vscode.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'vscode/resources/webview',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        query: path.resolve(__dirname, 'src/platform/vscode/entry/query.ts'),
        database: path.resolve(__dirname, 'src/platform/vscode/entry/database.ts'),
        structure: path.resolve(__dirname, 'src/platform/vscode/entry/structure.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});
```

## 5. 共享核心服务

### 5.1 提取核心服务

```typescript
// packages/core/src/DatabaseService.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import * as mysql from 'mysql2/promise';
import * as pg from 'pg';

export class DatabaseService {
    private connections: Map<string, DataSource> = new Map();

    async connect(options: DataSourceOptions): Promise<DataSource> {
        const dataSource = new DataSource(options);
        await dataSource.initialize();
        this.connections.set(options.name || 'default', dataSource);
        return dataSource;
    }

    async query(connectionId: string, sql: string): Promise<any> {
        const dataSource = this.connections.get(connectionId);
        if (!dataSource) {
            throw new Error('Connection not found');
        }
        return dataSource.query(sql);
    }

    async disconnect(connectionId: string): Promise<void> {
        const dataSource = this.connections.get(connectionId);
        if (dataSource) {
            await dataSource.destroy();
            this.connections.delete(connectionId);
        }
    }
}
```

## 6. 测试与发布

### 6.1 本地测试

```bash
# 在 VSCode 中按 F5 启动扩展开发主机
```

### 6.2 打包发布

```bash
# 安装 vsce
npm install -g vsce

# 打包
vsce package

# 发布到市场
vsce publish
```

## 7. 功能对比

| 功能 | Web 版 | NW.js 桌面版 | VSCode 扩展 |
|------|--------|--------------|-------------|
| 数据库连接 | ✅ | ✅ | ✅ |
| SQL 查询 | ✅ | ✅ | ✅ |
| 数据编辑 | ✅ | ✅ | ✅ |
| 表结构查看 | ✅ | ✅ | ✅ |
| 侧边栏导航 | ❌ | ✅ | ✅ |
| 代码编辑器集成 | ❌ | ❌ | ✅ |
| 工作区配置 | ❌ | ❌ | ✅ |
| 跨平台 | ✅ | ✅ | ✅ |

## 8. 开发优先级

### Phase 1 - MVP
- [x] 基础扩展框架
- [ ] 数据库连接管理
- [ ] 侧边栏树形视图
- [ ] 基本 SQL 查询

### Phase 2 - 核心功能
- [ ] WebView 面板
- [ ] 查询结果展示
- [ ] 表结构查看
- [ ] 数据编辑

### Phase 3 - 高级功能
- [ ] 智能提示
- [ ] SQL 格式化
- [ ] 导出功能
- [ ] 工作区配置

## 9. 技术栈

- **Extension API**: VSCode Extension API
- **后端服务**: TypeORM + 数据库驱动
- **前端**: Vue 3 + WebView
- **构建工具**: Vite + TypeScript
- **通信**: Webview API postMessage

## 10. 注意事项

1. **性能优化**: WebView 中的 Vue 应用需要优化性能
2. **资源加载**: 使用 `webview.asWebviewUri` 处理本地资源
3. **安全性**: WebView 与扩展之间的通信需要验证来源
4. **状态管理**: 使用 VSCode 的 globalState 存储连接配置
5. **跨平台**: 确保所有数据库驱动在不同平台可用
