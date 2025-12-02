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
    return this.get('/api/database/connections');
  }

  /**
   * 根据ID获取数据库连接配置
   */
  async getConnectionById(id: string) {
    return this.get(`/api/database/connections/${id}`);
  }

  /**
   * 添加数据库连接配置
   */
  async addConnection(connection: ConnectionEntity) {
    return this.post('/api/database/connections', connection);
  }

  /**
   * 更新数据库连接配置
   */
  async updateConnection(id: string, updates: Partial<ConnectionEntity>) {
    return this.put(`/api/database/connections/${id}`, updates);
  }

  /**
   * 删除数据库连接配置
   */
  async deleteConnection(id: string) {
    return this.delete(`/api/database/connections/${id}`);
  }

  /**
   * 测试数据库连接
   */
  async testConnection(connection: ConnectionEntity) {
    return this.post('/api/database/connections/test', connection);
  }

  /**
   * 获取支持的数据库类型
   */
  async getDatabaseTypes() {
    return this.get('/api/database/types');
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
    return this.get(`/api/database/connections/${connectionId}/databases`);
  }

  /**
   * 获取数据库详细信息
   */
  async getDatabaseInfo(connectionId: string, databaseName: string) {
    return this.get(`/api/database/connections/${connectionId}/databases/${databaseName}`);
  }

  /**
   * 获取数据库表列表
   */
  async getTables(connectionId: string, databaseName: string) {
    return this.get(`/api/database/connections/${connectionId}/databases/${databaseName}/tables`);
  }

  /**
   * 获取表详细信息
   */
  async getTableInfo(connectionId: string, databaseName: string, tableName: string) {
    return this.get(`/api/database/connections/${connectionId}/databases/${databaseName}/tables/${tableName}`);
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

    return this.get(`/api/database/connections/${connectionId}/databases/${databaseName}/tables/${tableName}/data?${params}`);
  }

  /**
   * 执行SQL查询
   */
  async executeQuery(connectionId: string, sql: string) {
    return this.post(`/api/database/connections/${connectionId}/query`, { sql });
  }

  /**
   * 关闭数据库连接
   */
  async closeConnection(connectionId: string) {
    return this.post(`/api/database/connections/${connectionId}/close`);
  }
}