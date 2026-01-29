"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const connection_service_1 = require("../connection.service");
// 动态导入数据库服务类，避免在浏览器环境中加载 Node.js 特有模块
let MySQLService;
let PostgreSQLService;
let SQLiteService;
let OracleService;
let SQLServerService;
MySQLService = require('./mysql.service').MySQLService;
PostgreSQLService = require('./postgres.service').PostgreSQLService;
SQLiteService = require('./sqlite.service').SQLiteService;
OracleService = require('./oracle.service').OracleService;
SQLServerService = require('./mssql.service').SQLServerService;
/**
 * 数据库服务管理类
 * 负责根据数据库类型选择相应的服务实现
 */
class DatabaseService {
    connectionService;
    mysqlService;
    postgreSQLService;
    sqliteService;
    oracleService;
    sqlServerService;
    constructor() {
        this.connectionService = new connection_service_1.ConnectionService();
        this.mysqlService = new MySQLService();
        this.postgreSQLService = new PostgreSQLService();
        this.sqliteService = new SQLiteService();
        this.oracleService = new OracleService();
        this.sqlServerService = new SQLServerService();
    }
    /**
     * 获取数据库服务实例
     */
    getDatabaseService(type) {
        switch (type.toLowerCase()) {
            case 'mysql':
                return this.mysqlService;
            case 'postgres':
            case 'postgresql':
                return this.postgreSQLService;
            case 'sqlite':
                return this.sqliteService;
            case 'oracle':
                return this.oracleService;
            case 'mssql':
            case 'sqlserver':
                return this.sqlServerService;
            default:
                throw new Error(`不支持的数据库类型: ${type}`);
        }
    }
    /**
     * 获取数据库列表
     */
    async getDatabases(connectionId) {
        const dataSource = await this.connectionService.getActiveConnection(connectionId);
        console.log(dataSource);
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
            default:
                return {};
        }
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.service.js.map