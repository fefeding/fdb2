"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const events_1 = require("events");
/**
 * 连接管理器
 * 负责管理数据库连接的增删改查和持久化
 */
class ConnectionManager extends events_1.EventEmitter {
    constructor(context) {
        super();
        this.context = context;
        this.connections = new Map();
        this.loadConnections();
    }
    /**
     * 从持久化存储加载连接
     */
    async loadConnections() {
        const stored = this.context.globalState.get('fdb2.connections', []);
        this.connections.clear();
        stored.forEach(conn => {
            this.connections.set(conn.id, conn);
        });
    }
    /**
     * 保存连接到持久化存储
     */
    async saveConnections() {
        const connections = Array.from(this.connections.values());
        await this.context.globalState.update('fdb2.connections', connections);
    }
    /**
     * 获取所有连接
     */
    getAllConnections() {
        return Array.from(this.connections.values());
    }
    /**
     * 根据ID获取连接
     */
    getConnectionById(id) {
        return this.connections.get(id);
    }
    /**
     * 添加连接
     */
    async addConnection(connection) {
        connection.id = this.generateId();
        connection.createdAt = Date.now();
        connection.updatedAt = Date.now();
        this.connections.set(connection.id, connection);
        await this.saveConnections();
        this.emit('connectionsChanged');
    }
    /**
     * 更新连接
     */
    async updateConnection(id, updates) {
        const connection = this.connections.get(id);
        if (!connection) {
            throw new Error(`连接 ${id} 不存在`);
        }
        Object.assign(connection, updates, {
            id,
            updatedAt: Date.now()
        });
        this.connections.set(id, connection);
        await this.saveConnections();
        this.emit('connectionsChanged');
    }
    /**
     * 删除连接
     */
    async deleteConnection(id) {
        if (!this.connections.has(id)) {
            throw new Error(`连接 ${id} 不存在`);
        }
        this.connections.delete(id);
        await this.saveConnections();
        this.emit('connectionsChanged');
    }
    /**
     * 测试连接
     */
    async testConnection(connection) {
        // TODO: 实现真实的连接测试
        console.log('Testing connection:', connection.name);
        return true;
    }
    /**
     * 生成唯一ID
     */
    generateId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 连接变化事件
     */
    onDidChangeConnections(callback) {
        this.on('connectionsChanged', callback);
    }
}
exports.ConnectionManager = ConnectionManager;
//# sourceMappingURL=ConnectionManager.js.map