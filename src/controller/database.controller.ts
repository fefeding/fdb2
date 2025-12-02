import { Controller, Get, Post, Query, Body, Param } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { Inject } from '@midwayjs/core';
import { ConnectionService } from '../service/connection.service';
import { DatabaseService } from '../service/database.service';
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
  @Get('/connections')
  async getConnections() {
    try {
      const connections = await this.connectionService.getAllConnections();
      this.ctx.body = {
        success: true,
        data: connections
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 根据ID获取数据库连接配置
   */
  @Get('/connections/:id')
  async getConnection(@Param('id') id: string) {
    try {
      const connection = await this.connectionService.getConnectionById(id);
      if (!connection) {
        this.ctx.body = {
          success: false,
          error: '连接配置不存在'
        };
        return;
      }
      
      this.ctx.body = {
        success: true,
        data: connection
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 添加数据库连接配置
   */
  @Post('/connections')
  async addConnection(@Body() connectionData: ConnectionEntity) {
    try {
      const connection = await this.connectionService.addConnection(connectionData);
      this.ctx.body = {
        success: true,
        data: connection
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新数据库连接配置
   */
  @Post('/connections/:id')
  async updateConnection(@Param('id') id: string, @Body() updates: Partial<ConnectionEntity>) {
    try {
      const connection = await this.connectionService.updateConnection(id, updates);
      this.ctx.body = {
        success: true,
        data: connection
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除数据库连接配置
   */
  @Post('/connections/:id')
  async deleteConnection(@Param('id') id: string) {
    try {
      await this.connectionService.deleteConnection(id);
      this.ctx.body = {
        success: true
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试数据库连接
   */
  @Post('/connections/test')
  async testConnection(@Body() connectionData: ConnectionEntity) {
    try {
      const result = await this.connectionService.testConnection(connectionData);
      this.ctx.body = {
        success: true,
        data: {
          connected: result
        }
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取数据库列表
   */
  @Get('/connections/:id/databases')
  async getDatabases(@Param('id') connectionId: string) {
    try {
      const databases = await this.databaseService.getDatabases(connectionId);
      this.ctx.body = {
        success: true,
        data: databases
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取数据库详细信息
   */
  @Get('/connections/:id/databases/:database')
  async getDatabaseInfo(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string
  ) {
    try {
      const databaseInfo = await this.databaseService.getDatabaseInfo(connectionId, databaseName);
      this.ctx.body = {
        success: true,
        data: databaseInfo
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取数据库表列表
   */
  @Get('/connections/:id/databases/:database/tables')
  async getTables(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string
  ) {
    try {
      const tables = await this.databaseService.getTables(connectionId, databaseName);
      this.ctx.body = {
        success: true,
        data: tables
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取表详细信息
   */
  @Get('/connections/:id/databases/:database/tables/:table')
  async getTableInfo(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string,
    @Param('table') tableName: string
  ) {
    try {
      const tableInfo = await this.databaseService.getTableInfo(connectionId, databaseName, tableName);
      this.ctx.body = {
        success: true,
        data: tableInfo
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取表数据
   */
  @Get('/connections/:id/databases/:database/tables/:table/data')
  async getTableData(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string,
    @Param('table') tableName: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 100,
    @Query('where') where?: string,
    @Query('orderBy') orderBy?: string
  ) {
    try {
      const result = await this.databaseService.getTableData(
        connectionId,
        databaseName,
        tableName,
        page,
        pageSize,
        where,
        orderBy
      );
      this.ctx.body = {
        success: true,
        data: result
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行SQL查询
   */
  @Post('/connections/:id/query')
  async executeQuery(
    @Param('id') connectionId: string,
    @Body('sql') sql: string
  ) {
    try {
      if (!sql || sql.trim() === '') {
        this.ctx.body = {
          success: false,
          error: 'SQL语句不能为空'
        };
        return;
      }

      const result = await this.databaseService.executeQuery(connectionId, sql);
      this.ctx.body = result;
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 关闭数据库连接
   */
  @Post('/connections/:id/close')
  async closeConnection(@Param('id') connectionId: string) {
    try {
      await this.connectionService.closeConnection(connectionId);
      this.ctx.body = {
        success: true
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取支持的数据库类型
   */
  @Get('/types')
  async getSupportedDatabaseTypes() {
    try {
      const types = [
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
          value: 'mssql',
          label: 'SQL Server',
          icon: 'bi-database',
          defaultPort: 1433,
          description: 'Microsoft SQL Server'
        },
        {
          value: 'oracle',
          label: 'Oracle',
          icon: 'bi-database',
          defaultPort: 1521,
          description: 'Oracle数据库'
        }
      ];
      
      this.ctx.body = {
        success: true,
        data: types
      };
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 导出表数据
   */
  @Get('/connections/:id/databases/:database/tables/:table/export')
  async exportTableData(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string,
    @Param('table') tableName: string,
    @Query('format') format: string = 'json',
    @Query('where') where?: string
  ) {
    try {
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
          this.ctx.body = result.data;
          break;
        case 'csv':
          // CSV格式导出
          this.ctx.set('Content-Type', 'text/csv');
          this.ctx.set('Content-Disposition', `attachment; filename="${tableName}.csv"`);
          this.ctx.body = this.convertToCSV(result.data);
          break;
        default:
          this.ctx.body = {
            success: false,
            error: '不支持的导出格式'
          };
      }
    } catch (error) {
      this.ctx.body = {
        success: false,
        error: error.message
      };
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