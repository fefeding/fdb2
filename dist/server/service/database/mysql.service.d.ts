import { DataSource } from 'typeorm';
import { BaseDatabaseService } from './base.service';
import { TableEntity, ColumnEntity, IndexEntity, ForeignKeyEntity } from '../../model/database.entity';
/**
 * MySQL数据库服务实现
 */
export declare class MySQLService extends BaseDatabaseService {
    getDatabaseType(): string;
    /**
     * 获取MySQL数据库列表
     */
    getDatabases(dataSource: DataSource): Promise<string[]>;
    /**
     * 获取MySQL表列表
     */
    getTables(dataSource: DataSource, database: string): Promise<TableEntity[]>;
    /**
     * 获取MySQL列信息
     */
    getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]>;
    /**
     * 获取MySQL索引信息
     */
    getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]>;
    /**
     * 获取MySQL外键信息
     */
    getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]>;
    /**
     * 获取MySQL数据库大小
     */
    getDatabaseSize(dataSource: DataSource, database: string): Promise<number>;
    /**
     * MySQL使用反引号标识符
     */
    quoteIdentifier(identifier: string): string;
    /**
     * 获取MySQL视图列表
     */
    getViews(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取MySQL视图定义
     */
    getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string>;
    /**
     * 获取MySQL存储过程列表
     */
    getProcedures(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取MySQL存储过程定义
     */
    getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string>;
    /**
     * 创建MySQL数据库
     */
    createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void>;
    /**
     * 删除MySQL数据库
     */
    dropDatabase(dataSource: DataSource, databaseName: string): Promise<void>;
}
//# sourceMappingURL=mysql.service.d.ts.map