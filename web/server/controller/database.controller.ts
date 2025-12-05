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
    @Body('sql') sql: string,
    @Body('database') databaseName?: string
  ) {
      if (!sql || sql.trim() === '') {
        throw Error('SQL语句不能为空');
      }

      const result = await this.databaseService.executeQuery(connectionId, sql, databaseName);
      return result;
  }

  /**
   * 关闭数据库连接
   */
  @All('/closeConnection/:id')
  async closeConnection(@Param('id') connectionId: string) {
      await this.connectionService.closeConnection(connectionId);
      // 也清理该连接的所有数据库连接
      await this.connectionService.closeAllConnectionsForId(connectionId);
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

  /**
   * 保存表结构
   */
  @All('/saveTableStructure/:id')
  async saveTableStructure(
    @Param('id') connectionId: string,
    @Body() body: { database: string; table: any; columns: any[] }
  ) {
    const { database, table, columns } = body;
    
    // 生成CREATE TABLE或ALTER TABLE SQL
    const sql = this.generateTableSQL(table.name, columns, table);
    
    // 执行SQL
    const result = await this.databaseService.executeQuery(connectionId, sql, database);
    
    return {
      success: true,
      sql: sql,
      result: result
    };
  }

  /**
   * 修改表结构
   */
  @All('/alterTable/:id')
  async alterTable(
    @Param('id') connectionId: string,
    @Body() body: { database: string; tableName: string; columns: any[]; oldColumns?: any[] }
  ) {
    const { database, tableName, columns, oldColumns } = body;
    
    // 生成ALTER TABLE SQL
    const sqlStatements = this.generateAlterTableSQL(tableName, columns, oldColumns);
    
    const results = [];
    for (const sql of sqlStatements) {
      const result = await this.databaseService.executeQuery(connectionId, sql, database);
      results.push({ sql, result });
    }
    
    return {
      success: true,
      statements: sqlStatements,
      results: results
    };
  }

  /**
   * 插入数据
   */
  @All('/insertData/:id/:database/:table')
  async insertData(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string,
    @Param('table') tableName: string,
    @Body() data: any
  ) {
    const sql = this.generateInsertSQL(tableName, data);
    const result = await this.databaseService.executeQuery(connectionId, sql, databaseName);
    
    return {
      sql: sql,
      result: result
    };
  }

  /**
   * 更新数据
   */
  @All('/updateData/:id/:database/:table')
  async updateData(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string,
    @Param('table') tableName: string,
    @Body() body: { data: any; where: any }
  ) {
    const { data, where } = body;
    const sql = this.generateUpdateSQL(tableName, data, where);
    const result = await this.databaseService.executeQuery(connectionId, sql, databaseName);
    
    return {
      sql: sql,
      result: result
    };
  }

  /**
   * 删除数据
   */
  @All('/deleteData/:id/:database/:table')
  async deleteData(
    @Param('id') connectionId: string,
    @Param('database') databaseName: string,
    @Param('table') tableName: string,
    @Body() where: any
  ) {
    const sql = this.generateDeleteSQL(tableName, where);
    const result = await this.databaseService.executeQuery(connectionId, sql, databaseName);
    
    return {
      success: true,
      sql: sql,
      result: result
    };
  }

  /**
   * 生成表SQL
   */
  private generateTableSQL(tableName: string, columns: any[], tableInfo: any): string {
    let sql = `CREATE TABLE \`${tableName}\` (\n`;
    
    const primaryKeys = [];
    
    columns.forEach((column, index) => {
      const columnDef = [];
      columnDef.push(`  \`${column.name}\``);
      columnDef.push(this.getColumnTypeDefinition(column));
      
      if (!column.nullable) {
        columnDef.push('NOT NULL');
      }
      
      if (column.defaultValue !== null && column.defaultValue !== '') {
        columnDef.push(`DEFAULT ${this.formatDefaultValue(column.defaultValue, column.type)}`);
      }
      
      if (column.isAutoIncrement) {
        columnDef.push('AUTO_INCREMENT');
      }
      
      if (column.comment) {
        columnDef.push(`COMMENT '${column.comment}'`);
      }
      
      sql += columnDef.join(' ');
      
      if (index < columns.length - 1) {
        sql += ',\n';
      }
      
      if (column.isPrimary) {
        primaryKeys.push(column.name);
      }
    });
    
    // 添加主键约束
    if (primaryKeys.length > 0) {
      sql += `,\n  PRIMARY KEY (\`${primaryKeys.join('`, `')}\`)`;
    }
    
    sql += `\n) ENGINE=${tableInfo.engine} DEFAULT CHARSET=${tableInfo.charset} COLLATE=${tableInfo.collation}`;
    
    if (tableInfo.comment) {
      sql += ` COMMENT='${tableInfo.comment}'`;
    }
    
    sql += ';';
    
    return sql;
  }

  /**
   * 生成修改表SQL
   */
  private generateAlterTableSQL(tableName: string, newColumns: any[], oldColumns: any[] = []): string[] {
    const statements = [];
    
    // 简化实现：删除所有列，重新添加列
    // 注意：实际生产中需要更复杂的对比逻辑
    statements.push(`DROP TABLE IF EXISTS \`${tableName}_temp\`;`);
    
    let createTempSQL = `CREATE TABLE \`${tableName}_temp\` (\n`;
    const primaryKeys = [];
    
    newColumns.forEach((column, index) => {
      const columnDef = [];
      columnDef.push(`  \`${column.name}\``);
      columnDef.push(this.getColumnTypeDefinition(column));
      
      if (!column.nullable) {
        columnDef.push('NOT NULL');
      }
      
      if (column.defaultValue !== null && column.defaultValue !== '') {
        columnDef.push(`DEFAULT ${this.formatDefaultValue(column.defaultValue, column.type)}`);
      }
      
      if (column.isAutoIncrement) {
        columnDef.push('AUTO_INCREMENT');
      }
      
      if (column.comment) {
        columnDef.push(`COMMENT '${column.comment}'`);
      }
      
      createTempSQL += columnDef.join(' ');
      
      if (index < newColumns.length - 1) {
        createTempSQL += ',\n';
      }
      
      if (column.isPrimary) {
        primaryKeys.push(column.name);
      }
    });
    
    if (primaryKeys.length > 0) {
      createTempSQL += `,\n  PRIMARY KEY (\`${primaryKeys.join('`, `')}\`)`;
    }
    
    createTempSQL += '\n);';
    statements.push(createTempSQL);
    
    // 复制数据和重命名
    statements.push(`INSERT INTO \`${tableName}_temp\` SELECT * FROM \`${tableName}\`;`);
    statements.push(`DROP TABLE \`${tableName}\`;`);
    statements.push(`RENAME TABLE \`${tableName}_temp\` TO \`${tableName}\`;`);
    
    return statements;
  }

  /**
   * 生成插入SQL
   */
  private generateInsertSQL(tableName: string, data: any): string {
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    const quotedColumns = columns.map(col => `\`${col}\``).join(', ');
    const quotedValues = values.map(val => this.formatValue(val)).join(', ');
    
    return `INSERT INTO \`${tableName}\` (${quotedColumns}) VALUES (${quotedValues});`;
  }

  /**
   * 生成更新SQL
   */
  private generateUpdateSQL(tableName: string, data: any, where: any): string {
    const setClause = Object.entries(data)
      .map(([key, value]) => `\`${key}\` = ${this.formatValue(value)}`)
      .join(', ');
    
    const whereClause = Object.entries(where)
      .map(([key, value]) => `\`${key}\` = ${this.formatValue(value)}`)
      .join(' AND ');
    
    return `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereClause};`;
  }

  /**
   * 生成删除SQL
   */
  private generateDeleteSQL(tableName: string, where: any): string {
    const whereClause = Object.entries(where)
      .map(([key, value]) => `\`${key}\` = ${this.formatValue(value)}`)
      .join(' AND ');
    
    return `DELETE FROM \`${tableName}\` WHERE ${whereClause};`;
  }

  /**
   * 获取字段类型定义
   */
  private getColumnTypeDefinition(column: any): string {
    let type = column.type.toUpperCase();
    
    if (this.needsLength(column.type) && column.length) {
      type += `(${column.length})`;
    }
    
    return type;
  }

  /**
   * 判断类型是否需要长度
   */
  private needsLength(type: string): boolean {
    const typesNeedingLength = ['varchar', 'char', 'decimal', 'float', 'double'];
    return typesNeedingLength.some(t => type.startsWith(t));
  }

  /**
   * 格式化默认值
   */
  private formatDefaultValue(value: string, type: string): string {
    if (value === '' || value === null || value === undefined) {
      return 'NULL';
    }
    
    if (this.isNumberType(type) || ['float', 'double', 'decimal'].includes(type)) {
      return value;
    }
    
    // 字符串类型需要加引号
    return `'${value.replace(/'/g, "''")}'`;
  }

  /**
   * 格式化值
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    if (value instanceof Date) {
      return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    
    // 字符串类型需要加引号
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * 判断是否为数字类型
   */
  private isNumberType(type: string): boolean {
    return ['int', 'bigint', 'tinyint', 'smallint', 'mediumint'].includes(type);
  }
}