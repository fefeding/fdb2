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
export class MySQLService extends BaseDatabaseService {

  getDatabaseType(): string {
    return 'mysql';
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
}