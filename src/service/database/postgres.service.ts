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
 * PostgreSQL数据库服务实现
 */
@Provide()
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
    const result = await dataSource.query(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as defaultValue,
        character_maximum_length as length,
        numeric_precision as precision,
        numeric_scale as scale
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);

    // 获取主键信息
    const primaryKeys = await this.getPrimaryKeys(dataSource, table);

    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      defaultValue: row.defaultValue,
      isPrimary: primaryKeys.includes(row.name),
      isAutoIncrement: row.defaultValue?.includes('nextval') || false,
      length: row.length,
      precision: row.precision,
      scale: row.scale
    }));
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
}