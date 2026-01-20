import { DataSource } from 'typeorm';
import { BaseDatabaseService } from './base.service';
import { TableEntity, ColumnEntity, IndexEntity, ForeignKeyEntity } from '../../model/database.entity';
/**
 * SQL Server数据库服务实现
 */
export declare class SQLServerService extends BaseDatabaseService {
    getDatabaseType(): string;
    /**
     * 获取SQL Server数据库列表
     */
    getDatabases(dataSource: DataSource): Promise<string[]>;
    /**
     * 获取SQL Server表列表
     */
    getTables(dataSource: DataSource, database: string): Promise<TableEntity[]>;
    /**
     * 获取SQL Server列信息
     */
    getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]>;
    /**
     * 获取SQL Server索引信息
     */
    getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]>;
    /**
     * 获取SQL Server外键信息
     */
    getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]>;
    /**
     * 获取SQL Server数据库大小
     */
    getDatabaseSize(dataSource: DataSource, database: string): Promise<number>;
    /**
     * 获取主键信息
     */
    private getPrimaryKeys;
    /**
     * SQL Server的标识符引用方式
     */
    quoteIdentifier(identifier: string): string;
    /**
     * 获取SQL Server视图列表
     */
    getViews(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取SQL Server视图定义
     */
    getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string>;
    /**
     * 获取SQL Server存储过程列表
     */
    getProcedures(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取SQL Server存储过程定义
     */
    getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string>;
    /**
     * 创建SQL Server数据库
     */
    createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void>;
    /**
     * 删除SQL Server数据库
     */
    dropDatabase(dataSource: DataSource, databaseName: string): Promise<void>;
}
//# sourceMappingURL=mssql.service.d.ts.map