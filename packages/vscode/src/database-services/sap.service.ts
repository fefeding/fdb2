import { DataSource } from 'typeorm';
import { BaseDatabaseService } from './base.service';
import { 
  DatabaseEntity, 
  TableEntity, 
  ColumnEntity, 
  IndexEntity, 
  ForeignKeyEntity 
} from './model/database.entity';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SAP HANA数据库服务实现
 * SAP HANA 是 SAP 公司的高性能内存数据库
 */
export class SAPHANADatabaseService extends BaseDatabaseService {

  getDatabaseType() {
    return 'sap';
  }

  /**
   * 获取SAP HANA数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    try {
      const result = await dataSource.query(`
        SELECT 
          SCHEMA_NAME as name
        FROM 
          SCHEMAS
        WHERE 
          SCHEMA_NAME NOT IN ('SYS', 'SYS_BI', 'SYS_EPM', 'SYS_REPO', 'SYS_RT', '_SYS_BIC', '_SYS_BI', '_SYS_DI', '_SYS_REPO', '_SYS_STATISTICS', '_SYS_TASK', '_SYS_XS')
        ORDER BY 
          SCHEMA_NAME
      `);
      return result.map((row: any) => row.name);
    } catch (error) {
      console.error('获取SAP HANA数据库列表失败:', error);
      return [];
    }
  }

  /**
   * 获取SAP HANA表列表
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    try {
      const result = await dataSource.query(`
        SELECT 
          TABLE_NAME as name,
          'table' as type,
          COMMENTS as comment
        FROM 
          TABLES
        WHERE 
          SCHEMA_NAME = ?
          AND IS_VALID = 'TRUE'
        ORDER BY 
          TABLE_NAME
      `, [database]);
      
      return result.map((row: any) => ({
        name: row.name,
        type: row.type,
        comment: row.comment || '',
        rowCount: undefined,
        dataSize: undefined,
        indexSize: undefined
      }));
    } catch (error) {
      console.error('获取SAP HANA表列表失败:', error);
      return [];
    }
  }

  /**
   * 获取SAP HANA列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    try {
      const result = await dataSource.query(`
        SELECT 
          COLUMN_NAME as name,
          DATA_TYPE_NAME as type,
          IS_NULLABLE as nullable,
          DEFAULT_VALUE as defaultValue,
          COLUMN_ID as position
        FROM 
          TABLE_COLUMNS
        WHERE 
          SCHEMA_NAME = ?
          AND TABLE_NAME = ?
        ORDER BY 
          POSITION
      `, [database, table]);
      
      const primaryKeyResult = await dataSource.query(`
        SELECT 
          COLUMN_NAME
        FROM 
          CONSTRAINTS
        WHERE 
          SCHEMA_NAME = ?
          AND TABLE_NAME = ?
          AND CONSTRAINT_TYPE = 'PRIMARY KEY'
      `, [database, table]);
      
      const primaryKeys = new Set(primaryKeyResult.map((row: any) => row.COLUMN_NAME));
      
      return result.map((row: any) => ({
        name: row.name,
        type: row.type,
        nullable: row.nullable === 'TRUE',
        defaultValue: row.defaultValue,
        isPrimary: primaryKeys.has(row.name),
        isAutoIncrement: row.type.toUpperCase().includes('IDENTITY')
      }));
    } catch (error) {
      console.error('获取SAP HANA列信息失败:', error);
      return [];
    }
  }

  /**
   * 获取SAP HANA索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    try {
      const result = await dataSource.query(`
        SELECT 
          INDEX_NAME as name,
          'INDEX' as type,
          IS_UNIQUE as unique
        FROM 
          INDEXES
        WHERE 
          SCHEMA_NAME = ?
          AND TABLE_NAME = ?
        ORDER BY 
          INDEX_NAME
      `, [database, table]);
      
      const indexDetails = await Promise.all(result.map(async (index: any) => {
        const columnsResult = await dataSource.query(`
          SELECT 
            COLUMN_NAME
          FROM 
            INDEX_COLUMNS
          WHERE 
            SCHEMA_NAME = ?
            AND TABLE_NAME = ?
            AND INDEX_NAME = ?
          ORDER BY 
            POSITION
        `, [database, table, index.name]);
        
        return {
          name: index.name,
          type: index.unique === 'TRUE' ? 'UNIQUE' : 'INDEX',
          columns: columnsResult.map((col: any) => col.COLUMN_NAME),
          unique: index.unique === 'TRUE'
        };
      }));
      
      return indexDetails;
    } catch (error) {
      console.error('获取SAP HANA索引信息失败:', error);
      return [];
    }
  }

  /**
   * 获取SAP HANA外键信息
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    try {
      const result = await dataSource.query(`
        SELECT 
          CONSTRAINT_NAME as name,
          COLUMN_NAME as column,
          REFERENCED_SCHEMA_NAME as referencedSchema,
          REFERENCED_TABLE_NAME as referencedTable,
          REFERENCED_COLUMN_NAME as referencedColumn,
          DELETE_RULE as onDelete,
          UPDATE_RULE as onUpdate
        FROM 
          REFERENTIAL_CONSTRAINTS
        WHERE 
          SCHEMA_NAME = ?
          AND TABLE_NAME = ?
        ORDER BY 
          CONSTRAINT_NAME
      `, [database, table]);
      
      return result.map((row: any) => ({
        name: row.name,
        column: row.column,
        referencedTable: row.referencedSchema ? `${row.referencedSchema}.${row.referencedTable}` : row.referencedTable,
        referencedColumn: row.referencedColumn,
        onDelete: row.onDelete || 'NO ACTION',
        onUpdate: row.onUpdate || 'NO ACTION'
      }));
    } catch (error) {
      console.error('获取SAP HANA外键信息失败:', error);
      return [];
    }
  }

  /**
   * 获取SAP HANA数据库大小
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    try {
      const result = await dataSource.query(`
        SELECT 
          SUM(MEMORY_SIZE_IN_TOTAL) as size
        FROM 
          M_TABLES
        WHERE 
          SCHEMA_NAME = ?
      `, [database]);
      return result[0]?.size || 0;
    } catch (error) {
      console.error('获取SAP HANA数据库大小失败:', error);
      return 0;
    }
  }

  /**
   * 获取SAP HANA视图列表
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    try {
      const result = await dataSource.query(`
        SELECT 
          VIEW_NAME as name,
          DEFINITION as definition
        FROM 
          VIEWS
        WHERE 
          SCHEMA_NAME = ?
          AND IS_VALID = 'TRUE'
        ORDER BY 
          VIEW_NAME
      `, [database]);
      
      return result.map((row: any) => ({
        name: row.name,
        comment: '',
        schemaName: database,
        definition: row.definition
      }));
    } catch (error) {
      console.error('获取SAP HANA视图列表失败:', error);
      return [];
    }
  }

  /**
   * 获取SAP HANA视图定义
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    try {
      const result = await dataSource.query(`
        SELECT 
          DEFINITION as definition
        FROM 
          VIEWS
        WHERE 
          SCHEMA_NAME = ?
          AND VIEW_NAME = ?
      `, [database, viewName]);
      return result[0]?.definition || '';
    } catch (error) {
      console.error('获取SAP HANA视图定义失败:', error);
      return '';
    }
  }

  /**
   * 获取SAP HANA存储过程列表
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    try {
      const result = await dataSource.query(`
        SELECT 
          PROCEDURE_NAME as name,
          DEFINITION as definition
        FROM 
          PROCEDURES
        WHERE 
          SCHEMA_NAME = ?
          AND IS_VALID = 'TRUE'
        ORDER BY 
          PROCEDURE_NAME
      `, [database]);
      
      return result.map((row: any) => ({
        name: row.name,
        owner: database,
        definition: row.definition
      }));
    } catch (error) {
      console.error('获取SAP HANA存储过程列表失败:', error);
      return [];
    }
  }

  /**
   * 获取SAP HANA存储过程定义
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    try {
      const result = await dataSource.query(`
        SELECT 
          DEFINITION as definition
        FROM 
          PROCEDURES
        WHERE 
          SCHEMA_NAME = ?
          AND PROCEDURE_NAME = ?
      `, [database, procedureName]);
      return result[0]?.definition || '';
    } catch (error) {
      console.error('获取SAP HANA存储过程定义失败:', error);
      return '';
    }
  }

  /**
   * 创建SAP HANA数据库（实际上是创建Schema）
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    try {
      await dataSource.query(`CREATE SCHEMA ${this.quoteIdentifier(databaseName)}`);
    } catch (error) {
      console.error('创建SAP HANA数据库失败:', error);
      throw new Error(`创建数据库失败: ${error.message}`);
    }
  }

  /**
   * 删除SAP HANA数据库（实际上是删除Schema）
   */
  async dropDatabase(dataSource: DataSource, databaseName: string): Promise<void> {
    try {
      await dataSource.query(`DROP SCHEMA ${this.quoteIdentifier(databaseName)} CASCADE`);
    } catch (error) {
      console.error('删除SAP HANA数据库失败:', error);
      throw new Error(`删除数据库失败: ${error.message}`);
    }
  }

