import { DataSource } from 'typeorm';
import { ObjectId } from 'mongodb';
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
 * MongoDB 数据库只有在拥有至少一个集合后才会被持久化并出现在 listDatabases 中。
 * 创建空库时保留一个占位集合作为"存在证明"，并在 getTables 中过滤掉它，避免暴露垃圾集合。
 */
const DB_INIT_MARKER = '__db_tool_init';

/**
 * MongoDB数据库服务实现
 * MongoDB 是一个 NoSQL 文档数据库，与关系型数据库有很大不同。
 *
 * 重要：TypeORM 的 MongoDB 驱动不支持通过 dataSource.query() 执行 shell 命令字符串
 * （如 `db.collection.find()`），那种写法永远无法工作。这里统一通过驱动持有的
 * 原生 MongoClient（dataSource.driver.queryRunner.databaseConnection）直接操作，
 * 这是唯一可靠的访问方式。
 */
export class MongoDBService extends BaseDatabaseService {

  getDatabaseType() {
    return 'mongodb';
  }

  /**
   * 获取驱动持有的原生 MongoClient
   */
  private nativeClient(dataSource: DataSource): any {
    return (dataSource.driver as any).queryRunner.databaseConnection;
  }

  /**
   * 获取指定数据库的原生 Db 句柄
   */
  private nativeDb(dataSource: DataSource, database: string): any {
    return this.nativeClient(dataSource).db(database);
  }

  /**
   * 获取MongoDB数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    try {
      const res = await this.nativeDb(dataSource, 'admin').admin().listDatabases();
      return (res.databases || []).map((db: any) => db.name)
        .filter((name: string) => name !== 'admin' && name !== 'local' && name !== 'config');
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
      const db = this.nativeDb(dataSource, database);
      const collections = await db.listCollections().toArray();
      return collections
        .filter((c: any) => c.name !== DB_INIT_MARKER)
        .map((c: any) => ({
        name: c.name,
        type: c.type === 'view' ? 'view' : 'collection',
        rowCount: undefined,
        dataSize: undefined,
        indexSize: undefined
      }));
    } catch (error) {
      console.error('获取MongoDB集合列表失败:', error);
      return [];
    }
  }

  /**
   * 获取MongoDB集合的字段信息（文档结构，取一条样本推断）
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    try {
      const db = this.nativeDb(dataSource, database);
      const sample = await db.collection(table).findOne();
      if (!sample) {
        return [];
      }

      const fields = Object.keys(sample);
      return fields.map(field => ({
        name: field,
        type: this.inferType(sample[field]),
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

  // ---------------------------------------------------------------- 文档查询辅助

  /**
   * 过滤条件：接受 JSON 对象或 JSON 字符串（如 {"status":"active"}）。
   * SQL WHERE 一律明确拒绝——静默忽略会变成"查全表"，比报错更危险。
   */
  private parseFilter(where?: string | Record<string, any>): Record<string, any> {
    if (!where) return {};
    if (typeof where === 'object') return where;
    if (typeof where === 'string') {
      const t = where.trim();
      if (!t) return {};
      try {
        const parsed = JSON.parse(t);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch {
        throw new Error('MongoDB 过滤条件必须是 JSON（如 {"status":"active"}），不支持 SQL WHERE');
      }
      throw new Error('MongoDB 过滤条件必须是 JSON 对象（如 {"status":"active"}）');
    }
    return {};
  }

  /** 排序：支持 {"name":1} / {"name":-1} / "name ASC, age DESC" */
  private parseSort(orderBy?: string | Record<string, any>): Record<string, 1 | -1> | undefined {
    if (!orderBy) return undefined;
    if (typeof orderBy === 'object') {
      const out: Record<string, 1 | -1> = {};
      for (const k of Object.keys(orderBy)) out[k] = Number((orderBy as any)[k]) < 0 ? -1 : 1;
      return Object.keys(out).length ? out : undefined;
    }
    const t = orderBy.trim();
    if (!t) return undefined;
    if (t.startsWith('{')) {
      try {
        return this.parseSort(JSON.parse(t));
      } catch {
        throw new Error('MongoDB 排序条件必须是 JSON（如 {"name":1}）');
      }
    }
    const out: Record<string, 1 | -1> = {};
    for (const part of t.split(',')) {
      const seg = part.trim().split(/\s+/).filter(Boolean);
      if (!seg.length) continue;
      out[seg[0]] = /desc/i.test(seg[1] || '') ? -1 : 1;
    }
    return Object.keys(out).length ? out : undefined;
  }

  /** 24 位十六进制字符串转 ObjectId（否则按原值匹配，兼容非 ObjectId 主键） */
  private toObjectId(id: any): any {
    if (id instanceof ObjectId) return id;
    if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
      try { return new ObjectId(id); } catch { return id; }
    }
    return id;
  }

