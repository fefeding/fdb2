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
 * SQLite数据库服务实现
 */
export class SQLiteService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'sqlite';
  }

  /**
   * 获取SQLite数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    // SQLite只有一个主数据库
    return ['main'];
  }

  /**
   * 获取SQLite表列表
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        tbl_name as name,
        'table' as type,
        sql as definition
      FROM sqlite_master 
      WHERE type = 'table' AND tbl_name NOT LIKE 'sqlite_%'
    `);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      rowCount: undefined,
      dataSize: undefined,
      indexSize: undefined
    }));
  }

  /**
   * 获取SQLite列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    const result = await dataSource.query(`PRAGMA table_info(${table})`);
    
    // 获取自增列信息
    const xinfoResult = await dataSource.query(`PRAGMA table_xinfo(${table})`);
    const autoIncrementColumns = new Set(
      xinfoResult
        .filter((row: any) => row.hidden === 2 && row.pk === 1)
        .map((row: any) => row.name)
    );
    
    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      defaultValue: row.dflt_value,
      isPrimary: row.pk === 1,
      isAutoIncrement: autoIncrementColumns.has(row.name)
    }));
  }

  /**
   * 获取SQLite索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    const result = await dataSource.query(`PRAGMA index_list(${table})`);
    
    return result.map((row: any) => ({
      name: row.name,
      type: row.unique ? 'UNIQUE' : 'INDEX',
      columns: [], // 需要额外查询
      unique: row.unique === 1
    }));
  }

  /**
   * 获取SQLite外键信息
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    const result = await dataSource.query(`PRAGMA foreign_key_list(${table})`);
    
    return result.map((row: any) => ({
      name: `fk_${table}_${row.table}`,
      column: row.from,
      referencedTable: row.table,
      referencedColumn: row.to,
      onDelete: row.on_delete || 'NO ACTION',
      onUpdate: row.on_update || 'NO ACTION'
    }));
  }

  /**
   * 获取SQLite数据库大小
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    // SQLite数据库大小需要通过文件系统获取，这里返回0
    return 0;
  }

  /**
   * 获取SQLite视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await dataSource.query(`
      SELECT 
        name,
        sql as definition
      FROM sqlite_master 
      WHERE type = 'view' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    return result.map((row: any) => ({
      name: row.name,
      comment: '',
      schemaName: 'main',
      definition: row.definition
    }));
  }

  /**
   * 获取SQLite视图定义
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    const result = await dataSource.query(`
      SELECT sql as definition
      FROM sqlite_master 
      WHERE type = 'view' AND name = $1
    `, [viewName]);

    return result[0]?.definition || '';
  }

  /**
   * SQLite不支持存储过程
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    // SQLite不支持存储过程，返回空数组
    return [];
  }

  /**
   * SQLite不支持存储过程
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    throw new Error('SQLite不支持存储过程');
  }

  /**
   * 创建SQLite数据库
   * 注意：SQLite的"数据库"实际上是文件，所以这个方法只是创建一个空文件
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    // SQLite中数据库是文件，通常在连接时指定文件路径
    // 这里只是创建一个空文件，实际使用时需要连接到这个文件
    throw new Error('SQLite数据库创建需要指定文件路径，请在连接配置中设置数据库文件路径');
  }

  /**
   * 删除SQLite数据库
   */
  async dropDatabase(dataSource: DataSource, databaseName: string): Promise<void> {
    // SQLite中删除数据库需要删除文件
    throw new Error('SQLite数据库删除需要手动删除数据库文件');
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
        if (column.isPrimary && column.isAutoIncrement) definition += ' PRIMARY KEY AUTOINCREMENT';
        else if (column.isPrimary) definition += ' PRIMARY KEY';
        return definition;
      });

      schemaSql += columnDefinitions.join(',\n');
      schemaSql += '\n);\n\n';

      // 添加索引
      for (const index of indexes) {
        if (index.type === 'PRIMARY' || index.name.toUpperCase() === 'PRIMARY') continue; // 跳过主键索引
        schemaSql += `-- 索引: ${index.name} on ${table.name}\n`;
        schemaSql += `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(table.name)} (${index.columns.map(col => this.quoteIdentifier(col)).join(', ')})\n`;
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
    // SQLite查看日志
    try {
      // 尝试查看SQLite配置
      const logs = await dataSource.query(`PRAGMA compile_options;`);
      return logs;
    } catch (error) {
      return [{ message: 'SQLite数据库日志功能有限，请检查数据库文件状态' }];
    }
  }

  /**
   * 备份数据库
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    // SQLite备份数据库
    try {
      // SQLite备份就是复制数据库文件
      const backupPath = options?.path || path.join(__dirname, '..', '..', 'backups');
      
      // 确保备份目录存在
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      // 获取SQLite数据库文件路径
      const connectionOptions = dataSource.options as any;
      const dbPath = connectionOptions.database;
      
      if (!dbPath) {
        throw new Error('SQLite数据库文件路径未找到');
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `${databaseName}_${timestamp}.db`);
      
      // 复制数据库文件
      fs.copyFileSync(dbPath, backupFile);
      
      return `备份成功：${backupFile}`;
    } catch (error) {
      console.error('SQLite备份失败:', error);
      throw new Error(`备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    // SQLite恢复数据库
    try {
      // SQLite恢复就是复制备份文件到数据库文件路径
      const connectionOptions = dataSource.options as any;
      const dbPath = connectionOptions.database;
      
      if (!dbPath) {
        throw new Error('SQLite数据库文件路径未找到');
      }
      
      // 复制备份文件到数据库路径
      fs.copyFileSync(filePath, dbPath);
    } catch (error) {
      console.error('SQLite恢复失败:', error);
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
        // 分批查询数据（SQLite 使用 LIMIT OFFSET 语法）
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
        console.log(`SQLite导出表数据进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('SQLite导出表数据失败:', error);
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
        // 分批查询数据（SQLite 使用 LIMIT OFFSET 语法）
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
              // 处理JSON类型和其他对象类型
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
        console.log(`SQLite导出表数据到CSV进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      return exportFile;
    } catch (error) {
      console.error('SQLite导出表数据到CSV失败:', error);
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
        // 分批查询数据（SQLite 使用 LIMIT OFFSET 语法）
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
        console.log(`SQLite导出表数据到JSON进度: ${tableName} - 已处理 ${offset} 行`);
      }
      
      // 写入 JSON 尾部
      fs.appendFileSync(exportFile, '\n]', 'utf8');
      
      return exportFile;
    } catch (error) {
      console.error('SQLite导出表数据到JSON失败:', error);
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
      console.error('SQLite导出表数据到Excel失败:', error);
      throw new Error(`导出表数据到Excel失败: ${error.message}`);
    }
  }

  /**
   * 修改表结构
   * SQLite的ALTER TABLE操作非常有限，需要通过重建表来实现复杂的表结构修改
   */
  async alterTable(dataSource: DataSource, databaseName: string, tableDiff: any): Promise<any> {
    try {
      const tableName = tableDiff.tableName;
      const sqlStatements: string[] = [];

      // SQLite不支持直接修改表注释，只能忽略

      // 如果有修改或删除列，需要重建表
      if (tableDiff.modifiedColumns.length > 0 || tableDiff.deletedColumns.length > 0) {
        const tempTableName = `_temp_${tableName}_${Date.now()}`;
        
        // 获取所有列（包括新增的和未修改的）
        const allColumns = [...tableDiff.addedColumns];
        const existingColumns = await this.getColumns(dataSource, databaseName, tableName);
        
        // 添加未修改的现有列
        existingColumns.forEach(col => {
          const isDeleted = tableDiff.deletedColumns.some((dc: any) => dc.name === col.name);
          const isModified = tableDiff.modifiedColumns.some((mc: any) => mc.oldColumn.name === col.name);
          if (!isDeleted && !isModified) {
            allColumns.push(col);
          }
        });

        // 添加修改后的列
        tableDiff.modifiedColumns.forEach((modification: any) => {
          allColumns.push(modification.newColumn);
        });

        // 创建临时表
        let createTableSQL = `CREATE TABLE "${tempTableName}" (`;
        const columnDefinitions: string[] = [];

        allColumns.forEach(column => {
          // 检查type是否已经包含长度信息（括号）
          const typeHasLength = /\(\d+\)/.test(column.type);

          let definition = `"${column.name}" ${column.type}`;

          // 处理长度和精度（仅当type中没有指定长度时才添加）
          if (!typeHasLength) {
            if (column.length) {
              definition += `(${column.length})`;
            } else if (column.precision) {
              if (column.scale) {
                definition += `(${column.precision},${column.scale})`;
              } else {
                definition += `(${column.precision})`;
              }
            }
          }

          // 处理NULL约束
          if (!column.nullable) {
            definition += ' NOT NULL';
          }

          // 处理默认值
          if (column.defaultValue) {
            const upperDefault = column.defaultValue.toString().toUpperCase();
            if (['CURRENT_TIMESTAMP', 'NOW()', 'CURRENT_DATE', 'CURRENT_TIME'].includes(upperDefault)) {
              definition += ` DEFAULT ${upperDefault}`;
            } else {
              definition += ` DEFAULT '${column.defaultValue}'`;
            }
          }

          // 处理主键和自增
          if (column.isPrimary) {
            if (column.isAutoIncrement) {
              definition += ' PRIMARY KEY AUTOINCREMENT';
            } else {
              definition += ' PRIMARY KEY';
            }
          }

          columnDefinitions.push(definition);
        });

        createTableSQL += columnDefinitions.join(',\n');
        createTableSQL += ')';
        sqlStatements.push(createTableSQL + ';');

        // 复制数据到临时表
        const existingColumnNames = existingColumns.map(col => `"${col.name}"`).join(', ');
        const newColumnNames = allColumns.map(col => `"${col.name}"`).join(', ');
        sqlStatements.push(`INSERT INTO "${tempTableName}" (${newColumnNames}) SELECT ${existingColumnNames} FROM "${tableName}";`);

        // 删除旧表
        sqlStatements.push(`DROP TABLE "${tableName}";`);

        // 重命名临时表
        sqlStatements.push(`ALTER TABLE "${tempTableName}" RENAME TO "${tableName}";`);

      } else if (tableDiff.addedColumns.length > 0) {
        // 只有添加列，可以直接使用ALTER TABLE ADD COLUMN
        tableDiff.addedColumns.forEach((column: any) => {
          // 检查type是否已经包含长度信息（括号）
          const typeHasLength = /\(\d+\)/.test(column.type);

          let columnSQL = `ALTER TABLE "${tableName}" ADD COLUMN "${column.name}" ${column.type}`;

          // 处理长度和精度（仅当type中没有指定长度时才添加）
          if (!typeHasLength) {
            if (column.length) {
              columnSQL += `(${column.length})`;
            } else if (column.precision) {
              if (column.scale) {
                columnSQL += `(${column.precision},${column.scale})`;
              } else {
                columnSQL += `(${column.precision})`;
              }
            }
          }

          // 处理NULL约束
          if (!column.nullable) {
            columnSQL += ' NOT NULL';
          }

          // 处理默认值
          if (column.defaultValue) {
            const upperDefault = column.defaultValue.toString().toUpperCase();
            if (['CURRENT_TIMESTAMP', 'NOW()', 'CURRENT_DATE', 'CURRENT_TIME'].includes(upperDefault)) {
              columnSQL += ` DEFAULT ${upperDefault}`;
            } else {
              columnSQL += ` DEFAULT '${column.defaultValue}'`;
            }
          }

          sqlStatements.push(columnSQL + ';');
        });
      }

      // 执行SQL语句
      if (sqlStatements.length > 0) {
        await this.executeBatchQuery(dataSource, sqlStatements, { useTransaction: true });
      }

      return { ret: 0, message: '表结构修改成功' };
    } catch (error) {
      console.error('SQLite修改表结构失败:', error);
      return { ret: 1, message: `修改表结构失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 批量插入数据
   */
  async bulkInsert(dataSource: DataSource, databaseName: string, tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) return;

    const columns = Object.keys(data[0]);
    const placeholders = data.map(() => 
      `(${columns.map(() => '?').join(', ')})`
    ).join(', ');

    const values = data.flatMap(row => 
      columns.map(column => row[column])
    );

    const sql = `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES ${placeholders}`;
    
    await dataSource.query(sql, values);
  }

  /**
   * 插入单条数据
   */
  async insertData(dataSource: DataSource, databaseName: string, tableName: string, data: any): Promise<void> {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(column => data[column]);

    const sql = `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${placeholders})`;

    await dataSource.query(sql, values);
  }

  /**
   * 删除表
   */
  async dropTable(dataSource: DataSource, databaseName: string, tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS "${tableName}"`;
    await dataSource.query(sql);
  }

  /**
   * 创建表
   */
  async createTable(dataSource: DataSource, databaseName: string, table: any): Promise<void> {
    const { name, columns, comment } = table;
    
    let sql = `CREATE TABLE "${name}" (\n`;
    const columnDefs: string[] = [];

    columns.forEach((column: any) => {
      let columnDef = `  "${column.name}" ${column.type}`;
      
      if (!column.nullable) {
        columnDef += ' NOT NULL';
      }
      
      if (column.defaultValue) {
        const upperDefault = column.defaultValue.toString().toUpperCase();
        if (['CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME'].includes(upperDefault)) {
          columnDef += ` DEFAULT ${upperDefault}`;
        } else {
          columnDef += ` DEFAULT '${column.defaultValue}'`;
        }
      }
      
      if (column.isAutoIncrement) {
        columnDef += ' AUTOINCREMENT';
      }
      
      columnDefs.push(columnDef);
    });

    sql += columnDefs.join(',\n');
    sql += '\n)';
    
    await dataSource.query(sql);
  }
}