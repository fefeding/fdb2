import { DataSource } from 'typeorm';
import { 
  DatabaseEntity, 
  TableEntity, 
  ColumnEntity, 
  IndexEntity, 
  ForeignKeyEntity 
} from './model/database.entity';

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
    try {
      const result = await dataSource.query(sql);
      return result;
    } catch (error) {
      console.error('SQL执行失败:', error);
      throw error;
    }
  }

  /**
   * 批量执行SQL查询（支持多条语句）
   */
  async executeBatchQuery(
    dataSource: DataSource, 
    sqlStatements: string[], 
    options?: {
      batchSize?: number;  // 每批执行的语句数量
      useTransaction?: boolean;  // 是否使用事务
      continueOnError?: boolean;  // 错误时是否继续执行
    }
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const {
      batchSize = 100,
      useTransaction = true,
      continueOnError = false
    } = options || {};

    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    // 分批处理SQL语句
    for (let i = 0; i < sqlStatements.length; i += batchSize) {
      const batch = sqlStatements.slice(i, i + batchSize);
      
      try {
        if (useTransaction) {
          // 使用事务执行批次
          await dataSource.transaction(async (manager) => {
            for (const statement of batch) {
              try {
                await manager.query(statement);
                success++;
              } catch (error) {
                failed++;
                errors.push({ statement, error: error.message });
                if (!continueOnError) {
                  throw error;
                }
              }
            }
          });
        } else {
          // 非事务执行批次
          for (const statement of batch) {
            try {
              await dataSource.query(statement);
              success++;
            } catch (error) {
              failed++;
              errors.push({ statement, error: error.message });
              if (!continueOnError) {
                throw error;
              }
            }
          }
        }
      } catch (batchError) {
        console.error(`批次执行失败 (${i}-${i + batchSize}):`, batchError);
        if (!continueOnError) {
          throw new Error(`批次执行失败: ${batchError.message}`);
        }
      }
    }

    return { success, failed, errors };
  }

  /**
   * 执行文件中的SQL（支持大文件）
   */
  async executeSqlFile(
    dataSource: DataSource, 
    filePath: string, 
    options?: {
      batchSize?: number;
      useTransaction?: boolean;
      continueOnError?: boolean;
    }
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const fs = require('fs');
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // 分割SQL语句
    const sqlStatements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    return this.executeBatchQuery(dataSource, sqlStatements, options);
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
  public quoteIdentifier(identifier: string): string {
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

  /**
   * 获取视图列表 - 子类实现（如果支持）
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    // 默认实现，子类可以重写
    throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持视图`);
  }

  /**
   * 获取视图定义 - 子类实现（如果支持）
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    // 默认实现，子类可以重写
    throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持视图`);
  }

  /**
   * 获取存储过程列表 - 子类实现（如果支持）
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    // 默认实现，子类可以重写
    throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持存储过程`);
  }

  /**
   * 获取存储过程定义 - 子类实现（如果支持）
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    // 默认实现，子类可以重写
    throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持存储过程`);
  }

  /**
   * 导出数据库架构 - 子类实现
   */
  abstract exportSchema(dataSource: DataSource, database: string): Promise<string>;

  /**
   * 查看数据库日志 - 子类实现（如果支持）
   */
  abstract viewLogs(dataSource: DataSource, database?: string, limit?: number): Promise<any[]>;

  /**
   * 创建数据库 - 子类实现（如果支持）
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    // 默认实现，子类可以重写
    throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持创建数据库`);
  }

  /**
   * 删除数据库 - 子类实现（如果支持）
   */
  async dropDatabase(dataSource: DataSource, databaseName: string): Promise<void> {
    // 默认实现，子类可以重写
    throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持删除数据库`);
  }

  /**
   * 备份数据库 - 子类实现（如果支持）
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    // 默认实现，子类可以重写
    throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持备份数据库`);
  }

  /**
   * 恢复数据库 - 子类实现（如果支持）
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    // 默认实现，子类可以重写
    throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持恢复数据库`);
  }

  /**
   * 导出表数据到 SQL 文件 - 子类实现
   */
  abstract exportTableDataToSQL(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string>;

  /**
   * 导出表数据到 CSV 文件 - 子类实现
   */
  abstract exportTableDataToCSV(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string>;

  /**
   * 导出表数据到 JSON 文件 - 子类实现
   */
  abstract exportTableDataToJSON(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string>;

  /**
   * 导出表数据到 Excel 文件 - 子类实现
   */
  abstract exportTableDataToExcel(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string>;
}