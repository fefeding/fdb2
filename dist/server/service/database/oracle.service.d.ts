import { DataSource } from 'typeorm';
import { BaseDatabaseService } from './base.service';
import { TableEntity, ColumnEntity, IndexEntity, ForeignKeyEntity } from '../../model/database.entity';
/**
 * Oracle数据库服务实现
 */
export declare class OracleService extends BaseDatabaseService {
    getDatabaseType(): string;
    /**
     * 获取Oracle数据库列表（用户schema）
     */
    getDatabases(dataSource: DataSource): Promise<string[]>;
    /**
     * 获取Oracle表列表
     */
    getTables(dataSource: DataSource, database: string): Promise<TableEntity[]>;
    /**
     * 获取Oracle列信息
     */
    getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]>;
    /**
     * 获取Oracle索引信息
     */
    getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]>;
    /**
     * 获取Oracle外键信息
     */
    getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]>;
    /**
     * 获取Oracle数据库大小（用户schema大小）
     */
    getDatabaseSize(dataSource: DataSource, database: string): Promise<number>;
    /**
     * 获取表统计信息
     */
    private getTableStats;
    /**
     * 获取主键信息
     */
    private getPrimaryKeys;
    /**
     * Oracle的标识符引用方式
     */
    quoteIdentifier(identifier: string): string;
    /**
     * 获取Oracle视图列表
     */
    getViews(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取Oracle视图定义
     */
    getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string>;
    /**
     * 获取Oracle存储过程列表
     */
    getProcedures(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取Oracle存储过程定义
     */
    getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string>;
    /**
     * 创建Oracle数据库
     */
    createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void>;
    /**
     * 删除Oracle数据库
     */
    dropDatabase(dataSource: DataSource, databaseName: string): Promise<void>;
}
//# sourceMappingURL=oracle.service.d.ts.map