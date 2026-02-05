/**
 * 数据库服务桥接层
 * 用于 VSCode 扩展调用 server 目录下的现有数据库服务
 * 为了简化部署，这里直接实现必要的功能，复用 server 目录的逻辑
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DataSource, type DataSourceOptions } from 'typeorm';

// 引入数据库服务接口（从本地复制的服务）
import { MySQLService } from '../database-services/mysql.service';
import { PostgreSQLService } from '../database-services/postgres.service';
import { SQLiteService } from '../database-services/sqlite.service';
import { OracleService } from '../database-services/oracle.service';
import { SQLServerService } from '../database-services/mssql.service';
import { CockroachDBService } from '../database-services/cockroachdb.service';
import { MongoDBService } from '../database-services/mongodb.service';
import { SAPHANADatabaseService } from '../database-services/sap.service';
import { BaseDatabaseService } from '../database-services/base.service';
import { ConnectionEntity } from '../database-services/model/connection.entity';

/**
 * 数据库服务桥接类
 * 直接复用 server 目录下的服务
 */
export class DatabaseServiceBridge {
  /**
   * 连接配置文件路径
   */
  private readonly configPath: string;

  /**
   * 活跃的数据库连接实例
   */
  private activeConnections: Map<string, DataSource> = new Map();

  /**
   * 数据库服务实例
   */
  private mysqlService: MySQLService;
  private postgreSQLService: PostgreSQLService;
  private sqliteService: SQLiteService;
  private oracleService: OracleService;
  private sqlServerService: SQLServerService;
  private cockroachDBService: CockroachDBService;
  private mongoDBService: MongoDBService;
  private sapHANADatabaseService: SAPHANADatabaseService;

