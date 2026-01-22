import { ConnectionService } from '../connection.service';
import { BaseDatabaseService } from './base.service';
import { DatabaseEntity, TableEntity } from '../../model/database.entity';
/**
 * 数据库服务管理类
 * 负责根据数据库类型选择相应的服务实现
 */
export declare class DatabaseService {
    connectionService: ConnectionService;
    private mysqlService;
    private postgreSQLService;
    private sqliteService;
    private oracleService;
    private sqlServerService;
    constructor();
    /**
     * 获取数据库服务实例
     */
    getDatabaseService(type: string): BaseDatabaseService;
    /**
     * 获取数据库列表
     */
    getDatabases(connectionId: string): Promise<string[]>;
    /**
     * 获取数据库详细信息
     */
    getDatabaseInfo(connectionId: string, databaseName: string): Promise<DatabaseEntity>;
    /**
     * 获取数据库表列表
     */
    getTables(connectionId: string, databaseName: string): Promise<TableEntity[]>;
    /**
     * 获取表详细信息
     */
    getTableInfo(connectionId: string, databaseName: string, tableName: string): Promise<TableEntity>;
    /**
     * 获取表数据
     */
    getTableData(connectionId: string, databaseName: string, tableName: string, page?: number, pageSize?: number, where?: string, orderBy?: string): Promise<{
        data: any[];
        total: number;
    }>;
    /**
     * 执行SQL查询
     */
    executeQuery(connectionId: string, sql: string, databaseName?: string): Promise<any>;
    /**
     * 获取视图列表
     */
    getViews(connectionId: string, databaseName: string): Promise<any[]>;
    /**
     * 获取视图定义
     */
    getViewDefinition(connectionId: string, databaseName: string, viewName: string): Promise<string>;
    /**
     * 获取存储过程列表
     */
    getProcedures(connectionId: string, databaseName: string): Promise<any[]>;
    /**
     * 获取存储过程定义
     */
    getProcedureDefinition(connectionId: string, databaseName: string, procedureName: string): Promise<string>;
    /**
     * 测试数据库连接
     */
    testConnection(connectionId: string): Promise<boolean>;
    /**
     * 获取支持的数据库类型
     */
    getSupportedDatabaseTypes(): ({
        value: string;
        label: string;
        icon: string;
        defaultPort: number;
        description: string;
        features: {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays?: undefined;
            supportEnum?: undefined;
            supportSequences?: undefined;
            supportSynonyms?: undefined;
            supportStoredProcedures?: undefined;
        };
    } | {
        value: string;
        label: string;
        icon: string;
        defaultPort: number;
        description: string;
        features: {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays: boolean;
            supportEnum: boolean;
            supportSequences?: undefined;
            supportSynonyms?: undefined;
            supportStoredProcedures?: undefined;
        };
    } | {
        value: string;
        label: string;
        icon: string;
        defaultPort: any;
        description: string;
        features: {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays: boolean;
            supportEnum?: undefined;
            supportSequences?: undefined;
            supportSynonyms?: undefined;
            supportStoredProcedures?: undefined;
        };
    } | {
        value: string;
        label: string;
        icon: string;
        defaultPort: number;
        description: string;
        features: {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays: boolean;
            supportSequences: boolean;
            supportSynonyms: boolean;
            supportEnum?: undefined;
            supportStoredProcedures?: undefined;
        };
    } | {
        value: string;
        label: string;
        icon: string;
        defaultPort: number;
        description: string;
        features: {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays: boolean;
            supportStoredProcedures: boolean;
            supportEnum?: undefined;
            supportSequences?: undefined;
            supportSynonyms?: undefined;
        };
    })[];
    /**
     * 创建数据库
     */
    createDatabase(connectionId: string, databaseName: string, options?: any): Promise<void>;
    /**
     * 删除数据库
     */
    dropDatabase(connectionId: string, databaseName: string): Promise<void>;
    /**
     * 导出数据库架构
     */
    exportSchema(connectionId: string, databaseName: string): Promise<string>;
    /**
     * 查看数据库日志
     */
    viewLogs(connectionId: string, databaseName?: string, limit?: number): Promise<any[]>;
    /**
     * 备份数据库
     */
    backupDatabase(connectionId: string, databaseName: string, options?: any): Promise<string>;
    /**
     * 恢复数据库
     */
    restoreDatabase(connectionId: string, databaseName: string, filePath: string, options?: any): Promise<void>;
    /**
     * 获取数据库统计信息
     */
    getDatabaseStats(connectionId: string, databaseName: string): Promise<any>;
    /**
     * 优化数据库
     */
    optimizeDatabase(connectionId: string, databaseName: string): Promise<any>;
    /**
     * 分析表
     */
    analyzeTables(connectionId: string, databaseName: string): Promise<any>;
    /**
     * 修复表
     */
    repairTables(connectionId: string, databaseName: string): Promise<any>;
    /**
     * 获取数据库类型特定的配置
     */
    getDatabaseTypeSpecificConfig(type: string): {
        type: string;
        features: {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays?: undefined;
            supportEnum?: undefined;
            supportSequences?: undefined;
            supportSynonyms?: undefined;
            supportStoredProcedures?: undefined;
        } | {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays: boolean;
            supportEnum: boolean;
            supportSequences?: undefined;
            supportSynonyms?: undefined;
            supportStoredProcedures?: undefined;
        } | {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays: boolean;
            supportEnum?: undefined;
            supportSequences?: undefined;
            supportSynonyms?: undefined;
            supportStoredProcedures?: undefined;
        } | {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays: boolean;
            supportSequences: boolean;
            supportSynonyms: boolean;
            supportEnum?: undefined;
            supportStoredProcedures?: undefined;
        } | {
            supportSchemas: boolean;
            supportProcedures: boolean;
            supportTriggers: boolean;
            supportViews: boolean;
            supportFullTextSearch: boolean;
            supportJson: boolean;
            supportArrays: boolean;
            supportStoredProcedures: boolean;
            supportEnum?: undefined;
            supportSequences?: undefined;
            supportSynonyms?: undefined;
        } | {
            supportSchemas?: undefined;
            supportProcedures?: undefined;
            supportTriggers?: undefined;
            supportViews?: undefined;
            supportFullTextSearch?: undefined;
            supportJson?: undefined;
            supportArrays?: undefined;
            supportEnum?: undefined;
            supportSequences?: undefined;
            supportSynonyms?: undefined;
            supportStoredProcedures?: undefined;
        };
    };
    /**
     * 获取数据库特性
     */
    private getDatabaseFeatures;
}
//# sourceMappingURL=database.service.d.ts.map