  /**
   * 导出数据库架构
   */
  async exportSchema(dataSource: DataSource, databaseName: string): Promise<string> {
    const tables = await this.getTables(dataSource, databaseName);
    let schemaSql = `-- SAP HANA数据库架构导出 - ${databaseName}\n`;
    schemaSql += `-- 导出时间: ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      const columns = await this.getColumns(dataSource, databaseName, table.name);
      const indexes = await this.getIndexes(dataSource, databaseName, table.name);
      const foreignKeys = await this.getForeignKeys(dataSource, databaseName, table.name);

      schemaSql += `-- 表结构: ${table.name}\n`;
      schemaSql += `CREATE COLUMN TABLE ${this.quoteIdentifier(table.name)} (\n`;
      
      const columnDefinitions = columns.map(column => {
        let definition = `  ${this.quoteIdentifier(column.name)} ${column.type}`;
        if (!column.nullable)
          definition += ' NOT NULL';
        if (column.defaultValue !== undefined) {
          const upperDefault = column.defaultValue.toString().toUpperCase();
          if (upperDefault === 'CURRENT_TIMESTAMP' || upperDefault === 'NOW()' || upperDefault === 'CURRENT_DATE') {
            definition += ` DEFAULT ${upperDefault}`;
          } else {
            definition += ` DEFAULT ${column.defaultValue === null ? 'NULL' : `'${column.defaultValue}'`}`;
          }
        }
        if (column.isPrimary)
          definition += ' PRIMARY KEY';
        return definition;
      });
      
      schemaSql += columnDefinitions.join(',\n');
      schemaSql += '\n);\n\n';

      for (const index of indexes) {
        if (index.type === 'PRIMARY' || index.name.toUpperCase() === 'PRIMARY')
          continue;
        schemaSql += `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(table.name)} (${index.columns.map(col => this.quoteIdentifier(col)).join(', ')});\n`;
      }
      
      if (indexes.length > 0)
        schemaSql += '\n';

      for (const foreignKey of foreignKeys) {
        schemaSql += `ALTER TABLE ${this.quoteIdentifier(table.name)} ADD CONSTRAINT ${this.quoteIdentifier(foreignKey.name)} FOREIGN KEY (${this.quoteIdentifier(foreignKey.column)}) REFERENCES ${this.quoteIdentifier(foreignKey.referencedTable)} (${this.quoteIdentifier(foreignKey.referencedColumn)})${foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : ''}${foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : ''};\n`;
      }
      
      if (foreignKeys.length > 0)
        schemaSql += '\n';
    }

    return schemaSql;
  }

  /**
   * 查看SAP HANA日志
   */
  async viewLogs(dataSource: DataSource, database?: string, limit: number = 100): Promise<any[]> {
    try {
      const result = await dataSource.query(`
        SELECT 
          HOST,
          PORT,
          CONNECTION_ID,
          TRANSACTION_ID,
          STATEMENT,
          START_TIME,
          DURATION_MICROSECONDS
        FROM 
          M_ACTIVE_TRANSACTIONS
        ORDER BY 
          START_TIME DESC
        LIMIT ?
      `, [limit]);
      return result;
    } catch (error) {
      console.error('获取SAP HANA日志失败:', error);
      return [{ message: 'SAP HANA日志功能需要管理员权限，请检查数据库配置' }];
    }
  }

  /**
   * 备份SAP HANA数据库
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    try {
      const backupPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'backups');
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `${databaseName}_${timestamp}.sql`);

      const schema = await this.exportSchema(dataSource, databaseName);
      fs.writeFileSync(backupFile, schema, 'utf8');

      return `备份成功：${backupFile}`;
    } catch (error) {
      console.error('SAP HANA备份失败:', error);
      throw new Error(`备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复SAP HANA数据库
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    try {
      await this.executeSqlFile(dataSource, filePath);
    } catch (error) {
      console.error('SAP HANA恢复失败:', error);
      throw new Error(`恢复失败: ${error.message}`);
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
      const columnNames = columns.map(column => column.name);

      const header = `-- 表数据导出 - ${tableName}\n` +
        `-- 导出时间: ${new Date().toISOString()}\n\n`;
      fs.writeFileSync(exportFile, header, 'utf8');

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

        let batchSql = '';
        data.forEach((row) => {
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

        fs.appendFileSync(exportFile, batchSql, 'utf8');
        offset += batchSize;
        console.log(`SAP HANA导出表数据进度: ${tableName} - 已处理 ${offset} 行`);
      }

      return exportFile;
    } catch (error) {
      console.error('SAP HANA导出表数据失败:', error);
      throw new Error(`导出表数据失败: ${error.message}`);
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
      const columnNames = columns.map(column => column.name);

      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      fs.writeFileSync(exportFile, bom);
      fs.appendFileSync(exportFile, columnNames.map(name => `"${name}"`).join(',') + '\n', 'utf8');

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

        let batchCsv = '';
        data.forEach((row) => {
          const values = columnNames.map(column => {
            const value = row[column];
            if (value === null || value === undefined) {
              return '';
            } else if (typeof value === 'string') {
              return `"${value.replace(/"/g, '""')}"`;
            } else if (value instanceof Date) {
              return `"${value.toISOString().slice(0, 19).replace('T', ' ')}"`;
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
        });

        fs.appendFileSync(exportFile, batchCsv, 'utf8');
        offset += batchSize;
        console.log(`SAP HANA导出表数据到CSV进度: ${tableName} - 已处理 ${offset} 行`);
      }

      return exportFile;
    } catch (error) {
      console.error('SAP HANA导出表数据到CSV失败:', error);
      throw new Error(`导出表数据到CSV失败: ${error.message}`);
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
        const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
        const data = await dataSource.query(query);

        if (data.length === 0) {
          hasMoreData = false;
          break;
        }

        allData = allData.concat(data);
        offset += batchSize;
        console.log(`SAP HANA导出表数据到JSON进度: ${tableName} - 已处理 ${offset} 行`);
      }

      fs.writeFileSync(exportFile, JSON.stringify(allData, null, 2), 'utf8');
      return exportFile;
    } catch (error) {
      console.error('SAP HANA导出表数据到JSON失败:', error);
      throw new Error(`导出表数据到JSON失败: ${error.message}`);
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
      const columnNames = columns.map(column => column.name);

      const batchSize = options?.batchSize || 10000;
      let offset = 0;
      let hasMoreData = true;
      let allData: any[] = [];

      while (hasMoreData) {
        const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
        const data = await dataSource.query(query);

        if (data.length === 0) {
          hasMoreData = false;
          break;
        }

        allData = allData.concat(data);
        offset += batchSize;
        console.log(`SAP HANA导出表数据到Excel进度: ${tableName} - 已处理 ${offset} 行`);
      }

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(tableName);

      worksheet.columns = columnNames.map(name => ({
        header: name,
        key: name
      }));

      worksheet.addRows(allData);

      await workbook.xlsx.writeFile(exportFile);
      return exportFile;
    } catch (error) {
      console.error('SAP HANA导出表数据到Excel失败:', error);
      throw new Error(`导出表数据到Excel失败: ${error.message}`);
    }
  }

  /**
   * SAP HANA使用双引号作为标识符
   */
  public quoteIdentifier(identifier: string): string {
    return `"${identifier}"`;
  }
}
