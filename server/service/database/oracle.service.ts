import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { BaseDatabaseService } from './base.service';
import { buildColumnType, formatDefaultLiteral, escapeSqlString } from './sql-type.helper';
import {
  TableEntity,
  ColumnEntity,
  IndexEntity,
  ForeignKeyEntity
} from '../../model/database.entity';
import { canonicalizeTableEntity } from '../../core/schema/canonical';
import { emitCreateDdl } from '../../core/schema/ddl-emitter';

/**
 * Oracle数据库服务实现
 */
export class OracleService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'oracle';
  }

  /**
   * 统一封装 Oracle 查询。
   *
   * 关键约定（务必遵守，否则会静默拿到 undefined）：
   * 1. oracledb 返回的行对象键名是大写；dbQuery 统一把键名转成小写后返回。
   * 2. 因此**所有 SQL 别名必须写成加引号的小写**（如 `... as "defaultvalue"`），
   *    读取时用同名小写属性（如 `row.defaultvalue`）。
   *    若别名写成 camelCase（如 `"isIdentity"`），归一化后是 `isidentity`，
   *    用 `row.isIdentity` 读取会得到 undefined —— 这是最容易踩的坑。
   * 3. 加引号同时可规避 Oracle 保留字别名（`column`/`type`/`comment`/`size` 等）
   *    导致的 ORA-00923 "FROM keyword not found"。
   * 4. 数据导出等按列名取值（`row[column]`）依赖本归一化：Oracle 的 `SELECT *`
   *    返回的键名是大写，而 getColumns 返回小写列名，统一小写后二者才能对上。
   */
  private async dbQuery(dataSource: DataSource, sql: string, parameters?: any[]): Promise<any[]> {
    const result = await dataSource.query(sql, parameters);
    return this.normalizeRows(result);
  }

  /**
   * 把每行对象的键名转小写（oracledb 默认返回大写键名）。
   */
  private normalizeRows(result: any): any[] {
    if (!Array.isArray(result)) return result as any;
    return result.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
      const out: any = {};
      for (const k of Object.keys(row)) out[k.toLowerCase()] = row[k];
      return out;
    });
  }

  /**
   * 获取Oracle数据库列表（用户schema）
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    const result = await this.dbQuery(dataSource, `
      SELECT username as "name"
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
    const result = await this.dbQuery(dataSource, `
      SELECT 
        table_name as "name",
        'TABLE' as "type"
      FROM all_tables 
      WHERE owner = USER
        AND table_name NOT LIKE 'BIN$%'
        AND temporary = 'N'
      ORDER BY table_name
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
   * 获取Oracle列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    // 使用兼容的SQL查询，移除可能不兼容的字段
    const result = await this.dbQuery(dataSource, `
      SELECT 
        column_name as "name",
        data_type as "type",
        data_length as "length",
        nullable as "nullable",
        data_default as "defaultvalue",
        identity_column as "isidentity"
      FROM user_tab_columns 
      WHERE table_name = :1
      ORDER BY column_id
    `, [ 
      table.toUpperCase() 
    ]);

    // 获取主键信息
    const primaryKeys = await this.getPrimaryKeys(dataSource, database, table);
    
    // 获取序列信息（Oracle使用序列实现自增）
    const sequenceColumns = await this.getSequenceColumns(dataSource, database, table);

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
        // Oracle 数据字典中列名是大写存储的，而其它方言（及前端 spec）使用小写，
        // 且 Oracle 对未加引号的标识符大小写不敏感。统一返回小写，避免与 spec 比较时
        // 因大小写不同而把"已存在列"误判为"删除+新增"（会触发 ORA-01430 等）。
        name: (row.name || '').toLowerCase(),
        type: row.type + (row.length ? `(${row.length})` : ''),
        nullable: row.nullable === 'Y',
        defaultValue: row.defaultvalue,
        isPrimary: primaryKeys.includes((row.name || '').toLowerCase()),
        isAutoIncrement: row.isidentity === 'YES' || sequenceColumns.includes((row.name || '').toLowerCase()),
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
    const result = await this.dbQuery(dataSource, `
      SELECT 
        i.index_name as "name",
        DECODE(i.uniqueness, 'UNIQUE', 'UNIQUE INDEX', 'INDEX') as "type",
        ic.column_name as "column"
      FROM all_indexes i
      -- 索引名只在 schema 内唯一，必须同时限定 owner，否则跨 schema 同名索引会产生重复行。
      -- 用 join 去重（而非 DISTINCT），这样 ORDER BY 未出现在 SELECT 中的列也不会触发 ORA-01791。
      JOIN all_ind_columns ic ON i.index_name = ic.index_name AND ic.index_owner = i.table_owner
      WHERE i.table_owner = USER 
        AND i.table_name = :1
        AND i.index_name NOT IN (SELECT constraint_name 
                               FROM all_constraints 
                               WHERE constraint_type = 'P')
      ORDER BY i.index_name, ic.column_position
    `, [ 
      table.toUpperCase()
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
    const result = await this.dbQuery(dataSource, `
      SELECT 
        c.constraint_name as "name",
        cc.column_name as "column",
        r.table_name as "referencedtable",
        rc.column_name as "referencedcolumn",
        c.delete_rule as "ondelete"
      FROM all_constraints c
      JOIN all_cons_columns cc ON c.constraint_name = cc.constraint_name
      JOIN all_constraints r ON c.r_constraint_name = r.constraint_name
      JOIN all_cons_columns rc ON r.constraint_name = rc.constraint_name AND cc.position = rc.position
      WHERE c.constraint_type = 'R'
        AND c.owner = USER 
        AND c.table_name = :1
    `, [ 
      table.toUpperCase() 
    ]);

    return result.map((row: any) => ({
      name: row.name,
      column: row.column,
      referencedTable: row.referencedtable,
      referencedColumn: row.referencedcolumn,
      onDelete: row.ondelete || 'NO ACTION',
      onUpdate: 'NO ACTION' // Oracle不支持ON UPDATE
    }));
  }

  /**
   * 获取Oracle数据库大小（用户schema大小）
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    const result = await this.dbQuery(dataSource, `
      SELECT SUM(bytes) as "size"
      FROM user_segments
    `);
    return result[0]?.size || 0;
  }

  /**
   * 获取表统计信息
   */
  private async getTableStats(dataSource: DataSource, database: string, table: string): Promise<any> {
    try {
      const result = await this.dbQuery(dataSource, `
        SELECT 
          num_rows as "rowcount",
          (SELECT SUM(bytes) FROM user_segments WHERE segment_name = :1) as "datasize"
        FROM all_tables
        WHERE owner = USER AND table_name = :2
      `, [ 
        table.toUpperCase(),
        table.toUpperCase() 
      ]);
      
      // 注意：dbQuery 会把键名统一转小写，故这里读 lowercase 键名
      return {
        rowCount: result[0]?.rowcount || 0,
        dataSize: result[0]?.datasize || 0,
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
    const result = await this.dbQuery(dataSource, `
      SELECT cc.column_name as "column_name"
      FROM all_cons_columns cc
      JOIN all_constraints c ON cc.constraint_name = c.constraint_name
      WHERE c.constraint_type = 'P'
        AND c.owner = USER 
        AND c.table_name = :1
      ORDER BY cc.position
    `, [ 
      table.toUpperCase() 
    ]);
    return result.map((row: any) => (row.column_name || '').toLowerCase());
  }

  /**
   * 获取Oracle序列信息（用于检测自增列）
   */
  private async getSequenceColumns(dataSource: DataSource, database: string, table: string): Promise<string[]> {
    try {
      const result = await this.dbQuery(dataSource, `
        SELECT acc.column_name as "column_name"
        FROM all_tab_columns acc
        JOIN all_triggers at ON acc.table_name = at.table_name 
          AND acc.owner = at.owner
        JOIN all_sequences seq ON at.trigger_name LIKE seq.sequence_name || '%'
        WHERE acc.owner = USER 
          AND acc.table_name = :1
          AND acc.data_default IS NOT NULL
          AND acc.data_default LIKE seq.sequence_name || '.nextval'
      `, [ 
        table.toUpperCase() 
      ]);
      return result.map((row: any) => (row.column_name || '').toLowerCase());
    } catch (error) {
      // 如果查询失败，返回空数组
      return [];
    }
  }

  /**
   * Oracle的标识符引用方式
   */
  public quoteIdentifier(identifier: string): string {
    return `"${identifier.toUpperCase()}"`;
  }

  /**
   * Oracle 不支持 LIMIT/OFFSET 语法，分页需用 12c+ 的
   * `OFFSET n ROWS FETCH NEXT m ROWS ONLY`。
   */
  protected buildPaginationClause(pageSize: number, offset: number): string {
    return `OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
  }

  /**
   * 获取Oracle视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await this.dbQuery(dataSource, `
      SELECT 
        view_name as "name",
        NULL as "comment"
      FROM all_views 
      WHERE owner = USER
      ORDER BY view_name
    `);

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
    const result = await this.dbQuery(dataSource, `
      SELECT text as "definition"
      FROM all_views 
      WHERE owner = USER 
        AND view_name = :1
    `, [viewName.toUpperCase()]);

    return result[0]?.definition || '';
  }

  /**
   * 获取Oracle存储过程列表
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    const result = await this.dbQuery(dataSource, `
      SELECT 
        object_name as "name",
        NULL as "comment",
        'PROCEDURE' as "type",
        NULL as "returnvalue",
        'PL/SQL' as "language"
      FROM all_objects 
      WHERE owner = USER 
        AND object_type IN ('PROCEDURE', 'FUNCTION')
        AND status = 'VALID'
      ORDER BY object_name
    `);

    return result.map((row: any) => ({
      name: row.name,
      comment: row.comment || '',
      type: row.type,
      returnType: row.returnvalue || '',
      language: row.language || 'PL/SQL'
    }));
  }

  /**
   * 获取Oracle存储过程定义
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    const result = await this.dbQuery(dataSource, `
      SELECT text as "definition"
      FROM all_source 
      WHERE owner = USER 
        AND name = :1
      ORDER BY line
    `, [procedureName.toUpperCase()]);

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
    
    await this.dbQuery(dataSource, sql);
  }

  /**
   * 删除Oracle数据库
   */
  async dropDatabase(dataSource: DataSource, databaseName: string): Promise<void> {
    const sql = `DROP DATABASE ${this.quoteIdentifier(databaseName)}`;
    await this.dbQuery(dataSource, sql);
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
      // 注意：Oracle 不支持 `CREATE TABLE IF NOT EXISTS` 语法，直接生成 CREATE TABLE。
      schemaSql += `-- 表结构: ${table.name}\n`;
      schemaSql += `CREATE TABLE ${this.quoteIdentifier(table.name)} (\n`;

      // 添加列定义
      // 注意：Oracle 语法要求 `GENERATED ... AS IDENTITY` 出现在 NOT NULL / DEFAULT 之前。
      const columnDefinitions = columns.map(column => {
        let definition = `  ${this.quoteIdentifier(column.name)} ${column.type}`;
        if (column.isAutoIncrement) definition += ' GENERATED ALWAYS AS IDENTITY';
        if (!column.nullable) definition += ' NOT NULL';
        if (column.defaultValue !== undefined && column.defaultValue !== null) {
          // 特殊关键字处理
          const upperDefault = column.defaultValue.toString().toUpperCase();
          if (upperDefault === 'CURRENT_TIMESTAMP' || upperDefault === 'NOW()' || upperDefault === 'CURRENT_DATE') {
            definition += ` DEFAULT ${upperDefault}`;
          } else {
            definition += ` DEFAULT ${column.defaultValue === null ? 'NULL' : `'${column.defaultValue}'`}`;
          }
        }
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
    // Oracle查看日志
    try {
      // 尝试查看Oracle警告日志
      const logs = await this.dbQuery(dataSource, `
        SELECT * FROM v$diag_info WHERE name LIKE '%Log%'
      `);
      return logs;
    } catch (error) {
      try {
        // 尝试查看Oracle系统事件
        const logs = await this.dbQuery(dataSource, `
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
        const data = await this.dbQuery(dataSource, query);
        
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
        const data = await this.dbQuery(dataSource, query);
        
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
        const data = await this.dbQuery(dataSource, query);
        
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


  /**
   * 批量插入数据
   */
  async bulkInsert(dataSource: DataSource, databaseName: string, tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) return;

    // Oracle不支持标准的批量插入语法，需要使用FORALL或多次插入
    for (const row of data) {
      await this.insertData(dataSource, databaseName, tableName, row);
    }
  }

  /**
   * 插入单条数据
   */
  async insertData(dataSource: DataSource, databaseName: string, tableName: string, data: any): Promise<void> {
    const columns = Object.keys(data);
    const placeholders = columns.map((_, index) => `:${index + 1}`).join(', ');
    const values = columns.map(column => data[column]);

    const sql = `INSERT INTO ${this.quoteIdentifier(tableName)} (${columns.map(col => this.quoteIdentifier(col)).join(', ')}) VALUES (${placeholders})`;
    
    await this.dbQuery(dataSource, sql, values);
  }

  /**
   * 删除表
   */
  async dropTable(dataSource: DataSource, databaseName: string, tableName: string): Promise<void> {
    const sql = `DROP TABLE ${this.quoteIdentifier(tableName)} PURGE`;
    await this.dbQuery(dataSource, sql);
  }

  /**
   * 创建表
   */
  async createTable(dataSource: DataSource, databaseName: string, table: any): Promise<void> {
    const { name, columns, comment } = table;

    // 统一走 emitCreateDdl：前端建表 / SQLite 重建 / syncTable 建表共用同一渲染出口。
    // 顺带修复旧实现的既有缺陷：PG/CRDB 的 `int SERIAL` 与内联 COMMENT（语法错误）、
    // SQLite 丢失主键、默认值假值兜底与一律加引号等。
    const canonical = canonicalizeTableEntity({
      name,
      comment: comment ?? '',
      columns: columns ?? []
    });
    const statements = emitCreateDdl('oracle', canonical, { mssqlDatabase: databaseName });
    await this.executeBatchQuery(dataSource, statements, { useTransaction: true });
  }
}