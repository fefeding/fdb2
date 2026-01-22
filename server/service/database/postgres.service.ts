import { DataSource } from 'typeorm';
import { BaseDatabaseService } from './base.service';
import { 
  TableEntity, 
  ColumnEntity, 
  IndexEntity, 
  ForeignKeyEntity 
} from '../../model/database.entity';

/**
 * PostgreSQL数据库服务实现
 */
export class PostgreSQLService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'postgres';
  }

  /**
   * 获取PostgreSQL数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    const result = await dataSource.query(`
      SELECT datname as name 
      FROM pg_database 
      WHERE datistemplate = false
    `);
    return result.map((row: any) => row.name);
  }

  /**
   * 获取PostgreSQL表列表
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        t.table_name as name,
        'BASE TABLE' as type,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as rowCount,
        0 as dataSize,
        0 as indexSize,
        '' as collation,
        obj_description(c.oid) as comment
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
        AND t.table_type = 'BASE TABLE'
    `);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      rowCount: row.rowcount || 0,
      dataSize: row.datasize || 0,
      indexSize: row.indexsize || 0,
      collation: row.collation,
      comment: row.comment
    }));
  }

  /**
   * 获取PostgreSQL列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    // 使用兼容的SQL查询，移除可能不兼容的精度字段
    const result = await dataSource.query(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as defaultValue,
        character_maximum_length as length
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);

    // 获取主键信息
    const primaryKeys = await this.getPrimaryKeys(dataSource, table);

    // 从data_type中解析精度信息
    return result.map((row: any) => {
      const dataType = row.type || '';
      let precision = undefined;
      let scale = undefined;
      
      // 解析DECIMAL(M,D)或NUMERIC(M,D)类型的精度
      const decimalMatch = dataType.match(/(DECIMAL|NUMERIC)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (decimalMatch) {
        precision = parseInt(decimalMatch[2]);
        scale = parseInt(decimalMatch[3]);
      }
      
      return {
        name: row.name,
        type: row.type,
        nullable: row.nullable === 'YES',
        defaultValue: row.defaultValue,
        isPrimary: primaryKeys.includes(row.name),
        isAutoIncrement: row.defaultValue?.includes('nextval') || false,
        length: row.length,
        precision: precision,
        scale: scale
      };
    });
  }

  /**
   * 获取PostgreSQL索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        indexname as name,
        indexdef as definition
      FROM pg_indexes 
      WHERE tablename = $1
    `, [table]);

    return result.map((row: any) => ({
      name: row.name,
      type: 'INDEX',
      columns: [], // 需要解析definition
      unique: row.definition.toLowerCase().includes('unique')
    }));
  }

  /**
   * 获取PostgreSQL外键信息
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        tc.constraint_name as name,
        kcu.column_name as column,
        ccu.table_name as referencedTable,
        ccu.column_name as referencedColumn,
        rc.delete_rule as onDelete
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = $1
    `, [table]);

    return result.map((row: any) => ({
      name: row.name,
      column: row.column,
      referencedTable: row.referencedtable,
      referencedColumn: row.referencedcolumn,
      onDelete: row.ondelete,
      onUpdate: 'NO ACTION'
    }));
  }

  /**
   * 获取PostgreSQL数据库大小
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    const result = await dataSource.query(`
      SELECT pg_database_size($1) as size
    `, [database]);
    return result[0]?.size || 0;
  }

  /**
   * 获取主键信息
   */
  private async getPrimaryKeys(dataSource: DataSource, table: string): Promise<string[]> {
    const result = await dataSource.query(`
      SELECT column_name 
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_name = $1
    `, [table]);
    return result.map((row: any) => row.column_name);
  }

  /**
   * PostgreSQL使用双引号标识符
   */
  public quoteIdentifier(identifier: string): string {
    return `"${identifier}"`;
  }

  /**
   * 获取PostgreSQL视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        table_name as name,
        COALESCE(obj_description(c.oid), '') as comment,
        table_schema as schemaName
      FROM information_schema.views v
      LEFT JOIN pg_class c ON c.relname = v.table_name
      WHERE v.table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY v.table_name
    `);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      schemaName: row.schemaname
    }));
  }

  /**
   * 获取PostgreSQL视图定义
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT view_definition as definition
      FROM information_schema.views 
      WHERE table_name = $1
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
    `, [viewName]);

    return result[0]?.definition || '';
  }

  /**
   * 获取PostgreSQL存储过程列表
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        routine_name as name,
        '' as comment,
        routine_type as type,
        COALESCE(data_type, '') as returnType,
        external_language as language
      FROM information_schema.routines 
      WHERE routine_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY routine_name
    `);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      type: row.type,
      returnType: row.returntype || '',
      language: row.language || 'SQL'
    }));
  }

  /**
   * 获取PostgreSQL存储过程定义
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT routine_definition as definition
      FROM information_schema.routines 
      WHERE routine_name = $1
        AND routine_schema NOT IN ('information_schema', 'pg_catalog')
    `, [procedureName]);

    return result[0]?.definition || '';
  }

  /**
   * 创建PostgreSQL数据库
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    let sql = `CREATE DATABASE ${this.quoteIdentifier(databaseName)}`;
    
    if (options) {
      const clauses = [];
      
      if (options.owner) {
        clauses.push(`OWNER ${options.owner}`);
      }
      
      if (options.template) {
        clauses.push(`TEMPLATE ${options.template}`);
      }
      
      if (options.encoding) {
        clauses.push(`ENCODING '${options.encoding}'`);
      }
      
      if (options.lcCollate) {
        clauses.push(`LC_COLLATE '${options.lcCollate}'`);
      }
      
      if (options.lcCtype) {
        clauses.push(`LC_CTYPE '${options.lcCtype}'`);
      }
      
      if (options.tablespace) {
        clauses.push(`TABLESPACE ${options.tablespace}`);
      }
      
      if (options.allowConnections !== undefined) {
        clauses.push(`ALLOW_CONNECTIONS ${options.allowConnections}`);
      }
      
      if (options.connectionLimit !== undefined) {
        clauses.push(`CONNECTION LIMIT ${options.connectionLimit}`);
      }
      
      if (clauses.length > 0) {
        sql += ' ' + clauses.join(' ');
      }
    }
    
    await dataSource.query(sql);
  }

  /**
   * 删除PostgreSQL数据库
   */
  async dropDatabase(dataSource: DataSource, databaseName: string): Promise<void> {
    const sql = `DROP DATABASE ${this.quoteIdentifier(databaseName)}`;
    await dataSource.query(sql);
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
        if (column.autoIncrement) definition += ' SERIAL';
        return definition;
      });

      // 添加主键
      const primaryKeyColumns = columns.filter(column => column.isPrimary);
      if (primaryKeyColumns.length > 0) {
        const primaryKeyNames = primaryKeyColumns.map(column => this.quoteIdentifier(column.name)).join(', ');
        columnDefinitions.push(`  PRIMARY KEY (${primaryKeyNames})`);
      }

      schemaSql += columnDefinitions.join(',\n');
      schemaSql += '\n);\n\n';

      // 添加索引
      for (const index of indexes) {
        if (index.isPrimary) continue; // 主键已经在表定义中添加
        schemaSql += `-- 索引: ${index.name} on ${table.name}\n`;
        schemaSql += `CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(table.name)} (${index.columns.map(col => this.quoteIdentifier(col)).join(', ')});\n`;
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
    // PostgreSQL查看日志
    try {
      // 尝试查看PostgreSQL日志设置
      const logs = await dataSource.query(`SELECT name, setting FROM pg_settings WHERE name LIKE '%log%' LIMIT ${limit}`);
      return logs;
    } catch (error) {
      try {
        // 尝试查看最近的连接日志
        const logs = await dataSource.query(`SELECT * FROM pg_stat_activity LIMIT ${limit}`);
        return logs;
      } catch (e) {
        return [{ message: '无法获取PostgreSQL日志，请确保具有适当的权限' }];
      }
    }
  }
}