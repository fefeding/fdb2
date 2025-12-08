/**
 * 数据库信息实体
 * 用于存储数据库的基本信息和结构
 */

export class DatabaseEntity {
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
 * 数据库表实体
 */
export class TableEntity {
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
 * 数据库列实体
 */
export class ColumnEntity {
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
 * 数据库索引实体
 */
export class IndexEntity {
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
 * 外键实体
 */
export class ForeignKeyEntity {
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