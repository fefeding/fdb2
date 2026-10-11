import * as vscode from 'vscode';
import { DatabaseBridge } from '../service/DatabaseBridge';

export type TreeCtx = 'connection' | 'database' | 'table' | 'column' | 'error';

/**
 * 侧边栏数据库树形视图：
 *   连接 -> 库 -> 表 -> 列
 * 所有数据通过 DatabaseBridge 复用后端 server 服务获取。
 */
export class DatabaseTreeProvider implements vscode.TreeDataProvider<DbTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<DbTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private bridge: DatabaseBridge) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DbTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DbTreeItem): Promise<DbTreeItem[]> {
    try {
      if (!element) {
        const conns = (await this.bridge.call<any[]>('/api/database/getConnections')) || [];
        if (conns.length === 0) {
          const tip = new DbTreeItem('暂无连接，点击 + 添加', 'error', vscode.TreeItemCollapsibleState.None);
          tip.iconPath = new vscode.ThemeIcon('info');
          return [tip];
        }
        return conns.map((c) => DbTreeItem.connection(c));
      }

      if (element.ctx === 'connection') {
        const dbs = (await this.bridge.call<string[]>('/api/database/getDatabases', { id: element.connectionId })) || [];
        return dbs.map((d) => DbTreeItem.database(d, element.connectionId!));
      }

      if (element.ctx === 'database') {
        const tables = (await this.bridge.call<any[]>('/api/database/getTables', {
          id: element.connectionId,
          database: element.database
        })) || [];
        return tables.map((t) =>
          DbTreeItem.table(t.name, t.type, element.connectionId!, element.database!)
        );
      }

      if (element.ctx === 'table') {
        const info = await this.bridge.call<any>('/api/database/getTableInfo', {
          id: element.connectionId,
          database: element.database,
          table: element.table
        });
        const cols = (info && info.columns) || [];
        return cols.map((c: any) => DbTreeItem.column(c, element.connectionId!, element.database!, element.table!));
      }

      return [];
    } catch (e: any) {
      return [DbTreeItem.error(e?.message || String(e))];
    }
  }
}

export class DbTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly ctx: TreeCtx,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public connectionId?: string,
    public database?: string,
    public table?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = ctx;
  }

  static connection(c: any): DbTreeItem {
    const item = new DbTreeItem(
      c.name,
      'connection',
      vscode.TreeItemCollapsibleState.Collapsed,
      c.id
    );
    item.iconPath = new vscode.ThemeIcon('database');
    const typeLabel = (c.type || '').toUpperCase();
    item.description = `${typeLabel} · ${c.host || ''}${c.port ? ':' + c.port : ''}${c.database ? '/' + c.database : ''}`;
    item.command = {
      command: 'dbtool.openExplorer',
      title: '打开数据库工作台',
      arguments: [{ connectionId: c.id }]
    };
    item.tooltip = `${c.name}\n${typeLabel} @ ${c.host || ''}:${c.port || ''}`;
    return item;
  }

  static database(name: string, connId: string): DbTreeItem {
    const item = new DbTreeItem(name, 'database', vscode.TreeItemCollapsibleState.Collapsed, connId, name);
    item.iconPath = new vscode.ThemeIcon('folder');
    item.command = {
      command: 'dbtool.openExplorer',
      title: '打开数据库工作台',
      arguments: [{ connectionId: connId, database: name }]
    };
    return item;
  }

  static table(name: string, type: string, connId: string, db: string): DbTreeItem {
    const isView = (type || '').toLowerCase() === 'view';
    const item = new DbTreeItem(name, 'table', vscode.TreeItemCollapsibleState.Collapsed, connId, db, name);
    item.iconPath = new vscode.ThemeIcon(isView ? 'eye' : 'table');
    item.command = {
      command: 'dbtool.openExplorer',
      title: '打开数据库工作台',
      arguments: [{ connectionId: connId, database: db, table: name }]
    };
    return item;
  }

  static column(c: any, connId: string, db: string, table: string): DbTreeItem {
    const item = new DbTreeItem(c.name, 'column', vscode.TreeItemCollapsibleState.None, connId, db, table);
    item.iconPath = new vscode.ThemeIcon('symbol-field');
    const parts: string[] = [];
    if (c.type) parts.push(c.type);
    if (c.isPrimary) parts.push('PK');
    if (c.nullable === false || c.notNull) parts.push('NOT NULL');
    if (c.isAutoIncrement) parts.push('AUTO_INCREMENT');
    item.description = parts.join(' · ');
    return item;
  }

  static error(msg: string): DbTreeItem {
    const item = new DbTreeItem('错误: ' + msg, 'error', vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('error');
    return item;
  }
}
