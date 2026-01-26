import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { BaseDatabaseService } from './base.service';
import { 
  TableEntity, 
  ColumnEntity, 
  IndexEntity, 
  ForeignKeyEntity 
} from '../../model/database.entity';

/**
 * Oracle数据库服务实现
 */
export class OracleService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'oracle';
  }

  /**
   * 获取Oracle数据库列表（用户schema）
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    const result = await dataSource.query(`
      SELECT username as name 
      FROM all_users 
      WHERE username NOT IN ('SYS', 'SYSTEM', 'XDB', 'OUTLN')
      ORDER BY username
    `);
    return result.map((row: any) => row.name);
  }

  /**
   * 获取Oracle表列表
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        table_name as name,
        'TABLE' as type
      FROM all_tables 
      WHERE owner = ? 
        AND table_name NOT LIKE 'BIN$%'
        AND temporary = 'N'
      ORDER BY table_name
    `, [database.toUpperCase()]);

    // 获取表的统计信息
    const tablesWithStats = [];
    for (const table of result) {
      const stats = await this.getTableStats(dataSource, database, table.name);
      tablesWithStats.push({
        name: table.name,
        type: table.type,
        rowCount: stats.rowCount,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize
      });
    }

    return tablesWithStats;
  }

  /**
   * 获取Oracle列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    // 使用兼容的SQL查询，移除可能不兼容的字段
    const result = await dataSource.query(`
      SELECT 
        column_name as name,
        data_type as type,
        data_length as length,
        nullable as nullable,
        data_default as defaultValue
      FROM all_tab_columns 
      WHERE owner = ? 
        AND table_name = ?
      ORDER BY column_id
    `, [ 
      database.toUpperCase(), 
      table.toUpperCase() 
    ]);

    // 获取主键信息
    const primaryKeys = await this.getPrimaryKeys(dataSource, database, table);

    // 从data_type中解析精度信息
    return result.map((row: any) => {
      const dataType = row.type || '';
      let precision = undefined;
      let scale = undefined;
      
      // 解析DECIMAL(M,D)或NUMBER(M,D)类型的精度
      const decimalMatch = dataType.match(/(DECIMAL|NUMBER)\s*\(\s*(\d+)\s*(,\s*(\d+)\s*)?\s*\)/i);
      if (decimalMatch) {
        precision = parseInt(decimalMatch[2]);
        if (decimalMatch[3]) {
          scale = parseInt(decimalMatch[3].replace(/\D/g, ''));
        }
      }
      
      return {
        name: row.name,
        type: row.type + (row.length ? `(${row.length})` : ''),
        nullable: row.nullable === 'Y',
        defaultValue: row.defaultValue,
        isPrimary: primaryKeys.includes(row.name),
        isAutoIncrement: false, // Oracle不使用自增，使用序列
        length: row.length,
        precision: precision,
        scale: scale
      };
    });
  }

  /**
   * 获取Oracle索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    const result = await dataSource.query(`
      SELECT DISTINCT 
        i.index_name as name,
        DECODE(i.uniqueness, 'UNIQUE', 'UNIQUE INDEX', 'INDEX') as type,
        ic.column_name as column
      FROM all_indexes i
      JOIN all_ind_columns ic ON i.index_name = ic.index_name
      WHERE i.table_owner = ? 
        AND i.table_name = ?
        AND i.index_name NOT IN (SELECT constraint_name 
                               FROM all_constraints 
                               WHERE constraint_type = 'P' 
                               AND table_owner = ?)
      ORDER BY i.index_name, ic.column_position
    `, [ 
      database.toUpperCase(), 
      table.toUpperCase(),
      database.toUpperCase() 
    ]);

    // 按索引名分组
    const indexMap = new Map<string, IndexEntity>();
    result.forEach((row: any) => {
      if (!indexMap.has(row.name)) {
        indexMap.set(row.name, {
          name: row.name,
          type: row.type,
          columns: [],
          unique: row.type.includes('UNIQUE')
        });
      }
      indexMap.get(row.name)!.columns.push(row.column);
    });

    return Array.from(indexMap.values());
  }

  /**
   * 获取Oracle外键信息
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        c.constraint_name as name,
        cc.column_name as column,
        r.table_name as referencedTable,
        rc.column_name as referencedColumn,
        c.delete_rule as onDelete
      FROM all_constraints c
      JOIN all_cons_columns cc ON c.constraint_name = cc.constraint_name
      JOIN all_constraints r ON c.r_constraint_name = r.constraint_name
      JOIN all_cons_columns rc ON r.constraint_name = rc.constraint_name AND cc.position = rc.position
      WHERE c.constraint_type = 'R'
        AND c.owner = ? 
        AND c.table_name = ?
    `, [ 
      database.toUpperCase(), 
      table.toUpperCase() 
    ]);

    return result.map((row: any) => ({
      name: row.name,
      column: row.column,
      referencedTable: row.referencedTable,
      referencedColumn: row.referencedColumn,
      onDelete: row.onDelete || 'NO ACTION',
      onUpdate: 'NO ACTION' // Oracle不支持ON UPDATE
    }));
  }

  /**
   * 获取Oracle数据库大小（用户schema大小）
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    const result = await dataSource.query(`
      SELECT SUM(bytes) as size
      FROM user_segments
    `);
    return result[0]?.size || 0;
  }

  /**
   * 获取表统计信息
   */
  private async getTableStats(dataSource: DataSource, database: string, table: string): Promise<any> {
    try {
      const result = await dataSource.query(`
        SELECT 
          num_rows as rowCount,
          (SELECT SUM(bytes) FROM user_segments WHERE segment_name = ?) as dataSize
        FROM all_tables
        WHERE owner = ? AND table_name = ?
      `, [ 
        table.toUpperCase(),
        database.toUpperCase(), 
        table.toUpperCase() 
      ]);
      
      return {
        rowCount: result[0]?.rowCount || 0,
        dataSize: result[0]?.dataSize || 0,
        indexSize: 0 // Oracle索引大小计算较复杂，这里简化处理
      };
    } catch (error) {
      // 如果没有统计信息，返回默认值
      return {
        rowCount: 0,
        dataSize: 0,
        indexSize: 0
      };
    }
  }

  /**
   * 获取主键信息
   */
  private async getPrimaryKeys(dataSource: DataSource, database: string, table: string): Promise<string[]> {
    const result = await dataSource.query(`
      SELECT column_name
      FROM all_cons_columns cc
      JOIN all_constraints c ON cc.constraint_name = c.constraint_name
      WHERE c.constraint_type = 'P'
        AND c.owner = ? 
        AND c.table_name = ?
      ORDER BY cc.position
    `, [ 
      database.toUpperCase(), 
      table.toUpperCase() 
    ]);
    return result.map((row: any) => row.column_name);
  }

  /**
   * Oracle的标识符引用方式
   */
  public quoteIdentifier(identifier: string): string {
    return `"${identifier.toUpperCase()}"`;
  }

  /**
   * 获取Oracle视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        view_name as name,
        '' as comment
      FROM all_views 
      WHERE owner = ?
      ORDER BY view_name
    `, [database.toUpperCase()]);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      schemaName: database
    }));
  }

  /**
   * 获取Oracle视图定义
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT text as definition
      FROM all_views 
      WHERE owner = ? 
        AND view_name = ?
    `, [database.toUpperCase(), viewName.toUpperCase()]);

    return result[0]?.definition || '';
  }

  /**
   * 获取Oracle存储过程列表
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        object_name as name,
        '' as comment,
        'PROCEDURE' as type,
        '' as returnType,
        'PL/SQL' as language
      FROM all_objects 
      WHERE owner = ? 
        AND object_type IN ('PROCEDURE', 'FUNCTION')
        AND status = 'VALID'
      ORDER BY object_name
    `, [database.toUpperCase()]);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      type: row.type,
      returnType: row.returnType || '',
      language: row.language || 'PL/SQL'
    }));
  }

  /**
   * 获取Oracle存储过程定义
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT text as definition
      FROM all_source 
      WHERE owner = ? 
        AND name = ?
      ORDER BY line
    `, [database.toUpperCase(), procedureName.toUpperCase()]);

    return result.map((row: any) => row.definition).join('\n') || '';
  }

  /**
   * 创建Oracle数据库
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    // Oracle数据库创建比较复杂，通常需要DBA权限
    // 这里提供基本的创建语法
    let sql = `CREATE DATABASE ${this.quoteIdentifier(databaseName)}`;
    
    if (options) {
      const clauses = [];
      
      if (options.user) {
        clauses.push(`USER ${options.user}`);
      }
      
      if (options.password) {
        clauses.push(`IDENTIFIED BY ${options.password}`);
      }
      
      if (options.defaultTablespace) {
        clauses.push(`DEFAULT TABLESPACE ${options.defaultTablespace}`);
      }
      
      if (options.tempTablespace) {
        clauses.push(`TEMPORARY TABLESPACE ${options.tempTablespace}`);
      }
      
      if (options.datafile) {
        clauses.push(`DATAFILE '${options.datafile}'`);
      }
      
      if (options.size) {
        clauses.push(`SIZE ${options.size}`);
      }
      
      if (options.autoExtend) {
        clauses.push(`AUTOEXTEND ON`);
      }
      
      if (clauses.length > 0) {
        sql += ' ' + clauses.join(' ');
      }
    }
    
    await dataSource.query(sql);
  }

  /**
   * 删除Oracle数据库
   */
  async dropDatabase(dataSource: DataSource, databaseName: string): Promise<void> {
    const sql = `DROP DATABASE ${this.quoteIdentifier(databaseName)}`;
    await dataSource.query(sql);
  }

  /**
   * 导出数据库架构
   */
  async exportSchema(dataSource: DataSource, databaseName: string): Promise<string> {
    // 获取所有表
    const tables = await this.getTables(dataSource, databaseName);
    let schemaSql = `-- 数据库架构导出 - ${databaseName}\n`;
    schemaSql += `-- 导出时间: ${new Date().toISOString()}\n\n`;

    // 为每个表生成CREATE TABLE语句
    for (const table of tables) {
      // 获取表结构
      const columns = await this.getColumns(dataSource, databaseName, table.name);
      const indexes = await this.getIndexes(dataSource, databaseName, table.name);
      const foreignKeys = await this.getForeignKeys(dataSource, databaseName, table.name);

      // 生成CREATE TABLE语句
      schemaSql += `-- 表结构: ${table.name}\n`;
      schemaSql += `CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(table.name)} (\n`;

      // 添加列定义
      const columnDefinitions = columns.map(column => {
        let definition = `  ${this.quoteIdentifier(column.name)} ${column.type}`;
        if (!column.nullable) definition += ' NOT NULL';
        if (column.defaultValue !== undefined) {
          definition += ` DEFAULT ${column.defaultValue === null ? 'NULL' : `'${column.defaultValue}'`}`;
        }
        if (column.isAutoIncrement) definition += ' GENERATED ALWAYS AS IDENTITY';
        return definition;
      });

      // 添加主键
      const primaryKeyColumns = columns.filter(column => column.isPrimary);
      if (primaryKeyColumns.length > 0) {
        const primaryKeyNames = primaryKeyColumns.map(column => this.quoteIdentifier(column.name)).join(', ');
        columnDefinitions.push(`  PRIMARY KEY (${primaryKeyNames})`);
      }

      schemaSql += columnDefinitions.join(',\n');
      schemaSql += '\n);\n\n';

      // 添加索引
      for (const index of indexes) {
        if (index.type === 'PRIMARY') continue; // 主键已经在表定义中添加
        schemaSql += `-- 索引: ${index.name} on ${table.name}\n`;
        schemaSql += `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(table.name)} (${index.columns.map(col => this.quoteIdentifier(col)).join(', ')})\n`;
      }

      if (indexes.length > 0) schemaSql += '\n';

      // 添加外键
      for (const foreignKey of foreignKeys) {
        schemaSql += `-- 外键: ${foreignKey.name} on ${table.name}\n`;
        schemaSql += `ALTER TABLE ${this.quoteIdentifier(table.name)} ADD CONSTRAINT ${this.quoteIdentifier(foreignKey.name)} FOREIGN KEY (${this.quoteIdentifier(foreignKey.column)}) REFERENCES ${this.quoteIdentifier(foreignKey.referencedTable)} (${this.quoteIdentifier(foreignKey.referencedColumn)})${foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : ''}${foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : ''};\n`;
      }

      if (foreignKeys.length > 0) schemaSql += '\n';
    }

    return schemaSql;
  }

  /**
   * 查看数据库日志
   */
  async viewLogs(dataSource: DataSource, database?: string, limit: number = 100): Promise<any[]> {
    // Oracle查看日志
    try {
      // 尝试查看Oracle警告日志
      const logs = await dataSource.query(`
        SELECT * FROM v$diag_info WHERE name LIKE '%Log%'
      `);
      return logs;
    } catch (error) {
      try {
        // 尝试查看Oracle系统事件
        const logs = await dataSource.query(`
          SELECT * FROM v$event_name WHERE name LIKE '%log%' LIMIT ${limit}
        `);
        return logs;
      } catch (e) {
        return [{ message: '无法获取Oracle日志，请确保具有适当的权限' }];
      }
    }
  }

  /**
   * 备份数据库
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    // Oracle备份数据库
    try {
      // 使用RMAN命令备份
      const backupPath = options?.path || path.join(__dirname, '..', '..', 'backups');
      
      // 确保备份目录存在
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `${databaseName}_${timestamp}.bkp`);
      
      // 执行RMAN备份命令
      const connectionOptions = dataSource.options as any;
      const host = connectionOptions.host || 'localhost';
      const port = connectionOptions.port || 1521;
      const user = connectionOptions.username;
      const password = connectionOptions.password;
      const serviceName = connectionOptions.database || databaseName;
      
      // 构建RMAN命令
      const rmanCommand = `rman target ${user}/${password}@${host}:${port}/${serviceName} cmdfile=${backupPath}/backup.rman`;
      
      // 创建RMAN命令文件
      const rmanScript = `BACKUP DATABASE TO DISK '${backupFile}';`;
      fs.writeFileSync(path.join(backupPath, 'backup.rman'), rmanScript);
      
      // 执行命令
      execSync(rmanCommand);
      
      return `备份成功：${backupFile}`;
    } catch (error) {
      console.error('Oracle备份失败:', error);
      throw new Error(`备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    // Oracle恢复数据库
    try {
      // 使用RMAN命令恢复
      const backupPath = path.dirname(filePath);
      
      // 执行RMAN恢复命令
      const connectionOptions = dataSource.options as any;
      const host = connectionOptions.host || 'localhost';
      const port = connectionOptions.port || 1521;
      const user = connectionOptions.username;
      const password = connectionOptions.password;
      const serviceName = connectionOptions.database || databaseName;
      
      // 构建RMAN命令
      const rmanCommand = `rman target ${user}/${password}@${host}:${port}/${serviceName} cmdfile=${backupPath}/restore.rman`;
      
      // 创建RMAN命令文件
      const rmanScript = `
SHUTDOWN IMMEDIATE;
STARTUP MOUNT;
RESTORE DATABASE FROM DISK '${filePath}';
RECOVER DATABASE;
ALTER DATABASE OPEN;
`;
      fs.writeFileSync(path.join(backupPath, 'restore.rman'), rmanScript);
      
      // 执行命令
      execSync(rmanCommand);
    } catch (error) {
      console.error('Oracle恢复失败:', error);
      throw new Error(`恢复失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 SQL 文件
   */
  async exportTableDataToSQL(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.sql`);
      
      const columns = await this.getColumns(dataSource, databaseName, tableName);
      const columnNames = columns.map(column => column.name);
      
      // 生成文件头部
      const header = `-- 表数据导出 - ${tableName}\n` +
                    `-- 导出时间: ${new Date().toISOString()}\n\n`;
      fs.writeFileSync(exportFile, header, 'utf8');
      
      // 分批处理数据，避免一次性加载大量数据到内存
      const batchSize = options?.batchSize || 10000; // 每批处理10000行
      let offset = 0;
      let hasMoreData = true;
      
      while (hasMoreData) {
        // 分批查询数据（Oracle 使用 ROWNUM 语法）
        const query = `SELECT * FROM (SELECT a.*, ROWNUM rnum FROM (SELECT * FROM ${this.quoteIdentifier(tableName)}) a WHERE ROWNUM <= ${offset + batchSize}) WHERE rnum > ${offset}`;
        const data = await dataSource.query(query);
        
        if (data.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // 生成当前批次的 INSERT 语句
        let batchSql = '';
        data.forEach((row: any) => {
          const values = columnNames.map(column => {
            const value = row[column];
            if (value === null || value === undefined) return 'NULL';
            if (typeof value === 'string') {
              // 处理字符串，转义单引号
              return `'${value.replace(/'/g, "''")}'`;
            }
            if (typeof value === 'boolean') {
              // Oracle 使用 NUMBER(1) 存储布尔值，1 表示 true，0 表示 false
              return value ? '1' : '0';
            }
            if (value instanceof Date) {
              // 格式化日期为 Oracle 兼容格式
              const year = value.getFullYear();
              const month = String(value.getMonth() + 1).padStart(2, '0');
              const day = String(value.getDate()).padStart(2, '0');
              const hours = String(value.getHours()).padStart(2, '0');
              const minutes = String(value.getMinutes()).padStart(2, '0');
              const seconds = String(value.getSeconds()).padStart(2, '0');
              return `TO_TIMESTAMP('${year}-${month}-${day} ${hours}:${minutes}:${seconds}', 'YYYY-MM-DD HH24:MI:SS')`;
            }
            if (typeof value === 'object') {
              // 处理对象类型，如 CLOB
              try {
                const stringValue = JSON.stringify(value);
                return `'${stringValue.replace(/'/g, "''")}'`;
              } catch {
                return `'${String(value).replace(/'/g, "''")}'`;
              }
            }
            // 其他类型直接转换为字符串
            return String(value);
          });
          batchSql += `INSERT INTO ${this.quoteIdentifier(tableName)} (${columnNames.map(col => this.quoteIdentifier(col)).join(', ')}) VALUES (${values.join(', ')});\n`;
        });
        
        // 追加写入文件
        fs.appendFileSync(exportFile, batchSql, 'utf8');
        
        // 增加偏移量
        offset += batchSize;
        
        // 打印进度信息
        console.log(`Oracle导出表数据进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('Oracle导出表数据失败:', error);
      throw new Error(`导出表数据失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 CSV 文件
   */
  async exportTableDataToCSV(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.csv`);
      
      const columns = await this.getColumns(dataSource, databaseName, tableName);
      const columnNames = columns.map(column => column.name);
      
      // 写入 CSV 头部（包含 UTF-8 BOM）
      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      fs.writeFileSync(exportFile, bom);
      fs.appendFileSync(exportFile, columnNames.map(name => `"${name}"`).join(',') + '\n', 'utf8');
      
      // 分批处理数据，避免一次性加载大量数据到内存
      const batchSize = options?.batchSize || 10000; // 每批处理10000行
      let offset = 0;
      let hasMoreData = true;
      
      while (hasMoreData) {
        // 分批查询数据（Oracle 使用 ROWNUM 语法）
        const query = `SELECT * FROM (SELECT a.*, ROWNUM rnum FROM (SELECT * FROM ${this.quoteIdentifier(tableName)}) a WHERE ROWNUM <= ${offset + batchSize}) WHERE rnum > ${offset}`;
        const data = await dataSource.query(query);
        
        if (data.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // 生成当前批次的 CSV 行
        let batchCsv = '';
        data.forEach((row: any) => {
          const values = columnNames.map(column => {
            const value = row[column];
            if (value === null || value === undefined) {
              return '';
            } else if (typeof value === 'string') {
              // 转义双引号并包裹在双引号中
              return `"${value.replace(/"/g, '""')}"`;
            } else if (value instanceof Date) {
              // 格式化日期为 Oracle 兼容格式
              const year = value.getFullYear();
              const month = String(value.getMonth() + 1).padStart(2, '0');
              const day = String(value.getDate()).padStart(2, '0');
              const hours = String(value.getHours()).padStart(2, '0');
              const minutes = String(value.getMinutes()).padStart(2, '0');
              const seconds = String(value.getSeconds()).padStart(2, '0');
              return `"${year}-${month}-${day} ${hours}:${minutes}:${seconds}"`;
            } else if (typeof value === 'object' && value !== null) {
              // 处理对象类型，如 CLOB
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
        });
        
        // 追加写入文件
        fs.appendFileSync(exportFile, batchCsv, 'utf8');
        
        // 增加偏移量
        offset += batchSize;
        
        // 打印进度信息
        console.log(`Oracle导出表数据到CSV进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('Oracle导出表数据到CSV失败:', error);
      throw new Error(`导出表数据到CSV失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 JSON 文件
   */
  async exportTableDataToJSON(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.json`);
      
      // 写入 JSON 头部
      fs.writeFileSync(exportFile, '[\n', 'utf8');
      
      // 分批处理数据，避免一次性加载大量数据到内存
      const batchSize = options?.batchSize || 10000; // 每批处理10000行
      let offset = 0;
      let hasMoreData = true;
      let isFirstBatch = true;
      
      while (hasMoreData) {
        // 分批查询数据（Oracle 使用 ROWNUM 语法）
        const query = `SELECT * FROM (SELECT a.*, ROWNUM rnum FROM (SELECT * FROM ${this.quoteIdentifier(tableName)}) a WHERE ROWNUM <= ${offset + batchSize}) WHERE rnum > ${offset}`;
        const data = await dataSource.query(query);
        
        if (data.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // 生成当前批次的 JSON 数据
        let batchJson = '';
        data.forEach((row: any, index: number) => {
          if (!isFirstBatch || index > 0) {
            batchJson += ',\n';
          }
          batchJson += JSON.stringify(row);
        });
        
        // 追加写入文件
        fs.appendFileSync(exportFile, batchJson, 'utf8');
        
        // 增加偏移量
        offset += batchSize;
        isFirstBatch = false;
        
        // 打印进度信息
        console.log(`Oracle导出表数据到JSON进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      // 写入 JSON 尾部
      fs.appendFileSync(exportFile, '\n]', 'utf8');
      
      return exportFile;
    } catch (error) {
      console.error('Oracle导出表数据到JSON失败:', error);
      throw new Error(`导出表数据到JSON失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 Excel 文件
   */
  async exportTableDataToExcel(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      // 由于 Excel 文件格式复杂，这里我们先导出为 CSV，然后可以考虑使用库来转换
      // 或者直接调用其他服务来处理 Excel 导出
      return this.exportTableDataToCSV(dataSource, databaseName, tableName, options);
    } catch (error) {
      console.error('Oracle导出表数据到Excel失败:', error);
      throw new Error(`导出表数据到Excel失败: ${error.message}`);
    }
  }
}