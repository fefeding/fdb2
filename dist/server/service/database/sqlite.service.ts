import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { BaseDatabaseService } from './base.service';
import { 
  TableEntity, 
  ColumnEntity, 
  IndexEntity, 
  ForeignKeyEntity 
} from '../../model/database.entity';

/**
 * SQLite数据库服务实现
 */
export class SQLiteService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'sqlite';
  }

  /**
   * 获取SQLite数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    // SQLite只有一个主数据库
    return ['main'];
  }

  /**
   * 获取SQLite表列表
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        tbl_name as name,
        'table' as type,
        sql as definition
      FROM sqlite_master 
      WHERE type = 'table' AND tbl_name NOT LIKE 'sqlite_%'
    `);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      rowCount: 0, // SQLite需要额外查询
      dataSize: 0,
      indexSize: 0
    }));
  }

  /**
   * 获取SQLite列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    const result = await dataSource.query(`PRAGMA table_info(${table})`);
    
    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      defaultValue: row.dflt_value,
      isPrimary: row.pk === 1,
      isAutoIncrement: false
    }));
  }

  /**
   * 获取SQLite索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    const result = await dataSource.query(`PRAGMA index_list(${table})`);
    
    return result.map((row: any) => ({
      name: row.name,
      type: row.unique ? 'UNIQUE' : 'INDEX',
      columns: [], // 需要额外查询
      unique: row.unique === 1
    }));
  }

  /**
   * 获取SQLite外键信息
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    const result = await dataSource.query(`PRAGMA foreign_key_list(${table})`);
    
    return result.map((row: any) => ({
      name: `fk_${table}_${row.table}`,
      column: row.from,
      referencedTable: row.table,
      referencedColumn: row.to,
      onDelete: row.on_delete || 'NO ACTION',
      onUpdate: row.on_update || 'NO ACTION'
    }));
  }

  /**
   * 获取SQLite数据库大小
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    // SQLite数据库大小需要通过文件系统获取，这里返回0
    return 0;
  }

  /**
   * 获取SQLite视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        name,
        sql as definition
      FROM sqlite_master 
      WHERE type = 'view' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    return result.map((row: any) => ({
      name: row.name,
      comment: '',
      schemaName: 'main',
      definition: row.definition
    }));
  }

  /**
   * 获取SQLite视图定义
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT sql as definition
      FROM sqlite_master 
      WHERE type = 'view' AND name = $1
    `, [viewName]);

    return result[0]?.definition || '';
  }

  /**
   * SQLite不支持存储过程
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    // SQLite不支持存储过程，返回空数组
    return [];
  }

  /**
   * SQLite不支持存储过程
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    throw new Error('SQLite不支持存储过程');
  }

  /**
   * 创建SQLite数据库
   * 注意：SQLite的"数据库"实际上是文件，所以这个方法只是创建一个空文件
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    // SQLite中数据库是文件，通常在连接时指定文件路径
    // 这里只是创建一个空文件，实际使用时需要连接到这个文件
    throw new Error('SQLite数据库创建需要指定文件路径，请在连接配置中设置数据库文件路径');
  }

  /**
   * 删除SQLite数据库
   */
  async dropDatabase(dataSource: DataSource, databaseName: string): Promise<void> {
    // SQLite中删除数据库需要删除文件
    throw new Error('SQLite数据库删除需要手动删除数据库文件');
  }

  /**
   * 导出数据库架构
   */
  async exportSchema(dataSource: DataSource, databaseName: string): Promise<string> {
    // 获取所有表
    const tables = await this.getTables(dataSource, databaseName);
    let schemaSql = `-- 数据库架构导出 - ${databaseName}\n`;
    schemaSql += `-- 导出时间: ${new Date().toISOString()}\n\n`;

    // 为每个表生成CREATE TABLE语句
    for (const table of tables) {
      // 获取表结构
      const columns = await this.getColumns(dataSource, databaseName, table.name);
      const indexes = await this.getIndexes(dataSource, databaseName, table.name);
      const foreignKeys = await this.getForeignKeys(dataSource, databaseName, table.name);

      // 生成CREATE TABLE语句
      schemaSql += `-- 表结构: ${table.name}\n`;
      schemaSql += `CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(table.name)} (\n`;

      // 添加列定义
      const columnDefinitions = columns.map(column => {
        let definition = `  ${this.quoteIdentifier(column.name)} ${column.type}`;
        if (column.notNull) definition += ' NOT NULL';
        if (column.defaultValue !== undefined) {
          definition += ` DEFAULT ${column.defaultValue === null ? 'NULL' : `'${column.defaultValue}'`}`;
        }
        if (column.isPrimary && column.autoIncrement) definition += ' PRIMARY KEY AUTOINCREMENT';
        else if (column.isPrimary) definition += ' PRIMARY KEY';
        return definition;
      });

      schemaSql += columnDefinitions.join(',\n');
      schemaSql += '\n);\n\n';

      // 添加索引
      for (const index of indexes) {
        if (index.isPrimary) continue; // 主键已经在表定义中添加
        schemaSql += `-- 索引: ${index.name} on ${table.name}\n`;
        schemaSql += `CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(table.name)} (${index.columns.map(col => this.quoteIdentifier(col)).join(', ')});\n`;
      }

      if (indexes.length > 0) schemaSql += '\n';

      // 添加外键
      for (const foreignKey of foreignKeys) {
        schemaSql += `-- 外键: ${foreignKey.name} on ${table.name}\n`;
        schemaSql += `ALTER TABLE ${this.quoteIdentifier(table.name)} ADD CONSTRAINT ${this.quoteIdentifier(foreignKey.name)} FOREIGN KEY (${foreignKey.columns.map(col => this.quoteIdentifier(col)).join(', ')}) REFERENCES ${this.quoteIdentifier(foreignKey.referencedTable)} (${foreignKey.referencedColumns.map(col => this.quoteIdentifier(col)).join(', ')})${foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : ''}${foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : ''};\n`;
      }

      if (foreignKeys.length > 0) schemaSql += '\n';
    }

    return schemaSql;
  }

  /**
   * 查看数据库日志
   */
  async viewLogs(dataSource: DataSource, database?: string, limit: number = 100): Promise<any[]> {
    // SQLite查看日志
    try {
      // 尝试查看SQLite配置
      const logs = await dataSource.query(`PRAGMA compile_options;`);
      return logs;
    } catch (error) {
      return [{ message: 'SQLite数据库日志功能有限，请检查数据库文件状态' }];
    }
  }

  /**
   * 备份数据库
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    // SQLite备份数据库
    try {
      // SQLite备份就是复制数据库文件
      const backupPath = options?.path || path.join(__dirname, '..', '..', 'backups');
      
      // 确保备份目录存在
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      // 获取SQLite数据库文件路径
      const connectionOptions = dataSource.options as any;
      const dbPath = connectionOptions.database;
      
      if (!dbPath) {
        throw new Error('SQLite数据库文件路径未找到');
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `${databaseName}_${timestamp}.db`);
      
      // 复制数据库文件
      fs.copyFileSync(dbPath, backupFile);
      
      return `备份成功：${backupFile}`;
    } catch (error) {
      console.error('SQLite备份失败:', error);
      throw new Error(`备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    // SQLite恢复数据库
    try {
      // SQLite恢复就是复制备份文件到数据库文件路径
      const connectionOptions = dataSource.options as any;
      const dbPath = connectionOptions.database;
      
      if (!dbPath) {
        throw new Error('SQLite数据库文件路径未找到');
      }
      
      // 复制备份文件到数据库路径
      fs.copyFileSync(filePath, dbPath);
    } catch (error) {
      console.error('SQLite恢复失败:', error);
      throw new Error(`恢复失败: ${error.message}`);
    }
  }
}