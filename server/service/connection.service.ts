import * as fs from 'fs';
import * as path from 'path';
import { ConnectionEntity } from '../model/connection.entity';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { getDataPath, ensureDataDir } from '../utils/data-dir';

/**
 * 缓存的连接池数量上限。
 * 每个池自身还有 connectionLimit 上限（见 getTypeORMOptions），
 * 二者相乘即本进程对单个库的最大连接数，需留出余量避免撞上服务端 max_connections。
 */
const MAX_CACHED_CONNECTIONS = 8;

/**
 * 数据库连接管理服务
 * 负责管理数据库连接配置和连接实例
 */
export class ConnectionService {

  /**
   * 连接配置文件路径
   * 优先使用环境变量 DB_TOOL_DATA_DIR，否则使用用户主目录下的 .db-tool 目录
   */
  private readonly configPath: string;

  /**
   * 活跃的数据库连接实例
   */
  private activeConnections: Map<string, DataSource> = new Map();

  /**
   * 正在建立中的连接（key → Promise）。
   * 缓存里存的是已建好的 DataSource，同一 key 的并发请求在 await 期间都读不到缓存，
   * 会各自 new DataSource().initialize()，后写的覆盖先写的——先建的那个池再无引用也
   * 无法回收，持续累积直到服务端报 ER_CON_COUNT_ERROR(Too many connections)。
   * 这里登记在途 Promise，让并发请求共享同一次建连。
   */
  private pendingConnections: Map<string, Promise<DataSource>> = new Map();

  constructor() {
    this.configPath = getDataPath('connections.json');
  }

