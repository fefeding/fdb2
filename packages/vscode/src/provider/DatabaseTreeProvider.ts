import * as vscode from 'vscode';
import { DatabaseServiceBridge } from '../service/DatabaseServiceBridge';
import { DatabaseConnection, DatabaseInfo, TableInfo } from '../typings/connection';

/**
 * 树形视图项目类型
 */
type TreeItemContext =
    | 'connection'      // 数据库连接
    | 'database'        // 数据库
    | 'table'           // 表
    | 'view'            // 视图
    | 'table-actions';  // 表操作

/**
 * 树形视图项目
 */
class DatabaseItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: TreeItemContext,
        public readonly connection?: DatabaseConnection,
        public readonly database?: DatabaseInfo,
        public readonly table?: TableInfo
    ) {
        super(label, collapsibleState);

        // 设置图标
        this.iconPath = this.getIconPath(contextValue);

        // 设置描述
        if (contextValue === 'connection' && connection) {
            this.description = `${connection.host}:${connection.port}`;
        } else if (contextValue === 'table' && table) {
            this.description = table.type;
        }
    }

    private getIconPath(contextValue: TreeItemContext): vscode.ThemeIcon {
        switch (contextValue) {
            case 'connection':
                return new vscode.ThemeIcon('database');
            case 'database':
                return new vscode.ThemeIcon('server');
            case 'table':
                return new vscode.ThemeIcon('table');
            case 'view':
                return new vscode.ThemeIcon('preview');
            case 'table-actions':
                return new vscode.ThemeIcon('ellipsis');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}

/**
 * 数据库树形视图提供者
 * 提供侧边栏的数据库连接和结构树
 */
export class DatabaseTreeProvider implements vscode.TreeDataProvider<DatabaseItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<DatabaseItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private context: vscode.ExtensionContext,
        private dbBridge: DatabaseServiceBridge
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: DatabaseItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DatabaseItem): Promise<DatabaseItem[]> {
        if (!element) {
            // 根节点：显示所有连接
            const connections = await this.dbBridge.connection.getAllConnections();
            return connections.map((conn: any) => {
                const item = new DatabaseItem(
                    conn.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'connection',
                    conn
                );
                item.command = {
                    command: 'fdb2.openDatabasePanel',
                    title: '打开数据库',
                    arguments: [conn]
                };
                return item;
            });
        }

        if (element.contextValue === 'connection') {
            // 连接节点：显示数据库列表（SQLite 不显示）
            if (element.connection?.type === 'sqlite') {
                return await this.getTables(element.connection, '');
            }
            return await this.getDatabases(element.connection);
        }

        if (element.contextValue === 'database') {
            // 数据库节点：显示表列表
            return await this.getTables(element.connection, element.database?.name || '');
        }

        if (element.contextValue === 'table' || element.contextValue === 'view') {
            // 表节点：显示操作按钮
            return [
                new DatabaseItem('查看数据', vscode.TreeItemCollapsibleState.None, 'table-actions'),
                new DatabaseItem('查看结构', vscode.TreeItemCollapsibleState.None, 'table-actions'),
                new DatabaseItem('导出数据', vscode.TreeItemCollapsibleState.None, 'table-actions')
            ];
        }

        return [];
    }

    /**
     * 获取数据库列表
     */
    private async getDatabases(connection: DatabaseConnection): Promise<DatabaseItem[]> {
        if (!connection) return [];
        try {
            const databases = await this.dbBridge.database.getDatabases(connection.id);
            return databases.map(db =>
                new DatabaseItem(
                    db,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'database',
                    connection,
                    db
                )
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`获取数据库列表失败: ${error.message}`);
            return [];
        }
    }

    /**
     * 获取表列表
     */
    private async getTables(connection: DatabaseConnection, databaseName: string): Promise<DatabaseItem[]> {
        try {
            const tables = await this.dbBridge.database.getTables(connection.id, databaseName);
            return tables.map(table =>
                new DatabaseItem(
                    table.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    table.type === 'view' ? 'view' : 'table',
                    connection,
                    undefined,
                    table
                )
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`获取表列表失败: ${error.message}`);
            return [];
        }
    }
}
