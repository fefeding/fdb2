import { Provide, Inject } from '@midwayjs/core';
import { BaseService } from '@cicctencent/midwayjs-base';
import { DataSource } from 'typeorm';
import { ConnectionService } from './connection.service';
import { 
  DatabaseEntity, 
  TableEntity, 
  ColumnEntity, 
  IndexEntity, 
  ForeignKeyEntity 
} from '../model/database.entity';

/**
 * 数据库管理服务
 * 负责数据库结构查询、数据操作等
 */
@Provide()
export class DatabaseService extends BaseService {

  @Inject()
  connectionService: ConnectionService;

  /**
   * 获取数据库列表
   */
  async getDatabases(connectionId: string): Promise<string[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const type = dataSource.options.type as string;

    switch (type.toLowerCase()) {
      case 'mysql':
        return this.getMySQLDatabases(dataSource);
      case 'postgres':
        return this.getPostgresDatabases(dataSource);
      case 'sqlite':
        return ['main']; // SQLite只有一个主数据库
      default:
        throw new Error(`不支持的数据库类型: ${type}`);
    }
  }

  /**
   * 获取数据库详细信息
   */
  async getDatabaseInfo(connectionId: string, databaseName: string): Promise<DatabaseEntity> {
    
    const tables = await this.getTables(connectionId, databaseName);
    
    return {
      name: databaseName,
      tableCount: tables.length,
      size: await this.getDatabaseSize(connectionId, databaseName),
      tables
    };
  }

  /**
   * 获取数据库表列表
   */
  async getTables(connectionId: string, databaseName: string): Promise<TableEntity[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const type = dataSource.options.type as string;

    switch (type.toLowerCase()) {
      case 'mysql':
        return this.getMySQLTables(dataSource, databaseName);
      case 'postgres':
        return this.getPostgresTables(dataSource, databaseName);
      case 'sqlite':
        return this.getSQLiteTables(dataSource);
      default:
        throw new Error(`不支持的数据库类型: ${type}`);
    }
  }

  /**
   * 获取表详细信息
   */
  async getTableInfo(connectionId: string, databaseName: string, tableName: string): Promise<TableEntity> {
    const tables = await this.getTables(connectionId, databaseName);
    const table = tables.find(t => t.name === tableName);
    
    if (!table) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 获取列信息
    table.columns = await this.getTableColumns(connectionId, databaseName, tableName);
    
    // 获取索引信息
    table.indexes = await this.getTableIndexes(connectionId, databaseName, tableName);
    
    // 获取外键信息
    table.foreignKeys = await this.getTableForeignKeys(connectionId, databaseName, tableName);

    return table;
  }

  /**
   * 获取表数据
   */
  async getTableData(
    connectionId: string, 
    databaseName: string, 
    tableName: string,
    page: number = 1,
    pageSize: number = 100,
    where?: string,
    orderBy?: string
  ): Promise<{ data: any[], total: number }> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    
    // 构建查询
    let query = `SELECT * FROM ${this.quoteIdentifier(tableName)}`;
    
    if (where) {
      query += ` WHERE ${where}`;
    }
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    const offset = (page - 1) * pageSize;
    query += ` LIMIT ${pageSize} OFFSET ${offset}`;

    // 执行数据查询
    const data = await dataSource.query(query);

    // 获取总数
    let countQuery = `SELECT COUNT(*) as total FROM ${this.quoteIdentifier(tableName)}`;
    if (where) {
      countQuery += ` WHERE ${where}`;
    }
    const countResult = await dataSource.query(countQuery);
    const total = countResult[0]?.total || 0;

