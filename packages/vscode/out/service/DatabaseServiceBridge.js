"use strict";
/**
 * 数据库服务桥接层
 * 用于 VSCode 扩展调用 server 目录下的现有数据库服务
 * 为了简化部署，这里直接实现必要的功能，复用 server 目录的逻辑
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseServiceBridge = void 0;
exports.getDatabaseServiceBridge = getDatabaseServiceBridge;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const typeorm_1 = require("typeorm");
// 引入数据库服务接口（从本地复制的服务）
const mysql_service_1 = require("../database-services/mysql.service");
const postgres_service_1 = require("../database-services/postgres.service");
const sqlite_service_1 = require("../database-services/sqlite.service");
const oracle_service_1 = require("../database-services/oracle.service");
const mssql_service_1 = require("../database-services/mssql.service");
const cockroachdb_service_1 = require("../database-services/cockroachdb.service");
const mongodb_service_1 = require("../database-services/mongodb.service");
const sap_service_1 = require("../database-services/sap.service");
/**
 * 数据库服务桥接类
 * 直接复用 server 目录下的服务
 */
class DatabaseServiceBridge {
    constructor() {
        /**
         * 活跃的数据库连接实例
         */
        this.activeConnections = new Map();
        const dataDir = process.env.DB_TOOL_DATA_DIR || path.join(os.homedir(), '.fdb2');
        this.configPath = path.join(dataDir, 'connections.json');
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
     * 初始化服务
     */
    async init() {
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
    }
    /**
     * 连接管理接口
     */
    get connection() {
        return {
            getAllConnections: this.getAllConnections.bind(this),
            getConnectionById: this.getConnectionById.bind(this),
            addConnection: this.addConnection.bind(this),
            updateConnection: this.updateConnection.bind(this),
            deleteConnection: this.deleteConnection.bind(this),
            testConnection: this.testConnection.bind(this)
        };
    }
    /**
     * 数据库管理接口
     */
    get database() {
        return {
            getDatabases: this.getDatabases.bind(this),
            getTables: this.getTables.bind(this),
            executeQuery: this.executeQuery.bind(this),
            getViews: this.getViews.bind(this),
            getProcedures: this.getProcedures.bind(this)
        };
    }
    /**
     * 连接管理实现
     */
    async getAllConnections() {
        try {
            if (!fs.existsSync(this.configPath)) {
                return [];
            }
            const data = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error('读取连接配置失败:', error);
            return [];
        }
    }
    async getConnectionById(id) {
        const connections = await this.getAllConnections();
        return connections.find(conn => conn.id === id) || null;
    }
    async addConnection(connection) {
        const connections = await this.getAllConnections();
        if (connections.find(conn => conn.name === connection.name)) {
            throw new Error('连接名称已存在');
        }
        connection.id = this.generateId();
        connection.createdAt = new Date();
        connection.updatedAt = new Date();
        connection.enabled = connection.enabled !== undefined ? connection.enabled : true;
        connections.push(connection);
        await this.saveConnections(connections);
        return connection;
    }
    async updateConnection(id, updates) {
        const connections = await this.getAllConnections();
        const index = connections.findIndex(conn => conn.id === id);
        if (index === -1) {
            throw new Error('连接配置不存在');
        }
        if (updates.name && connections.find((conn, idx) => conn.name === updates.name && idx !== index)) {
            throw new Error('连接名称已存在');
        }
        connections[index] = { ...connections[index], ...updates, updatedAt: new Date() };
        await this.saveConnections(connections);
        return connections[index];
    }
    async deleteConnection(id) {
        const connections = await this.getAllConnections();
        const filteredConnections = connections.filter(conn => conn.id !== id);
        if (filteredConnections.length === connections.length) {
            throw new Error('连接配置不存在');
        }
        if (this.activeConnections.has(id)) {
            await this.activeConnections.get(id)?.destroy();
            this.activeConnections.delete(id);
        }
        await this.saveConnections(filteredConnections);
    }
    async testConnection(connection) {
        try {
            const tempDataSource = await this.createTypeORMDataSource(connection);
            await tempDataSource.query('SELECT 1');
            await tempDataSource.destroy();
            return true;
        }
        catch (error) {
            console.error(error);
            return false;
        }
    }
    /**
     * 数据库管理实现
     */
    async getDatabases(connectionId) {
        const dataSource = await this.getActiveConnection(connectionId);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getDatabases(dataSource);
    }
    async getTables(connectionId, databaseName) {
        const dataSource = await this.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getTables(dataSource, databaseName);
    }
    async executeQuery(connectionId, sql, databaseName) {
        const dataSource = await this.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.executeQuery(dataSource, sql);
    }
    async getViews(connectionId, databaseName) {
        const dataSource = await this.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getViews(dataSource, databaseName);
    }
    async getProcedures(connectionId, databaseName) {
        const dataSource = await this.getActiveConnection(connectionId, databaseName);
        const databaseService = this.getDatabaseService(dataSource.options.type);
        return databaseService.getProcedures(dataSource, databaseName);
    }
    /**
     * 获取活跃的数据库连接
     */
    async getActiveConnection(id, database) {
        const key = database ? `${id}_${database}` : id;
        if (this.activeConnections.has(key)) {
            const db = this.activeConnections.get(key);
            if (db?.isInitialized) {
                return db;
            }
            else {
                this.activeConnections.delete(key);
            }
        }
        if (this.activeConnections.size >= 10) {
            const oldestKey = this.activeConnections.keys().next().value || '';
            const oldestConnection = this.activeConnections.get(oldestKey);
            try {
                await oldestConnection?.destroy();
            }
            catch (error) {
                console.error(`关闭旧连接 ${oldestKey} 失败:`, error);
            }
            this.activeConnections.delete(oldestKey);
        }
        const connectionConfig = await this.getConnectionById(id);
        if (!connectionConfig) {
            throw new Error('连接配置不存在');
        }
        const updatedConnectionConfig = {
            ...connectionConfig,
            database: database || connectionConfig.database
        };
        const dataSource = await this.createTypeORMDataSource(updatedConnectionConfig);
        this.activeConnections.set(key, dataSource);
        return dataSource;
    }
    /**
     * 创建TypeORM数据源
     */
    async createTypeORMDataSource(connectionConfig) {
        const connectionOptions = this.getTypeORMOptions(connectionConfig);
        return new typeorm_1.DataSource(connectionOptions).initialize();
    }
    /**
     * 获取TypeORM连接配置
     */
    getTypeORMOptions(connectionConfig) {
        const baseOptions = {
            type: connectionConfig.type,
            host: connectionConfig.host,
            port: connectionConfig.port,
            username: connectionConfig.username,
            password: connectionConfig.password,
            database: connectionConfig.database,
            synchronize: false,
            logging: false,
            extra: {
                multipleStatements: true
            },
            ...connectionConfig.options
        };
        switch (connectionConfig.type.toLowerCase()) {
            case 'sqlite':
                return {
                    ...baseOptions,
                    type: 'sqlite',
                    database: connectionConfig.database,
                    host: undefined,
                    port: undefined,
                    username: undefined,
                    password: undefined
                };
            case 'postgres':
            case 'postgresql':
                return {
                    ...baseOptions,
                    type: 'postgres',
                    ssl: connectionConfig.options?.ssl || false
                };
            case 'oracle':
                return {
                    ...baseOptions,
                    type: 'oracle',
                    connectString: `${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`,
                    host: undefined,
                    port: undefined,
                    database: undefined,
                    extra: {
                        connectionTimeout: 60000,
                        poolMax: 10,
                        poolMin: 1,
                        poolIncrement: 1
                    }
                };
            case 'mssql':
            case 'sqlserver':
                return {
                    ...baseOptions,
                    type: 'mssql',
                    options: {
                        encrypt: connectionConfig.options?.encrypt || false,
                        trustServerCertificate: true
                    },
                    extra: {
                        connectionTimeout: 60000,
                        requestTimeout: 15000
                    }
                };
            default:
                return baseOptions;
        }
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
     * 保存连接配置到文件
     */
    async saveConnections(connections) {
        try {
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(connections, null, 2), 'utf8');
        }
        catch (error) {
            console.error('保存连接配置失败:', error);
            throw error;
        }
    }
    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
exports.DatabaseServiceBridge = DatabaseServiceBridge;
// 创建全局单例
let bridgeInstance = null;
/**
 * 获取数据库服务桥接实例
 */
function getDatabaseServiceBridge() {
    if (!bridgeInstance) {
        bridgeInstance = new DatabaseServiceBridge();
    }
    return bridgeInstance;
}
//# sourceMappingURL=DatabaseServiceBridge.js.map