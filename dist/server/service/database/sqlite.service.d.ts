import { DataSource } from 'typeorm';
import { BaseDatabaseService } from './base.service';
import { TableEntity, ColumnEntity, IndexEntity, ForeignKeyEntity } from '../../model/database.entity';
/**
 * SQLite数据库服务实现
 */
export declare class SQLiteService extends BaseDatabaseService {
    getDatabaseType(): string;
    /**
     * 获取SQLite数据库列表
     */
    getDatabases(dataSource: DataSource): Promise<string[]>;
    /**
     * 获取SQLite表列表
     */
    getTables(dataSource: DataSource, database: string): Promise<TableEntity[]>;
    /**
     * 获取SQLite列信息
     */
    getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]>;
    /**
     * 获取SQLite索引信息
     */
    getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]>;
    /**
     * 获取SQLite外键信息
     */
    getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]>;
    /**
     * 获取SQLite数据库大小
     */
    getDatabaseSize(dataSource: DataSource, database: string): Promise<number>;
    /**
     * 获取SQLite视图列表
     */
    getViews(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取SQLite视图定义
     */
    getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string>;
    /**
     * SQLite不支持存储过程
     */
    getProcedures(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * SQLite不支持存储过程
     */
    getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string>;
    /**
     * 创建SQLite数据库
     * 注意：SQLite的"数据库"实际上是文件，所以这个方法只是创建一个空文件
     */
    createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void>;
    /**
     * 删除SQLite数据库
     */
    dropDatabase(dataSource: DataSource, databaseName: string): Promise<void>;
}
//# sourceMappingURL=sqlite.service.d.ts.map