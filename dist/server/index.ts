import type { Connect } from "vite";
import * as http from "node:http";
import * as url from "node:url";
import { ConnectionService } from './service/connection.service';
import { DatabaseService } from './service/database/database.service';

// 初始化服务实例
const connectionService = new ConnectionService();
const databaseService = new DatabaseService();


// 数据库相关路由处理
export async function handleDatabaseRoutes(pathname: string, body: any) {
  // /api/database/getConnections
  if (pathname === '/api/database/getConnections') {
    const result = await connectionService.getAllConnections();
    return result;
  }

  // /api/database/getConnection
  if (pathname === '/api/database/getConnection') {
    const { id } = body;
    const result = await connectionService.getConnectionById(id);
    return result;
  }

  // /api/database/addConnection
  if (pathname === '/api/database/addConnection') {
    const result = await connectionService.addConnection(body);
    return result;
  }

  // /api/database/updateConnection
  if (pathname === '/api/database/updateConnection') {
    const { id, ...updates } = body;
    if (!id) throw Error('Missing parameter: id');
    const result = await connectionService.updateConnection(id, updates);
    return result;
  }

  // /api/database/deleteConnection
  if (pathname === '/api/database/deleteConnection') {
    const { id } = body;
    if (!id) throw Error('Missing parameter: id');
    await connectionService.deleteConnection(id);
    return true;
  }

  // /api/database/testConnection
  if (pathname === '/api/database/testConnection') {
    const result = await connectionService.testConnection(body);
    return result;
  }

  // /api/database/getDatabases
  if (pathname === '/api/database/getDatabases') {
    const { id } = body;
    if (!id) throw Error('Missing parameter: id');
    const result = await databaseService.getDatabases(id);
    return result;
  }

  // /api/database/getDatabaseInfo
  if (pathname === '/api/database/getDatabaseInfo') {
    const { id, database } = body;
    if (!id || !database) throw Error('Missing parameters: id, database');
    const result = await databaseService.getDatabaseInfo(id, database);
    return result;
  }

  // /api/database/getTables
  if (pathname === '/api/database/getTables') {
    const { id, database } = body;
    if (!id || !database) throw Error('Missing parameters: id, database');
    const result = await databaseService.getTables(id, database);
    return result;
  }

  // /api/database/getTableInfo
  if (pathname === '/api/database/getTableInfo') {
    const { id, database, table } = body;
    if (!id || !database || !table) throw Error('Missing parameters: id, database, table');
    const result = await databaseService.getTableInfo(id, database, table);
    return result;
  }

  // /api/database/getTableData
  if (pathname === '/api/database/getTableData') {
    const { id, database, table, page = 1, pageSize = 100, where, orderBy } = body;
    if (!id || !database || !table) throw Error('Missing parameters: id, database, table');
    const result = await databaseService.getTableData(id, database, table, page, pageSize, where, orderBy);
    return result;
  }

  // /api/database/executeQuery
  if (pathname === '/api/database/executeQuery') {
    const { id, sql, database } = body;
    if (!id || !sql) throw Error('Missing parameters: id, sql');
    if (!sql.trim()) throw Error('SQL语句不能为空');
    const result = await databaseService.executeQuery(id, sql, database);
    return result;
  }

  // /api/database/closeConnection
  if (pathname === '/api/database/closeConnection') {
    const { id } = body;
    if (!id) throw Error('Missing parameter: id');
    await connectionService.closeConnection(id);
    await connectionService.closeAllConnectionsForId(id);
    return true;
  }

  // /api/database/getSupportedDatabaseTypes
  if (pathname === '/api/database/getSupportedDatabaseTypes') {
    const types = databaseService.getSupportedDatabaseTypes();
    return types;
  }

  // /api/database/createDatabase
  if (pathname === '/api/database/createDatabase') {
    const { id, databaseName, options } = body;
    if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
    await databaseService.createDatabase(id, databaseName, options);
    return { success: true };
  }

  // /api/database/dropDatabase
  if (pathname === '/api/database/dropDatabase') {
    const { id, databaseName } = body;
    if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
    await databaseService.dropDatabase(id, databaseName);
    return { success: true };
  }

  // /api/database/exportSchema
  if (pathname === '/api/database/exportSchema') {
    const { id, databaseName } = body;
    if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
    const schema = await databaseService.exportSchema(id, databaseName);
    return { success: true, schema };
  }

  // /api/database/viewLogs
  if (pathname === '/api/database/viewLogs') {
    const { id, databaseName, limit = 100 } = body;
    if (!id) throw Error('Missing parameter: id');
    const logs = await databaseService.viewLogs(id, databaseName, limit);
    return { success: true, logs };
  }

  // /api/database/backup
  if (pathname === '/api/database/backup') {
    const { id, databaseName, options } = body;
    if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
    const result = await databaseService.backupDatabase(id, databaseName, options);
    return { success: true, result };
  }

  // /api/database/restore
  if (pathname === '/api/database/restore') {
    const { id, databaseName, filePath, options } = body;
    if (!id || !databaseName || !filePath) throw Error('Missing parameters: id, databaseName, filePath');
    await databaseService.restoreDatabase(id, databaseName, filePath, options);
    return { success: true };
  }

  // /api/database/getStats
  if (pathname === '/api/database/getStats') {
    const { id, databaseName } = body;
    if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
    const stats = await databaseService.getDatabaseStats(id, databaseName);
    return { success: true, stats };
  }

  // /api/database/optimize
  if (pathname === '/api/database/optimize') {
    const { id, databaseName } = body;
    if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
    const results = await databaseService.optimizeDatabase(id, databaseName);
    return { success: true, results };
  }

  // /api/database/analyze
  if (pathname === '/api/database/analyze') {
    const { id, databaseName } = body;
    if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
    const results = await databaseService.analyzeTables(id, databaseName);
    return { success: true, results };
  }

  // /api/database/repair
  if (pathname === '/api/database/repair') {
    const { id, databaseName } = body;
    if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
    const results = await databaseService.repairTables(id, databaseName);
    return { success: true, results };
  }

  // /api/database/exportTableData
  if (pathname === '/api/database/exportTableData') {
    const { id, database, table, format = 'json', where } = body;
    if (!id || !database || !table) throw Error('Missing parameters: id, database, table');
    
    // 获取所有数据
    const result = await databaseService.getTableData(id, database, table, 1, 10000, where);
    return result;
  }

  // /api/database/exportTableDataToSQL
  if (pathname === '/api/database/exportTableDataToSQL') {
    const { id, database, table, options } = body;
    if (!id || !database || !table) throw Error('Missing parameters: id, database, table');
    
    // 调用数据库服务导出表数据到SQL文件
    const exportPath = await databaseService.exportTableDataToSQL(id, database, table, options);
    return exportPath;
  }

  // /api/database/exportTableDataToCSV
  if (pathname === '/api/database/exportTableDataToCSV') {
    const { id, database, table, options } = body;
    if (!id || !database || !table) throw Error('Missing parameters: id, database, table');
    
    // 调用数据库服务导出表数据到CSV文件
    const exportPath = await databaseService.exportTableDataToCSV(id, database, table, options);
    return exportPath;
  }

  // /api/database/exportTableDataToJSON
  if (pathname === '/api/database/exportTableDataToJSON') {
    const { id, database, table, options } = body;
    if (!id || !database || !table) throw Error('Missing parameters: id, database, table');
    
    // 调用数据库服务导出表数据到JSON文件
    const exportPath = await databaseService.exportTableDataToJSON(id, database, table, options);
    return exportPath;
  }

  // /api/database/exportTableDataToExcel
  if (pathname === '/api/database/exportTableDataToExcel') {
    const { id, database, table, options } = body;
    if (!id || !database || !table) throw Error('Missing parameters: id, database, table');
    
    // 调用数据库服务导出表数据到Excel文件
    const exportPath = await databaseService.exportTableDataToExcel(id, database, table, options);
    return exportPath;
  }

  // /api/database/saveTableStructure
  if (pathname === '/api/database/saveTableStructure') {
    const { id, database, table, columns } = body;
    if (!id || !database || !table || !columns) throw Error('Missing parameters');
    
    const sql = generateTableSQL(table.name, columns, table);
    const result = await databaseService.executeQuery(id, sql, database);
    return { success: true, sql, result };
  }

  // /api/database/alterTable
  if (pathname === '/api/database/alterTable') {
    const { id, database, tableName, columns, oldColumns } = body;
    if (!id || !database || !tableName || !columns) throw Error('Missing parameters');
    
    const sqlStatements = generateAlterTableSQL(tableName, columns, oldColumns);
    const results = [] as Array<any>;
    for (const sql of sqlStatements) {
      const result = await databaseService.executeQuery(id, sql, database);
      results.push({ sql, result });
    }
    return { success: true, statements: sqlStatements, results };
  }

  // /api/database/insertData
  if (pathname === '/api/database/insertData') {
    const { id, database, table, data } = body;
    if (!id || !database || !table || !data) throw Error('Missing parameters');
    
    const sql = generateInsertSQL(table, data);
    const result = await databaseService.executeQuery(id, sql, database);
    return { sql, result };
  }

  // /api/database/updateData
  if (pathname === '/api/database/updateData') {
    const { id, database, table, data, where } = body;
    if (!id || !database || !table || !data || !where) throw Error('Missing parameters');
    
    const sql = generateUpdateSQL(table, data, where);
    const result = await databaseService.executeQuery(id, sql, database);
    return { sql, result };
  }

  // /api/database/deleteData
  if (pathname === '/api/database/deleteData') {
    const { id, database, table, where } = body;
    if (!id || !database || !table || !where) throw Error('Missing parameters');
    
    const sql = generateDeleteSQL(table, where);
    const result = await databaseService.executeQuery(id, sql, database);
    return  { success: true, sql, result };
  }

  // /api/database/truncateTable/:id/:database/:table
  if (pathname.startsWith('/api/database/truncateTable/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 5) throw Error('Invalid URL format');
    const id = parts[3];
    const database = parts[4];
    const table = parts[5];
    if (!id || !database || !table) throw Error('Missing parameters');
    
    // 使用数据库服务生成正确的TRUNCATE语法
    const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
    const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);
    const sql = `TRUNCATE TABLE ${dbService['quoteIdentifier'](table)}`;
    const result = await databaseService.executeQuery(id, sql, database);
    return { success: true, sql, result };
  }

  // /api/database/dropTable/:id/:database/:table
  if (pathname.startsWith('/api/database/dropTable/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 5) throw Error('Invalid URL format');
    const id = parts[3];
    const database = parts[4];
    const table = parts[5];
    if (!id || !database || !table) throw Error('Missing parameters');
    
    // 使用数据库服务生成正确的DROP语法
    const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
    const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);
    const sql = `DROP TABLE ${dbService['quoteIdentifier'](table)}`;
    const result = await databaseService.executeQuery(id, sql, database);
    return { success: true, sql, result };
  }

  // /api/database/getViews
  if (pathname === '/api/database/getViews') {
    const { id, database } = body;
    if (!id || !database) throw Error('Missing parameters: id, database');
    
    const result = await databaseService.getViews(id, database);
    return result;
  }

  // /api/database/getViewDefinition
  if (pathname === '/api/database/getViewDefinition') {
    const { id, database, viewName } = body;
    if (!id || !database || !viewName) throw Error('Missing parameters: id, database, viewName');
    
    const result = await databaseService.getViewDefinition(id, database, viewName);
    return result;
  }

  // /api/database/createView
  if (pathname === '/api/database/createView') {
    const { id, database, viewName, definition } = body;
    if (!id || !database || !viewName || !definition) throw Error('Missing parameters: id, database, viewName, definition');
    
    // 使用数据库服务生成正确的CREATE VIEW语法
    const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
    const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);
    const sql = `CREATE VIEW ${dbService['quoteIdentifier'](viewName)} AS ${definition}`;
    const result = await databaseService.executeQuery(id, sql, database);
    return { success: true, sql, result };
  }

  // /api/database/dropView
  if (pathname === '/api/database/dropView') {
    const { id, database, viewName } = body;
    if (!id || !database || !viewName) throw Error('Missing parameters: id, database, viewName');
    
    // 使用数据库服务生成正确的DROP VIEW语法
    const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
    const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);
    const sql = `DROP VIEW ${dbService['quoteIdentifier'](viewName)}`;
    const result = await databaseService.executeQuery(id, sql, database);
    return { success: true, sql, result };
  }

  // /api/database/getProcedures
  if (pathname === '/api/database/getProcedures') {
    const { id, database } = body;
    if (!id || !database) throw Error('Missing parameters: id, database');
    
    const result = await databaseService.getProcedures(id, database);
    return result;
  }

  // /api/database/getProcedureDefinition
  if (pathname === '/api/database/getProcedureDefinition') {
    const { id, database, procedureName } = body;
    if (!id || !database || !procedureName) throw Error('Missing parameters: id, database, procedureName');
    
    const result = await databaseService.getProcedureDefinition(id, database, procedureName);
    return result;
  }

   throw Error('API endpoint not found');
}

