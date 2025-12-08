import * as fs from 'fs';
import * as path from 'path';
import { ConnectionEntity } from '../model/connection.entity';
import { DataSource, type DataSourceOptions } from 'typeorm';

/**
 * 数据库连接管理服务
 * 负责管理数据库连接配置和连接实例
 */
export class ConnectionService {

  /**
   * 连接配置文件路径
   */
  private readonly configPath = path.join(process.cwd(), 'data', 'connections.json');

  /**
   * 活跃的数据库连接实例
   */
  private activeConnections: Map<string, DataSource> = new Map();

  /**
   * 初始化服务，创建配置目录
   */
  async init() {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  /**
   * 获取所有数据库连接配置
   */
  async getAllConnections(): Promise<ConnectionEntity[]> {
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

  /**
   * 根据ID获取数据库连接配置
   */
  async getConnectionById(id: string): Promise<ConnectionEntity | null> {
    const connections = await this.getAllConnections();
    return connections.find(conn => conn.id === id) || null;
  }

  /**
   * 添加数据库连接配置
   */
  async addConnection(connection: ConnectionEntity): Promise<ConnectionEntity> {
    const connections = await this.getAllConnections();
    
    // 检查名称是否重复
    if (connections.find(conn => conn.name === connection.name)) {
      throw new Error('连接名称已存在');
    }

    // 生成ID并设置时间戳
    connection.id = this.generateId();
    connection.createdAt = new Date();
    connection.updatedAt = new Date();
    connection.enabled = connection.enabled !== undefined ? connection.enabled : true;

    connections.push(connection);
    await this.saveConnections(connections);
    
    return connection;
  }

  /**
   * 更新数据库连接配置
   */
  async updateConnection(id: string, updates: Partial<ConnectionEntity>): Promise<ConnectionEntity> {
    const connections = await this.getAllConnections();
    const index = connections.findIndex(conn => conn.id === id);
    
    if (index === -1) {
      throw new Error('连接配置不存在');
    }

    // 检查名称重复
    if (updates.name && connections.find((conn, idx) => conn.name === updates.name && idx !== index)) {
      throw new Error('连接名称已存在');
    }
    // @ts-ignore
    connections[index] = { ...connections[index], ...updates, updatedAt: new Date() };
    await this.saveConnections(connections);
    // @ts-ignore
    return connections[index];
  }

  /**
   * 删除数据库连接配置
   */
  async deleteConnection(id: string): Promise<void> {
    const connections = await this.getAllConnections();
    const filteredConnections = connections.filter(conn => conn.id !== id);
    
    if (filteredConnections.length === connections.length) {
      throw new Error('连接配置不存在');
    }

    // 关闭活跃连接
    if (this.activeConnections.has(id)) {
      await this.activeConnections.get(id)?.destroy();
      this.activeConnections.delete(id);
    }

    await this.saveConnections(filteredConnections);
  }

  /**
   * 测试数据库连接
   */
  async testConnection(connection: ConnectionEntity): Promise<boolean> {
    try {
      console.log('test', connection);
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
   * 获取活跃的数据库连接
   */
  async getActiveConnection(id: string, database?: string): Promise<DataSource> {
    const key = database ? `${id}_${database}` : id;
    if (this.activeConnections.has(key)) {
      const db = this.activeConnections.get(key);
      // 检查连接是否仍然有效
      if (db?.isInitialized) {
        return db;
      } else {
        // 连接已关闭，从缓存中移除
        this.activeConnections.delete(key);
      }
    }

    // 连接池大小限制，防止连接数无限增长
    if (this.activeConnections.size >= 10) {
      // 关闭最旧的连接
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

    // 创建一个新的连接配置，使用指定的数据库
    const updatedConnectionConfig: ConnectionEntity = {
      ...connectionConfig,
      database: database || connectionConfig.database
    };

    const dataSource = await this.createTypeORMDataSource(updatedConnectionConfig);
    this.activeConnections.set(key, dataSource);
    
    return dataSource;
  }

  /**
   * 关闭数据库连接
   */
  async closeConnection(id: string, database?: string): Promise<void> {
    const key = database ? `${id}_${database}` : id;
    if (this.activeConnections.has(key)) {
      await this.activeConnections.get(key)?.destroy();
      this.activeConnections.delete(key);
    }
    // 也关闭默认连接（如果存在）
    if (database && this.activeConnections.has(id)) {
      await this.activeConnections.get(id)?.destroy();
      this.activeConnections.delete(id);
    }
  }

  /**
   * 关闭特定连接的所有数据库连接
   */
  async closeAllConnectionsForId(connectionId: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const [key, dataSource] of this.activeConnections) {
      if (key.startsWith(connectionId + '_') || key === connectionId) {
        try {
          await dataSource.destroy();
          keysToDelete.push(key);
        } catch (error) {
          console.error(`关闭连接 ${key} 失败:`, error);
        }
      }
    }
    keysToDelete.forEach(key => this.activeConnections.delete(key));
  }

  /**
   * 关闭所有数据库连接
   */
  async closeAllConnections(): Promise<void> {
    for (const [id, dataSource] of this.activeConnections) {
      try {
        await dataSource.destroy();
      } catch (error) {
        console.error(`关闭连接 ${id} 失败:`, error);
      }
    }
    this.activeConnections.clear();
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
    const baseOptions = {
      type: connectionConfig.type as any,
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.username,
      password: connectionConfig.password,
      database: connectionConfig.database,
      synchronize: false,
      logging: false,
      ...connectionConfig.options
    };

    // 根据数据库类型调整配置
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
   * 保存连接配置到文件
   */
  private async saveConnections(connections: ConnectionEntity[]): Promise<void> {
    try {
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