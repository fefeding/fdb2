import { ConnectionService } from '../connection.service';
import { BaseDatabaseService } from './base.service';
import { 
  DatabaseEntity, 
  TableEntity 
} from '../../model/database.entity';
import { MySQLService } from './mysql.service';
import { PostgreSQLService } from './postgres.service';
import { SQLiteService } from './sqlite.service';
import { OracleService } from './oracle.service';
import { SQLServerService } from './mssql.service';
import { CockroachDBService } from './cockroachdb.service';
import { MongoDBService } from './mongodb.service';
import { SAPHANADatabaseService } from './sap.service';

/**
 * 数据库服务管理类
 * 负责根据数据库类型选择相应的服务实现
 */
export class DatabaseService {

  public connectionService: ConnectionService;
  private mysqlService: MySQLService;
  private postgreSQLService: PostgreSQLService;
  private sqliteService: SQLiteService;
  private oracleService: OracleService;
  private sqlServerService: SQLServerService;
  private cockroachDBService: CockroachDBService;
  private mongoDBService: MongoDBService;
  private sapHANADatabaseService: SAPHANADatabaseService;

  constructor() {
    this.connectionService = new ConnectionService();
    
      this.mysqlService = new MySQLService();
      this.postgreSQLService = new PostgreSQLService();
      this.sqliteService = new SQLiteService();
      this.oracleService = new OracleService();
      this.sqlServerService = new SQLServerService();
      this.cockroachDBService = new CockroachDBService();
      this.mongoDBService = new MongoDBService();
      this.sapHANADatabaseService = new SAPHANADatabaseService();
  }

  /**
   * 获取数据库服务实例
   */
  public getDatabaseService(type: string): BaseDatabaseService {    
    
    switch (type.toLowerCase()) {
      case 'mysql':
      case 'aurora-mysql':
      case 'auroramysql':
        return this.mysqlService;
      case 'postgres':
      case 'postgresql':
      case 'aurora-postgres':
      case 'aurorapostgres':
      case 'aurora-postgresql':
        return this.postgreSQLService;
      case 'sqlite':
      case 'better-sqlite3':
      case 'bettersqlite3':
        return this.sqliteService;
      case 'oracle':
        return this.oracleService;
      case 'mssql':
      case 'sqlserver':
        return this.sqlServerService;
      case 'cockroachdb':
      case 'cockroach':
        return this.cockroachDBService;
      case 'mongodb':
      case 'mongo':
        return this.mongoDBService;
      case 'sap':
      case 'sap-hana':
      case 'saphana':
        return this.sapHANADatabaseService;
      default:
        throw new Error(`不支持的数据库类型: ${type}`);
    }
  }

  /**
   * 获取数据库列表
   */
  async getDatabases(connectionId: string): Promise<string[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getDatabases(dataSource);
  }

