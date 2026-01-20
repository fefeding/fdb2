import { DataSource } from 'typeorm';
import { BaseDatabaseService } from './base.service';
import { TableEntity, ColumnEntity, IndexEntity, ForeignKeyEntity } from '../../model/database.entity';
/**
 * PostgreSQL数据库服务实现
 */
export declare class PostgreSQLService extends BaseDatabaseService {
    getDatabaseType(): string;
    /**
     * 获取PostgreSQL数据库列表
     */
    getDatabases(dataSource: DataSource): Promise<string[]>;
    /**
     * 获取PostgreSQL表列表
     */
    getTables(dataSource: DataSource, database: string): Promise<TableEntity[]>;
    /**
     * 获取PostgreSQL列信息
     */
    getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]>;
    /**
     * 获取PostgreSQL索引信息
     */
    getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]>;
    /**
     * 获取PostgreSQL外键信息
     */
    getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]>;
    /**
     * 获取PostgreSQL数据库大小
     */
    getDatabaseSize(dataSource: DataSource, database: string): Promise<number>;
    /**
     * 获取主键信息
     */
    private getPrimaryKeys;
    /**
     * PostgreSQL使用双引号标识符
     */
    quoteIdentifier(identifier: string): string;
    /**
     * 获取PostgreSQL视图列表
     */
    getViews(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取PostgreSQL视图定义
     */
    getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string>;
    /**
     * 获取PostgreSQL存储过程列表
     */
    getProcedures(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取PostgreSQL存储过程定义
     */
    getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string>;
    /**
     * 创建PostgreSQL数据库
     */
    createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void>;
    /**
     * 删除PostgreSQL数据库
     */
    dropDatabase(dataSource: DataSource, databaseName: string): Promise<void>;
}
//# sourceMappingURL=postgres.service.d.ts.map