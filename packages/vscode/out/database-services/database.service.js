"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const connection_service_1 = require("./connection.service");
const mysql_service_1 = require("./mysql.service");
const postgres_service_1 = require("./postgres.service");
const sqlite_service_1 = require("./sqlite.service");
const oracle_service_1 = require("./oracle.service");
const mssql_service_1 = require("./mssql.service");
const cockroachdb_service_1 = require("./cockroachdb.service");
const mongodb_service_1 = require("./mongodb.service");
const sap_service_1 = require("./sap.service");
/**
 * 数据库服务管理类
 * 负责根据数据库类型选择相应的服务实现
 */
class DatabaseService {
    constructor() {
        this.connectionService = new connection_service_1.ConnectionService();
        this.mysqlService = new mysql_service_1.MySQLService();
        this.postgreSQLService = new postgres_service_1.PostgreSQLService();
        this.sqliteService = new sqlite_service_1.SQLiteService();
        this.oracleService = new oracle_service_1.OracleService();
        this.sqlServerService = new mssql_service_1.SQLServerService();
        this.cockroachDBService = new cockroachdb_service_1.CockroachDBService();
        this.mongoDBService = new mongodb_service_1.MongoDBService();
        this.sapHANADatabaseService = new sap_service_1.SAPHANADatabaseService();
    }
    /**
     * 获取数据库服务实例
     */
    getDatabaseService(type) {
        switch (type.toLowerCase()) {
            case 'mysql':
            case 'aurora-mysql':
            case 'auroramysql':
                return this.mysqlService;
            case 'postgres':
            case 'postgresql':
            case 'aurora-postgres':
            case 'aurorapostgres':
            case 'aurora-postgresql':
                return this.postgreSQLService;
            case 'sqlite':
            case 'better-sqlite3':
            case 'bettersqlite3':
                return this.sqliteService;
            case 'oracle':
                return this.oracleService;
            case 'mssql':
            case 'sqlserver':
                return this.sqlServerService;
            case 'cockroachdb':
            case 'cockroach':
                return this.cockroachDBService;
            case 'mongodb':
            case 'mongo':
                return this.mongoDBService;
            case 'sap':
            case 'sap-hana':
            case 'saphana':
                return this.sapHANADatabaseService;
            default:
                throw new Error(`不支持的数据库类型: ${type}`);
        }
    }
    /**
     * 获取数据库列表
     */
    async getDatabases(connectionId) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getDatabases(dataSource);
    }
    /**
     * 获取数据库详细信息
     */
    async getDatabaseInfo(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getDatabaseInfo(dataSource, databaseName);
    }
    /**
     * 获取数据库表列表
     */
    async getTables(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getTables(dataSource, databaseName);
    }
    /**
     * 获取表详细信息
     */
    async getTableInfo(connectionId, databaseName, tableName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getTableInfo(dataSource, databaseName, tableName);
    }
    /**
     * 获取表数据
     */
    async getTableData(connectionId, databaseName, tableName, page = 1, pageSize = 100, where, orderBy) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getTableData(dataSource, databaseName, tableName, page, pageSize, where, orderBy);
    }
    /**
     * 执行SQL查询
     */
    async executeQuery(connectionId, sql, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.executeQuery(dataSource, sql);
    }
    /**
     * 获取视图列表
     */
    async getViews(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getViews(dataSource, databaseName);
    }
    /**
     * 获取视图定义
     */
    async getViewDefinition(connectionId, databaseName, viewName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getViewDefinition(dataSource, databaseName, viewName);
    }
    /**
     * 获取存储过程列表
     */
    async getProcedures(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getProcedures(dataSource, databaseName);
    }
    /**
     * 获取存储过程定义
     */
    async getProcedureDefinition(connectionId, databaseName, procedureName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getProcedureDefinition(dataSource, databaseName, procedureName);
    }
    /**
     * 测试数据库连接
     */
    async testConnection(connectionId) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.testConnection(dataSource);
    }
    /**
     * 获取支持的数据库类型
     */
    getSupportedDatabaseTypes() {
        return [
            {
                value: 'mysql',
                label: 'MySQL',
                icon: 'bi-database',
                defaultPort: 3306,
                description: 'MySQL数据库',
                features: {
                    supportSchemas: false,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true
                }
            },
            {
                value: 'postgres',
                label: 'PostgreSQL',
                icon: 'bi-database',
                defaultPort: 5432,
                description: 'PostgreSQL数据库',
                features: {
                    supportSchemas: true,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: true,
                    supportEnum: true
                }
            },
            {
                value: 'sqlite',
                label: 'SQLite',
                icon: 'bi-database',
                defaultPort: null,
                description: 'SQLite数据库文件',
                features: {
                    supportSchemas: false,
                    supportProcedures: false,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: false,
                    supportArrays: false
                }
            },
            {
                value: 'oracle',
                label: 'Oracle',
                icon: 'bi-database',
                defaultPort: 1521,
                description: 'Oracle数据库',
                features: {
                    supportSchemas: true,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: false,
                    supportArrays: false,
                    supportSequences: true,
                    supportSynonyms: true
                }
            },
            {
                value: 'mssql',
                label: 'SQL Server',
                icon: 'bi-database',
                defaultPort: 1433,
                description: 'Microsoft SQL Server',
                features: {
                    supportSchemas: false,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: false,
                    supportStoredProcedures: true
                }
            },
            {
                value: 'cockroachdb',
                label: 'CockroachDB',
                icon: 'bi-database',
                defaultPort: 26257,
                description: 'CockroachDB分布式SQL数据库',
                features: {
                    supportSchemas: true,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: true,
                    supportEnum: true,
                    supportDistributed: true
                }
            },
            {
                value: 'mongodb',
                label: 'MongoDB',
                icon: 'bi-database',
                defaultPort: 27017,
                description: 'MongoDB文档数据库',
                features: {
                    supportSchemas: false,
                    supportProcedures: false,
                    supportTriggers: false,
                    supportViews: false,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: true,
                    supportDocuments: true,
                    supportNoSQL: true
                }
            },
            {
                value: 'sap',
                label: 'SAP HANA',
                icon: 'bi-database',
                defaultPort: 39013,
                description: 'SAP HANA内存数据库',
                features: {
                    supportSchemas: true,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: false,
                    supportInMemory: true,
                    supportHighPerformance: true
                }
            }
        ];
    }
    /**
     * 创建数据库
     */
    async createDatabase(connectionId, databaseName, options) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.createDatabase(dataSource, databaseName, options);
    }
    /**
     * 删除数据库
     */
    async dropDatabase(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.dropDatabase(dataSource, databaseName);
    }
    /**
     * 导出数据库架构
     */
    async exportSchema(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.exportSchema(dataSource, databaseName);
    }
    /**
     * 查看数据库日志
     */
    async viewLogs(connectionId, databaseName, limit = 100) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.viewLogs(dataSource, databaseName, limit);
    }
    /**
     * 备份数据库
     */
    async backupDatabase(connectionId, databaseName, options) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.backupDatabase(dataSource, databaseName, options);
    }
    /**
     * 恢复数据库
     */
    async restoreDatabase(connectionId, databaseName, filePath, options) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.restoreDatabase(dataSource, databaseName, filePath, options);
    }
    /**
     * 获取数据库统计信息
     */
    async getDatabaseStats(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        const tables = await databaseService.getTables(dataSource, databaseName);
        const tableCount = tables.length;
        const size = await databaseService.getDatabaseSize(dataSource, databaseName);
        return {
            tableCount,
            size,
            tables: tables.map(table => ({
                name: table.name,
                rowCount: table.rowCount || 0,
                size: table.dataSize || 0
            }))
        };
    }
    /**
     * 优化数据库
     */
    async optimizeDatabase(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        const tables = await databaseService.getTables(dataSource, databaseName);
        const results = [];
        for (const table of tables) {
            try {
                const result = await dataSource.query(`OPTIMIZE TABLE \`${table.name}\``);
                results.push({ table: table.name, success: true, result });
            }
            catch (error) {
                results.push({ table: table.name, success: false, error: error.message });
            }
        }
        return { results };
    }
    /**
     * 分析表
     */
    async analyzeTables(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        const tables = await databaseService.getTables(dataSource, databaseName);
        const results = [];
        for (const table of tables) {
            try {
                const result = await dataSource.query(`ANALYZE TABLE \`${table.name}\``);
                results.push({ table: table.name, success: true, result });
            }
            catch (error) {
                results.push({ table: table.name, success: false, error: error.message });
            }
        }
        return { results };
    }
    /**
     * 修复表
     */
    async repairTables(connectionId, databaseName) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        const tables = await databaseService.getTables(dataSource, databaseName);
        const results = [];
        for (const table of tables) {
            try {
                const result = await dataSource.query(`REPAIR TABLE \`${table.name}\``);
                results.push({ table: table.name, success: true, result });
            }
            catch (error) {
                results.push({ table: table.name, success: false, error: error.message });
            }
        }
        return { results };
    }
    /**
     * 导出表数据到 SQL 文件
     */
    async exportTableDataToSQL(connectionId, databaseName, tableName, options) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.exportTableDataToSQL(dataSource, databaseName, tableName, options);
    }
    /**
     * 导出表数据到 CSV 文件
     */
    async exportTableDataToCSV(connectionId, databaseName, tableName, options) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.exportTableDataToCSV(dataSource, databaseName, tableName, options);
    }
    /**
     * 导出表数据到 JSON 文件
     */
    async exportTableDataToJSON(connectionId, databaseName, tableName, options) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.exportTableDataToJSON(dataSource, databaseName, tableName, options);
    }
    /**
     * 导出表数据到 Excel 文件
     */
    async exportTableDataToExcel(connectionId, databaseName, tableName, options) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.exportTableDataToExcel(dataSource, databaseName, tableName, options);
    }
    /**
     * 获取数据库类型特定的配置
     */
    getDatabaseTypeSpecificConfig(type) {
        const service = this.getDatabaseService(type);
        return {
            type: service.getDatabaseType(),
            features: this.getDatabaseFeatures(type)
        };
    }
    /**
     * 获取数据库特性
     */
    getDatabaseFeatures(type) {
        switch (type.toLowerCase()) {
            case 'mysql':
                return {
                    supportSchemas: false,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true
                };
            case 'postgres':
            case 'postgresql':
                return {
                    supportSchemas: true,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: true,
                    supportEnum: true
                };
            case 'sqlite':
                return {
                    supportSchemas: false,
                    supportProcedures: false,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: false,
                    supportArrays: false
                };
            case 'oracle':
                return {
                    supportSchemas: true,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: false,
                    supportArrays: false,
                    supportSequences: true,
                    supportSynonyms: true
                };
            case 'mssql':
            case 'sqlserver':
                return {
                    supportSchemas: false,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: false,
                    supportStoredProcedures: true
                };
            case 'cockroachdb':
            case 'cockroach':
                return {
                    supportSchemas: true,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: true,
                    supportEnum: true,
                    supportDistributed: true
                };
            case 'mongodb':
            case 'mongo':
                return {
                    supportSchemas: false,
                    supportProcedures: false,
                    supportTriggers: false,
                    supportViews: false,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: true,
                    supportDocuments: true,
                    supportNoSQL: true
                };
            case 'sap':
            case 'sap-hana':
            case 'saphana':
                return {
                    supportSchemas: true,
                    supportProcedures: true,
                    supportTriggers: true,
                    supportViews: true,
                    supportFullTextSearch: true,
                    supportJson: true,
                    supportArrays: false,
                    supportInMemory: true,
                    supportHighPerformance: true
                };
            default:
                return {};
        }
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.service.js.map