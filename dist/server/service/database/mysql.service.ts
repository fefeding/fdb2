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
 * MySQL数据库服务实现
 */
export class MySQLService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'mysql';
  }

  /**
   * 导出表数据到 CSV 文件
   */
  async exportTableDataToCSV(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', 'exports');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.csv`);
      
      const columns = await this.getColumns(dataSource, databaseName, tableName);
      const columnNames = columns.map(column => column.name);
      
      // 写入 CSV 头部
      const header = columnNames.join(',') + '\n';
      fs.writeFileSync(exportFile, '\ufeff' + header, 'utf8');
      
      // 分批处理数据
      const batchSize = options?.batchSize || 10000;
      let offset = 0;
      let hasMoreData = true;
      
      while (hasMoreData) {
        const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
        const data = await dataSource.query(query);
        
        if (data.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // 生成当前批次的 CSV 行
        let batchContent = '';
        data.forEach((row: any) => {
          const values = columnNames.map(column => {
            const value = row[column];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string') {
              const stringValue = String(value);
              if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            }
            if (typeof value === 'object') {
              try {
                const stringValue = JSON.stringify(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                  return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
              } catch {
                return `"${String(value).replace(/"/g, '""')}"`;
              }
            }
            return String(value);
          });
          batchContent += values.join(',') + '\n';
        });
        
        fs.appendFileSync(exportFile, batchContent, 'utf8');
        offset += batchSize;
        console.log(`MySQL导出CSV进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('MySQL导出CSV失败:', error);
      throw new Error(`导出CSV失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 JSON 文件
   */
  async exportTableDataToJSON(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      const exportPath = options?.path || path.join(__dirname, '..', '..', 'exports');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.json`);
      
      const columns = await this.getColumns(dataSource, databaseName, tableName);
      const columnNames = columns.map(column => column.name);
      
      // 分批处理数据，生成 JSON 数组
      const batchSize = options?.batchSize || 10000;
      let offset = 0;
      let hasMoreData = true;
      let isFirstBatch = true;
      
      // 写入 JSON 开始
      fs.writeFileSync(exportFile, '[', 'utf8');
      
      while (hasMoreData) {
        const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
        const data = await dataSource.query(query);
        
        if (data.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // 生成当前批次的 JSON 数据
        let batchContent = '';
        data.forEach((row: any, index: number) => {
          if (!isFirstBatch || index > 0) {
            batchContent += ',';
          }
          batchContent += JSON.stringify(row);
        });
        
        fs.appendFileSync(exportFile, batchContent, 'utf8');
        isFirstBatch = false;
        offset += batchSize;
        console.log(`MySQL导出JSON进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      // 写入 JSON 结束
      fs.appendFileSync(exportFile, ']', 'utf8');
      
      return exportFile;
    } catch (error) {
      console.error('MySQL导出JSON失败:', error);
      throw new Error(`导出JSON失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 Excel 文件
   */
  async exportTableDataToExcel(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      // 由于 Excel 文件需要特殊处理，这里先导出为 CSV，然后在前端转换为 Excel
      // 或者使用专门的库生成 Excel 文件
      // 这里暂时实现为导出为 CSV，后续可以根据需要优化
      return this.exportTableDataToCSV(dataSource, databaseName, tableName, options);
    } catch (error) {
      console.error('MySQL导出Excel失败:', error);
      throw new Error(`导出Excel失败: ${error.message}`);
    }
  }

  /**
   * 获取MySQL数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    const result = await dataSource.query('SHOW DATABASES');
    // 过滤掉系统数据库
    //const systemDatabases = ['information_schema', 'performance_schema', 'mysql', 'sys'];
    return result
      .map((row: any) => row.Database)
      //.filter((db: string) => !systemDatabases.includes(db));
  }

  /**
   * 获取MySQL表列表
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        TABLE_NAME as name,
        TABLE_TYPE as type,
        ENGINE as engine,
        TABLE_ROWS as rowCount,
        DATA_LENGTH as dataSize,
        INDEX_LENGTH as indexSize,
        TABLE_COLLATION as collation,
        CREATE_TIME as createdAt,
        UPDATE_TIME as updatedAt,
        TABLE_COMMENT as comment
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [database]);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      engine: row.engine,
      rowCount: row.rowCount || 0,
      dataSize: row.dataSize || 0,
      indexSize: row.indexSize || 0,
      collation: row.collation,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      comment: row.comment
    }));
  }

  /**
   * 获取MySQL列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    // 使用兼容的SQL查询，避免使用某些MySQL版本不支持的NUMERIC_PRECISION和NUMERIC_SCALE
    const result = await dataSource.query(`
      SELECT 
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as defaultValue,
        COLUMN_KEY as columnKey,
        EXTRA as extra,
        CHARACTER_MAXIMUM_LENGTH as length,
        CHARACTER_SET_NAME as charset,
        COLLATION_NAME as collation,
        COLUMN_COMMENT as comment
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `, [database, table]);

    return result.map((row: any) => {
      // 从COLUMN_TYPE中解析精度信息
      const columnType = row.type || '';
      let precision = undefined;
      let scale = undefined;
      
      // 解析DECIMAL(M,D)或NUMERIC(M,D)类型的精度
      const decimalMatch = columnType.match(/(DECIMAL|NUMERIC)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (decimalMatch) {
        precision = parseInt(decimalMatch[2]);
        scale = parseInt(decimalMatch[3]);
      }
      
      return {
        name: row.name,
        type: row.type,
        nullable: row.nullable === 'YES',
        defaultValue: row.defaultValue,
        isPrimary: row.columnKey === 'PRI',
        isAutoIncrement: row.extra?.includes('auto_increment') || false,
        length: row.length,
        precision: precision,
        scale: scale,
        charset: row.charset,
        collation: row.collation,
        comment: row.comment
      };
    });
  }

  /**
   * 获取MySQL索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    // 使用更兼容的SQL查询，避免使用保留关键字作为别名
    const result = await dataSource.query(`
      SELECT 
        INDEX_NAME as name,
        INDEX_TYPE as type,
        COLUMN_NAME as columnName
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [database, table]);

    // 按索引名分组并判断唯一性
    const indexMap = new Map<string, IndexEntity>();
    result.forEach((row: any) => {
      if (!indexMap.has(row.name)) {
        // 主键索引是唯一的，其他索引需要通过SHOW INDEX查询确定
        let isUnique = false;
        if (row.name === 'PRIMARY') {
          isUnique = true;
        } else {
          // 对于非主键索引，使用更简单的方法：检查索引名称是否包含UNIQUE关键字
          isUnique = row.name.toUpperCase().includes('UNIQUE') || row.type === 'UNIQUE';
        }
        
        indexMap.set(row.name, {
          name: row.name,
          type: row.type,
          columns: [],
          unique: isUnique
        });
      }
      indexMap.get(row.name)!.columns.push(row.columnName);
    });

    return Array.from(indexMap.values());
  }

  /**
   * 获取MySQL外键信息
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        kcu.CONSTRAINT_NAME as name,
        kcu.COLUMN_NAME as columnName,
        kcu.REFERENCED_TABLE_NAME as referencedTable,
        kcu.REFERENCED_COLUMN_NAME as referencedColumn,
        rc.DELETE_RULE as onDelete,
        rc.UPDATE_RULE as onUpdate
      FROM information_schema.KEY_COLUMN_USAGE kcu
      LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc 
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
        AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE kcu.TABLE_SCHEMA = ? 
        AND kcu.TABLE_NAME = ?
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `, [database, table]);

    return result.map((row: any) => ({
      name: row.name,
      column: row.columnName,
      referencedTable: row.referencedTable,
      referencedColumn: row.referencedColumn,
      onDelete: row.onDelete || 'NO ACTION',
      onUpdate: row.onUpdate || 'NO ACTION'
    }));
  }

  /**
   * 获取MySQL数据库大小
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    const result = await dataSource.query(`
      SELECT SUM(data_length + index_length) as size
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [database]);
    return result[0]?.size || 0;
  }

  /**
   * MySQL使用反引号标识符
   */
  public quoteIdentifier(identifier: string): string {
    return `\`${identifier}\``;
  }

  /**
   * 获取MySQL视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    // 完全移除TABLE_COMMENT字段，因为某些MySQL版本中不存在该字段
    const result = await dataSource.query(`
      SELECT 
        TABLE_NAME as name,
        TABLE_SCHEMA as schemaName
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [database]);

    return result.map((row: any) => ({
      name: row.name,
      comment: '',
      schemaName: row.schemaName
    }));
  }

  /**
   * 获取MySQL视图定义
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT VIEW_DEFINITION as definition
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = ?
    `, [database, viewName]);

    return result[0]?.definition || '';
  }

  /**
   * 获取MySQL存储过程列表
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        ROUTINE_NAME as name,
        ROUTINE_TYPE as type,
        ROUTINE_COMMENT as comment
      FROM information_schema.ROUTINES 
      WHERE ROUTINE_SCHEMA = ?
      ORDER BY ROUTINE_NAME
    `, [database]);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      type: row.type,
      returnType: '',
      language: 'SQL'
    }));
  }

  /**
   * 获取MySQL存储过程定义
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT ROUTINE_DEFINITION as definition
      FROM information_schema.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? 
      AND ROUTINE_NAME = ?
    `, [database, procedureName]);

    return result[0]?.definition || '';
  }

  /**
   * 创建MySQL数据库
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    let sql = `CREATE DATABASE ${this.quoteIdentifier(databaseName)}`;
    
    if (options) {
      const clauses = [];
      
      if (options.charset) {
        clauses.push(`CHARACTER SET ${options.charset}`);
      }
      
      if (options.collation) {
        clauses.push(`COLLATE ${options.collation}`);
      }
      
      if (clauses.length > 0) {
        sql += ' ' + clauses.join(' ');
      }
    }
    
    await dataSource.query(sql);
  }

  /**
   * 删除MySQL数据库
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
      schemaSql += `CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n`;

      // 添加列定义
      const columnDefinitions = columns.map(column => {
        let definition = `  \`${column.name}\` ${column.type}`;
        if (!column.nullable) definition += ' NOT NULL';
        if (column.defaultValue !== undefined) {
          definition += ` DEFAULT ${column.defaultValue === null ? 'NULL' : `'${column.defaultValue}'`}`;
        }
        if (column.isAutoIncrement) definition += ' AUTO_INCREMENT';
        return definition;
      });

      // 添加主键
      const primaryKeyColumns = columns.filter(column => column.isPrimary);
      if (primaryKeyColumns.length > 0) {
        const primaryKeyNames = primaryKeyColumns.map(column => `\`${column.name}\``).join(', ');
        columnDefinitions.push(`  PRIMARY KEY (${primaryKeyNames})`);
      }

      schemaSql += columnDefinitions.join(',\n');
      schemaSql += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

      // 添加索引
      for (const index of indexes) {
        if (index.type === 'PRIMARY') continue; // 主键已经在表定义中添加
        schemaSql += `-- 索引: ${index.name} on ${table.name}\n`;
        schemaSql += `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX \`${index.name}\` ON \`${table.name}\` (${index.columns.map(col => `\`${col}\``).join(', ')})\n`;
      }

      if (indexes.length > 0) schemaSql += '\n';

      // 添加外键
      for (const foreignKey of foreignKeys) {
        schemaSql += `-- 外键: ${foreignKey.name} on ${table.name}\n`;
        schemaSql += `ALTER TABLE \`${table.name}\` ADD CONSTRAINT \`${foreignKey.name}\` FOREIGN KEY (\`${foreignKey.column}\`) REFERENCES \`${foreignKey.referencedTable}\` (\`${foreignKey.referencedColumn}\`)${foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : ''}${foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : ''};\n`;
      }

      if (foreignKeys.length > 0) schemaSql += '\n';
    }

    return schemaSql;
  }

  /**
   * 查看数据库日志
   */
  async viewLogs(dataSource: DataSource, database?: string, limit: number = 100): Promise<any[]> {
    // MySQL查看错误日志
    try {
      const logs = await dataSource.query(`SHOW ERROR LOGS LIMIT ${limit}`);
      return logs;
    } catch (error) {
      // 如果SHOW ERROR LOGS失败，尝试其他方式
      try {
        // 尝试查看通用日志
        const logs = await dataSource.query(`SHOW GLOBAL VARIABLES LIKE '%log%'`);
        return logs;
      } catch (e) {
        return [{ message: '无法获取MySQL日志，请确保具有适当的权限' }];
      }
    }
  }

  /**
   * 备份数据库
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    // MySQL备份数据库
    try {
      // 使用mysqldump命令备份
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
      const port = connectionOptions.port || 3306;
      const user = connectionOptions.username;
      const password = connectionOptions.password;
      
      // 构建mysqldump命令
      let command = `mysqldump -h ${host} -P ${port} -u ${user}`;
      if (password) {
        command += ` -p${password}`;
      }
      command += ` ${databaseName} > ${backupFile}`;
      
      // 执行命令
      execSync(command);
      
      return `备份成功：${backupFile}`;
    } catch (error) {
      console.error('MySQL备份失败:', error);
      throw new Error(`备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    // MySQL恢复数据库
    try {
      // 执行恢复命令
      const connectionOptions = dataSource.options as any;
      const host = connectionOptions.host || 'localhost';
      const port = connectionOptions.port || 3306;
      const user = connectionOptions.username;
      const password = connectionOptions.password;
      
      // 构建mysql命令
      let command = `mysql -h ${host} -P ${port} -u ${user}`;
      if (password) {
        command += ` -p${password}`;
      }
      command += ` ${databaseName} < ${filePath}`;
      
      // 执行命令
      execSync(command);
    } catch (error) {
      console.error('MySQL恢复失败:', error);
      throw new Error(`恢复失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 SQL 文件
   */
  async exportTableDataToSQL(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    try {
      // 创建导出目录
      const exportPath = options?.path || path.join(__dirname, '..', '..', 'exports');
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
              return value ? '1' : '0';
            } else if (value instanceof Date) {
              return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
            } else if (typeof value === 'object') {
              // 处理JSON类型和其他对象类型
              try {
                const stringValue = JSON.stringify(value);
                return `'${stringValue.replace(/'/g, "''")}'`;
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
        console.log(`MySQL导出表数据进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('MySQL导出表数据失败:', error);
      throw new Error(`导出表数据失败: ${error.message}`);
    }
  }
}