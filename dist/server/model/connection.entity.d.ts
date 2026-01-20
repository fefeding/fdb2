/**
 * 数据库连接配置实体
 * 注意：此实体仅用于代码结构，实际数据保存在本地JSON文件中
 */
export declare class ConnectionEntity {
    /**
     * 连接ID
     */
    id: string;
    /**
     * 连接名称
     */
    name: string;
    /**
     * 数据库类型 (mysql, postgresql, sqlite, etc.)
     */
    type: string;
    /**
     * 主机地址
     */
    host: string;
    /**
     * 端口号
     */
    port: number;
    /**
     * 数据库名称
     */
    database: string;
    /**
     * 用户名
     */
    username: string;
    /**
     * 密码 (加密存储)
     */
    password: string;
    /**
     * 连接参数 (SSL等)
     */
    options: Record<string, any>;
    /**
     * 是否启用
     */
    enabled: boolean;
    /**
     * 创建时间
     */
    createdAt: Date;
    /**
     * 更新时间
     */
    updatedAt: Date;
}
//# sourceMappingURL=connection.entity.d.ts.map