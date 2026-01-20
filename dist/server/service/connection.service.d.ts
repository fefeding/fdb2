import { ConnectionEntity } from '../model/connection.entity';
import { DataSource } from 'typeorm';
/**
 * 数据库连接管理服务
 * 负责管理数据库连接配置和连接实例
 */
export declare class ConnectionService {
    /**
     * 连接配置文件路径
     */
    private readonly configPath;
    /**
     * 活跃的数据库连接实例
     */
    private activeConnections;
    /**
     * 初始化服务，创建配置目录
     */
    init(): Promise<void>;
    /**
     * 获取所有数据库连接配置
     */
    getAllConnections(): Promise<ConnectionEntity[]>;
    /**
     * 根据ID获取数据库连接配置
     */
    getConnectionById(id: string): Promise<ConnectionEntity | null>;
    /**
     * 添加数据库连接配置
     */
    addConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;
    /**
     * 更新数据库连接配置
     */
    updateConnection(id: string, updates: Partial<ConnectionEntity>): Promise<ConnectionEntity>;
    /**
     * 删除数据库连接配置
     */
    deleteConnection(id: string): Promise<void>;
    /**
     * 测试数据库连接
     */
    testConnection(connection: ConnectionEntity): Promise<boolean>;
    /**
     * 获取活跃的数据库连接
     */
    getActiveConnection(id: string, database?: string): Promise<DataSource>;
    /**
     * 关闭数据库连接
     */
    closeConnection(id: string, database?: string): Promise<void>;
    /**
     * 关闭特定连接的所有数据库连接
     */
    closeAllConnectionsForId(connectionId: string): Promise<void>;
    /**
     * 关闭所有数据库连接
     */
    closeAllConnections(): Promise<void>;
    /**
     * 创建TypeORM数据源
     */
    private createTypeORMDataSource;
    /**
     * 获取TypeORM连接配置
     */
    private getTypeORMOptions;
    /**
     * 保存连接配置到文件
     */
    private saveConnections;
    /**
     * 生成唯一ID
     */
    private generateId;
}
//# sourceMappingURL=connection.service.d.ts.map