  /**
   * 获取数据库详细信息
   */
  async getDatabaseInfo(connectionId: string, databaseName: string): Promise<DatabaseEntity> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getDatabaseInfo(dataSource, databaseName);
  }

  /**
   * 获取数据库表列表
   */
  async getTables(connectionId: string, databaseName: string): Promise<TableEntity[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getTables(dataSource, databaseName);
  }

  /**
   * 获取表详细信息
   */
  async getTableInfo(connectionId: string, databaseName: string, tableName: string): Promise<TableEntity> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getTableInfo(dataSource, databaseName, tableName);
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
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getTableData(dataSource, databaseName, tableName, page, pageSize, where, orderBy);
  }

  /**
   * 执行SQL查询
   */
  async executeQuery(connectionId: string, sql: string, databaseName?: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.executeQuery(dataSource, sql);
  }

  /**
   * 修改表结构
   */
  async alterTable(connectionId: string, databaseName: string, tableDiff: any): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.alterTable(dataSource, databaseName, tableDiff);
  }

  /**
   * 同步表结构和数据到其他数据库
   */
  async syncTable(connectionId: string, syncConfig: any): Promise<any> {
    try {
      const { source, target, options } = syncConfig;
      
      // 获取源数据库连接
      const sourceDataSource = await this.connectionService.getActiveConnection(connectionId, source.database);
      const sourceService = this.getDatabaseService(sourceDataSource.options.type as string);

      // 创建目标数据库连接
      let targetDataSource;
      let targetService;
      let targetDatabaseName;
      
      if (target.connectionId) {
        // 使用已配置的连接
        const dbName = target.database || source.database;
        targetDataSource = await this.connectionService.getActiveConnection(target.connectionId, dbName);
        targetService = this.getDatabaseService(targetDataSource.options.type as string);
        targetDatabaseName = dbName;
      } else {
        // 使用手动配置的连接
        targetDataSource = await this.connectionService.createTemporaryConnection({
          type: target.dbType,
          host: target.host,
          port: target.port,
          username: target.username,
          password: target.password,
          database: target.database
        });
        targetService = this.getDatabaseService(target.dbType);
        targetDatabaseName = target.database;
      }

      const syncResults = [];

      // 处理单个表
      const sourceTableName = source.tableName;
      const tableSyncResult = {
        tableName: sourceTableName,
        structureSynced: false,
        dataSynced: false,
        rowsSynced: 0,
        messages: []
      };

      try {
        // 获取源表结构
        const tableStructure = await sourceService.getTableStructure(sourceDataSource, source.database, sourceTableName);
        const columns = tableStructure.columns;
        
        // 同步表结构
        if (options.syncStructure) {
          console.log(`开始同步表结构: ${sourceTableName} -> ${target.tableName}`);
          tableSyncResult.messages.push(`开始同步表结构: ${sourceTableName} -> ${target.tableName}`);
          
          // 检查目标表是否存在
          const targetTables = await targetService.getTables(targetDataSource, targetDatabaseName);
          const tableExists = targetTables.some(t => t.name === target.tableName);

          if (tableExists) {
            if (options.dropIfExists) {
              tableSyncResult.messages.push(`目标表已存在，删除表: ${target.tableName}`);
              await targetService.dropTable(targetDataSource, targetDatabaseName, target.tableName);
            } else {
              tableSyncResult.messages.push(`目标表已存在，跳过表结构同步`);
            }
          }

          if (!tableExists || options.dropIfExists) {
            tableSyncResult.messages.push(`创建目标表: ${target.tableName}`);
            await targetService.createTable(targetDataSource, targetDatabaseName, {
              name: target.tableName,
              columns: columns,
              comment: tableStructure.comment
            });
            tableSyncResult.structureSynced = true;
          }
        }

        // 同步表数据
        if (options.syncData) {
          tableSyncResult.messages.push(`开始同步表数据: ${sourceTableName} -> ${target.tableName}`);
          
          // 获取源表数据（分批获取，避免内存问题）
          const batchSize = 1000;
          let offset = 0;
          let totalRows = 0;

          while (true) {
            const sourceData = await sourceService.query(sourceDataSource, {
              sql: `SELECT * FROM ${sourceService.quoteIdentifier(sourceTableName)} LIMIT ? OFFSET ?`,
              params: [batchSize, offset]
            });

            if (sourceData.length === 0) {
              break;
            }

            // 插入数据到目标表
            if (options.bulkInsert) {
              await targetService.bulkInsert(targetDataSource, targetDatabaseName, target.tableName, sourceData, options.overrideExisting);
            } else {
              for (const row of sourceData) {
                await targetService.insertData(targetDataSource, targetDatabaseName, target.tableName, row, options.overrideExisting);
              }
            }

            totalRows += sourceData.length;
            tableSyncResult.messages.push(`已同步 ${totalRows} 行数据`);
            offset += batchSize;
          }

          tableSyncResult.dataSynced = true;
          tableSyncResult.rowsSynced = totalRows;
          tableSyncResult.messages.push(`数据同步完成，共同步 ${totalRows} 行`);
        }

        syncResults.push(tableSyncResult);
      } catch (error: any) {
        console.error(`同步表 ${sourceTableName} 失败:`, error);
        tableSyncResult.messages.push(`同步失败: ${error instanceof Error ? error.message : String(error)}`);
        syncResults.push(tableSyncResult);
        throw error;
      }
      finally {
        console.log(tableSyncResult.messages);
      }
      return { tables: syncResults };
    } catch (error: any) {
      console.error('同步表失败:', error);
     throw error;
    }
  }

  /**
   * 获取视图列表
   */
  async getViews(connectionId: string, databaseName: string): Promise<any[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getViews(dataSource, databaseName);
  }

  /**
   * 获取视图定义
   */
  async getViewDefinition(connectionId: string, databaseName: string, viewName: string): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getViewDefinition(dataSource, databaseName, viewName);
  }

  /**
   * 获取存储过程列表
   */
  async getProcedures(connectionId: string, databaseName: string): Promise<any[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getProcedures(dataSource, databaseName);
  }

  /**
   * 获取存储过程定义
   */
  async getProcedureDefinition(connectionId: string, databaseName: string, procedureName: string): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getProcedureDefinition(dataSource, databaseName, procedureName);
  }

  /**
   * 测试数据库连接
   */
  async testConnection(connectionId: string): Promise<boolean> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.testConnection(dataSource);
  }

  /**
   * 获取支持的数据库类型
   */
  getSupportedDatabaseTypes() {
    return [
      {
        value: 'mysql',
        label: 'MySQL',
        icon: 'bi-database',
        defaultPort: 3306,
        description: 'MySQL数据库',
        features: {
          supportSchemas: false,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true
        }
      },
      {
        value: 'postgres',
        label: 'PostgreSQL',
        icon: 'bi-database',
        defaultPort: 5432,
        description: 'PostgreSQL数据库',
        features: {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportEnum: true
        }
      },
      {
        value: 'sqlite',
        label: 'SQLite',
        icon: 'bi-database',
        defaultPort: null,
        description: 'SQLite数据库文件',
        features: {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: false,
          supportArrays: false
        }
      },
      {
        value: 'oracle',
        label: 'Oracle',
        icon: 'bi-database',
        defaultPort: 1521,
        description: 'Oracle数据库',
        features: {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: false,
          supportArrays: false,
          supportSequences: true,
          supportSynonyms: true
        }
      },
      {
        value: 'mssql',
        label: 'SQL Server',
        icon: 'bi-database',
        defaultPort: 1433,
        description: 'Microsoft SQL Server',
        features: {
          supportSchemas: false,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: false,
          supportStoredProcedures: true
        }
      },
      {
        value: 'cockroachdb',
        label: 'CockroachDB',
        icon: 'bi-database',
        defaultPort: 26257,
        description: 'CockroachDB分布式SQL数据库',
        features: {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportEnum: true,
          supportDistributed: true
        }
      },
      {
        value: 'mongodb',
        label: 'MongoDB',
        icon: 'bi-database',
        defaultPort: 27017,
        description: 'MongoDB文档数据库',
        features: {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: false,
          supportViews: false,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportDocuments: true,
          supportNoSQL: true
        }
      },
      {
        value: 'sap',
        label: 'SAP HANA',
        icon: 'bi-database',
        defaultPort: 39013,
        description: 'SAP HANA内存数据库',
        features: {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: false,
          supportInMemory: true,
          supportHighPerformance: true
        }
      }
    ];
  }

  /**
   * 创建数据库
   */
  async createDatabase(connectionId: string, databaseName: string, options?: any): Promise<void> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.createDatabase(dataSource, databaseName, options);
  }

  /**
   * 删除数据库
   */
  async dropDatabase(connectionId: string, databaseName: string): Promise<void> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.dropDatabase(dataSource, databaseName);
  }

  /**
   * 导出数据库架构
   */
  async exportSchema(connectionId: string, databaseName: string): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportSchema(dataSource, databaseName);
  }

  /**
   * 查看数据库日志
   */
  async viewLogs(connectionId: string, databaseName?: string, limit: number = 100): Promise<any[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.viewLogs(dataSource, databaseName, limit);
  }

  /**
   * 备份数据库
   */
  async backupDatabase(connectionId: string, databaseName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.backupDatabase(dataSource, databaseName, options);
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(connectionId: string, databaseName: string, filePath: string, options?: any): Promise<void> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.restoreDatabase(dataSource, databaseName, filePath, options);
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(connectionId: string, databaseName: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    
    const tables = await databaseService.getTables(dataSource, databaseName);
    const tableCount = tables.length;
    const size = await databaseService.getDatabaseSize(dataSource, databaseName);
    
    return {
      tableCount,
      size,
      tables: tables.map(table => ({
        name: table.name,
        rowCount: table.rowCount || 0,
        size: table.dataSize || 0
      }))
    };
  }

  /**
   * 优化数据库
   */
  async optimizeDatabase(connectionId: string, databaseName: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    
    const tables = await databaseService.getTables(dataSource, databaseName);
    const results = [];
    
    for (const table of tables) {
      try {
        const result = await dataSource.query(`OPTIMIZE TABLE \`${table.name}\``);
        results.push({ table: table.name, success: true, result });
      } catch (error) {
        results.push({ table: table.name, success: false, error: error.message });
      }
    }
    
    return { results };
  }

  /**
   * 分析表
   */
  async analyzeTables(connectionId: string, databaseName: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    
    const tables = await databaseService.getTables(dataSource, databaseName);
    const results = [];
    
    for (const table of tables) {
      try {
        const result = await dataSource.query(`ANALYZE TABLE \`${table.name}\``);
        results.push({ table: table.name, success: true, result });
      } catch (error) {
        results.push({ table: table.name, success: false, error: error.message });
      }
    }
    
    return { results };
  }

  /**
   * 修复表
   */
  async repairTables(connectionId: string, databaseName: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    
    const tables = await databaseService.getTables(dataSource, databaseName);
    const results = [];
    
    for (const table of tables) {
      try {
        const result = await dataSource.query(`REPAIR TABLE \`${table.name}\``);
        results.push({ table: table.name, success: true, result });
      } catch (error) {
        results.push({ table: table.name, success: false, error: error.message });
      }
    }
    
    return { results };
  }

  /**
   * 导出表数据到 SQL 文件
   */
  async exportTableDataToSQL(connectionId: string, databaseName: string, tableName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportTableDataToSQL(dataSource, databaseName, tableName, options);
  }

  /**
   * 导出表数据到 CSV 文件
   */
  async exportTableDataToCSV(connectionId: string, databaseName: string, tableName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportTableDataToCSV(dataSource, databaseName, tableName, options);
  }

  /**
   * 导出表数据到 JSON 文件
   */
  async exportTableDataToJSON(connectionId: string, databaseName: string, tableName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportTableDataToJSON(dataSource, databaseName, tableName, options);
  }

  /**
   * 导出表数据到 Excel 文件
   */
  async exportTableDataToExcel(connectionId: string, databaseName: string, tableName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportTableDataToExcel(dataSource, databaseName, tableName, options);
  }

  /**
   * 获取数据库类型特定的配置
   */
  getDatabaseTypeSpecificConfig(type: string) {
    const service = this.getDatabaseService(type);
    return {
      type: service.getDatabaseType(),
      features: this.getDatabaseFeatures(type)
    };
  }

  /**
   * 获取数据库特性
   */
  private getDatabaseFeatures(type: string) {
    switch (type.toLowerCase()) {
      case 'mysql':
        return {
          supportSchemas: false,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true
        };
      case 'postgres':
      case 'postgresql':
        return {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportEnum: true
        };
      case 'sqlite':
        return {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: false,
          supportArrays: false
        };
      case 'oracle':
        return {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: false,
          supportArrays: false,
          supportSequences: true,
          supportSynonyms: true
        };
      case 'mssql':
      case 'sqlserver':
        return {
          supportSchemas: false,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: false,
          supportStoredProcedures: true
        };
      case 'cockroachdb':
      case 'cockroach':
        return {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportEnum: true,
          supportDistributed: true
        };
      case 'mongodb':
      case 'mongo':
        return {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: false,
          supportViews: false,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportDocuments: true,
          supportNoSQL: true
        };
      case 'sap':
      case 'sap-hana':
      case 'saphana':
        return {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: false,
          supportInMemory: true,
          supportHighPerformance: true
        };
      default:
        return {};
    }
  }
}