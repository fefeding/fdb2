import type { Connect } from "vite";
import * as http from "node:http";
import * as url from "node:url";
import { ConnectionService } from './service/connection.service';
import { DatabaseService } from './service/database/database.service';

// 初始化服务实例
const connectionService = new ConnectionService();
const databaseService = new DatabaseService();

// 响应助手函数
function sendJSON(res: http.ServerResponse, data: any, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ret: 0, msg: 'success', data }));
}

function sendError(res: http.ServerResponse, message: string, statusCode = 500) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ret: statusCode, msg: message }));
}

// 获取POST请求体
async function getRequestBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 路由处理函数
export default async function route(req: Connect.IncomingMessage, res: http.ServerResponse, next: Connect.NextFunction) {
  try {
    if (!req.url?.startsWith('/api/')) {
      return next();
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method?.toLowerCase();

    // 统一处理为POST请求
    if (method !== 'post') {
      return sendError(res, 'Only POST method is allowed', 405);
    }

    const body = await getRequestBody(req);
    const pathParts = pathname.split('/').filter(Boolean);

    // 路由分发
    if (pathname.startsWith('/api/database/')) {
      await handleDatabaseRoutes(pathname, pathParts, body, res);
    } else {
      sendError(res, 'API not found', 404);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    sendError(res, error.message || 'Internal server error', 500);
  }
}

// 数据库相关路由处理
async function handleDatabaseRoutes(pathname: string, pathParts: string[], body: any, res: http.ServerResponse) {
  // /api/database/getConnections
  if (pathname === '/api/database/getConnections') {
    const result = await connectionService.getAllConnections();
    return sendJSON(res, result);
  }

  // /api/database/getConnection
  if (pathname === '/api/database/getConnection') {
    const { id } = body;
    if (!id) return sendError(res, 'Missing parameter: id');
    const result = await connectionService.getConnectionById(id);
    return sendJSON(res, result);
  }

  // /api/database/addConnection
  if (pathname === '/api/database/addConnection') {
    const result = await connectionService.addConnection(body);
    return sendJSON(res, result);
  }

  // /api/database/updateConnection
  if (pathname === '/api/database/updateConnection') {
    const { id, ...updates } = body;
    if (!id) return sendError(res, 'Missing parameter: id');
    const result = await connectionService.updateConnection(id, updates);
    return sendJSON(res, result);
  }

  // /api/database/deleteConnection
  if (pathname === '/api/database/deleteConnection') {
    const { id } = body;
    if (!id) return sendError(res, 'Missing parameter: id');
    await connectionService.deleteConnection(id);
    return sendJSON(res, true);
  }

  // /api/database/testConnection
  if (pathname === '/api/database/testConnection') {
    const result = await connectionService.testConnection(body);
    return sendJSON(res, result);
  }

  // /api/database/getDatabases
  if (pathname === '/api/database/getDatabases') {
    const { id } = body;
    if (!id) return sendError(res, 'Missing parameter: id');
    const result = await databaseService.getDatabases(id);
    return sendJSON(res, result);
  }

  // /api/database/getDatabaseInfo
  if (pathname === '/api/database/getDatabaseInfo') {
    const { id, database } = body;
    if (!id || !database) return sendError(res, 'Missing parameters: id, database');
    const result = await databaseService.getDatabaseInfo(id, database);
    return sendJSON(res, result);
  }

  // /api/database/getTables
  if (pathname === '/api/database/getTables') {
    const { id, database } = body;
    if (!id || !database) return sendError(res, 'Missing parameters: id, database');
    const result = await databaseService.getTables(id, database);
    return sendJSON(res, result);
  }

  // /api/database/getTableInfo
  if (pathname === '/api/database/getTableInfo') {
    const { id, database, table } = body;
    if (!id || !database || !table) return sendError(res, 'Missing parameters: id, database, table');
    const result = await databaseService.getTableInfo(id, database, table);
    return sendJSON(res, result);
  }

  // /api/database/getTableData
  if (pathname === '/api/database/getTableData') {
    const { id, database, table, page = 1, pageSize = 100, where, orderBy } = body;
    if (!id || !database || !table) return sendError(res, 'Missing parameters: id, database, table');
    const result = await databaseService.getTableData(id, database, table, page, pageSize, where, orderBy);
    return sendJSON(res, result);
  }

  // /api/database/executeQuery
  if (pathname === '/api/database/executeQuery') {
    const { id, sql, database } = body;
    if (!id || !sql) return sendError(res, 'Missing parameters: id, sql');
    if (!sql.trim()) return sendError(res, 'SQL语句不能为空');
    const result = await databaseService.executeQuery(id, sql, database);
    return sendJSON(res, result);
  }

  // /api/database/closeConnection
  if (pathname === '/api/database/closeConnection') {
    const { id } = body;
    if (!id) return sendError(res, 'Missing parameter: id');
    await connectionService.closeConnection(id);
    await connectionService.closeAllConnectionsForId(id);
    return sendJSON(res, true);
  }

  // /api/database/getSupportedDatabaseTypes
  if (pathname === '/api/database/getSupportedDatabaseTypes') {
    const types = databaseService.getSupportedDatabaseTypes();
    return sendJSON(res, types);
  }

  // /api/database/exportTableData
  if (pathname === '/api/database/exportTableData') {
    const { id, database, table, format = 'json', where } = body;
    if (!id || !database || !table) return sendError(res, 'Missing parameters: id, database, table');
    
    // 获取所有数据
    const result = await databaseService.getTableData(id, database, table, 1, 10000, where);

    switch (format.toLowerCase()) {
      case 'json':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.data));
        return;
      case 'csv':
        const csv = convertToCSV(result.data);
        res.writeHead(200, { 'Content-Type': 'text/csv' });
        res.end(csv);
        return;
      default:
        return sendError(res, '不支持的导出格式');
    }
  }

  // /api/database/saveTableStructure
  if (pathname === '/api/database/saveTableStructure') {
    const { id, database, table, columns } = body;
    if (!id || !database || !table || !columns) return sendError(res, 'Missing parameters');
    
    const sql = generateTableSQL(table.name, columns, table);
    const result = await databaseService.executeQuery(id, sql, database);
    return sendJSON(res, { success: true, sql, result });
  }

  // /api/database/alterTable
  if (pathname === '/api/database/alterTable') {
    const { id, database, tableName, columns, oldColumns } = body;
    if (!id || !database || !tableName || !columns) return sendError(res, 'Missing parameters');
    
    const sqlStatements = generateAlterTableSQL(tableName, columns, oldColumns);
    const results = [];
    for (const sql of sqlStatements) {
      const result = await databaseService.executeQuery(id, sql, database);
      results.push({ sql, result });
    }
    return sendJSON(res, { success: true, statements: sqlStatements, results });
  }

  // /api/database/insertData
  if (pathname === '/api/database/insertData') {
    const { id, database, table, data } = body;
    if (!id || !database || !table || !data) return sendError(res, 'Missing parameters');
    
    const sql = generateInsertSQL(table, data);
    const result = await databaseService.executeQuery(id, sql, database);
    return sendJSON(res, { sql, result });
  }

  // /api/database/updateData
  if (pathname === '/api/database/updateData') {
    const { id, database, table, data, where } = body;
    if (!id || !database || !table || !data || !where) return sendError(res, 'Missing parameters');
    
    const sql = generateUpdateSQL(table, data, where);
    const result = await databaseService.executeQuery(id, sql, database);
    return sendJSON(res, { sql, result });
  }

  // /api/database/deleteData
  if (pathname === '/api/database/deleteData') {
    const { id, database, table, where } = body;
    if (!id || !database || !table || !where) return sendError(res, 'Missing parameters');
    
    const sql = generateDeleteSQL(table, where);
    const result = await databaseService.executeQuery(id, sql, database);
    return sendJSON(res, { success: true, sql, result });
  }

  return sendError(res, 'API endpoint not found', 404);
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
  
  const primaryKeys = [];
  
  columns.forEach((column, index) => {
    const columnDef = [];
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
  const statements = [];
  
  // 简化实现：删除所有列，重新添加列
  // 注意：实际生产中需要更复杂的对比逻辑
  statements.push(`DROP TABLE IF EXISTS \`${tableName}_temp\`;`);
  
  let createTempSQL = `CREATE TABLE \`${tableName}_temp\` (\n`;
  const primaryKeys = [];
  
  newColumns.forEach((column, index) => {
    const columnDef = [];
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
  
  // 字符串类型需要加引号
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isNumberType(type: string): boolean {
  return ['int', 'bigint', 'tinyint', 'smallint', 'mediumint'].includes(type);
}