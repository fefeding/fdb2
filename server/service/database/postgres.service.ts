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
 * PostgreSQL数据库服务实现
 */
export class PostgreSQLService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'postgres';
  }

  /**
   * 获取PostgreSQL数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    const result = await dataSource.query(`
      SELECT datname as name 
      FROM pg_database 
      WHERE datistemplate = false
    `);
    return result.map((row: any) => row.name);
  }

  /**
   * 获取PostgreSQL表列表
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        t.table_name as name,
        'BASE TABLE' as type,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as rowCount,
        0 as dataSize,
        0 as indexSize,
        '' as collation,
        obj_description(c.oid) as comment
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
        AND t.table_type = 'BASE TABLE'
    `);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      rowCount: row.rowcount || 0,
      dataSize: row.datasize || 0,
      indexSize: row.indexsize || 0,
      collation: row.collation,
      comment: row.comment
    }));
  }

  /**
   * 获取PostgreSQL列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    // 使用兼容的SQL查询，移除可能不兼容的精度字段
    const result = await dataSource.query(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as defaultValue,
        character_maximum_length as length
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);

    // 获取主键信息
    const primaryKeys = await this.getPrimaryKeys(dataSource, table);
    
    // 获取 IDENTITY 列信息（PostgreSQL 10+）
    const identityColumns = await this.getIdentityColumns(dataSource, table);

    // 从data_type中解析精度信息
    return result.map((row: any) => {
      const dataType = row.type || '';
      let precision = undefined;
      let scale = undefined;
      
      // 解析DECIMAL(M,D)或NUMERIC(M,D)类型的精度
      const decimalMatch = dataType.match(/(DECIMAL|NUMERIC)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (decimalMatch) {
        precision = parseInt(decimalMatch[2]);
        scale = parseInt(decimalMatch[3]);
      }
      
      // 检查是否为自增列（SERIAL 或 IDENTITY）
      const isAutoIncrement = row.defaultValue?.includes('nextval') || 
                            identityColumns.includes(row.name);
      
      return {
        name: row.name,
        type: row.type,
        nullable: row.nullable === 'YES',
        defaultValue: row.defaultValue,
        isPrimary: primaryKeys.includes(row.name),
        isAutoIncrement: isAutoIncrement,
        length: row.length,
        precision: precision,
        scale: scale
      };
    });
  }

  /**
   * 获取PostgreSQL索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        indexname as name,
        indexdef as definition
      FROM pg_indexes 
      WHERE tablename = $1
    `, [table]);

    return result.map((row: any) => ({
      name: row.name,
      type: 'INDEX',
      columns: [], // 需要解析definition
      unique: row.definition.toLowerCase().includes('unique')
    }));
  }

  /**
   * 获取PostgreSQL外键信息
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        tc.constraint_name as name,
        kcu.column_name as column,
        ccu.table_name as referencedTable,
        ccu.column_name as referencedColumn,
        rc.delete_rule as onDelete
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = $1
    `, [table]);

    return result.map((row: any) => ({
      name: row.name,
      column: row.column,
      referencedTable: row.referencedtable,
      referencedColumn: row.referencedcolumn,
      onDelete: row.ondelete,
      onUpdate: 'NO ACTION'
    }));
  }

  /**
   * 获取PostgreSQL数据库大小
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    const result = await dataSource.query(`
      SELECT pg_database_size($1) as size
    `, [database]);
    return result[0]?.size || 0;
  }

  /**
   * 获取主键信息
   */
  private async getPrimaryKeys(dataSource: DataSource, table: string): Promise<string[]> {
    const result = await dataSource.query(`
      SELECT column_name 
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_name = $1
    `, [table]);
    return result.map((row: any) => row.column_name);
  }

  /**
   * 获取PostgreSQL IDENTITY列信息（PostgreSQL 10+）
   */
  private async getIdentityColumns(dataSource: DataSource, table: string): Promise<string[]> {
    try {
      const result = await dataSource.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
          AND is_identity = 'YES'
      `, [table]);
      return result.map((row: any) => row.column_name);
    } catch (error) {
      // 如果查询失败（PostgreSQL 版本低于 10），返回空数组
      return [];
    }
  }

  /**
   * PostgreSQL使用双引号标识符
   */
  public quoteIdentifier(identifier: string): string {
    return `"${identifier}"`;
  }

  /**
   * 获取PostgreSQL视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        table_name as name,
        COALESCE(obj_description(c.oid), '') as comment,
        table_schema as schemaName
      FROM information_schema.views v
      LEFT JOIN pg_class c ON c.relname = v.table_name
      WHERE v.table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY v.table_name
    `);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      schemaName: row.schemaname
    }));
  }

  /**
   * 获取PostgreSQL视图定义
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT view_definition as definition
      FROM information_schema.views 
      WHERE table_name = $1
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
    `, [viewName]);

    return result[0]?.definition || '';
  }

  /**
   * 获取PostgreSQL存储过程列表
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        routine_name as name,
        '' as comment,
        routine_type as type,
        COALESCE(data_type, '') as returnType,
        external_language as language
      FROM information_schema.routines 
      WHERE routine_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY routine_name
    `);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      type: row.type,
      returnType: row.returntype || '',
      language: row.language || 'SQL'
    }));
  }

  /**
   * 获取PostgreSQL存储过程定义
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT routine_definition as definition
      FROM information_schema.routines 
      WHERE routine_name = $1
        AND routine_schema NOT IN ('information_schema', 'pg_catalog')
    `, [procedureName]);

    return result[0]?.definition || '';
  }

  /**
   * 创建PostgreSQL数据库
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    let sql = `CREATE DATABASE ${this.quoteIdentifier(databaseName)}`;
    
    if (options) {
      const clauses = [];
      
      if (options.owner) {
        clauses.push(`OWNER ${options.owner}`);
      }
      
      if (options.template) {
        clauses.push(`TEMPLATE ${options.template}`);
      }
      
      if (options.encoding) {
        clauses.push(`ENCODING '${options.encoding}'`);
      }
      
      if (options.lcCollate) {
        clauses.push(`LC_COLLATE '${options.lcCollate}'`);
      }
      
      if (options.lcCtype) {
        clauses.push(`LC_CTYPE '${options.lcCtype}'`);
      }
      
      if (options.tablespace) {
        clauses.push(`TABLESPACE ${options.tablespace}`);
      }
      
      if (options.allowConnections !== undefined) {
        clauses.push(`ALLOW_CONNECTIONS ${options.allowConnections}`);
      }
      
      if (options.connectionLimit !== undefined) {
        clauses.push(`CONNECTION LIMIT ${options.connectionLimit}`);
      }
      
      if (clauses.length > 0) {
        sql += ' ' + clauses.join(' ');
      }
    }
    
    await dataSource.query(sql);
  }

  /**
   * 删除PostgreSQL数据库
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
          // 特殊关键字处理
          const upperDefault = column.defaultValue.toString().toUpperCase();
          if (upperDefault === 'CURRENT_TIMESTAMP' || upperDefault === 'NOW()' || upperDefault === 'CURRENT_DATE') {
            definition += ` DEFAULT ${upperDefault}`;
          } else {
            definition += ` DEFAULT ${column.defaultValue === null ? 'NULL' : `'${column.defaultValue}'`}`;
          }
        }
        if (column.isAutoIncrement) definition += ' SERIAL';
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
        if (index.type === 'PRIMARY' || index.name.toUpperCase() === 'PRIMARY') continue; // 跳过主键索引
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
    // PostgreSQL查看日志
    try {
      // 尝试查看PostgreSQL日志设置
      const logs = await dataSource.query(`SELECT name, setting FROM pg_settings WHERE name LIKE '%log%' LIMIT ${limit}`);
      return logs;
    } catch (error) {
      try {
        // 尝试查看最近的连接日志
        const logs = await dataSource.query(`SELECT * FROM pg_stat_activity LIMIT ${limit}`);
        return logs;
      } catch (e) {
        return [{ message: '无法获取PostgreSQL日志，请确保具有适当的权限' }];
      }
    }
  }

  /**
   * 备份数据库
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    // PostgreSQL备份数据库
    try {
      // 使用pg_dump命令备份
      const backupPath = options?.path || path.join(__dirname, '..', '..', 'backups');
      
      // 确保备份目录存在
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `${databaseName}_${timestamp}.sql`);
      
      // 执行备份命令
      const connectionOptions = dataSource.options as any;
      const host = connectionOptions.host || 'localhost';
      const port = connectionOptions.port || 5432;
      const user = connectionOptions.username;
      const password = connectionOptions.password;
      
      // 构建pg_dump命令
      let command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${databaseName} > ${backupFile}`;
      
      // 执行命令
      execSync(command, { env: { ...process.env, PGPASSWORD: password } });
      
      return `备份成功：${backupFile}`;
    } catch (error) {
      console.error('PostgreSQL备份失败:', error);
      throw new Error(`备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    // PostgreSQL恢复数据库
    try {
      // 执行恢复命令
      const connectionOptions = dataSource.options as any;
      const host = connectionOptions.host || 'localhost';
      const port = connectionOptions.port || 5432;
      const user = connectionOptions.username;
      const password = connectionOptions.password;
      
      // 构建psql命令
      let command = `psql -h ${host} -p ${port} -U ${user} -d ${databaseName} -f ${filePath}`;
      
      // 执行命令
      execSync(command, { env: { ...process.env, PGPASSWORD: password } });
    } catch (error) {
      console.error('PostgreSQL恢复失败:', error);
      throw new Error(`恢复失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 SQL 文件
   */
  async exportTableDataToSQL(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      // 创建导出目录
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.sql`);
      
      // 获取表结构
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
        // 分批查询数据
        const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
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
            if (value === null || value === undefined) {
              return 'NULL';
            } else if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            } else if (typeof value === 'boolean') {
              return value ? 'TRUE' : 'FALSE';
            } else if (value instanceof Date) {
              return `'${value.toISOString()}'`;
            } else if (typeof value === 'object' && value !== null) {
              // 处理JSON类型
              try {
                return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
              } catch {
                return `'${String(value).replace(/'/g, "''")}'`;
              }
            } else {
              return String(value);
            }
          });
          
          batchSql += `INSERT INTO ${this.quoteIdentifier(tableName)} (${columnNames.map(col => this.quoteIdentifier(col)).join(', ')}) VALUES (${values.join(', ')});\n`;
        });
        
        // 追加写入文件
        fs.appendFileSync(exportFile, batchSql, 'utf8');
        
        // 增加偏移量
        offset += batchSize;
        
        // 打印进度信息
        console.log(`PostgreSQL导出表数据进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('PostgreSQL导出表数据失败:', error);
      throw new Error(`导出表数据失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 CSV 文件
   */
  async exportTableDataToCSV(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      // 创建导出目录
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.csv`);
      
      // 获取表结构
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
        // 分批查询数据
        const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
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
              return `"${value.toISOString().slice(0, 19).replace('T', ' ')}"`;
            } else if (typeof value === 'object' && value !== null) {
              // 处理JSON类型
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
        console.log(`PostgreSQL导出表数据到CSV进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('PostgreSQL导出表数据到CSV失败:', error);
      throw new Error(`导出表数据到CSV失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 JSON 文件
   */
  async exportTableDataToJSON(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      // 创建导出目录
      const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }
      
      // 生成文件名
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
        // 分批查询数据
        const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
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
        console.log(`PostgreSQL导出表数据到JSON进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      // 写入 JSON 尾部
      fs.appendFileSync(exportFile, '\n]', 'utf8');
      
      return exportFile;
    } catch (error) {
      console.error('PostgreSQL导出表数据到JSON失败:', error);
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
      console.error('PostgreSQL导出表数据到Excel失败:', error);
      throw new Error(`导出表数据到Excel失败: ${error.message}`);
    }
  }
}