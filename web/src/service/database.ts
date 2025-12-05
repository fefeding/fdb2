import { request } from '@/service/base';
import type { ConnectionEntity, DatabaseEntity, TableEntity, ColumnEntity, IndexEntity, ForeignKeyEntity } from '@/typings/database';

/**
 * 数据库连接管理服务
 */
export class ConnectionService {
  
  /**
   * 获取所有数据库连接配置
   */
  async getAllConnections() {
    return request('/api/database/getConnections', {});
  }

  /**
   * 根据ID获取数据库连接配置
   */
  async getConnectionById(id: string) {
    return request('/api/database/getConnection', { id });
  }

  /**
   * 添加数据库连接配置
   */
  async addConnection(connection: ConnectionEntity) {
    return request('/api/database/addConnection', connection);
  }

  /**
   * 更新数据库连接配置
   */
  async updateConnection(id: string, updates: Partial<ConnectionEntity>) {
    return request('/api/database/updateConnection', { id, ...updates });
  }

  /**
   * 删除数据库连接配置
   */
  async deleteConnection(id: string) {
    return request('/api/database/deleteConnection', { id });
  }

  /**
   * 测试数据库连接
   */
  async testConnection(connection: ConnectionEntity) {    
    return request('/api/database/testConnection', connection);
  }

  /**
   * 获取支持的数据库类型
   */
  async getDatabaseTypes() {
    return request('/api/database/getSupportedDatabaseTypes');
  }
}

/**
 * 数据库管理服务
 */
export class DatabaseService {
  
  /**
   * 获取数据库列表
   */
  async getDatabases(connectionId: string) {
    return request('/api/database/getDatabases', { id: connectionId });
  }

  /**
   * 获取数据库详细信息
   */
  async getDatabaseInfo(connectionId: string, databaseName: string) {
    return request('/api/database/getDatabaseInfo', { id: connectionId, database: databaseName });
  }

  /**
   * 获取数据库表列表
   */
  async getTables(connectionId: string, databaseName: string) {
    return request('/api/database/getTables', { id: connectionId, database: databaseName });
  }

  /**
   * 获取表详细信息
   */
  async getTableInfo(connectionId: string, databaseName: string, tableName: string) {
    return request('/api/database/getTableInfo', { id: connectionId, database: databaseName, table: tableName });
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
  ) {
    const params = {
      id: connectionId,
      database: databaseName,
      table: tableName,
      page,
      pageSize,
      where,
      orderBy
    };
    return request('/api/database/getTableData', params);
  }

  /**
   * 执行SQL查询
   */
  async executeQuery(connectionId: string, sql: string, databaseName?: string) {
    return request('/api/database/executeQuery', { id: connectionId, sql, database: databaseName });
  }

  /**
   * 关闭数据库连接
   */
  async closeConnection(connectionId: string) {
    return request('/api/database/closeConnection', { id: connectionId });
  }

  /**
   * 导出表数据
   */
  async exportTableData(
    connectionId: string,
    databaseName: string,
    tableName: string,
    format: string = 'json',
    where?: string
  ) {
    return request('/api/database/exportTableData', {
      id: connectionId,
      database: databaseName,
      table: tableName,
      format,
      where
    });
  }

  /**
   * 保存表结构（新建表）
   */
  async saveTableStructure(
    connectionId: string,
    database: string,
    table: any,
    columns: any[]
  ) {
    return request('/api/database/saveTableStructure', {
      id: connectionId,
      database,
      table,
      columns
    });
  }

  /**
   * 修改表结构
   */
  async alterTable(
    connectionId: string,
    database: string,
    tableName: string,
    columns: any[],
    oldColumns?: any[]
  ) {
    return request('/api/database/alterTable', {
      id: connectionId,
      database,
      tableName,
      columns,
      oldColumns
    });
  }

  /**
   * 插入数据
   */
  async insertData(
    connectionId: string,
    database: string,
    tableName: string,
    data: any
  ) {
    return request('/api/database/insertData', {
      id: connectionId,
      database,
      table: tableName,
      data
    });
  }

  /**
   * 更新数据
   */
  async updateData(
    connectionId: string,
    database: string,
    tableName: string,
    data: any,
    where: any
  ) {
    return request('/api/database/updateData', {
      id: connectionId,
      database,
      table: tableName,
      data,
      where
    });
  }

  /**
   * 删除数据
   */
  async deleteData(
    connectionId: string,
    database: string,
    tableName: string,
    where: any
  ) {
    return request('/api/database/deleteData', {
      id: connectionId,
      database,
      table: tableName,
      where
    });
  }

  /**
   * 截断表
   */
  async truncateTable(
    connectionId: string,
    database: string,
    tableName: string
  ) {
    return request(`/api/database/truncateTable/${connectionId}/${database}/${tableName}`);
  }

  /**
   * 删除表
   */
  async dropTable(
    connectionId: string,
    database: string,
    tableName: string
  ) {
    return request(`/api/database/dropTable/${connectionId}/${database}/${tableName}`);
  }

  /**
   * 数据库备份
   */
  async backupDatabase(
    connectionId: string,
    database: string,
    options?: any
  ) {
    return request(`/api/database/backup/${connectionId}/${database}`, options);
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(
    connectionId: string,
    data: any
  ) {
    return request('/api/database/restore', data);
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(
    connectionId: string,
    database: string
  ) {
    return request(`/api/database/getStats/${connectionId}/${database}`);
  }

  /**
   * 优化数据库
   */
  async optimizeDatabase(
    connectionId: string,
    database: string
  ) {
    return request(`/api/database/optimize/${connectionId}/${database}`);
  }

  /**
   * 检查数据库健康状态
   */
  async checkDatabaseHealth(
    connectionId: string,
    database: string
  ) {
    return request(`/api/database/health/${connectionId}/${database}`);
  }
}