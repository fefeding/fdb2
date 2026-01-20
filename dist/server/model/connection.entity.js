"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionEntity = void 0;
/**
 * 数据库连接配置实体
 * 注意：此实体仅用于代码结构，实际数据保存在本地JSON文件中
 */
class ConnectionEntity {
    /**
     * 连接ID
     */
    id;
    /**
     * 连接名称
     */
    name;
    /**
     * 数据库类型 (mysql, postgresql, sqlite, etc.)
     */
    type;
    /**
     * 主机地址
     */
    host;
    /**
     * 端口号
     */
    port;
    /**
     * 数据库名称
     */
    database;
    /**
     * 用户名
     */
    username;
    /**
     * 密码 (加密存储)
     */
    password;
    /**
     * 连接参数 (SSL等)
     */
    options;
    /**
     * 是否启用
     */
    enabled;
    /**
     * 创建时间
     */
    createdAt;
    /**
     * 更新时间
     */
    updatedAt;
}
exports.ConnectionEntity = ConnectionEntity;
//# sourceMappingURL=connection.entity.js.map