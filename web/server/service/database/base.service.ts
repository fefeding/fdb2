import { DataSource } from 'typeorm';
import { 
  DatabaseEntity, 
  TableEntity, 
  ColumnEntity, 
  IndexEntity, 
  ForeignKeyEntity 
} from '../../model/database.entity';

/**
 * 数据库服务基础类
 * 提供所有数据库类型的通用操作
 */
export abstract class BaseDatabaseService {

  /**
   * 获取数据库类型
   */
  abstract getDatabaseType(): string;

  /**
   * 获取数据库列表 - 子类实现
   */
  abstract getDatabases(dataSource: DataSource): Promise<string[]>;

  /**
   * 获取表列表 - 子类实现
   */
  abstract getTables(dataSource: DataSource, database: string): Promise<TableEntity[]>;

  /**
   * 获取列信息 - 子类实现
   */
  abstract getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]>;

  /**
   * 获取索引信息 - 子类实现
   */
  abstract getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]>;

  /**
   * 获取外键信息 - 子类实现
   */
  abstract getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]>;

  /**
   * 获取数据库大小 - 子类实现
   */
  abstract getDatabaseSize(dataSource: DataSource, database: string): Promise<number>;

  /**
   * 通用方法：获取数据库详细信息
   */
  async getDatabaseInfo(dataSource: DataSource, databaseName: string): Promise<DatabaseEntity> {
    const tables = await this.getTables(dataSource, databaseName);
    
    return {
      name: databaseName,
      tableCount: tables.length,
      size: await this.getDatabaseSize(dataSource, databaseName),
      tables
    };
  }

  /**
   * 通用方法：获取表详细信息
   */
  async getTableInfo(dataSource: DataSource, databaseName: string, tableName: string): Promise<TableEntity> {
    const tables = await this.getTables(dataSource, databaseName);
    const table = tables.find(t => t.name === tableName);
    
    if (!table) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 获取列信息
    table.columns = await this.getColumns(dataSource, databaseName, tableName);
    
    // 获取索引信息
    table.indexes = await this.getIndexes(dataSource, databaseName, tableName);
    
    // 获取外键信息
    table.foreignKeys = await this.getForeignKeys(dataSource, databaseName, tableName);

    return table;
  }

  /**
   * 通用方法：获取表数据
   */
  async getTableData(
    dataSource: DataSource, 
    databaseName: string, 
    tableName: string,
    page: number = 1,
    pageSize: number = 100,
    where?: string,
    orderBy?: string
  ): Promise<{ data: any[], total: number }> {
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
   * 通用方法：执行SQL查询
   */
  async executeQuery(dataSource: DataSource, sql: string): Promise<any> {
      const result = await dataSource.query(sql);
      return result;
  }

  /**
   * 通用方法：测试连接
   */
  async testConnection(dataSource: DataSource): Promise<boolean> {
    try {
      await dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      //this.ctx.logger.error('数据库连接测试失败:', error);
      console.error(error);
      return false;
    }
  }

  /**
   * 通用方法：给标识符加引号
   */
  protected quoteIdentifier(identifier: string): string {
    return `"${identifier}"`;
  }

  /**
   * 通用方法：构建分页查询
   */
  protected buildPaginationQuery(baseQuery: string, page: number, pageSize: number): string {
    const offset = (page - 1) * pageSize;
    return `${baseQuery} LIMIT ${pageSize} OFFSET ${offset}`;
  }

  /**
   * 通用方法：构建计数查询
   */
  protected buildCountQuery(baseQuery: string): string {
    return `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;
  }
}