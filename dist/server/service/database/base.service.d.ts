import { DataSource } from 'typeorm';
import { DatabaseEntity, TableEntity, ColumnEntity, IndexEntity, ForeignKeyEntity } from '../../model/database.entity';
/**
 * 数据库服务基础类
 * 提供所有数据库类型的通用操作
 */
export declare abstract class BaseDatabaseService {
    /**
     * 获取数据库类型
     */
    abstract getDatabaseType(): string;
    /**
     * 获取数据库列表 - 子类实现
     */
    abstract getDatabases(dataSource: DataSource): Promise<string[]>;
    /**
     * 获取表列表 - 子类实现
     */
    abstract getTables(dataSource: DataSource, database: string): Promise<TableEntity[]>;
    /**
     * 获取列信息 - 子类实现
     */
    abstract getColumns(dataSource: DataSource, database: string, table: string): Promise<ColumnEntity[]>;
    /**
     * 获取索引信息 - 子类实现
     */
    abstract getIndexes(dataSource: DataSource, database: string, table: string): Promise<IndexEntity[]>;
    /**
     * 获取外键信息 - 子类实现
     */
    abstract getForeignKeys(dataSource: DataSource, database: string, table: string): Promise<ForeignKeyEntity[]>;
    /**
     * 获取数据库大小 - 子类实现
     */
    abstract getDatabaseSize(dataSource: DataSource, database: string): Promise<number>;
    /**
     * 通用方法：获取数据库详细信息
     */
    getDatabaseInfo(dataSource: DataSource, databaseName: string): Promise<DatabaseEntity>;
    /**
     * 通用方法：获取表详细信息
     */
    getTableInfo(dataSource: DataSource, databaseName: string, tableName: string): Promise<TableEntity>;
    /**
     * 通用方法：获取表数据
     */
    getTableData(dataSource: DataSource, databaseName: string, tableName: string, page?: number, pageSize?: number, where?: string, orderBy?: string): Promise<{
        data: any[];
        total: number;
    }>;
    /**
     * 通用方法：执行SQL查询
     */
    executeQuery(dataSource: DataSource, sql: string): Promise<any>;
    /**
     * 批量执行SQL查询（支持多条语句）
     */
    executeBatchQuery(dataSource: DataSource, sqlStatements: string[], options?: {
        batchSize?: number;
        useTransaction?: boolean;
        continueOnError?: boolean;
    }): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
    /**
     * 执行文件中的SQL（支持大文件）
     */
    executeSqlFile(dataSource: DataSource, filePath: string, options?: {
        batchSize?: number;
        useTransaction?: boolean;
        continueOnError?: boolean;
    }): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
    /**
     * 通用方法：测试连接
     */
    testConnection(dataSource: DataSource): Promise<boolean>;
    /**
     * 通用方法：给标识符加引号
     */
    quoteIdentifier(identifier: string): string;
    /**
     * 通用方法：构建分页查询
     */
    protected buildPaginationQuery(baseQuery: string, page: number, pageSize: number): string;
    /**
     * 通用方法：构建计数查询
     */
    protected buildCountQuery(baseQuery: string): string;
    /**
     * 获取视图列表 - 子类实现（如果支持）
     */
    getViews(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取视图定义 - 子类实现（如果支持）
     */
    getViewDefinition(dataSource: DataSource, database: string, viewName: string): Promise<string>;
    /**
     * 获取存储过程列表 - 子类实现（如果支持）
     */
    getProcedures(dataSource: DataSource, database: string): Promise<any[]>;
    /**
     * 获取存储过程定义 - 子类实现（如果支持）
     */
    getProcedureDefinition(dataSource: DataSource, database: string, procedureName: string): Promise<string>;
    /**
     * 导出数据库架构 - 子类实现
     */
    abstract exportSchema(dataSource: DataSource, database: string): Promise<string>;
    /**
     * 查看数据库日志 - 子类实现（如果支持）
     */
    abstract viewLogs(dataSource: DataSource, database?: string, limit?: number): Promise<any[]>;
    /**
     * 创建数据库 - 子类实现（如果支持）
     */
    createDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<void>;
    /**
     * 删除数据库 - 子类实现（如果支持）
     */
    dropDatabase(dataSource: DataSource, databaseName: string): Promise<void>;
    /**
     * 备份数据库 - 子类实现（如果支持）
     */
    backupDatabase(dataSource: DataSource, databaseName: string, options?: any): Promise<string>;
    /**
     * 恢复数据库 - 子类实现（如果支持）
     */
    restoreDatabase(dataSource: DataSource, databaseName: string, filePath: string, options?: any): Promise<void>;
    /**
     * 导出表数据到 SQL 文件 - 子类实现
     */
    abstract exportTableDataToSQL(dataSource: DataSource, databaseName: string, tableName: string, options?: any): Promise<string>;
}
//# sourceMappingURL=base.service.d.ts.map