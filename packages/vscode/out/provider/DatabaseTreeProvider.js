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
exports.DatabaseTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 树形视图项目
 */
class DatabaseItem extends vscode.TreeItem {
    constructor(label, collapsibleState, contextValue, connection, database, table) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.connection = connection;
        this.database = database;
        this.table = table;
        // 设置图标
        this.iconPath = this.getIconPath(contextValue);
        // 设置描述
        if (contextValue === 'connection' && connection) {
            this.description = `${connection.host}:${connection.port}`;
        }
        else if (contextValue === 'table' && table) {
            this.description = table.type;
        }
    }
    getIconPath(contextValue) {
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
class DatabaseTreeProvider {
    constructor(context, dbBridge) {
        this.context = context;
        this.dbBridge = dbBridge;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // 根节点：显示所有连接
            const connections = await this.dbBridge.connection.getAllConnections();
            return connections.map((conn) => {
                const item = new DatabaseItem(conn.name, vscode.TreeItemCollapsibleState.Collapsed, 'connection', conn);
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
    async getDatabases(connection) {
        if (!connection)
            return [];
        try {
            const databases = await this.dbBridge.database.getDatabases(connection.id);
            return databases.map(db => new DatabaseItem(db, vscode.TreeItemCollapsibleState.Collapsed, 'database', connection, db));
        }
        catch (error) {
            vscode.window.showErrorMessage(`获取数据库列表失败: ${error.message}`);
            return [];
        }
    }
    /**
     * 获取表列表
     */
    async getTables(connection, databaseName) {
        try {
            const tables = await this.dbBridge.database.getTables(connection.id, databaseName);
            return tables.map(table => new DatabaseItem(table.name, vscode.TreeItemCollapsibleState.Collapsed, table.type === 'view' ? 'view' : 'table', connection, undefined, table));
        }
        catch (error) {
            vscode.window.showErrorMessage(`获取表列表失败: ${error.message}`);
            return [];
        }
    }
}
exports.DatabaseTreeProvider = DatabaseTreeProvider;
//# sourceMappingURL=DatabaseTreeProvider.js.map