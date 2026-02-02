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

/**
 * MongoDB数据库服务实现
 * MongoDB 是一个 NoSQL 文档数据库，与关系型数据库有很大不同
 */
export class MongoDBService extends BaseDatabaseService {

  getDatabaseType() {
    return 'mongodb';
  }

  /**
   * 获取MongoDB数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    try {
      const result = await dataSource.query(`db.adminCommand({ listDatabases: 1 })`);
      return result.databases.map((db: any) => db.name).filter((name: string) => name !== 'admin' && name !== 'local' && name !== 'config');
    } catch (error) {
      console.error('获取MongoDB数据库列表失败:', error);
      return [];
    }
  }

  /**
   * 获取MongoDB集合列表（相当于关系型数据库的表）
   */
  async getTables(dataSource: DataSource, database: string): Promise<TableEntity[]> {
    try {
      const result = await dataSource.query(`db.getCollectionNames()`);
      return result.map((collectionName: string) => ({
        name: collectionName,
        type: 'collection',
        rowCount: 0,
        dataSize: 0,
        indexSize: 0
      }));
    } catch (error) {
      console.error('获取MongoDB集合列表失败:', error);
      return [];
    }
  }

  /**
   * 获取MongoDB集合的字段信息（文档结构）
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    try {
      const result = await dataSource.query(`db.${table}.findOne()`);
      if (!result) {
        return [];
      }

      const fields = Object.keys(result);
      return fields.map(field => ({
        name: field,
        type: this.inferType(result[field]),
        nullable: true,
        defaultValue: undefined,
        isPrimary: field === '_id',
        isAutoIncrement: field === '_id'
      }));
    } catch (error) {
      console.error('获取MongoDB集合字段信息失败:', error);
      return [];
    }
  }

  /**
   * 推断字段类型
   */
  private inferType(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    const type = typeof value;
    if (type === 'string') {
      return 'string';
    } else if (type === 'number') {
      return Number.isInteger(value) ? 'int' : 'double';
    } else if (type === 'boolean') {
      return 'boolean';
    } else if (type === 'object') {
      if (Array.isArray(value)) {
        return 'array';
      } else if (value instanceof Date) {
        return 'date';
      } else if (value instanceof Buffer) {
        return 'binData';
      } else if (value instanceof ObjectId) {
        return 'objectId';
      } else {
        return 'object';
      }
    }
    return 'unknown';
  }

  /**
   * 获取MongoDB索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    try {
      const result = await dataSource.query(`db.${table}.getIndexes()`);
      return result.map((index: any) => ({
        name: index.name,
        type: index.unique ? 'UNIQUE' : 'INDEX',
        columns: Object.keys(index.key),
        unique: index.unique || false
      }));
    } catch (error) {
      console.error('获取MongoDB索引信息失败:', error);
      return [];
    }
  }

  /**
   * MongoDB不支持外键
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    return [];
  }

  /**
   * 获取MongoDB数据库大小
   */
  async getDatabaseSize(dataSource: DataSource, database: string): Promise<number> {
    try {
      const result = await dataSource.query(`db.stats({ scale: 1 })`);
      return result.dataSize || 0;
    } catch (error) {
      console.error('获取MongoDB数据库大小失败:', error);
      return 0;
    }
  }

  /**
   * MongoDB不支持视图
   */
  async getViews(dataSource: DataSource, database: string): Promise<any[]> {
    return [];
  }

  /**
   * MongoDB不支持视图
   */
  async getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string> {
    throw new Error('MongoDB不支持视图');
  }

  /**
   * MongoDB不支持存储过程
   */
  async getProcedures(dataSource: DataSource, database: string): Promise<any[]> {
    return [];
  }

  /**
   * MongoDB不支持存储过程
   */
  async getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string> {
    throw new Error('MongoDB不支持存储过程');
  }

  /**
   * 创建MongoDB数据库
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    try {
      await dataSource.query(`db.getSiblingDB('${databaseName}').createCollection('temp')`);
      await dataSource.query(`db.getSiblingDB('${databaseName}').temp.drop()`);
    } catch (error) {
      console.error('创建MongoDB数据库失败:', error);
      throw new Error(`创建数据库失败: ${error.message}`);
    }
  }

  /**
   * 删除MongoDB数据库
   */
  async dropDatabase(dataSource: DataSource, databaseName: string): Promise<void> {
    try {
      await dataSource.query(`db.getSiblingDB('${databaseName}').dropDatabase()`);
    } catch (error) {
      console.error('删除MongoDB数据库失败:', error);
      throw new Error(`删除数据库失败: ${error.message}`);
    }
  }