// 工具函数
function convertToCSV(data: any[]): string {
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

function generateTableSQL(tableName: string, columns: any[], tableInfo: any): string {
  let sql = `CREATE TABLE \`${tableName}\` (\n`;
  
  const primaryKeys = [] as Array<string>;
  
  columns.forEach((column, index) => {
    const columnDef = [] as Array<string>;
    columnDef.push(`  \`${column.name}\``);
    columnDef.push(getColumnTypeDefinition(column));
    
    if (!column.nullable) {
      columnDef.push('NOT NULL');
    }
    
    if (column.defaultValue !== null && column.defaultValue !== '') {
      columnDef.push(`DEFAULT ${formatDefaultValue(column.defaultValue, column.type)}`);
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

function generateAlterTableSQL(tableName: string, newColumns: any[], oldColumns: any[] = []): string[] {
  const statements = [] as Array<string>;
  
  // 简化实现：删除所有列，重新添加列
  // 注意：实际生产中需要更复杂的对比逻辑
  statements.push(`DROP TABLE IF EXISTS \`${tableName}_temp\`;`);
  
  let createTempSQL = `CREATE TABLE \`${tableName}_temp\` (\n`;
  const primaryKeys = [] as Array<string>;
  
  newColumns.forEach((column, index) => {
    const columnDef = [] as Array<string>;
    columnDef.push(`  \`${column.name}\``);
    columnDef.push(getColumnTypeDefinition(column));
    
    if (!column.nullable) {
      columnDef.push('NOT NULL');
    }
    
    if (column.defaultValue !== null && column.defaultValue !== '') {
      columnDef.push(`DEFAULT ${formatDefaultValue(column.defaultValue, column.type)}`);
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

function generateInsertSQL(tableName: string, data: any): string {
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  const quotedColumns = columns.map(col => `\`${col}\``).join(', ');
  const quotedValues = values.map(val => formatValue(val)).join(', ');
  
  return `INSERT INTO \`${tableName}\` (${quotedColumns}) VALUES (${quotedValues});`;
}

function generateUpdateSQL(tableName: string, data: any, where: any): string {
  const setClause = Object.entries(data)
    .map(([key, value]) => `\`${key}\` = ${formatValue(value)}`)
    .join(', ');
  
  const whereClause = Object.entries(where)
    .map(([key, value]) => `\`${key}\` = ${formatValue(value)}`)
    .join(' AND ');
  
  return `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereClause};`;
}

function generateDeleteSQL(tableName: string, where: any): string {
  const whereClause = Object.entries(where)
    .map(([key, value]) => `\`${key}\` = ${formatValue(value)}`)
    .join(' AND ');
  
  return `DELETE FROM \`${tableName}\` WHERE ${whereClause};`;
}

function getColumnTypeDefinition(column: any): string {
  let type = column.type.toUpperCase();
  
  if (needsLength(column.type) && column.length) {
    type += `(${column.length})`;
  }
  
  return type;
}

function needsLength(type: string): boolean {
  const typesNeedingLength = ['varchar', 'char', 'decimal', 'float', 'double'];
  return typesNeedingLength.some(t => type.startsWith(t));
}

function formatDefaultValue(value: string, type: string): string {
  if (value === '' || value === null || value === undefined) {
    return 'NULL';
  }
  
  if (isNumberType(type) || ['float', 'double', 'decimal'].includes(type)) {
    return value;
  }
  
  // 特殊关键字处理
  if (value.toString().toUpperCase() === 'CURRENT_TIMESTAMP' ||
      value.toString().toUpperCase() === 'NOW()' ||
      value.toString().toUpperCase() === 'CURRENT_DATE') {
    return value.toString().toUpperCase();
  }
  
  // 字符串类型需要加引号
  return `'${value.replace(/'/g, "''")}'`;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  
  // 数组或对象类型需要 JSON 序列化
  if (typeof value === 'object' && value !== null) {
    try {
      const jsonStr = JSON.stringify(value);
      return `'${jsonStr.replace(/'/g, "''")}'`;
    } catch (e) {
      // 序列化失败时，作为普通字符串处理
      return `'${String(value).replace(/'/g, "''")}'`;
    }
  }
  
  // 字符串类型需要加引号
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isNumberType(type: string): boolean {
  return ['int', 'bigint', 'tinyint', 'smallint', 'mediumint'].includes(type);
}