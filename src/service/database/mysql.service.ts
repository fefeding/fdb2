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
 * MySQL数据库服务实现
 */
@Provide()
export class MySQLService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'mysql';
  }

  /**
   * 获取MySQL数据库列表
   */
  async getDatabases(dataSource: DataSource): Promise<string[]> {
    const result = await dataSource.query('SHOW DATABASES');
    return result.map((row: any) => row.Database);
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
    const result = await dataSource.query(`
      SELECT 
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as defaultValue,
        COLUMN_KEY as columnKey,
        EXTRA as extra,
        CHARACTER_MAXIMUM_LENGTH as length,
        NUMERIC_PRECISION as precision,
        NUMERIC_SCALE as scale,
        CHARACTER_SET_NAME as charset,
        COLLATION_NAME as collation,
        COLUMN_COMMENT as comment
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `, [database, table]);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      defaultValue: row.defaultValue,
      isPrimary: row.columnKey === 'PRI',
      isAutoIncrement: row.extra?.includes('auto_increment') || false,
      length: row.length,
      precision: row.precision,
      scale: row.scale,
      charset: row.charset,
      collation: row.collation,
      comment: row.comment
    }));
  }

  /**
   * 获取MySQL索引信息
   */
  async getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        INDEX_NAME as name,
        INDEX_TYPE as type,
        COLUMN_NAME as column,
        NON_UNIQUE as nonUnique
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [database, table]);

    // 按索引名分组
    const indexMap = new Map<string, IndexEntity>();
    result.forEach((row: any) => {
      if (!indexMap.has(row.name)) {
        indexMap.set(row.name, {
          name: row.name,
          type: row.type,
          columns: [],
          unique: row.nonUnique === 0
        });
      }
      indexMap.get(row.name)!.columns.push(row.column);
    });

    return Array.from(indexMap.values());
  }

  /**
   * 获取MySQL外键信息
   */
  async getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]> {
    const result = await dataSource.query(`
      SELECT 
        CONSTRAINT_NAME as name,
        COLUMN_NAME as column,
        REFERENCED_TABLE_NAME as referencedTable,
        REFERENCED_COLUMN_NAME as referencedColumn,
        DELETE_RULE as onDelete,
        UPDATE_RULE as onUpdate
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [database, table]);

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
}