    return { data, total };
  }

  /**
   * 执行SQL查询
   */
  async executeQuery(connectionId: string, sql: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    
    try {
      const result = await dataSource.query(sql);
      return {
        success: true,
        data: result,
        affectedRows: result.affectedRows || 0,
        insertId: result.insertId || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取MySQL数据库列表
   */
  private async getMySQLDatabases(dataSource: DataSource): Promise<string[]> {
    const result = await dataSource.query('SHOW DATABASES');
    return result.map((row: any) => row.Database);
  }

  /**
   * 获取PostgreSQL数据库列表
   */
  private async getPostgresDatabases(dataSource: DataSource): Promise<string[]> {
    const result = await dataSource.query(`
      SELECT datname as name 
      FROM pg_database 
      WHERE datistemplate = false
    `);
    return result.map((row: any) => row.name);
  }

  /**
   * 获取SQLite表列表
   */
  private async getSQLiteTables(dataSource: DataSource): Promise<TableEntity[]> {
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
   * 获取MySQL表列表
   */
  private async getMySQLTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        TABLE_NAME as name,
        TABLE_TYPE as type,
        ENGINE as engine,
        TABLE_ROWS as rowCount,
        DATA_LENGTH as dataSize,
        INDEX_LENGTH as indexSize,
        TABLE_COLLATION as collation,
        CREATE_TIME as createdAt,
        UPDATE_TIME as updatedAt,
        TABLE_COMMENT as comment
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [database]);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      engine: row.engine,
      rowCount: row.rowCount || 0,
      dataSize: row.dataSize || 0,
      indexSize: row.indexSize || 0,
      collation: row.collation,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      comment: row.comment
    }));
  }

  /**
   * 获取PostgreSQL表列表
   */
  private async getPostgresTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
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
   * 获取表列信息
   */
  private async getTableColumns(connectionId: string, databaseName: string, tableName: string): Promise<ColumnEntity[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const type = dataSource.options.type as string;

    switch (type.toLowerCase()) {
      case 'mysql':
        return this.getMySQLColumns(dataSource, databaseName, tableName);
      case 'postgres':
        return this.getPostgresColumns(dataSource, tableName);
      case 'sqlite':
        return this.getSQLiteColumns(dataSource, tableName);
      default:
        return [];
    }
  }

  /**
   * 获取MySQL列信息
   */
  private async getMySQLColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as defaultValue,
        COLUMN_KEY as columnKey,
        EXTRA as extra,
        CHARACTER_MAXIMUM_LENGTH as length,
        NUMERIC_PRECISION as precision,
        NUMERIC_SCALE as scale,
        CHARACTER_SET_NAME as charset,
        COLLATION_NAME as collation,
        COLUMN_COMMENT as comment
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `, [database, table]);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      defaultValue: row.defaultValue,
      isPrimary: row.columnKey === 'PRI',
      isAutoIncrement: row.extra?.includes('auto_increment') || false,
      length: row.length,
      precision: row.precision,
      scale: row.scale,
      charset: row.charset,
      collation: row.collation,
      comment: row.comment
    }));
  }

  /**
   * 获取PostgreSQL列信息
   */
  private async getPostgresColumns(dataSource: DataSource, table: string): Promise<ColumnEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as defaultValue,
        character_maximum_length as length,
        numeric_precision as precision,
        numeric_scale as scale
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      defaultValue: row.defaultValue,
      isPrimary: false, // 需要额外查询
      isAutoIncrement: false,
      length: row.length,
      precision: row.precision,
      scale: row.scale
    }));
  }

  /**
   * 获取SQLite列信息
   */
  private async getSQLiteColumns(dataSource: DataSource, table: string): Promise<ColumnEntity[]> {
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
   * 获取表索引信息
   */
  private async getTableIndexes(connectionId: string, databaseName: string, tableName: string): Promise<IndexEntity[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const type = dataSource.options.type as string;

    switch (type.toLowerCase()) {
      case 'mysql':
        return this.getMySQLIndexes(dataSource, databaseName, tableName);
      case 'postgres':
        return this.getPostgresIndexes(dataSource, tableName);
      case 'sqlite':
        return this.getSQLiteIndexes(dataSource, tableName);
      default:
        return [];
    }
  }

  /**
   * 获取MySQL索引信息
   */
  private async getMySQLIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        INDEX_NAME as name,
        INDEX_TYPE as type,
        COLUMN_NAME as column,
        NON_UNIQUE as nonUnique
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [database, table]);

    // 按索引名分组
    const indexMap = new Map<string, IndexEntity>();
    result.forEach((row: any) => {
      if (!indexMap.has(row.name)) {
        indexMap.set(row.name, {
          name: row.name,
          type: row.type,
          columns: [],
          unique: row.nonUnique === 0
        });
      }
      indexMap.get(row.name)!.columns.push(row.column);
    });

    return Array.from(indexMap.values());
  }

  /**
   * 获取PostgreSQL索引信息
   */
  private async getPostgresIndexes(dataSource: DataSource, table: string): Promise<IndexEntity[]> {
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
   * 获取SQLite索引信息
   */
  private async getSQLiteIndexes(dataSource: DataSource, table: string): Promise<IndexEntity[]> {
    const result = await dataSource.query(`PRAGMA index_list(${table})`);
    
    return result.map((row: any) => ({
      name: row.name,
      type: row.unique ? 'UNIQUE' : 'INDEX',
      columns: [], // 需要额外查询
      unique: row.unique === 1
    }));
  }

  /**
   * 获取表外键信息
   */
  private async getTableForeignKeys(connectionId: string, databaseName: string, tableName: string): Promise<ForeignKeyEntity[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const type = dataSource.options.type as string;

    switch (type.toLowerCase()) {
      case 'mysql':
        return this.getMySQLForeignKeys(dataSource, databaseName, tableName);
      case 'postgres':
        return this.getPostgresForeignKeys(dataSource, tableName);
      case 'sqlite':
        return this.getSQLiteForeignKeys(dataSource, tableName);
      default:
        return [];
    }
  }

  /**
   * 获取MySQL外键信息
   */
  private async getMySQLForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        CONSTRAINT_NAME as name,
        COLUMN_NAME as column,
        REFERENCED_TABLE_NAME as referencedTable,
        REFERENCED_COLUMN_NAME as referencedColumn,
        DELETE_RULE as onDelete,
        UPDATE_RULE as onUpdate
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [database, table]);

    return result.map((row: any) => ({
      name: row.name,
      column: row.column,
      referencedTable: row.referencedTable,
      referencedColumn: row.referencedColumn,
      onDelete: row.onDelete,
      onUpdate: row.onUpdate
    }));
  }

  /**
   * 获取PostgreSQL外键信息
   */
  private async getPostgresForeignKeys(dataSource: DataSource, table: string): Promise<ForeignKeyEntity[]> {
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
   * 获取SQLite外键信息
   */
  private async getSQLiteForeignKeys(dataSource: DataSource, table: string): Promise<ForeignKeyEntity[]> {
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
   * 获取数据库大小
   */
  private async getDatabaseSize(connectionId: string, databaseName: string): Promise<number> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const type = dataSource.options.type as string;

    switch (type.toLowerCase()) {
      case 'mysql':
        const result = await dataSource.query(`
          SELECT SUM(data_length + index_length) as size
          FROM information_schema.tables 
          WHERE table_schema = ?
        `, [databaseName]);
        return result[0]?.size || 0;
      default:
        return 0;
    }
  }

  /**
   * 给标识符加引号
   */
  private quoteIdentifier(identifier: string): string {
    return `"${identifier}"`;
  }
}