  /**
   * 导出数据库架构
   */
  async exportSchema(dataSource: DataSource, databaseName: string): Promise<string> {
    const collections = await this.getTables(dataSource, databaseName);
    let schemaSql = `-- MongoDB数据库架构导出 - ${databaseName}\n`;
    schemaSql += `-- 导出时间: ${new Date().toISOString()}\n\n`;

    for (const collection of collections) {
      const columns = await this.getColumns(dataSource, databaseName, collection.name);
      const indexes = await this.getIndexes(dataSource, databaseName, collection.name);

      schemaSql += `// 集合: ${collection.name}\n`;
      schemaSql += `// 字段:\n`;
      columns.forEach(column => {
        schemaSql += `//   ${column.name}: ${column.type}${column.isPrimary ? ' (主键)' : ''}\n`;
      });
      schemaSql += `\n`;

      if (indexes.length > 0) {
        schemaSql += `// 索引:\n`;
        indexes.forEach(index => {
          schemaSql += `//   ${index.name}: ${index.type} (${index.columns.join(', ')})\n`;
        });
        schemaSql += `\n`;
      }
    }

    return schemaSql;
  }

  /**
   * 查看MongoDB日志
   */
  async viewLogs(dataSource: DataSource, database?: string, limit: number = 100): Promise<any[]> {
    try {
      const result = await dataSource.query(`db.getSiblingDB('admin').adminCommand({ getLog: 'global' })`);
      return result.log || [];
    } catch (error) {
      console.error('获取MongoDB日志失败:', error);
      return [{ message: 'MongoDB日志功能需要管理员权限，请检查数据库配置' }];
    }
  }

  /**
   * 备份MongoDB数据库
   */
  async backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string> {
    try {
      const backupPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'backups');
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `${databaseName}_${timestamp}.json`);

      const collections = await this.getTables(dataSource, databaseName);
      const backupData: any = {
        database: databaseName,
        exportedAt: new Date().toISOString(),
        collections: {}
      };

      for (const collection of collections) {
        const result = await dataSource.query(`db.${collection.name}.find().toArray()`);
        backupData.collections[collection.name] = result;
      }

      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
      return `备份成功：${backupFile}`;
    } catch (error) {
      console.error('MongoDB备份失败:', error);
      throw new Error(`备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复MongoDB数据库
   */
  async restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void> {
    try {
      const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      for (const collectionName in backupData.collections) {
        const documents = backupData.collections[collectionName];
        if (documents.length > 0) {
          await dataSource.query(`db.${collectionName}.insertMany(${JSON.stringify(documents)})`);
        }
      }
    } catch (error) {
      console.error('MongoDB恢复失败:', error);
      throw new Error(`恢复失败: ${error.message}`);
    }
  }

  /**
   * 导出表数据到 SQL 文件（MongoDB不支持SQL）
   */
  async exportTableDataToSQL(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string> {
    throw new Error('MongoDB不支持导出为SQL格式，请使用JSON格式');
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

      const result = await dataSource.query(`db.${tableName}.find().toArray()`);
      
      if (result.length === 0) {
        fs.writeFileSync(exportFile, '', 'utf8');
        return exportFile;
      }

      const columns = await this.getColumns(dataSource, databaseName, tableName);
      const columnNames = columns.map(column => column.name);

      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      fs.writeFileSync(exportFile, bom);
      fs.appendFileSync(exportFile, columnNames.map(name => `"${name}"`).join(',') + '\n', 'utf8');

      let csv = '';
      result.forEach((doc) => {
        const values = columnNames.map(column => {
          const value = doc[column];
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
        csv += values.join(',') + '\n';
      });

      fs.appendFileSync(exportFile, csv, 'utf8');
      return exportFile;
    } catch (error) {
      console.error('MongoDB导出表数据到CSV失败:', error);
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

      const result = await dataSource.query(`db.${tableName}.find().toArray()`);
      fs.writeFileSync(exportFile, JSON.stringify(result, null, 2), 'utf8');
      return exportFile;
    } catch (error) {
      console.error('MongoDB导出表数据到JSON失败:', error);
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

      const result = await dataSource.query(`db.${tableName}.find().toArray()`);
      const columns = await this.getColumns(dataSource, databaseName, tableName);
      const columnNames = columns.map(column => column.name);

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(tableName);

      worksheet.columns = columnNames.map(name => ({
        header: name,
        key: name
      }));

      const flatData = result.map(doc => {
        const flatDoc: any = {};
        columnNames.forEach(column => {
          const value = doc[column];
          if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            flatDoc[column] = JSON.stringify(value);
          } else {
            flatDoc[column] = value;
          }
        });
        return flatDoc;
      });

      worksheet.addRows(flatData);

      await workbook.xlsx.writeFile(exportFile);
      return exportFile;
    } catch (error) {
      console.error('MongoDB导出表数据到Excel失败:', error);
      throw new Error(`导出表数据到Excel失败: ${error.message}`);
    }
  }

  /**
   * MongoDB使用反引号作为标识符
   */
  public quoteIdentifier(identifier: string): string {
    return `\`${identifier}\``;
  }
}

/**
 * ObjectId 类型定义
 */
class ObjectId {
  constructor(id?: string) {
    if (id) {
      this.id = id;
    }
  }
  id?: string;
  toString() {
    return this.id || '';
  }
}