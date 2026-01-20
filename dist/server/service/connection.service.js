"use strict";
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
exports.ConnectionService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const typeorm_1 = require("typeorm");
/**
 * 数据库连接管理服务
 * 负责管理数据库连接配置和连接实例
 */
class ConnectionService {
    /**
     * 连接配置文件路径
     */
    configPath = path.join(process.cwd(), 'data', 'connections.json');
    /**
     * 活跃的数据库连接实例
     */
    activeConnections = new Map();
    /**
     * 初始化服务，创建配置目录
     */
    async init() {
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
    }
    /**
     * 获取所有数据库连接配置
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
    /**
     * 根据ID获取数据库连接配置
     */
    async getConnectionById(id) {
        const connections = await this.getAllConnections();
        return connections.find(conn => conn.id === id) || null;
    }
    /**
     * 添加数据库连接配置
     */
    async addConnection(connection) {
        const connections = await this.getAllConnections();
        // 检查名称是否重复
        if (connections.find(conn => conn.name === connection.name)) {
            throw new Error('连接名称已存在');
        }
        // 生成ID并设置时间戳
        connection.id = this.generateId();
        connection.createdAt = new Date();
        connection.updatedAt = new Date();
        connection.enabled = connection.enabled !== undefined ? connection.enabled : true;
        connections.push(connection);
        await this.saveConnections(connections);
        return connection;
    }
    /**
     * 更新数据库连接配置
     */
    async updateConnection(id, updates) {
        const connections = await this.getAllConnections();
        const index = connections.findIndex(conn => conn.id === id);
        if (index === -1) {
            throw new Error('连接配置不存在');
        }
        // 检查名称重复
        if (updates.name && connections.find((conn, idx) => conn.name === updates.name && idx !== index)) {
            throw new Error('连接名称已存在');
        }
        // @ts-ignore
        connections[index] = { ...connections[index], ...updates, updatedAt: new Date() };
        await this.saveConnections(connections);
        // @ts-ignore
        return connections[index];
    }
    /**
     * 删除数据库连接配置
     */
    async deleteConnection(id) {
        const connections = await this.getAllConnections();
        const filteredConnections = connections.filter(conn => conn.id !== id);
        if (filteredConnections.length === connections.length) {
            throw new Error('连接配置不存在');
        }
        // 关闭活跃连接
        if (this.activeConnections.has(id)) {
            await this.activeConnections.get(id)?.destroy();
            this.activeConnections.delete(id);
        }
        await this.saveConnections(filteredConnections);
    }
    /**
     * 测试数据库连接
     */
    async testConnection(connection) {
        try {
            console.log('test', connection);
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
     * 获取活跃的数据库连接
     */
    async getActiveConnection(id, database) {
        const key = database ? `${id}_${database}` : id;
        if (this.activeConnections.has(key)) {
            const db = this.activeConnections.get(key);
            // 检查连接是否仍然有效
            if (db?.isInitialized) {
                return db;
            }
            else {
                // 连接已关闭，从缓存中移除
                this.activeConnections.delete(key);
            }
        }
        // 连接池大小限制，防止连接数无限增长
        if (this.activeConnections.size >= 10) {
            // 关闭最旧的连接
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
        // 创建一个新的连接配置，使用指定的数据库
        const updatedConnectionConfig = {
            ...connectionConfig,
            database: database || connectionConfig.database
        };
        const dataSource = await this.createTypeORMDataSource(updatedConnectionConfig);
        this.activeConnections.set(key, dataSource);
        return dataSource;
    }
    /**
     * 关闭数据库连接
     */
    async closeConnection(id, database) {
        const key = database ? `${id}_${database}` : id;
        if (this.activeConnections.has(key)) {
            await this.activeConnections.get(key)?.destroy();
            this.activeConnections.delete(key);
        }
        // 也关闭默认连接（如果存在）
        if (database && this.activeConnections.has(id)) {
            await this.activeConnections.get(id)?.destroy();
            this.activeConnections.delete(id);
        }
    }
    /**
     * 关闭特定连接的所有数据库连接
     */
    async closeAllConnectionsForId(connectionId) {
        const keysToDelete = [];
        for (const [key, dataSource] of this.activeConnections) {
            if (key.startsWith(connectionId + '_') || key === connectionId) {
                try {
                    await dataSource.destroy();
                    keysToDelete.push(key);
                }
                catch (error) {
                    console.error(`关闭连接 ${key} 失败:`, error);
                }
            }
        }
        keysToDelete.forEach(key => this.activeConnections.delete(key));
    }
    /**
     * 关闭所有数据库连接
     */
    async closeAllConnections() {
        for (const [id, dataSource] of this.activeConnections) {
            try {
                await dataSource.destroy();
            }
            catch (error) {
                console.error(`关闭连接 ${id} 失败:`, error);
            }
        }
        this.activeConnections.clear();
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
            ...connectionConfig.options
        };
        // 根据数据库类型调整配置
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
     * 保存连接配置到文件
     */
    async saveConnections(connections) {
        try {
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
exports.ConnectionService = ConnectionService;
//# sourceMappingURL=connection.service.js.map