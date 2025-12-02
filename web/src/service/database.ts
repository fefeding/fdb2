import { BaseAjax } from '@/adapter/ajax';
import type { ConnectionEntity, DatabaseEntity, TableEntity, ColumnEntity, IndexEntity, ForeignKeyEntity } from '@/typings/database';

/**
 * 数据库连接管理服务
 */
export class ConnectionService extends BaseAjax {
  
  /**
   * 获取所有数据库连接配置
   */
  async getAllConnections() {
    return this.get('/api/database/getConnections');
  }

  /**
   * 根据ID获取数据库连接配置
   */
  async getConnectionById(id: string) {
    return this.get(`/api/database/getConnection/${id}`);
  }

  /**
   * 添加数据库连接配置
   */
  async addConnection(connection: ConnectionEntity) {
    return this.post('/api/database/addConnection', connection);
  }

  /**
   * 更新数据库连接配置
   */
  async updateConnection(id: string, updates: Partial<ConnectionEntity>) {
    return this.post(`/api/database/updateConnection/${id}`, updates);
  }

  /**
   * 删除数据库连接配置
   */
  async deleteConnection(id: string) {
    return this.post(`/api/database/deleteConnection/${id}`);
  }

  /**
   * 测试数据库连接
   */
  async testConnection(connection: ConnectionEntity) {
    return this.post('/api/database/testConnection', connection);
  }

  /**
   * 获取支持的数据库类型
   */
  async getDatabaseTypes() {
    return this.get('/api/database/getSupportedDatabaseTypes');
  }
}

/**
 * 数据库管理服务
 */
export class DatabaseService extends BaseAjax {
  
  /**
   * 获取数据库列表
   */
  async getDatabases(connectionId: string) {
    return this.get(`/api/database/getDatabases/${connectionId}`);
  }

  /**
   * 获取数据库详细信息
   */
  async getDatabaseInfo(connectionId: string, databaseName: string) {
    return this.get(`/api/database/getDatabaseInfo/${connectionId}/${databaseName}`);
  }

  /**
   * 获取数据库表列表
   */
  async getTables(connectionId: string, databaseName: string) {
    return this.get(`/api/database/getTables/${connectionId}/${databaseName}`);
  }

  /**
   * 获取表详细信息
   */
  async getTableInfo(connectionId: string, databaseName: string, tableName: string) {
    return this.get(`/api/database/getTableInfo/${connectionId}/${databaseName}/${tableName}`);
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
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    });
    
    if (where) params.append('where', where);
    if (orderBy) params.append('orderBy', orderBy);

    return this.get(`/api/database/getTableData/${connectionId}/${databaseName}/${tableName}?${params}`);
  }

  /**
   * 执行SQL查询
   */
  async executeQuery(connectionId: string, sql: string) {
    return this.post(`/api/database/executeQuery/${connectionId}`, { sql });
  }

  /**
   * 关闭数据库连接
   */
  async closeConnection(connectionId: string) {
    return this.post(`/api/database/closeConnection/${connectionId}`);
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
    const params = new URLSearchParams({ format });
    if (where) params.append('where', where);

    return this.get(`/api/database/exportTableData/${connectionId}/${databaseName}/${tableName}?${params}`);
  }
}