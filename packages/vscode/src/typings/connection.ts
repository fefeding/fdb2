/**
 * 数据库连接配置
 */
export interface DatabaseConnection {
    id: string;
    name: string;
    type: DatabaseType;
    host: string;
    port: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
    charset?: string;
    timezone?: string;
    connectionTimeout?: number;
    createdAt?: number;
    updatedAt?: number;
}

/**
 * 支持的数据库类型
 */
export type DatabaseType =
    | 'mysql'
    | 'postgresql'
    | 'sqlite'
    | 'sqlserver'
    | 'oracle'
    | 'cockroachdb'
    | 'mongodb'
    | 'sap_hana';

/**
 * 数据库类型配置
 */
export interface DatabaseTypeConfig {
    type: DatabaseType;
    name: string;
    defaultPort: number;
    icon: string;
    driver: string;
    supports: string[];
}

/**
 * 查询结果
 */
export interface QueryResult {
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTime: number;
}

/**
 * 表信息
 */
export interface TableInfo {
    name: string;
    type: 'table' | 'view' | 'system';
    engine?: string;
    rows?: number;
    size?: string;
    comment?: string;
}

/**
 * 列信息
 */
export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    key: string;
    default?: any;
    extra?: string;
    comment?: string;
}

/**
 * 数据库信息
 */
export interface DatabaseInfo {
    name: string;
    size?: string;
    tables?: number;
    charset?: string;
    collation?: string;
}
