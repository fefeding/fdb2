/**
 * 数据库连接配置接口
 */
export interface ConnectionEntity {
  /**
   * 连接ID
   */
  id?: string;

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
  host?: string;

  /**
   * 端口号
   */
  port?: number;

  /**
   * 数据库名称
   */
  database?: string;

  /**
   * 用户名
   */
  username?: string;

  /**
   * 密码 (加密存储)
   */
  password?: string;

  /**
   * 连接参数 (SSL等)
   */
  options?: Record<string, any>;

  /**
   * 是否启用
   */
  enabled?: boolean;

  /**
   * 创建时间
   */
  createdAt?: Date;

  /**
   * 更新时间
   */
  updatedAt?: Date;
}

/**
 * 数据库信息接口
 */
export interface DatabaseEntity {
  /**
   * 数据库名称
   */
  name: string;

  /**
   * 数据库字符集
   */
  charset?: string;

  /**
   * 数据库排序规则
   */
  collation?: string;

  /**
   * 表数量
   */
  tableCount: number;

  /**
   * 数据库大小 (字节)
   */
  size: number;

  /**
   * 创建时间
   */
  createdAt?: Date;

  /**
   * 表信息列表
   */
  tables?: TableEntity[];
}

/**
 * 数据库表接口
 */
export interface TableEntity {
  /**
   * 表名
   */
  name: string;

  /**
   * 表类型
   */
  type?: string;

  /**
   * 引擎 (MySQL)
   */
  engine?: string;

  /**
   * 行数
   */
  rowCount: number;

  /**
   * 数据大小 (字节)
   */
  dataSize: number;

  /**
   * 索引大小 (字节)
   */
  indexSize: number;

  /**
   * 字符集
   */
  charset?: string;

  /**
   * 排序规则
   */
  collation?: string;

  /**
   * 创建时间
   */
  createdAt?: Date;

  /**
   * 更新时间
   */
  updatedAt?: Date;

  /**
   * 注释
   */
  comment?: string;

  /**
   * 列信息
   */
  columns?: ColumnEntity[];

  /**
   * 索引信息
   */
  indexes?: IndexEntity[];

  /**
   * 外键信息
   */
  foreignKeys?: ForeignKeyEntity[];
}

/**
 * 数据库列接口
 */
export interface ColumnEntity {
  /**
   * 列名
   */
  name: string;

  /**
   * 数据类型
   */
  type: string;

  /**
   * 是否允许NULL
   */
  nullable: boolean;

  /**
   * 默认值
   */
  defaultValue?: any;

  /**
   * 是否主键
   */
  isPrimary: boolean;

  /**
   * 是否自增
   */
  isAutoIncrement: boolean;

  /**
   * 字符长度
   */
  length?: number;

  /**
   * 小数位数
   */
  precision?: number;

  /**
   * 小数点后位数
   */
  scale?: number;

  /**
   * 字符集
   */
  charset?: string;

  /**
   * 排序规则
   */
  collation?: string;

  /**
   * 注释
   */
  comment?: string;
}

/**
 * 数据库索引接口
 */
export interface IndexEntity {
  /**
   * 索引名
   */
  name: string;

  /**
   * 索引类型 (PRIMARY, UNIQUE, INDEX, FULLTEXT)
   */
  type: string;

  /**
   * 索引列
   */
  columns: string[];

  /**
   * 是否唯一
   */
  unique: boolean;

  /**
   * 注释
   */
  comment?: string;
}

/**
 * 外键接口
 */
export interface ForeignKeyEntity {
  /**
   * 约束名
   */
  name: string;

  /**
   * 本地表列
   */
  column: string;

  /**
   * 目标表
   */
  referencedTable: string;

  /**
   * 目标表列
   */
  referencedColumn: string;

  /**
   * 删除规则 (CASCADE, SET NULL, RESTRICT, NO ACTION)
   */
  onDelete: string;

  /**
   * 更新规则 (CASCADE, SET NULL, RESTRICT, NO ACTION)
   */
  onUpdate: string;
}

/**
 * 查询结果接口
 */
export interface QueryResult {
  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 查询数据
   */
  data?: any[];

  /**
   * 影响行数
   */
  affectedRows?: number;

  /**
   * 插入ID
   */
  insertId?: number | null;

  /**
   * 错误信息
   */
  error?: string;
}

/**
 * API响应基础接口
 */
export interface ApiResponse<T = any> {
  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 响应数据
   */
  data?: T;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 消息
   */
  message?: string;
}