  /** 过滤条件中的 _id 做 ObjectId 归一化（含 $in/$nin 数组与操作符对象） */
  private normalizeId(filter: Record<string, any>): Record<string, any> {
    if (!filter || typeof filter !== 'object') return filter;
    const out: Record<string, any> = { ...filter };
    if (out._id === undefined) return out;
    const conv = (v: any): any => {
      if (Array.isArray(v)) return v.map(conv);
      if (v && typeof v === 'object') {
        const r: Record<string, any> = {};
        for (const k of Object.keys(v)) r[k] = conv(v[k]);
        return r;
      }
      return this.toObjectId(v);
    };
    out._id = conv(out._id);
    return out;
  }

  /**
   * 获取集合数据（文档模式）：原生 find + sort + skip + limit，不走 SQL。
   */
  async getTableData(
    dataSource: DataSource,
    databaseName: string,
    tableName: string,
    page: number = 1,
    pageSize: number = 100,
    where?: string | Record<string, any>,
    orderBy?: string | Record<string, any>
  ): Promise<{ data: any[], total: number }> {
    try {
      const col = this.nativeDb(dataSource, databaseName).collection(tableName);
      const filter = this.normalizeId(this.parseFilter(where));
      const sort = this.parseSort(orderBy);
      const total = await col.countDocuments(filter);
      const cursor = col.find(filter);
      if (sort) cursor.sort(sort);
      const data = await cursor
        .skip(Math.max(0, (page - 1) * pageSize))
        .limit(pageSize)
        .toArray();
      return { data, total };
    } catch (error) {
      console.error('获取MongoDB集合数据失败:', error);
      throw new Error(`获取集合数据失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 集合详情：在原生元数据（字段/索引）之上补 collStats（文档数/数据大小/索引大小）
   */
  async getTableInfo(dataSource: DataSource, databaseName: string, tableName: string): Promise<TableEntity> {
    const table = await super.getTableInfo(dataSource, databaseName, tableName);
    try {
      const stats = await this.nativeDb(dataSource, databaseName).command({ collStats: tableName });
      table.rowCount = stats?.count;
      table.dataSize = stats?.size;
      table.indexSize = stats?.totalIndexSize;
    } catch {
      // collStats 可能因权限不足失败：保持 undefined，不影响主流程
    }
    return table;
  }

  /**
   * MongoDB 不支持 SQL：给出明确错误，而不是让驱动抛 "Queries aren't supported by MongoDB"
   */
  async executeQuery(_dataSource: DataSource, _sql: string): Promise<any> {
    throw new Error('MongoDB 不支持 SQL 查询，请使用文档查询（JSON 过滤条件）');
  }

  /**
   * 获取MongoDB索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    try {
      const db = this.nativeDb(dataSource, database);
      const indexes = await db.collection(table).indexes();
      return indexes.map((index: any) => ({
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
      const db = this.nativeDb(dataSource, database);
      const stats = await db.stats();
      return stats.dataSize || 0;
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
   * 创建MongoDB数据库（通过创建再删除一个临时集合来物化数据库）
   */
  async createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void> {
    try {
      const db = this.nativeDb(dataSource, databaseName);
      // MongoDB 没有"空数据库"的概念：数据库只有在拥有至少一个集合后才会被持久化，
      // 并出现在 listDatabases 中。因此保留一个占位集合，否则刚创建的库在 getDatabases 中不可见。
      const existing = await db.listCollections({ name: DB_INIT_MARKER }).toArray();
      if (existing.length === 0) {
        await db.createCollection(DB_INIT_MARKER);
      }
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
      await this.nativeDb(dataSource, databaseName).dropDatabase();
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
      const res = await this.nativeDb(dataSource, 'admin').admin().command({ getLog: 'global' });
      return (res.log || []).slice(0, limit);
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

      const db = this.nativeDb(dataSource, databaseName);
      const collections = await this.getTables(dataSource, databaseName);
      const backupData: any = {
        database: databaseName,
        exportedAt: new Date().toISOString(),
        collections: {}
      };

      for (const collection of collections) {
        const docs = await db.collection(collection.name).find().toArray();
        backupData.collections[collection.name] = docs;
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
      const db = this.nativeDb(dataSource, databaseName);

      for (const collectionName in backupData.collections) {
        const documents = backupData.collections[collectionName];
        if (documents.length > 0) {
          await db.collection(collectionName).insertMany(documents);
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

      const db = this.nativeDb(dataSource, databaseName);
      const result = await db.collection(tableName).find().toArray();

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

      const db = this.nativeDb(dataSource, databaseName);
      const result = await db.collection(tableName).find().toArray();
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

      const db = this.nativeDb(dataSource, databaseName);
      const result = await db.collection(tableName).find().toArray();
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


  /**
   * 批量插入数据
   */
  async bulkInsert(dataSource: DataSource, databaseName: string, tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) return;
    const db = this.nativeDb(dataSource, databaseName);
    await db.collection(tableName).insertMany(data);
  }

  /**
   * 插入单条数据
   */
  async insertData(dataSource: DataSource, databaseName: string, tableName: string, data: any): Promise<void> {
    const db = this.nativeDb(dataSource, databaseName);
    await db.collection(tableName).insertOne(data);
  }

  /**
   * 删除表（集合）
   */
  async dropTable(dataSource: DataSource, databaseName: string, tableName: string): Promise<void> {
    const db = this.nativeDb(dataSource, databaseName);
    await db.collection(tableName).drop();
  }

  /**
   * 创建表（集合）
   */
  async createTable(dataSource: DataSource, databaseName: string, table: any): Promise<void> {
    const { name } = table;
    const db = this.nativeDb(dataSource, databaseName);
    await db.createCollection(name);
  }

  // ---------------------------------------------------------------- 文档级操作（document 模式）

  /** 按 _id 更新文档：$set 语义，_id 本身不可修改 */
  async updateDocument(
    dataSource: DataSource, databaseName: string, tableName: string, docId: any, document: any
  ): Promise<void> {
    const col = this.nativeDb(dataSource, databaseName).collection(tableName);
    const { _id, ...rest } = document || {};
    await col.updateOne({ _id: this.toObjectId(docId) }, { $set: rest });
  }

  /** 按 _id 删除文档 */
  async deleteDocument(
    dataSource: DataSource, databaseName: string, tableName: string, docId: any
  ): Promise<void> {
    const col = this.nativeDb(dataSource, databaseName).collection(tableName);
    await col.deleteOne({ _id: this.toObjectId(docId) });
  }

  /** 插入单个文档，返回 insertedId */
  async insertDocument(
    dataSource: DataSource, databaseName: string, tableName: string, document: any
  ): Promise<{ insertedId: any }> {
    const col = this.nativeDb(dataSource, databaseName).collection(tableName);
    const res = await col.insertOne(document);
    return { insertedId: res.insertedId };
  }

  /** 清空集合（保留集合与索引），返回删除条数 */
  async truncateCollection(
    dataSource: DataSource, databaseName: string, tableName: string
  ): Promise<number> {
    const col = this.nativeDb(dataSource, databaseName).collection(tableName);
    const res = await col.deleteMany({});
    return res.deletedCount ?? 0;
  }

  /** 创建索引：keys 形如 { name: 1 } 或 { "a.b": -1 } */
  async createIndex(
    dataSource: DataSource, databaseName: string, tableName: string,
    keys: Record<string, any>, options?: any
  ): Promise<string> {
    const col = this.nativeDb(dataSource, databaseName).collection(tableName);
    return col.createIndex(keys, options || {});
  }

  /** 删除索引 */
  async dropIndex(
    dataSource: DataSource, databaseName: string, tableName: string, indexName: string
  ): Promise<void> {
    const col = this.nativeDb(dataSource, databaseName).collection(tableName);
    await col.dropIndex(indexName);
  }

  /** 聚合管道（聚合构建器 / 高级查询） */
  async aggregate(
    dataSource: DataSource, databaseName: string, tableName: string, pipeline: any[]
  ): Promise<any[]> {
    const col = this.nativeDb(dataSource, databaseName).collection(tableName);
    return col.aggregate(Array.isArray(pipeline) ? pipeline : []).toArray();
  }
}
