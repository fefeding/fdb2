import { Controller, Query, Body, Param, All } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { Inject } from '@midwayjs/core';
import { ConnectionService } from '../service/connection.service';
import { DatabaseService } from '../service/database/database.service';
import { ConnectionEntity } from '../model/connection.entity';

/**
 * 数据库管理控制器
 * 提供数据库连接管理和操作API
 */
@Controller('/api/database')
export class DatabaseController {

  @Inject()
  ctx: Context;

  @Inject()
  connectionService: ConnectionService;

  @Inject()
  databaseService: DatabaseService;

  /**
   * 获取所有数据库连接配置
   */
  @All('/getConnections')
  async getConnections() {
      const connections = await this.connectionService.getAllConnections();
      return connections;
  }

  /**
   * 根据ID获取数据库连接配置
   */
  @All('/getConnection/:id')
  async getConnection(@Param('id') id: string) {
    
      const connection = await this.connectionService.getConnectionById(id);  
      return connection;
  }

  /**
   * 添加数据库连接配置
   */
  @All('/addConnection')
  async addConnection(@Body() connectionData: ConnectionEntity) {
    
      const connection = await this.connectionService.addConnection(connectionData);
      return connection;
  }

  /**
   * 更新数据库连接配置
   */
  @All('/updateConnection/:id')
  async updateConnection(@Param('id') id: string, @Body() updates: Partial<ConnectionEntity>) {
    
      const connection = await this.connectionService.updateConnection(id, updates);
      return connection;
  }

  /**
   * 删除数据库连接配置
   */
  @All('/deleteConnection/:id')
  async deleteConnection(@Param('id') id: string) {
    
      await this.connectionService.deleteConnection(id);
      return true;
  }

  /**
   * 测试数据库连接
   */
  @All('/testConnection')
  async testConnection(@Body() connectionData: ConnectionEntity) {
   
      const result = await this.connectionService.testConnection(connectionData);
      return result;
  }

  /**
   * 获取数据库列表
   */
  @All('/getDatabases/:id')
  async getDatabases(@Param('id') connectionId: string) {
   
      const databases = await this.databaseService.getDatabases(connectionId);
      return databases;
  }

  /**
   * 获取数据库详细信息
   */
  @All('/getDatabaseInfo/:id/:database')
  async getDatabaseInfo(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string
  ) {
      const databaseInfo = await this.databaseService.getDatabaseInfo(connectionId, databaseName);
      return databaseInfo;
  }

  /**
   * 获取数据库表列表
   */
  @All('/getTables/:id/:database')
  async getTables(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string
  ) {
      const tables = await this.databaseService.getTables(connectionId, databaseName);
      return tables;
  }

  /**
   * 获取表详细信息
   */
  @All('/getTableInfo/:id/:database/:table')
  async getTableInfo(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string,
    @Param('table') tableName: string
  ) {
      const tableInfo = await this.databaseService.getTableInfo(connectionId, databaseName, tableName);
      return tableInfo;
  }

  /**
   * 获取表数据
   */
  @All('/getTableData/:id/:database/:table')
  async getTableData(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string,
    @Param('table') tableName: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 100,
    @Query('where') where?: string,
    @Query('orderBy') orderBy?: string
  ) {
      const result = await this.databaseService.getTableData(
        connectionId,
        databaseName,
        tableName,
        page,
        pageSize,
        where,
        orderBy
      );
      return result;
  }

  /**
   * 执行SQL查询
   */
  @All('/executeQuery/:id')
  async executeQuery(
    @Param('id') connectionId: string,
    @Body('sql') sql: string
  ) {
      if (!sql || sql.trim() === '') {
        throw Error('SQL语句不能为空');
      }

      const result = await this.databaseService.executeQuery(connectionId, sql);
      return result;
  }

  /**
   * 关闭数据库连接
   */
  @All('/closeConnection/:id')
  async closeConnection(@Param('id') connectionId: string) {
    
      await this.connectionService.closeConnection(connectionId);
      return true;
  }

  /**
   * 获取支持的数据库类型
   */
  @All('/getSupportedDatabaseTypes')
  async getSupportedDatabaseTypes() {
      const types = this.databaseService.getSupportedDatabaseTypes();
      
      return types;
  }

  /**
   * 导出表数据
   */
  @All('/exportTableData/:id/:database/:table')
  async exportTableData(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string,
    @Param('table') tableName: string,
    @Query('format') format: string = 'json',
    @Query('where') where?: string
  ) {
      // 获取所有数据
      const result = await this.databaseService.getTableData(
        connectionId,
        databaseName,
        tableName,
        1,
        10000, // 导出限制
        where
      );

      switch (format.toLowerCase()) {
        case 'json':
          this.ctx.set('Content-Type', 'application/json');
          this.ctx.set('Content-Disposition', `attachment; filename="${tableName}.json"`);
          return result.data;
        case 'csv':
          // CSV格式导出
          this.ctx.set('Content-Type', 'text/csv');
          this.ctx.set('Content-Disposition', `attachment; filename="${tableName}.csv"`);
          return this.convertToCSV(result.data);
        default:
          throw Error('不支持的导出格式');
      }
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // 处理包含逗号、引号、换行符的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }
}