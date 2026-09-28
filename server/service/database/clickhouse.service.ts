import { DataSource } from 'typeorm';
import { BaseDatabaseService } from './base.service';
import {
  DatabaseEntity,
  TableEntity,
  ColumnEntity,
  IndexEntity,
  ForeignKeyEntity
} from '../../model/database.entity';
import * as fs from 'fs';
import * as path from 'path';
import { ClickHouseConnection } from './clickhouse-connection';

/**
 * ClickHouse数据库服务实现
 * ClickHouse 是列式 OLAP 数据库，使用 HTTP 接口（默认 8123）。
 * 注意：ClickHouse 不支持事务、外键、存储过程，主键通过 ORDER BY 体现。
 */
export class ClickHouseService extends BaseDatabaseService {

  getDatabaseType() {
    return 'clickhouse';
  }

  private escape(value: string): string {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  /**
   * 获取ClickHouse数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    try {
      const result = await (dataSource as any).query(`SHOW DATABASES`);
      return (result || [])
        .map((row: any) => (typeof row === 'string' ? row : row.name))
        .filter((name: string) => name && name !== 'system');
    } catch (error) {
      console.error('获取ClickHouse数据库列表失败:', error);
      return [];
    }
  }

  /**
   * 获取ClickHouse表/视图列表
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    try {
      const result = await (dataSource as any).query(
        `SELECT name, engine, total_rows
         FROM system.tables
         WHERE database = '${this.escape(database)}'
         ORDER BY name`
      );
      // 各表大小使用独立查询获取：不同 ClickHouse 版本 system.tables 的列名不同
      // （bytes_on_disk / total_bytes 等），获取失败不应影响表列表本身。
      const sizeMap: Record<string, number> = {};
      try {
        const sizes = await (dataSource as any).query(
          `SELECT name, total_bytes FROM system.tables WHERE database = '${this.escape(database)}'`
        );
        (sizes || []).forEach((r: any) => {
          if (r.name != null && r.total_bytes != null) sizeMap[r.name] = Number(r.total_bytes);
        });
      } catch {
        /* 大小列在当前版本不存在，忽略即可 */
      }
      return (result || []).map((row: any) => {
        const engine = (row.engine || '').toUpperCase();
        const isView = engine === 'VIEW' || engine === 'MATERIALIZEDVIEW' || engine === 'LIVEVIEW';
        return {
          name: row.name,
          type: isView ? 'view' : 'table',
          engine: row.engine,
          comment: '',
          rowCount: row.total_rows != null ? Number(row.total_rows) : undefined,
          dataSize: sizeMap[row.name] != null ? sizeMap[row.name] : undefined,
          indexSize: undefined
        };
      });
    } catch (error) {
      console.error('获取ClickHouse表列表失败:', error);
      return [];
    }
  }

  /**
   * 获取表数据（分页）。
   * 必须使用 `库`.`表` 限定名，因为连接默认库可能与目标库不同。
   */
  async getTableData(
    dataSource: DataSource,
    databaseName: string,
    tableName: string,
    page: number = 1,
    pageSize: number = 100,
    where?: string,
    orderBy?: string
  ): Promise<{ data: any[]; total: number }> {
    const qualified = `\`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\``;
    let query = `SELECT * FROM ${qualified}`;
    if (where) query += ` WHERE ${where}`;
    if (orderBy) query += ` ORDER BY ${orderBy}`;
    const offset = (page - 1) * pageSize;
    query += ` LIMIT ${pageSize} OFFSET ${offset}`;

    const data = await (dataSource as any).query(query);

    let countQuery = `SELECT COUNT(*) AS total FROM ${qualified}`;
    if (where) countQuery += ` WHERE ${where}`;
    const countResult = await (dataSource as any).query(countQuery);
    const total = Number((countResult && countResult[0] && countResult[0].total) || 0);

    return { data, total };
  }

  /**
   * 获取ClickHouse列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    try {
      const result = await (dataSource as any).query(
        `SELECT name, type, default_kind, default_expression, comment, is_in_primary_key
         FROM system.columns
         WHERE database = '${this.escape(database)}' AND table = '${this.escape(table)}'
         ORDER BY position`
      );
      return (result || []).map((row: any) => {
        const type: string = row.type || '';
        // ClickHouse 的可空性体现在类型上，如 Nullable(Int32)；system.columns 没有稳定的 is_nullable 列
        const nullable = /nullable\s*\(/i.test(type);
        return {
          name: row.name,
          type,
          nullable,
          defaultValue: row.default_expression || undefined,
          comment: row.comment || '',
          isPrimary: row.is_in_primary_key === 1 || row.is_in_primary_key === true || row.is_in_primary_key === '1',
          isAutoIncrement: false
        };
      });
    } catch (error) {
      console.error('获取ClickHouse列信息失败:', error);
      return [];
    }
  }

  /**
   * 获取ClickHouse索引信息（主键 + 数据跳数索引）
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    try {
      const indexes: IndexEntity[] = [];

      // 主键
      const pkResult = await (dataSource as any).query(
        `SELECT name FROM system.columns
         WHERE database = '${this.escape(database)}' AND table = '${this.escape(table)}' AND is_in_primary_key = 1
         ORDER BY position`
      );
      const pkColumns = (pkResult || []).map((r: any) => r.name);
      if (pkColumns.length > 0) {
        indexes.push({ name: 'primary', type: 'PRIMARY', columns: pkColumns, unique: true });
      }

      // 数据跳数索引（部分版本/视图下该系统表可能不存在，失败时不影响主键结果）
      try {
        const skipResult = await (dataSource as any).query(
          `SELECT name, type, expr, granularity
           FROM system.data_skipping_indexes
           WHERE database = '${this.escape(database)}' AND table = '${this.escape(table)}'`
        );
        for (const row of (skipResult || [])) {
          indexes.push({
            name: row.name,
            type: row.type || 'SKIPPING',
            columns: row.expr ? [row.expr] : [],
            unique: false
          });
        }
      } catch (skipError) {
        console.warn('获取ClickHouse数据跳数索引失败，已忽略:', (skipError as any)?.message || skipError);
      }
      return indexes;
    } catch (error) {
      console.error('获取ClickHouse索引信息失败:', error);
      return [];
    }
  }

  /**
   * ClickHouse不支持外键
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    return [];
  }

  /**
   * 获取ClickHouse数据库大小
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    try {
      const result = await (dataSource as any).query(
        `SELECT COALESCE(sum(total_bytes), 0) as size FROM system.tables WHERE database = '${this.escape(database)}'`
      );
      return Number((result && result[0] && result[0].size) || 0);
    } catch (error) {
      console.error('获取ClickHouse数据库大小失败:', error);
      return 0;
    }
  }

  /**
   * 获取ClickHouse视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    try {
      const result = await (dataSource as any).query(
        `SELECT name, engine, as_select FROM system.tables
         WHERE database = '${this.escape(database)}' AND engine IN ('View', 'MaterializedView', 'LiveView')
         ORDER BY name`
      );
      return (result || []).map((row: any) => ({
        name: row.name,
        comment: '',
        schemaName: database,
        definition: row.as_select || '',
        engine: row.engine
      }));
    } catch (error) {
      console.error('获取ClickHouse视图列表失败:', error);
      return [];
    }
  }

  /**
   * 获取ClickHouse视图定义
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    try {
      const result = await (dataSource as any).query(
        `SELECT as_select FROM system.tables WHERE database = '${this.escape(database)}' AND name = '${this.escape(viewName)}'`
      );
      return (result && result[0] && result[0].as_select) || '';
    } catch (error) {
      console.error('获取ClickHouse视图定义失败:', error);
      return '';
    }
  }

  /**
   * ClickHouse不支持存储过程
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    return [];
  }

  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    throw new Error('ClickHouse不支持存储过程');
  }

  /**
   * 创建ClickHouse数据库
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    await (dataSource as any).query(`CREATE DATABASE IF NOT EXISTS \`${this.escape(databaseName)}\``);
  }

  /**
   * 删除ClickHouse数据库
   */
  async dropDatabase(dataSource: DataSource, databaseName: string): Promise<void> {
    await (dataSource as any).query(`DROP DATABASE IF EXISTS \`${this.escape(databaseName)}\``);
  }

  /**
   * 导出数据库架构
   */
  async exportSchema(dataSource: DataSource, databaseName: string): Promise<string> {
    const tables = await this.getTables(dataSource, databaseName);
    let schemaSql = `-- ClickHouse数据库架构导出 - ${databaseName}\n`;
    schemaSql += `-- 导出时间: ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      try {
        const result = await (dataSource as any).query(`SHOW CREATE TABLE \`${this.escape(databaseName)}\`.\`${this.escape(table.name)}\``);
        const statement = (result && result[0] && (result[0].statement || result[0].create_table_query)) || '';
        schemaSql += `-- 表/视图: ${table.name}\n`;
        schemaSql += `${statement};\n\n`;
      } catch (error: any) {
        schemaSql += `-- 表 ${table.name} 导出失败: ${error?.message || error}\n\n`;
      }
    }

    return schemaSql;
  }

  /**
   * 查看ClickHouse日志（query_log，可能未开启）
   */
  async viewLogs(dataSource: DataSource, database?: string, limit: number = 100): Promise<any[]> {
    try {
      const result = await (dataSource as any).query(
        `SELECT event_time, user, query_kind, query, exception
         FROM system.query_log
         ORDER BY event_time DESC
         LIMIT ${Number(limit) || 100}`
      );
      return result || [];
    } catch (error) {
      console.error('获取ClickHouse日志失败:', error);
      return [{ message: 'ClickHouse日志功能需要开启 query_log（通常仅在配置了 query_log 的集群可用）' }];
    }
  }

  /**
   * 备份ClickHouse数据库
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    try {
      const backupPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'backups');
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `${databaseName}_${timestamp}.sql`);

      // 1) 结构（含视图）
      const schema = await this.exportSchema(dataSource, databaseName);
      fs.writeFileSync(backupFile, schema, 'utf8');

      // 2) 数据（仅普通表，视图无数据）。includeData=false 时仅备份结构
      const includeData = options?.includeData !== false;
      if (includeData) {
        const tables = (await this.getTables(dataSource, databaseName)).filter((t) => t.type === 'table');
        for (const t of tables) {
          await this.appendTableData(dataSource, databaseName, t.name, backupFile);
        }
      }

      return `备份成功：${backupFile}`;
    } catch (error: any) {
      console.error('ClickHouse备份失败:', error);
      throw new Error(`备份失败: ${error?.message || error}`);
    }
  }

  /**
   * 将单表数据以 INSERT 语句追加到备份文件中。
   * 使用 JSONStringsEachRow（见连接封装），UInt64 等大整数以字符串形式安全导出。
   */
  private async appendTableData(
    dataSource: DataSource,
    databaseName: string,
    tableName: string,
    file: string
  ): Promise<void> {
    const columns = await this.getColumns(dataSource, databaseName, tableName);
    const columnNames = columns.map((c) => c.name);
    const colList = columnNames.map((c) => `\`${this.escape(c)}\``).join(', ');

    fs.appendFileSync(file, `\n-- 数据: ${tableName}\n`, 'utf8');

    const batchSize = 10000;
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const query = `SELECT * FROM \`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\` LIMIT ${batchSize} OFFSET ${offset}`;
      const data = await (dataSource as any).query(query);
      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }
      const qualifiedTable = `\`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\``;
      let batch = '';
      for (const row of data) {
        const values = columnNames
          .map((column) => ClickHouseConnection.escapeLiteral(row[column]))
          .join(', ');
        batch += `INSERT INTO ${qualifiedTable} (${colList}) VALUES (${values});\n`;
      }
      fs.appendFileSync(file, batch, 'utf8');
      offset += batchSize;
    }
  }

  /**
   * 将 SQL 文本拆分为语句，正确处理单/双引号、反引号标识符与 -- /* 注释中的分号。
   */
  private static splitSqlStatements(text: string): string[] {
    const statements: string[] = [];
    let cur = '';
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inLineComment) {
        cur += ch;
        if (ch === '\n') inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          i++;
        } else {
          cur += ch;
        }
        continue;
      }
      if (inSingle) {
        cur += ch;
        // ClickHouse 以反斜杠转义单引号（\'），此时引号不结束字符串
        if (ch === '\\' && next !== undefined) {
          cur += next;
          i++;
          continue;
        }
        if (ch === "'") inSingle = false;
        continue;
      }
      if (inDouble) {
        cur += ch;
        if (ch === '"') inDouble = false;
        continue;
      }
      if (inBacktick) {
        cur += ch;
        if (ch === '`') inBacktick = false;
        continue;
      }

      if (ch === '-' && next === '-') {
        inLineComment = true;
        cur += ch;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (ch === "'") {
        inSingle = true;
        cur += ch;
        continue;
      }
      if (ch === '"') {
        inDouble = true;
        cur += ch;
        continue;
      }
      if (ch === '`') {
        inBacktick = true;
        cur += ch;
        continue;
      }
      if (ch === ';') {
        const trimmed = cur.trim();
        if (trimmed) statements.push(trimmed);
        cur = '';
        continue;
      }
      cur += ch;
    }
    const last = cur.trim();
    if (last) statements.push(last);
    return statements;
  }

  /**
   * 恢复ClickHouse数据库
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    try {
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      // 使用引号/注释感知的切分，避免字符串或视图定义中的分号被错误截断
      const statements = ClickHouseService.splitSqlStatements(sqlContent);
      for (const statement of statements) {
        await (dataSource as any).query(statement);
      }
    } catch (error: any) {
      console.error('ClickHouse恢复失败:', error);
      throw new Error(`恢复失败: ${error?.message || error}`);
    }
  }

  /**
   * 导出表数据到 SQL 文件
   */
  async exportTableDataToSQL(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.sql`);

      const columns = await this.getColumns(dataSource, databaseName, tableName);
      const columnNames = columns.map((c) => c.name);

      const header = `-- 表数据导出 - ${tableName}\n` + `-- 导出时间: ${new Date().toISOString()}\n\n`;
      fs.writeFileSync(exportFile, header, 'utf8');

      const batchSize = options?.batchSize || 10000;
      let offset = 0;
      let hasMoreData = true;

      while (hasMoreData) {
        const query = `SELECT * FROM \`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\` LIMIT ${batchSize} OFFSET ${offset}`;
        const data = await (dataSource as any).query(query);

        if (!data || data.length === 0) {
          hasMoreData = false;
          break;
        }

        const qualifiedTable = `\`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\``;
        let batchSql = '';
        for (const row of data) {
          const values = columnNames.map((column) => ClickHouseConnection.escapeLiteral(row[column]));
          batchSql += `INSERT INTO ${qualifiedTable} (${columnNames.map((c) => `\`${this.escape(c)}\``).join(', ')}) VALUES (${values.join(', ')});\n`;
        }

        fs.appendFileSync(exportFile, batchSql, 'utf8');
        offset += batchSize;
        console.log(`ClickHouse导出表数据进度: ${tableName} - 已处理 ${offset} 行`);
      }

      return exportFile;
    } catch (error: any) {
      console.error('ClickHouse导出表数据到SQL失败:', error);
      throw new Error(`导出表数据到SQL失败: ${error?.message || error}`);
    }
  }

  /**
   * 导出表数据到 CSV 文件
   */
  async exportTableDataToCSV(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.csv`);

      const columns = await this.getColumns(dataSource, databaseName, tableName);
      const columnNames = columns.map((c) => c.name);

      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      fs.writeFileSync(exportFile, bom);
      fs.appendFileSync(exportFile, columnNames.map((name) => `"${name}"`).join(',') + '\n', 'utf8');

      const batchSize = options?.batchSize || 10000;
      let offset = 0;
      let hasMoreData = true;

      while (hasMoreData) {
        const query = `SELECT * FROM \`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\` LIMIT ${batchSize} OFFSET ${offset}`;
        const data = await (dataSource as any).query(query);

        if (!data || data.length === 0) {
          hasMoreData = false;
          break;
        }

        let batchCsv = '';
        for (const row of data) {
          const values = columnNames.map((column) => {
            const value = row[column];
            if (value === null || value === undefined) {
              return '';
            } else if (typeof value === 'string') {
              return `"${value.replace(/"/g, '""')}"`;
            } else if (value instanceof Date) {
              return `"${value.toISOString()}"`;
            } else if (typeof value === 'object' && value !== null) {
              try {
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
              } catch {
                return `"${String(value).replace(/"/g, '""')}"`;
              }
            } else {
              return String(value);
            }
          });
          batchCsv += values.join(',') + '\n';
        }

        fs.appendFileSync(exportFile, batchCsv, 'utf8');
        offset += batchSize;
        console.log(`ClickHouse导出表数据到CSV进度: ${tableName} - 已处理 ${offset} 行`);
      }

      return exportFile;
    } catch (error: any) {
      console.error('ClickHouse导出表数据到CSV失败:', error);
      throw new Error(`导出表数据到CSV失败: ${error?.message || error}`);
    }
  }

  /**
   * 导出表数据到 JSON 文件
   */
  async exportTableDataToJSON(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.json`);

      const batchSize = options?.batchSize || 10000;
      let offset = 0;
      let hasMoreData = true;
      let allData: any[] = [];

      while (hasMoreData) {
        const query = `SELECT * FROM \`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\` LIMIT ${batchSize} OFFSET ${offset}`;
        const data = await (dataSource as any).query(query);

        if (!data || data.length === 0) {
          hasMoreData = false;
          break;
        }

        allData = allData.concat(data);
        offset += batchSize;
        console.log(`ClickHouse导出表数据到JSON进度: ${tableName} - 已处理 ${offset} 行`);
      }

      fs.writeFileSync(exportFile, JSON.stringify(allData, null, 2), 'utf8');
      return exportFile;
    } catch (error: any) {
      console.error('ClickHouse导出表数据到JSON失败:', error);
      throw new Error(`导出表数据到JSON失败: ${error?.message || error}`);
    }
  }

  /**
   * 导出表数据到 Excel 文件
   */
  async exportTableDataToExcel(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.xlsx`);

      const columns = await this.getColumns(dataSource, databaseName, tableName);
      const columnNames = columns.map((c) => c.name);

      const batchSize = options?.batchSize || 10000;
      let offset = 0;
      let hasMoreData = true;
      let allData: any[] = [];

      while (hasMoreData) {
        const query = `SELECT * FROM \`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\` LIMIT ${batchSize} OFFSET ${offset}`;
        const data = await (dataSource as any).query(query);

        if (!data || data.length === 0) {
          hasMoreData = false;
          break;
        }

        allData = allData.concat(data);
        offset += batchSize;
        console.log(`ClickHouse导出表数据到Excel进度: ${tableName} - 已处理 ${offset} 行`);
      }

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(tableName);

      worksheet.columns = columnNames.map((name) => ({ header: name, key: name }));
      worksheet.addRows(allData);

      await workbook.xlsx.writeFile(exportFile);
      return exportFile;
    } catch (error: any) {
      console.error('ClickHouse导出表数据到Excel失败:', error);
      throw new Error(`导出表数据到Excel失败: ${error?.message || error}`);
    }
  }

  /**
   * ClickHouse使用反引号作为标识符
   */
  public quoteIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  /**
   * 解析列类型：可空且类型本身不是 Nullable(...) 时包装 Nullable；
   * 不附加 NOT NULL，避免与 Nullable(...) 冲突（ClickHouse 默认即非空）。
   */
  private resolveColumnType(column: any): string {
    const type: string = column.type || 'String';
    if (column.nullable && !/nullable\s*\(/i.test(type)) {
      return `Nullable(${type})`;
    }
    return type;
  }

  /**
   * 修改表结构
   * ClickHouse支持 ADD/MODIFY/DROP/COMMENT COLUMN，但不支持事务。
   */
  async alterTable(dataSource: DataSource, databaseName: string, tableDiff: any): Promise<any> {
    try {
      const tableName = tableDiff.tableName;
      const qualified = `\`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\``;
      const sqlStatements: string[] = [];

      // 添加新列
      (tableDiff.addedColumns || []).forEach((column: any) => {
        let columnSQL = `ALTER TABLE ${qualified} ADD COLUMN \`${this.escape(column.name)}\` ${this.resolveColumnType(column)}`;
        if (column.defaultValue) {
          const upperDefault = column.defaultValue.toString().toUpperCase();
          if (['CURRENT_TIMESTAMP', 'NOW()', 'TODAY()'].includes(upperDefault)) {
            columnSQL += ` DEFAULT ${upperDefault}`;
          } else {
            columnSQL += ` DEFAULT ${ClickHouseConnection.escapeLiteral(column.defaultValue)}`;
          }
        }
        columnSQL += ';';
        sqlStatements.push(columnSQL);
        if (column.comment) {
          sqlStatements.push(`ALTER TABLE ${qualified} COMMENT COLUMN \`${this.escape(column.name)}\` '${this.escape(column.comment)}';`);
        }
      });

      // 修改列
      (tableDiff.modifiedColumns || []).forEach((modification: any) => {
        const { newColumn } = modification;
        sqlStatements.push(`ALTER TABLE ${qualified} MODIFY COLUMN \`${this.escape(newColumn.name)}\` ${this.resolveColumnType(newColumn)};`);
        if (newColumn.comment) {
          sqlStatements.push(`ALTER TABLE ${qualified} COMMENT COLUMN \`${this.escape(newColumn.name)}\` '${this.escape(newColumn.comment)}';`);
        }
      });

      // 删除列
      (tableDiff.deletedColumns || []).forEach((column: any) => {
        sqlStatements.push(`ALTER TABLE ${qualified} DROP COLUMN \`${this.escape(column.name)}\`;`);
      });

      for (const statement of sqlStatements) {
        await (dataSource as any).query(statement);
      }

      return { ret: 0, message: '表结构修改成功' };
    } catch (error: any) {
      console.error('ClickHouse修改表结构失败:', error);
      return { ret: 1, message: `修改表结构失败: ${error?.message || error}` };
    }
  }

  /**
   * 批量插入数据
   */
  async bulkInsert(dataSource: DataSource, databaseName: string, tableName: string, data: any[]): Promise<void> {
    if (!data || data.length === 0) return;

    const columns = Object.keys(data[0]);
    const rowsSql = data.map((row) =>
      `(${columns.map((column) => ClickHouseConnection.escapeLiteral(row[column])).join(', ')})`
    ).join(', ');

    const sql = `INSERT INTO \`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\` (${columns.map((c) => `\`${this.escape(c)}\``).join(', ')}) VALUES ${rowsSql}`;
    await (dataSource as any).query(sql);
  }

  /**
   * 插入单条数据
   */
  async insertData(dataSource: DataSource, databaseName: string, tableName: string, data: any): Promise<void> {
    const columns = Object.keys(data);
    const values = columns.map((column) => ClickHouseConnection.escapeLiteral(data[column]));
    const sql = `INSERT INTO \`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\` (${columns.map((c) => `\`${this.escape(c)}\``).join(', ')}) VALUES (${values.join(', ')})`;
    await (dataSource as any).query(sql);
  }

  /**
   * 删除表
   */
  async dropTable(dataSource: DataSource, databaseName: string, tableName: string): Promise<void> {
    await (dataSource as any).query(`DROP TABLE IF EXISTS \`${this.escape(databaseName)}\`.\`${this.escape(tableName)}\``);
  }

  /**
   * 创建表
   * ClickHouse要求指定 ENGINE，默认使用 MergeTree。
   */
  async createTable(dataSource: DataSource, databaseName: string, table: any): Promise<void> {
    const { name, columns, comment } = table;
    const qualified = `\`${this.escape(databaseName)}\`.\`${this.escape(name)}\``;

    const primaryKeys: string[] = [];
    const columnDefs: string[] = [];

    (columns || []).forEach((column: any) => {
      const type: string = column.type || 'String';
      let columnDef = `  \`${this.escape(column.name)}\` ${type}`;
      // 仅当列可空且类型本身不是 Nullable(...) 时才包装 Nullable，避免 NOT NULL 与 Nullable 冲突
      const isAlreadyNullable = /nullable\s*\(/i.test(type);
      if (column.nullable && !isAlreadyNullable) {
        columnDef = `  \`${this.escape(column.name)}\` Nullable(${type})`;
      }
      if (column.defaultValue) {
        const upperDefault = column.defaultValue.toString().toUpperCase();
        if (['CURRENT_TIMESTAMP', 'NOW()', 'TODAY()'].includes(upperDefault)) {
          columnDef += ` DEFAULT ${upperDefault}`;
        } else {
          columnDef += ` DEFAULT ${ClickHouseConnection.escapeLiteral(column.defaultValue)}`;
        }
      }
      if (column.isPrimary) {
        primaryKeys.push(`\`${this.escape(column.name)}\``);
      }
      if (column.comment) {
        columnDef += ` COMMENT '${this.escape(column.comment)}'`;
      }
      columnDefs.push(columnDef);
    });

    let sql = `CREATE TABLE IF NOT EXISTS ${qualified} (\n${columnDefs.join(',\n')}\n) ENGINE = MergeTree()`;
    // ClickHouse 中 PRIMARY KEY/ORDER BY 必须位于 ENGINE 之后；主键默认等于 ORDER BY，这里只保留 ORDER BY
    sql += primaryKeys.length > 0 ? ` ORDER BY (${primaryKeys.join(', ')})` : ' ORDER BY tuple()';
    if (comment) {
      sql += ` COMMENT '${this.escape(comment)}'`;
    }
    sql += ';';

    await (dataSource as any).query(sql);
  }
}
