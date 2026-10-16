import * as http from "node:http";
import { ConnectionService } from './service/connection.service';
import { DatabaseService } from './service/database/database.service';

// 初始化服务实例
const connectionService = new ConnectionService();
const databaseService = new DatabaseService();


// 数据库相关路由处理
export async function handleDatabaseRoutes(pathname: string, body: any) {
  try {
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

    // /api/database/refreshTableCache（手动全量拉取表列表，忽略预览缓存）
    if (pathname === '/api/database/refreshTableCache') {
      const { id, database } = body;
      if (!id || !database) throw Error('Missing parameters');

      const result = await databaseService.refreshTableCache(id, database);
      return result;
    }

    // /api/database/previewCreateTable（纯计算：目标态 TableSpec -> 建表 DDL 与方言能力）
    if (pathname === '/api/database/previewCreateTable') {
      const { id, database, spec } = body;
      if (!id || !database || !spec) throw Error('Missing parameters');

      const result = await databaseService.previewCreateTable(id, database, spec);
      return result;
    }

    // /api/database/executeCreateTable（执行：后端检测重名后生成并执行建表语句）
    if (pathname === '/api/database/executeCreateTable') {
      const { id, database, spec } = body;
      if (!id || !database || !spec) throw Error('Missing parameters');

      const result = await databaseService.executeCreateTable(id, database, spec);
      return result;
    }

    // /api/database/previewAlterTable（纯计算：目标态 TableSpec -> DDL 语句与变更集）
    if (pathname === '/api/database/previewAlterTable') {
      const { id, database, tableName, spec } = body;
      if (!id || !database || !tableName || !spec) throw Error('Missing parameters');

      const result = await databaseService.previewAlterTable(id, database, tableName, spec);
      return result;
    }

    // /api/database/executeAlterTable（执行：后端重读实时结构生成并执行，所见即所得）
    if (pathname === '/api/database/executeAlterTable') {
      const { id, database, tableName, spec } = body;
      if (!id || !database || !tableName || !spec) throw Error('Missing parameters');

      const result = await databaseService.executeAlterTable(id, database, tableName, spec);
      return result;
    }

    // /api/database/syncTable
    if (pathname === '/api/database/syncTable') {
      const { id, syncConfig } = body;
      if (!id || !syncConfig) throw Error('Missing parameters');

      const result = await databaseService.syncTable(id, syncConfig);
      return result;
    }

    // /api/database/insertData
    if (pathname === '/api/database/insertData') {
      const { id, database, table, data } = body;
      if (!id || !database || !table || !data) throw Error('Missing parameters');

      // 获取数据库服务实例以使用正确的语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);

      // 获取表的列信息，用于过滤自增字段
      const columns = await dbService.getColumns(dataSource, database, table);

      const sql = generateInsertSQL(dataSource.options.type as string, table, data, dbService, columns);
      const result = await databaseService.executeQuery(id, sql, database);
      return { sql, result };
    }

    // /api/database/updateData
    if (pathname === '/api/database/updateData') {
      const { id, database, table, data, where } = body;
      if (!id || !database || !table || !data || !where) throw Error('Missing parameters');

      // 获取数据库服务实例以使用正确的语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);

      const sql = generateUpdateSQL(dataSource.options.type as string, table, data, where, dbService);
      const result = await databaseService.executeQuery(id, sql, database);
      return { sql, result };
    }

    // /api/database/deleteData
    if (pathname === '/api/database/deleteData') {
      const { id, database, table, where } = body;
      if (!id || !database || !table || !where) throw Error('Missing parameters');

      // 获取数据库服务实例以使用正确的语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);

      const sql = generateDeleteSQL(dataSource.options.type as string, table, where, dbService);
      const result = await databaseService.executeQuery(id, sql, database);
      return { success: true, sql, result };
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
      // 防御：若传入的已是完整 CREATE VIEW 语句（SQLite/Oracle 的 getViewDefinition 形态），
      // 直接执行，避免拼成 `CREATE VIEW v AS CREATE VIEW v AS ...`
      const def = String(definition).trim();
      const isFullCreate = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:ALGORITHM\s*=\s*\w+\s+)?VIEW\s/is.test(def);
      const sql = isFullCreate ? def : `CREATE VIEW ${dbService['quoteIdentifier'](viewName)} AS ${def}`;
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
  catch (error: any) {
    if (error?.detail) error.message += ' ' + error.detail;
    throw error;
  }
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


function generateInsertSQL(dbType: string, tableName: string, data: any, dbService: any, columns?: any[]): string {
  // 如果提供了列信息，过滤掉自增字段
  let filteredData = data;
  if (columns && columns.length > 0) {
    filteredData = {};
    Object.keys(data).forEach(key => {
      const column = columns.find((col: any) => col.name === key);
      // 如果列存在且不是自增字段，则包含在 INSERT 语句中
      if (!column || !column.isAutoIncrement) {
        filteredData[key] = data[key];
      }
    });
  }

  const columnNames = Object.keys(filteredData);
  const values = Object.values(filteredData);

  const quotedColumns = columnNames.map(col => dbService.quoteIdentifier(col)).join(', ');
  const quotedValues = values.map(val => formatValue(dbType, val)).join(', ');

  return `INSERT INTO ${dbService.quoteIdentifier(tableName)} (${quotedColumns}) VALUES (${quotedValues});`;
}

function generateUpdateSQL(dbType: string, tableName: string, data: any, where: any, dbService: any): string {
  const setClause = Object.entries(data)
    .map(([key, value]) => `${dbService.quoteIdentifier(key)} = ${formatValue(dbType, value)}`)
    .join(', ');

  const whereClause = Object.entries(where)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return `${dbService.quoteIdentifier(key)} IS NULL`;
      }
      return `${dbService.quoteIdentifier(key)} = ${formatValue(dbType, value)}`;
    })
    .join(' AND ');

  return `UPDATE ${dbService.quoteIdentifier(tableName)} SET ${setClause} WHERE ${whereClause};`;
}

function generateDeleteSQL(dbType: string, tableName: string, where: any, dbService: any): string {
  const whereClause = Object.entries(where)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return `${dbService.quoteIdentifier(key)} IS NULL`;
      }
      return `${dbService.quoteIdentifier(key)} = ${formatValue(dbType, value)}`;
    })
    .join(' AND ');

  return `DELETE FROM ${dbService.quoteIdentifier(tableName)} WHERE ${whereClause};`;
}

function formatValue(dbType: string, value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    if (dbType === 'postgres' || dbType === 'postgresql') {
      return `'${value.toISOString()}'`;
    } else if (dbType === 'sqlite') {
      return `'${value.toISOString()}'`;
    } else if (dbType === 'mssql') {
      return `'${value.toISOString()}'`;
    } else {
      return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
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

  // 处理字符串（包括空字符串 ''）
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isNumberType(type: string): boolean {
  return ['int', 'bigint', 'tinyint', 'smallint', 'mediumint'].includes(type);
}