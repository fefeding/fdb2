import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { BaseDatabaseService } from './base.service';
import { 
  TableEntity, 
  ColumnEntity, 
  IndexEntity, 
  ForeignKeyEntity 
} from '../../model/database.entity';

/**
 * SQL Server数据库服务实现
 */
export class SQLServerService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'mssql';
  }

  /**
   * 获取SQL Server数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    const result = await dataSource.query(`
      SELECT name 
      FROM sys.databases 
      WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
        AND state = 0
      ORDER BY name
    `);
    return result.map((row: any) => row.name);
  }

  /**
   * 获取SQL Server表列表
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        t.name,
        'BASE TABLE' as type,
        p.rows as rowCount,
        SUM(a.total_pages) * 8 * 1024 as dataSize
      FROM ${this.quoteIdentifier(database)}.sys.tables t
      INNER JOIN ${this.quoteIdentifier(database)}.sys.partitions p ON t.object_id = p.object_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.allocation_units a ON p.partition_id = a.container_id
      WHERE t.is_ms_shipped = 0
        AND p.index_id IN (0, 1)
      GROUP BY t.name, p.rows
      ORDER BY t.name
    `);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      rowCount: row.rowCount || 0,
      dataSize: row.dataSize || 0,
      indexSize: 0 // SQL Server索引大小计算较复杂，这里简化处理
    }));
  }

  /**
   * 获取SQL Server列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    // 使用兼容的SQL查询，避免使用可能不兼容的函数
    const result = await dataSource.query(`
      SELECT 
        c.name,
        t.name as type,
        c.max_length as length,
        c.precision,
        c.scale,
        c.is_nullable as nullable,
        c.default_object_id,
        COLUMNPROPERTY(c.object_id, c.name, 'IsIdentity') as isIdentity
      FROM ${this.quoteIdentifier(database)}.sys.columns c
      INNER JOIN ${this.quoteIdentifier(database)}.sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID(?)
      ORDER BY c.column_id
    `, [`${database}.${table}`]);

    // 获取主键信息
    const primaryKeys = await this.getPrimaryKeys(dataSource, database, table);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable,
      defaultValue: row.default_object_id ? 'DEFAULT' : null,
      isPrimary: primaryKeys.includes(row.name),
      isAutoIncrement: row.isIdentity === 1,
      length: row.length,
      precision: row.precision,
      scale: row.scale
    }));
  }

  /**
   * 获取SQL Server索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        i.name,
        i.type_desc as type,
        c.name as column,
        i.is_unique as isUnique
      FROM ${this.quoteIdentifier(database)}.sys.indexes i
      INNER JOIN ${this.quoteIdentifier(database)}.sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE i.object_id = OBJECT_ID(?)
        AND i.is_primary_key = 0
      ORDER BY i.name, ic.key_ordinal
    `, [`${database}.${table}`]);

    // 按索引名分组
    const indexMap = new Map<string, IndexEntity>();
    result.forEach((row: any) => {
      if (!indexMap.has(row.name)) {
        indexMap.set(row.name, {
          name: row.name,
          type: row.type,
          columns: [],
          unique: row.isUnique
        });
      }
      indexMap.get(row.name)!.columns.push(row.column);
    });

    return Array.from(indexMap.values());
  }

  /**
   * 获取SQL Server外键信息
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        fk.name as name,
        c.name as column,
        rt.name as referencedTable,
        rc.name as referencedColumn,
        fk.delete_action_desc as onDelete,
        fk.update_action_desc as onUpdate
      FROM ${this.quoteIdentifier(database)}.sys.foreign_keys fk
      INNER JOIN ${this.quoteIdentifier(database)}.sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.tables rt ON fkc.referenced_object_id = rt.object_id
      WHERE fkc.parent_object_id = OBJECT_ID(?)
    `, [`${database}.${table}`]);

    return result.map((row: any) => ({
      name: row.name,
      column: row.column,
      referencedTable: row.referencedTable,
      referencedColumn: row.referencedColumn,
      onDelete: row.onDelete,
      onUpdate: row.onUpdate
    }));
  }

  /**
   * 获取SQL Server数据库大小
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    const result = await dataSource.query(`
      SELECT SUM(size * 8 * 1024) as size
      FROM sys.master_files
      WHERE database_id = DB_ID(?)
    `, [database]);
    return result[0]?.size || 0;
  }

  /**
   * 获取主键信息
   */
  private async getPrimaryKeys(dataSource: DataSource, database: string, table: string): Promise<string[]> {
    const result = await dataSource.query(`
      SELECT c.name
      FROM ${this.quoteIdentifier(database)}.sys.key_constraints k
      INNER JOIN ${this.quoteIdentifier(database)}.sys.index_columns ic ON k.parent_object_id = ic.object_id AND k.unique_index_id = ic.index_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE k.type = 'PK'
        AND k.parent_object_id = OBJECT_ID(?)
      ORDER BY ic.key_ordinal
    `, [`${database}.${table}`]);
    return result.map((row: any) => row.name);
  }

  /**
   * SQL Server的标识符引用方式
   */
  public quoteIdentifier(identifier: string): string {
    return `[${identifier}]`;
  }

  /**
   * 获取SQL Server视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        TABLE_NAME as name,
        '' as comment,
        TABLE_SCHEMA as schemaName
      FROM ${this.quoteIdentifier(database)}.INFORMATION_SCHEMA.VIEWS
      ORDER BY TABLE_NAME
    `);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      schemaName: row.schemaname
    }));
  }

  /**
   * 获取SQL Server视图定义
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT VIEW_DEFINITION as definition
      FROM ${this.quoteIdentifier(database)}.INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_NAME = ?
    `, [viewName]);

    return result[0]?.definition || '';
  }

  /**
   * 获取SQL Server存储过程列表
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        ROUTINE_NAME as name,
        '' as comment,
        ROUTINE_TYPE as type,
        '' as returnType,
        'SQL' as language
      FROM ${this.quoteIdentifier(database)}.INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
      ORDER BY ROUTINE_NAME
    `);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      type: row.type,
      returnType: row.returnType || '',
      language: row.language || 'SQL'
    }));
  }

  /**
   * 获取SQL Server存储过程定义
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT ROUTINE_DEFINITION as definition
      FROM ${this.quoteIdentifier(database)}.INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_NAME = ?
    `, [procedureName]);

    return result[0]?.definition || '';
  }

  /**
   * 创建SQL Server数据库
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    let sql = `CREATE DATABASE ${this.quoteIdentifier(databaseName)}`;
    
    if (options) {
      const clauses = [];
      
      if (options.collation) {
        clauses.push(`COLLATE ${options.collation}`);
      }
      
      if (options.containment) {
        clauses.push(`CONTAINMENT = ${options.containment}`);
      }
      
      if (options.compatibilityLevel) {
        clauses.push(`COMPATIBILITY_LEVEL = ${options.compatibilityLevel}`);
      }
      
      // 添加数据文件配置
      if (options.dataFiles) {
        const fileClauses = options.dataFiles.map((file: any) => {
          let fileClause = `(NAME = '${file.name}', FILENAME = '${file.filename}'`;
          if (file.size) fileClause += `, SIZE = ${file.size}`;
          if (file.maxSize) fileClause += `, MAXSIZE = ${file.maxSize}`;
          if (file.growth) fileClause += `, FILEGROWTH = ${file.growth}`;
          fileClause += ')';
          return fileClause;
        });
        clauses.push(`ON ${fileClauses.join(', ')}`);
      }
      
      // 添加日志文件配置
      if (options.logFiles) {
        const logClauses = options.logFiles.map((log: any) => {
          let logClause = `(NAME = '${log.name}', FILENAME = '${log.filename}'`;
          if (log.size) logClause += `, SIZE = ${log.size}`;
          if (log.maxSize) logClause += `, MAXSIZE = ${log.maxSize}`;
          if (log.growth) logClause += `, FILEGROWTH = ${log.growth}`;
          logClause += ')';
          return logClause;
        });
        clauses.push(`LOG ON ${logClauses.join(', ')}`);
      }
      
      if (clauses.length > 0) {
        sql += ' ' + clauses.join(' ');
      }
    }
    
    await dataSource.query(sql);
  }

  /**
   * 删除SQL Server数据库
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
        if (column.isAutoIncrement) definition += ' IDENTITY(1,1)';
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
        schemaSql += `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(table.name)} (${index.columns.map(col => this.quoteIdentifier(col)).join(', ')});\n`;
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
    // SQL Server查看日志
    try {
      // 尝试查看SQL Server错误日志
      const logs = await dataSource.query(`EXEC xp_readerrorlog 0, 1, NULL, NULL, NULL, NULL, 'DESC'`);
      return logs.slice(0, limit);
    } catch (error) {
      try {
        // 尝试查看SQL Server事务日志
        const logs = await dataSource.query(`SELECT TOP ${limit} * FROM fn_dblog(NULL, NULL)`);
        return logs;
      } catch (e) {
        return [{ message: '无法获取SQL Server日志，请确保具有适当的权限' }];
      }
    }
  }

  /**
   * 备份数据库
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    // SQL Server备份数据库
    try {
      // 使用BACKUP DATABASE命令备份
      const backupPath = options?.path || path.join(__dirname, '..', '..', 'backups');
      
      // 确保备份目录存在
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `${databaseName}_${timestamp}.bak`);
      
      // 执行备份命令
      const backupSql = `BACKUP DATABASE ${this.quoteIdentifier(databaseName)} TO DISK = '${backupFile}' WITH INIT`;
      await dataSource.query(backupSql);
      
      return `备份成功：${backupFile}`;
    } catch (error) {
      console.error('SQL Server备份失败:', error);
      throw new Error(`备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    // SQL Server恢复数据库
    try {
      // 断开所有连接
      await dataSource.query(`ALTER DATABASE ${this.quoteIdentifier(databaseName)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE`);
      
      // 执行恢复命令
      const restoreSql = `RESTORE DATABASE ${this.quoteIdentifier(databaseName)} FROM DISK = '${filePath}' WITH REPLACE`;
      await dataSource.query(restoreSql);
      
      // 恢复多用户模式
      await dataSource.query(`ALTER DATABASE ${this.quoteIdentifier(databaseName)} SET MULTI_USER`);
    } catch (error) {
      console.error('SQL Server恢复失败:', error);
      throw new Error(`恢复失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 SQL 文件
   */
  async exportTableDataToSQL(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', 'exports');
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
        // 分批查询数据（SQL Server 使用 OFFSET FETCH 语法）
        const query = `SELECT * FROM ${this.quoteIdentifier(databaseName)}.${this.quoteIdentifier(tableName)} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${batchSize} ROWS ONLY`;
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
              // SQL Server 使用 BIT 类型，1 表示 true，0 表示 false
              return value ? '1' : '0';
            }
            if (value instanceof Date) {
              // 格式化日期为 SQL Server 兼容格式
              const year = value.getFullYear();
              const month = String(value.getMonth() + 1).padStart(2, '0');
              const day = String(value.getDate()).padStart(2, '0');
              const hours = String(value.getHours()).padStart(2, '0');
              const minutes = String(value.getMinutes()).padStart(2, '0');
              const seconds = String(value.getSeconds()).padStart(2, '0');
              return `'${year}-${month}-${day} ${hours}:${minutes}:${seconds}'`;
            }
            if (typeof value === 'object') {
              // 处理对象类型
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
          
          batchSql += `INSERT INTO ${this.quoteIdentifier(databaseName)}.${this.quoteIdentifier(tableName)} (${columnNames.map(col => this.quoteIdentifier(col)).join(', ')}) VALUES (${values.join(', ')});\n`;
        });
        
        // 追加写入文件
        fs.appendFileSync(exportFile, batchSql, 'utf8');
        
        // 增加偏移量
        offset += batchSize;
        
        // 打印进度信息
        console.log(`SQL Server导出表数据进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('SQL Server导出表数据失败:', error);
      throw new Error(`导出表数据失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 CSV 文件
   */
  async exportTableDataToCSV(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', 'exports');
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
        // 分批查询数据（SQL Server 使用 OFFSET FETCH 语法）
        const query = `SELECT * FROM ${this.quoteIdentifier(databaseName)}.${this.quoteIdentifier(tableName)} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${batchSize} ROWS ONLY`;
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
              // 格式化日期为 SQL Server 兼容格式
              const year = value.getFullYear();
              const month = String(value.getMonth() + 1).padStart(2, '0');
              const day = String(value.getDate()).padStart(2, '0');
              const hours = String(value.getHours()).padStart(2, '0');
              const minutes = String(value.getMinutes()).padStart(2, '0');
              const seconds = String(value.getSeconds()).padStart(2, '0');
              return `"${year}-${month}-${day} ${hours}:${minutes}:${seconds}"`;
            } else if (typeof value === 'object' && value !== null) {
              // 处理对象类型
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
        console.log(`SQL Server导出表数据到CSV进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('SQL Server导出表数据到CSV失败:', error);
      throw new Error(`导出表数据到CSV失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 JSON 文件
   */
  async exportTableDataToJSON(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', 'exports');
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
        // 分批查询数据（SQL Server 使用 OFFSET FETCH 语法）
        const query = `SELECT * FROM ${this.quoteIdentifier(databaseName)}.${this.quoteIdentifier(tableName)} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${batchSize} ROWS ONLY`;
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
        console.log(`SQL Server导出表数据到JSON进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      // 写入 JSON 尾部
      fs.appendFileSync(exportFile, '\n]', 'utf8');
      
      return exportFile;
    } catch (error) {
      console.error('SQL Server导出表数据到JSON失败:', error);
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
      console.error('SQL Server导出表数据到Excel失败:', error);
      throw new Error(`导出表数据到Excel失败: ${error.message}`);
    }
  }
}