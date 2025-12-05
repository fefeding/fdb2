import { Provide } from '@midwayjs/core';
import { DataSource } from 'typeorm';
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
@Provide()
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
      rowCount: 0, // SQLite需要额外查询
      dataSize: 0,
      indexSize: 0
    }));
  }

  /**
   * 获取SQLite列信息
   */
  async getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]> {
    const result = await dataSource.query(`PRAGMA table_info(${table})`);
    
    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      defaultValue: row.dflt_value,
      isPrimary: row.pk === 1,
      isAutoIncrement: false
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
}