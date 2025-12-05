import { ConnectionService } from '../connection.service';
import { BaseDatabaseService } from './base.service';
import { MySQLService } from './mysql.service';
import { PostgreSQLService } from './postgres.service';
import { SQLiteService } from './sqlite.service';
import { OracleService } from './oracle.service';
import { SQLServerService } from './mssql.service';
import { 
  DatabaseEntity, 
  TableEntity 
} from '../../model/database.entity';

/**
 * 数据库服务管理类
 * 负责根据数据库类型选择相应的服务实现
 */
export class DatabaseService {

  private connectionService: ConnectionService;
  private mysqlService: MySQLService;
  private postgreSQLService: PostgreSQLService;
  private sqliteService: SQLiteService;
  private oracleService: OracleService;
  private sqlServerService: SQLServerService;

  constructor() {
    this.connectionService = new ConnectionService();
    this.mysqlService = new MySQLService();
    this.postgreSQLService = new PostgreSQLService();
    this.sqliteService = new SQLiteService();
    this.oracleService = new OracleService();
    this.sqlServerService = new SQLServerService();
  }

  /**
   * 获取数据库服务实例
   */
  private getDatabaseService(type: string): BaseDatabaseService {
    switch (type.toLowerCase()) {
      case 'mysql':
        return this.mysqlService;
      case 'postgres':
      case 'postgresql':
        return this.postgreSQLService;
      case 'sqlite':
        return this.sqliteService;
      case 'oracle':
        return this.oracleService;
      case 'mssql':
      case 'sqlserver':
        return this.sqlServerService;
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
        description: 'MySQL数据库'
      },
      {
        value: 'postgres',
        label: 'PostgreSQL',
        icon: 'bi-database',
        defaultPort: 5432,
        description: 'PostgreSQL数据库'
      },
      {
        value: 'sqlite',
        label: 'SQLite',
        icon: 'bi-database',
        defaultPort: null,
        description: 'SQLite数据库文件'
      },
      {
        value: 'oracle',
        label: 'Oracle',
        icon: 'bi-database',
        defaultPort: 1521,
        description: 'Oracle数据库'
      },
      {
        value: 'mssql',
        label: 'SQL Server',
        icon: 'bi-database',
        defaultPort: 1433,
        description: 'Microsoft SQL Server'
      }
    ];
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
      default:
        return {};
    }
  }
}