  /**
   * 初始化服务，创建配置目录
   */
  async init() {
    ensureDataDir();
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
      const tempDataSource = await this.createTypeORMDataSource(connection);
      await tempDataSource.query('SELECT 1');
      await tempDataSource.destroy();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取活跃的数据库连接
   *
   * 并发安全：同一 key 的并发请求共享同一次建连（pendingConnections 去重），
   * 避免重复建连导致的连接池泄漏（MySQL Too many connections 的主因）。
   */
  async getActiveConnection(id: string, database?: string): Promise<DataSource> {
    const key = database ? `${id}_${database}` : id;

    // 命中缓存：可用则复用，并刷新 LRU 位置（避免正在使用的热点连接被优先淘汰）
    const cached = this.activeConnections.get(key);
    if (cached) {
      if (cached.isInitialized) {
        this.activeConnections.delete(key);
        this.activeConnections.set(key, cached);
        return cached;
      }
      // 连接已失效：必须销毁后再移除，否则它持有的连接池会泄漏
      this.activeConnections.delete(key);
      await this.destroyQuietly(cached, key);
    }

    // 并发去重：同一 key 已在建连中，直接复用同一个 Promise
    const pending = this.pendingConnections.get(key);
    if (pending) return pending;

    const task = this.createAndCacheConnection(key, id, database);
    this.pendingConnections.set(key, task);
    try {
      return await task;
    } finally {
      // 仅清理自己登记的那一个（可能已被同 key 的后续任务覆盖）
      if (this.pendingConnections.get(key) === task) {
        this.pendingConnections.delete(key);
      }
    }
  }

  /** 建连并登记到缓存；超过容量上限时按 LRU 淘汰最久未使用的连接 */
  private async createAndCacheConnection(key: string, id: string, database?: string): Promise<DataSource> {
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

    // 必须「注册后再裁剪」：若在 await 建连之前检查容量，并发请求会在同一时刻
    // 全部通过检查（此刻谁都还没 set 进缓存），缓存就会突破上限。
    // set 之后 size 才是真实值；新连接位于 LRU 末尾，裁剪不会误伤它。
    await this.trimCache();

    return dataSource;
  }

  /** 按 LRU 把缓存裁剪到上限，淘汰项真正 destroy，避免连接池残留 */
  private async trimCache(): Promise<void> {
    while (this.activeConnections.size > MAX_CACHED_CONNECTIONS) {
      const oldestKey = this.activeConnections.keys().next().value as string | undefined;
      if (!oldestKey) break;
      const oldest = this.activeConnections.get(oldestKey);
      this.activeConnections.delete(oldestKey);
      await this.destroyQuietly(oldest, oldestKey);
    }
  }

  /** 销毁连接但不向上抛，避免清理失败影响主流程 */
  private async destroyQuietly(dataSource: DataSource | undefined, label: string): Promise<void> {
    if (!dataSource) return;
    try {
      await dataSource.destroy();
    } catch (error) {
      console.error(`关闭连接 ${label} 失败:`, error);
    }
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
    // ClickHouse 没有官方 TypeORM 驱动，使用自带的 HTTP 连接封装
    if ((connectionConfig.type || '').toLowerCase() === 'clickhouse') {
      const { ClickHouseConnection } = require('./database/clickhouse-connection');
      return new ClickHouseConnection(connectionConfig) as unknown as DataSource;
    }
    const connectionOptions = this.getTypeORMOptions(connectionConfig);
    return new DataSource(connectionOptions).initialize();
  }

  /**
   * 创建临时数据库连接
   * 用于同步操作中的目标数据库连接
   */
  async createTemporaryConnection(connectionOptions: DataSourceOptions): Promise<DataSource> {
    try {
      // ClickHouse 使用自带连接封装
      if ((connectionOptions.type as any || '').toLowerCase() === 'clickhouse') {
        const { ClickHouseConnection } = require('./database/clickhouse-connection');
        return new ClickHouseConnection(connectionOptions) as unknown as DataSource;
      }
      // 显式指定 mysql2 驱动，避免 TypeORM 默认 "mysql"（老包）在全局安装环境下
      // 解析到遗留 mysql 包导致 caching_sha2_password 认证失败
      const dataSource = new DataSource({ ...connectionOptions, connectorPackage: 'mysql2' } as any);
      await dataSource.initialize();
      return dataSource;
    } catch (error) {
      console.error('创建临时连接失败:', error);
      throw error;
    }
  }

  /**
   * 获取TypeORM连接配置
   */
  private getTypeORMOptions(connectionConfig: ConnectionEntity): DataSourceOptions {
    const userOptions = (connectionConfig.options || {}) as Record<string, any>;

    const baseOptions = {
      type: connectionConfig.type as any,
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.username,
      password: connectionConfig.password,
      database: connectionConfig.database,
      synchronize: false,
      logging: false,
      // 强制使用 mysql2 驱动：TypeORM 默认 connectorPackage 是 "mysql"（老包），
      // 全局安装时 Node 会解析到系统中全局遗留的 mysql 包，该老包不支持 MySQL 8 的
      // caching_sha2_password，导致 ER_NOT_SUPPORTED_AUTH_MODE。显式指定 mysql2 可彻底规避。
      connectorPackage: 'mysql2',
      ...userOptions,
      // extra 必须放在 ...userOptions 之后并做合并：
      // 原先 extra 在展开之前，connectionConfig.options.extra 会把它整体顶掉，
      // 导致 multipleStatements 静默失效。
      // connectionLimit 显式收敛单池上限（mysql2 默认 10），叠加最多 MAX_CACHED_CONNECTIONS
      // 个池后仍远小于常见的 max_connections(151)，避免 Too many connections。
      extra: {
        multipleStatements: true,
        connectionLimit: 5,
        ...(userOptions.extra || {})
      }
    };

    // 根据数据库类型调整配置
    switch (connectionConfig.type.toLowerCase()) {
      case 'sqlite':
      case 'better-sqlite3':
      case 'bettersqlite3':
        return {
          ...baseOptions,
          type: 'better-sqlite3' as any,
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
          ssl: connectionConfig.options?.ssl || false,
          // pg 池上限字段是 max（不是 mysql2 的 connectionLimit）
          extra: { ...((baseOptions as any).extra || {}), max: 5 }
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
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(connections, null, 2), 'utf8');
      try {
        if (process.platform !== 'win32') fs.chmodSync(this.configPath, 0o600);
      } catch {
        /* ignore */
      }
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