  constructor() {
    const dataDir = process.env.DB_TOOL_DATA_DIR || path.join(os.homedir(), '.fdb2');
    this.configPath = path.join(dataDir, 'connections.json');

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
   * 初始化服务
   */
  async init() {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  /**
   * 连接管理接口
   */
  get connection() {
    return {
      getAllConnections: this.getAllConnections.bind(this),
      getConnectionById: this.getConnectionById.bind(this),
      addConnection: this.addConnection.bind(this),
      updateConnection: this.updateConnection.bind(this),
      deleteConnection: this.deleteConnection.bind(this),
      testConnection: this.testConnection.bind(this)
    };
  }

  /**
   * 数据库管理接口
   */
  get database() {
    return {
      getDatabases: this.getDatabases.bind(this),
      getTables: this.getTables.bind(this),
      executeQuery: this.executeQuery.bind(this),
      getViews: this.getViews.bind(this),
      getProcedures: this.getProcedures.bind(this)
    };
  }

  /**
   * 连接管理实现
   */
  private async getAllConnections(): Promise<ConnectionEntity[]> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return [];
      }
      const data = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(data) as ConnectionEntity[];
    } catch (error) {
      console.error('读取连接配置失败:', error);
      return [];
    }
  }

  private async getConnectionById(id: string): Promise<ConnectionEntity | null> {
    const connections = await this.getAllConnections();
    return connections.find(conn => conn.id === id) || null;
  }

  private async addConnection(connection: ConnectionEntity): Promise<ConnectionEntity> {
    const connections = await this.getAllConnections();

    if (connections.find(conn => conn.name === connection.name)) {
      throw new Error('连接名称已存在');
    }

    connection.id = this.generateId();
    connection.createdAt = new Date();
    connection.updatedAt = new Date();
    connection.enabled = connection.enabled !== undefined ? connection.enabled : true;

    connections.push(connection);
    await this.saveConnections(connections);

    return connection;
  }

  private async updateConnection(id: string, updates: Partial<ConnectionEntity>): Promise<ConnectionEntity> {
    const connections = await this.getAllConnections();
    const index = connections.findIndex(conn => conn.id === id);

    if (index === -1) {
      throw new Error('连接配置不存在');
    }

    if (updates.name && connections.find((conn, idx) => conn.name === updates.name && idx !== index)) {
      throw new Error('连接名称已存在');
    }

    connections[index] = { ...connections[index], ...updates, updatedAt: new Date() } as ConnectionEntity;
    await this.saveConnections(connections);

    return connections[index];
  }

  private async deleteConnection(id: string): Promise<void> {
    const connections = await this.getAllConnections();
    const filteredConnections = connections.filter(conn => conn.id !== id);

    if (filteredConnections.length === connections.length) {
      throw new Error('连接配置不存在');
    }

    if (this.activeConnections.has(id)) {
      await this.activeConnections.get(id)?.destroy();
      this.activeConnections.delete(id);
    }

    await this.saveConnections(filteredConnections);
  }

  private async testConnection(connection: ConnectionEntity): Promise<boolean> {
    try {
      const tempDataSource = await this.createTypeORMDataSource(connection);
      await tempDataSource.query('SELECT 1');
      await tempDataSource.destroy();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * 数据库管理实现
   */
  private async getDatabases(connectionId: string): Promise<string[]> {
    const dataSource = await this.getActiveConnection(connectionId);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getDatabases(dataSource);
  }

  private async getTables(connectionId: string, databaseName: string): Promise<any[]> {
    const dataSource = await this.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getTables(dataSource, databaseName);
  }

  private async executeQuery(connectionId: string, sql: string, databaseName?: string): Promise<any> {
    const dataSource = await this.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.executeQuery(dataSource, sql);
  }

  private async getViews(connectionId: string, databaseName: string): Promise<any[]> {
    const dataSource = await this.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getViews(dataSource, databaseName);
  }

  private async getProcedures(connectionId: string, databaseName: string): Promise<any[]> {
    const dataSource = await this.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getProcedures(dataSource, databaseName);
  }

  /**
   * 获取活跃的数据库连接
   */
  private async getActiveConnection(id: string, database?: string): Promise<DataSource> {
    const key = database ? `${id}_${database}` : id;
    if (this.activeConnections.has(key)) {
      const db = this.activeConnections.get(key);
      if (db?.isInitialized) {
        return db;
      } else {
        this.activeConnections.delete(key);
      }
    }

    if (this.activeConnections.size >= 10) {
      const oldestKey = this.activeConnections.keys().next().value || '';
      const oldestConnection = this.activeConnections.get(oldestKey);
      try {
        await oldestConnection?.destroy();
      } catch (error) {
        console.error(`关闭旧连接 ${oldestKey} 失败:`, error);
      }
      this.activeConnections.delete(oldestKey);
    }

    const connectionConfig = await this.getConnectionById(id);
    if (!connectionConfig) {
      throw new Error('连接配置不存在');
    }

    const updatedConnectionConfig: ConnectionEntity = {
      ...connectionConfig,
      database: database || connectionConfig.database
    };

    const dataSource = await this.createTypeORMDataSource(updatedConnectionConfig);
    this.activeConnections.set(key, dataSource);

    return dataSource;
  }

  /**
   * 创建TypeORM数据源
   */
  private async createTypeORMDataSource(connectionConfig: ConnectionEntity): Promise<DataSource> {
    const connectionOptions = this.getTypeORMOptions(connectionConfig);
    return new DataSource(connectionOptions).initialize();
  }

  /**
   * 获取TypeORM连接配置
   */
  private getTypeORMOptions(connectionConfig: ConnectionEntity): DataSourceOptions {
    const baseOptions: DataSourceOptions = {
      type: connectionConfig.type as any,
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.username,
      password: connectionConfig.password,
      database: connectionConfig.database,
      synchronize: false,
      logging: false,
      extra: {
        multipleStatements: true
      },
      ...connectionConfig.options
    };

    switch (connectionConfig.type.toLowerCase()) {
      case 'sqlite':
        return {
          ...baseOptions,
          type: 'sqlite' as any,
          database: connectionConfig.database,
          host: undefined,
          port: undefined,
          username: undefined,
          password: undefined
        };
      case 'postgres':
      case 'postgresql':
        return {
          ...baseOptions,
          type: 'postgres' as any,
          ssl: connectionConfig.options?.ssl || false
        };
      case 'oracle':
        return {
          ...baseOptions,
          type: 'oracle' as any,
          connectString: `${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`,
          host: undefined,
          port: undefined,
          database: undefined,
          extra: {
            connectionTimeout: 60000,
            poolMax: 10,
            poolMin: 1,
            poolIncrement: 1
          }
        };
      case 'mssql':
      case 'sqlserver':
        return {
          ...baseOptions,
          type: 'mssql' as any,
          options: {
            encrypt: connectionConfig.options?.encrypt || false,
            trustServerCertificate: true
          },
          extra: {
            connectionTimeout: 60000,
            requestTimeout: 15000
          }
        };
      default:
        return baseOptions;
    }
  }

  /**
   * 获取数据库服务实例
   */
  private getDatabaseService(type: string): BaseDatabaseService {
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
   * 保存连接配置到文件
   */
  private async saveConnections(connections: ConnectionEntity[]): Promise<void> {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(connections, null, 2), 'utf8');
    } catch (error) {
      console.error('保存连接配置失败:', error);
      throw error;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// 创建全局单例
let bridgeInstance: DatabaseServiceBridge | null = null;

/**
 * 获取数据库服务桥接实例
 */
export function getDatabaseServiceBridge(): DatabaseServiceBridge {
  if (!bridgeInstance) {
    bridgeInstance = new DatabaseServiceBridge();
  }
  return bridgeInstance;
}
