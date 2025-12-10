/**
 * 数据库类型定义
 */

export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgres',
  SQLITE = 'sqlite',
  ORACLE = 'oracle',
  SQLSERVER = 'mssql'
}

/**
 * 数据库类型配置
 */
export interface DatabaseTypeConfig {
  /** 类型值 */
  value: DatabaseType;
  /** 显示名称 */
  label: string;
  /** 图标 */
  icon: string;
  /** 默认端口 */
  defaultPort: number | null;
  /** 描述 */
  description: string;
  /** 支持的列类型 */
  supportedColumnTypes: ColumnType[];
}

/**
 * 列类型定义
 */
export interface ColumnType {
  /** 类型名称 */
  name: string;
  /** 显示名称 */
  label: string;
  /** 类别 */
  category: ColumnCategory;
  /** 是否需要长度参数 */
  requiresLength?: boolean;
  /** 是否需要精度参数 */
  requiresPrecision?: boolean;
  /** 是否需要小数位数参数 */
  requiresScale?: boolean;
  /** 默认长度 */
  defaultLength?: number;
  /** 默认精度 */
  defaultPrecision?: number;
  /** 默认小数位数 */
  defaultScale?: number;
  /** 是否支持无符号 */
  supportsUnsigned?: boolean;
  /** 是否支持自增 */
  supportsAutoIncrement?: boolean;
  /** 描述 */
  description?: string;
}

/**
 * 列类型类别
 */
export enum ColumnCategory {
  NUMERIC = 'numeric',
  STRING = 'string',
  DATE_TIME = 'date_time',
  BOOLEAN = 'boolean',
  BINARY = 'binary',
  TEXT = 'text',
  SPATIAL = 'spatial',
  JSON = 'json',
  ARRAY = 'array',
  OTHER = 'other'
}

/**
 * MySQL 列类型定义
 */
export const MYSQL_COLUMN_TYPES: ColumnType[] = [
  // 数值类型
  { name: 'TINYINT', label: 'TINYINT', category: ColumnCategory.NUMERIC, requiresLength: true, defaultLength: 4, supportsUnsigned: true, supportsAutoIncrement: true, description: '微整数，1字节' },
  { name: 'SMALLINT', label: 'SMALLINT', category: ColumnCategory.NUMERIC, requiresLength: true, defaultLength: 6, supportsUnsigned: true, supportsAutoIncrement: true, description: '小整数，2字节' },
  { name: 'MEDIUMINT', label: 'MEDIUMINT', category: ColumnCategory.NUMERIC, requiresLength: true, defaultLength: 9, supportsUnsigned: true, supportsAutoIncrement: true, description: '中等整数，3字节' },
  { name: 'INT', label: 'INT', category: ColumnCategory.NUMERIC, requiresLength: true, defaultLength: 11, supportsUnsigned: true, supportsAutoIncrement: true, description: '标准整数，4字节' },
  { name: 'BIGINT', label: 'BIGINT', category: ColumnCategory.NUMERIC, requiresLength: true, defaultLength: 20, supportsUnsigned: true, supportsAutoIncrement: true, description: '大整数，8字节' },
  { name: 'DECIMAL', label: 'DECIMAL', category: ColumnCategory.NUMERIC, requiresPrecision: true, requiresScale: true, defaultPrecision: 10, defaultScale: 2, description: '定点小数' },
  { name: 'FLOAT', label: 'FLOAT', category: ColumnCategory.NUMERIC, requiresPrecision: true, defaultPrecision: 10, requiresScale: true, defaultScale: 2, description: '单精度浮点数' },
  { name: 'DOUBLE', label: 'DOUBLE', category: ColumnCategory.NUMERIC, requiresPrecision: true, defaultPrecision: 16, requiresScale: true, defaultScale: 4, description: '双精度浮点数' },
  { name: 'BIT', label: 'BIT', category: ColumnCategory.NUMERIC, requiresLength: true, defaultLength: 1, description: '位类型' },
  { name: 'SERIAL', label: 'SERIAL', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '自增整数（别名）' },

  // 字符串类型
  { name: 'CHAR', label: 'CHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: '固定长度字符串' },
  { name: 'VARCHAR', label: 'VARCHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 255, description: '可变长度字符串' },
  { name: 'BINARY', label: 'BINARY', category: ColumnCategory.BINARY, requiresLength: true, defaultLength: 1, description: '固定长度二进制' },
  { name: 'VARBINARY', label: 'VARBINARY', category: ColumnCategory.BINARY, requiresLength: true, defaultLength: 255, description: '可变长度二进制' },

  // 文本类型
  { name: 'TINYTEXT', label: 'TINYTEXT', category: ColumnCategory.TEXT, description: '微型文本，最大255字符' },
  { name: 'TEXT', label: 'TEXT', category: ColumnCategory.TEXT, description: '文本，最大65535字符' },
  { name: 'MEDIUMTEXT', label: 'MEDIUMTEXT', category: ColumnCategory.TEXT, description: '中等文本，最大16MB' },
  { name: 'LONGTEXT', label: 'LONGTEXT', category: ColumnCategory.TEXT, description: '长文本，最大4GB' },

  // 日期时间类型
  { name: 'DATE', label: 'DATE', category: ColumnCategory.DATE_TIME, description: '日期' },
  { name: 'TIME', label: 'TIME', category: ColumnCategory.DATE_TIME, description: '时间' },
  { name: 'DATETIME', label: 'DATETIME', category: ColumnCategory.DATE_TIME, description: '日期时间' },
  { name: 'TIMESTAMP', label: 'TIMESTAMP', category: ColumnCategory.DATE_TIME, description: '时间戳' },
  { name: 'YEAR', label: 'YEAR', category: ColumnCategory.DATE_TIME, description: '年份' },

  // JSON 类型
  { name: 'JSON', label: 'JSON', category: ColumnCategory.JSON, description: 'JSON数据类型' },

  // 枚举和集合类型
  { name: 'ENUM', label: 'ENUM', category: ColumnCategory.OTHER, description: '枚举类型' },
  { name: 'SET', label: 'SET', category: ColumnCategory.OTHER, description: '集合类型' },

  // 空间类型
  { name: 'GEOMETRY', label: 'GEOMETRY', category: ColumnCategory.SPATIAL, description: '几何类型' },
  { name: 'POINT', label: 'POINT', category: ColumnCategory.SPATIAL, description: '点类型' },
  { name: 'LINESTRING', label: 'LINESTRING', category: ColumnCategory.SPATIAL, description: '线类型' },
  { name: 'POLYGON', label: 'POLYGON', category: ColumnCategory.SPATIAL, description: '多边形类型' }
];

/**
 * PostgreSQL 列类型定义
 */
export const POSTGRESQL_COLUMN_TYPES: ColumnType[] = [
  // 数值类型
  { name: 'SMALLINT', label: 'SMALLINT', category: ColumnCategory.NUMERIC, description: '小整数，2字节' },
  { name: 'INTEGER', label: 'INTEGER', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '整数，4字节' },
  { name: 'BIGINT', label: 'BIGINT', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '大整数，8字节' },
  { name: 'DECIMAL', label: 'DECIMAL', category: ColumnCategory.NUMERIC, requiresPrecision: true, requiresScale: true, defaultPrecision: 10, defaultScale: 2, description: '定点小数' },
  { name: 'NUMERIC', label: 'NUMERIC', category: ColumnCategory.NUMERIC, requiresPrecision: true, requiresScale: true, defaultPrecision: 10, defaultScale: 2, description: '定点小数' },
  { name: 'REAL', label: 'REAL', category: ColumnCategory.NUMERIC, description: '单精度浮点数，4字节' },
  { name: 'DOUBLE PRECISION', label: 'DOUBLE PRECISION', category: ColumnCategory.NUMERIC, description: '双精度浮点数，8字节' },
  { name: 'SMALLSERIAL', label: 'SMALLSERIAL', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '自增小整数' },
  { name: 'SERIAL', label: 'SERIAL', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '自增整数' },
  { name: 'BIGSERIAL', label: 'BIGSERIAL', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '自增大整数' },
  { name: 'MONEY', label: 'MONEY', category: ColumnCategory.NUMERIC, description: '货币类型' },

  // 字符串类型
  { name: 'CHARACTER VARYING', label: 'VARCHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 255, description: '可变长度字符串' },
  { name: 'CHARACTER', label: 'CHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: '固定长度字符串' },
  { name: 'TEXT', label: 'TEXT', category: ColumnCategory.TEXT, description: '文本' },

  // 二进制类型
  { name: 'BYTEA', label: 'BYTEA', category: ColumnCategory.BINARY, description: '二进制数据' },

  // 日期时间类型
  { name: 'DATE', label: 'DATE', category: ColumnCategory.DATE_TIME, description: '日期' },
  { name: 'TIME', label: 'TIME', category: ColumnCategory.DATE_TIME, description: '时间' },
  { name: 'TIME WITH TIME ZONE', label: 'TIME WITH TIME ZONE', category: ColumnCategory.DATE_TIME, description: '带时区时间' },
  { name: 'TIMESTAMP', label: 'TIMESTAMP', category: ColumnCategory.DATE_TIME, description: '时间戳' },
  { name: 'TIMESTAMP WITH TIME ZONE', label: 'TIMESTAMP WITH TIME ZONE', category: ColumnCategory.DATE_TIME, description: '带时区时间戳' },
  { name: 'INTERVAL', label: 'INTERVAL', category: ColumnCategory.DATE_TIME, description: '时间间隔' },

  // 布尔类型
  { name: 'BOOLEAN', label: 'BOOLEAN', category: ColumnCategory.BOOLEAN, description: '布尔值' },

  // JSON 类型
  { name: 'JSON', label: 'JSON', category: ColumnCategory.JSON, description: 'JSON数据类型' },
  { name: 'JSONB', label: 'JSONB', category: ColumnCategory.JSON, description: '二进制JSON数据类型' },

  // 数组类型
  { name: 'TEXT[]', label: 'TEXT[]', category: ColumnCategory.ARRAY, description: '文本数组' },
  { name: 'INTEGER[]', label: 'INTEGER[]', category: ColumnCategory.ARRAY, description: '整数数组' },

  // UUID 类型
  { name: 'UUID', label: 'UUID', category: ColumnCategory.OTHER, description: 'UUID类型' },

  // 网络地址类型
  { name: 'INET', label: 'INET', category: ColumnCategory.OTHER, description: 'IP地址' },
  { name: 'CIDR', label: 'CIDR', category: ColumnCategory.OTHER, description: 'CIDR地址' },

  // 几何类型
  { name: 'POINT', label: 'POINT', category: ColumnCategory.SPATIAL, description: '点类型' },
  { name: 'LINE', label: 'LINE', category: ColumnCategory.SPATIAL, description: '线类型' },
  { name: 'LSEG', label: 'LSEG', category: ColumnCategory.SPATIAL, description: '线段类型' },
  { name: 'BOX', label: 'BOX', category: ColumnCategory.SPATIAL, description: '矩形类型' },
  { name: 'PATH', label: 'PATH', category: ColumnCategory.SPATIAL, description: '路径类型' },
  { name: 'POLYGON', label: 'POLYGON', category: ColumnCategory.SPATIAL, description: '多边形类型' },
  { name: 'CIRCLE', label: 'CIRCLE', category: ColumnCategory.SPATIAL, description: '圆形类型' }
];

/**
 * SQLite 列类型定义
 */
export const SQLITE_COLUMN_TYPES: ColumnType[] = [
  // 数值类型
  { name: 'INTEGER', label: 'INTEGER', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '整数，支持自增' },
  { name: 'INT', label: 'INT', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '整数（INTEGER别名）' },
  { name: 'BIGINT', label: 'BIGINT', category: ColumnCategory.NUMERIC, description: '大整数' },
  { name: 'SMALLINT', label: 'SMALLINT', category: ColumnCategory.NUMERIC, description: '小整数' },
  { name: 'TINYINT', label: 'TINYINT', category: ColumnCategory.NUMERIC, description: '微整数' },
  { name: 'REAL', label: 'REAL', category: ColumnCategory.NUMERIC, description: '浮点数' },
  { name: 'DOUBLE', label: 'DOUBLE', category: ColumnCategory.NUMERIC, description: '双精度浮点数' },
  { name: 'FLOAT', label: 'FLOAT', category: ColumnCategory.NUMERIC, description: '浮点数' },

  // 字符串类型
  { name: 'TEXT', label: 'TEXT', category: ColumnCategory.TEXT, description: '文本' },
  { name: 'CHARACTER', label: 'CHARACTER', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: '字符' },
  { name: 'VARCHAR', label: 'VARCHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 255, description: '可变长字符串' },
  { name: 'NCHAR', label: 'NCHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: 'Unicode字符' },
  { name: 'NVARCHAR', label: 'NVARCHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 255, description: 'Unicode可变长字符串' },
  { name: 'CLOB', label: 'CLOB', category: ColumnCategory.TEXT, description: '字符大对象' },

  // 二进制类型
  { name: 'BLOB', label: 'BLOB', category: ColumnCategory.BINARY, description: '二进制大对象' },
  { name: 'BINARY', label: 'BINARY', category: ColumnCategory.BINARY, requiresLength: true, defaultLength: 1, description: '二进制' },
  { name: 'VARBINARY', label: 'VARBINARY', category: ColumnCategory.BINARY, requiresLength: true, defaultLength: 255, description: '可变长二进制' },

  // 日期时间类型
  { name: 'DATE', label: 'DATE', category: ColumnCategory.DATE_TIME, description: '日期' },
  { name: 'DATETIME', label: 'DATETIME', category: ColumnCategory.DATE_TIME, description: '日期时间' },
  { name: 'TIME', label: 'TIME', category: ColumnCategory.DATE_TIME, description: '时间' },
  { name: 'TIMESTAMP', label: 'TIMESTAMP', category: ColumnCategory.DATE_TIME, description: '时间戳' },

  // 数值（特殊）
  { name: 'NUMERIC', label: 'NUMERIC', category: ColumnCategory.NUMERIC, requiresPrecision: true, requiresScale: true, defaultPrecision: 10, defaultScale: 2, description: '定点小数' },
  { name: 'DECIMAL', label: 'DECIMAL', category: ColumnCategory.NUMERIC, requiresPrecision: true, requiresScale: true, defaultPrecision: 10, defaultScale: 2, description: '定点小数' },
  { name: 'BOOLEAN', label: 'BOOLEAN', category: ColumnCategory.BOOLEAN, description: '布尔值' },

  // 其他类型
  { name: 'ANY', label: 'ANY', category: ColumnCategory.OTHER, description: '任意类型' }
];

/**
 * Oracle 列类型定义
 */
export const ORACLE_COLUMN_TYPES: ColumnType[] = [
  // 数值类型
  { name: 'NUMBER', label: 'NUMBER', category: ColumnCategory.NUMERIC, requiresPrecision: true, requiresScale: true, defaultPrecision: 10, defaultScale: 2, description: '数值类型' },
  { name: 'INTEGER', label: 'INTEGER', category: ColumnCategory.NUMERIC, description: '整数类型' },
  { name: 'INT', label: 'INT', category: ColumnCategory.NUMERIC, description: '整数类型' },
  { name: 'SMALLINT', label: 'SMALLINT', category: ColumnCategory.NUMERIC, description: '小整数类型' },
  { name: 'REAL', label: 'REAL', category: ColumnCategory.NUMERIC, description: '浮点数类型' },
  { name: 'DOUBLE PRECISION', label: 'DOUBLE PRECISION', category: ColumnCategory.NUMERIC, description: '双精度浮点数' },
  { name: 'FLOAT', label: 'FLOAT', category: ColumnCategory.NUMERIC, requiresPrecision: true, defaultPrecision: 126, description: '浮点数' },
  { name: 'BINARY_FLOAT', label: 'BINARY_FLOAT', category: ColumnCategory.NUMERIC, description: '二进制浮点数' },
  { name: 'BINARY_DOUBLE', label: 'BINARY_DOUBLE', category: ColumnCategory.NUMERIC, description: '双精度二进制浮点数' },

  // 字符串类型
  { name: 'CHAR', label: 'CHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: '固定长度字符串' },
  { name: 'VARCHAR2', label: 'VARCHAR2', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 4000, description: '可变长度字符串' },
  { name: 'NVARCHAR2', label: 'NVARCHAR2', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 2000, description: 'Unicode可变长度字符串' },
  { name: 'NCHAR', label: 'NCHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: 'Unicode固定长度字符串' },
  { name: 'CLOB', label: 'CLOB', category: ColumnCategory.TEXT, description: '字符大对象' },
  { name: 'NCLOB', label: 'NCLOB', category: ColumnCategory.TEXT, description: 'Unicode字符大对象' },
  { name: 'LONG', label: 'LONG', category: ColumnCategory.TEXT, description: '长字符串类型' },

  // 二进制类型
  { name: 'RAW', label: 'RAW', category: ColumnCategory.BINARY, requiresLength: true, defaultLength: 2000, description: '二进制数据' },
  { name: 'LONG RAW', label: 'LONG RAW', category: ColumnCategory.BINARY, description: '长二进制数据' },
  { name: 'BLOB', label: 'BLOB', category: ColumnCategory.BINARY, description: '二进制大对象' },
  { name: 'BFILE', label: 'BFILE', category: ColumnCategory.BINARY, description: '外部二进制文件' },

  // 日期时间类型
  { name: 'DATE', label: 'DATE', category: ColumnCategory.DATE_TIME, description: '日期时间' },
  { name: 'TIMESTAMP', label: 'TIMESTAMP', category: ColumnCategory.DATE_TIME, description: '时间戳' },
  { name: 'TIMESTAMP WITH TIME ZONE', label: 'TIMESTAMP WITH TIME ZONE', category: ColumnCategory.DATE_TIME, description: '带时区时间戳' },
  { name: 'TIMESTAMP WITH LOCAL TIME ZONE', label: 'TIMESTAMP WITH LOCAL TIME ZONE', category: ColumnCategory.DATE_TIME, description: '带本地时区时间戳' },
  { name: 'INTERVAL YEAR TO MONTH', label: 'INTERVAL YEAR TO MONTH', category: ColumnCategory.DATE_TIME, description: '年月间隔' },
  { name: 'INTERVAL DAY TO SECOND', label: 'INTERVAL DAY TO SECOND', category: ColumnCategory.DATE_TIME, description: '日秒间隔' },

  // 行标识符类型
  { name: 'ROWID', label: 'ROWID', category: ColumnCategory.OTHER, description: '行标识符' },
  { name: 'UROWID', label: 'UROWID', category: ColumnCategory.OTHER, description: '通用行标识符' },

  // XML 类型
  { name: 'XMLTYPE', label: 'XMLTYPE', category: ColumnCategory.OTHER, description: 'XML数据类型' },

  // 空间类型
  { name: 'SDO_GEOMETRY', label: 'SDO_GEOMETRY', category: ColumnCategory.SPATIAL, description: '空间几何类型' }
];

/**
 * SQL Server 列类型定义
 */
export const SQLSERVER_COLUMN_TYPES: ColumnType[] = [
  // 精确数值类型
  { name: 'BIGINT', label: 'BIGINT', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '大整数，8字节' },
  { name: 'INT', label: 'INT', category: ColumnCategory.NUMERIC, supportsAutoIncrement: true, description: '整数，4字节' },
  { name: 'SMALLINT', label: 'SMALLINT', category: ColumnCategory.NUMERIC, description: '小整数，2字节' },
  { name: 'TINYINT', label: 'TINYINT', category: ColumnCategory.NUMERIC, description: '微整数，1字节' },
  { name: 'BIT', label: 'BIT', category: ColumnCategory.BOOLEAN, description: '位类型，布尔值' },
  { name: 'DECIMAL', label: 'DECIMAL', category: ColumnCategory.NUMERIC, requiresPrecision: true, requiresScale: true, defaultPrecision: 18, defaultScale: 0, description: '定点小数' },
  { name: 'NUMERIC', label: 'NUMERIC', category: ColumnCategory.NUMERIC, requiresPrecision: true, requiresScale: true, defaultPrecision: 18, defaultScale: 0, description: '定点小数' },
  { name: 'MONEY', label: 'MONEY', category: ColumnCategory.NUMERIC, description: '货币类型，8字节' },
  { name: 'SMALLMONEY', label: 'SMALLMONEY', category: ColumnCategory.NUMERIC, description: '小货币类型，4字节' },

  // 近似数值类型
  { name: 'FLOAT', label: 'FLOAT', category: ColumnCategory.NUMERIC, requiresPrecision: true, defaultPrecision: 53, description: '浮点数' },
  { name: 'REAL', label: 'REAL', category: ColumnCategory.NUMERIC, description: '浮点数，4字节' },

  // 日期时间类型
  { name: 'DATE', label: 'DATE', category: ColumnCategory.DATE_TIME, description: '日期' },
  { name: 'TIME', label: 'TIME', category: ColumnCategory.DATE_TIME, description: '时间' },
  { name: 'DATETIMEOFFSET', label: 'DATETIMEOFFSET', category: ColumnCategory.DATE_TIME, description: '带时区日期时间' },
  { name: 'DATETIME2', label: 'DATETIME2', category: ColumnCategory.DATE_TIME, description: '扩展日期时间' },
  { name: 'SMALLDATETIME', label: 'SMALLDATETIME', category: ColumnCategory.DATE_TIME, description: '小日期时间' },
  { name: 'DATETIME', label: 'DATETIME', category: ColumnCategory.DATE_TIME, description: '日期时间' },

  // 字符串类型
  { name: 'CHAR', label: 'CHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: '固定长度字符串' },
  { name: 'VARCHAR', label: 'VARCHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: '可变长度字符串' },
  { name: 'TEXT', label: 'TEXT', category: ColumnCategory.TEXT, description: '文本' },
  { name: 'NCHAR', label: 'NCHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: 'Unicode固定长度字符串' },
  { name: 'NVARCHAR', label: 'NVARCHAR', category: ColumnCategory.STRING, requiresLength: true, defaultLength: 1, description: 'Unicode可变长度字符串' },
  { name: 'NTEXT', label: 'NTEXT', category: ColumnCategory.TEXT, description: 'Unicode文本' },

  // 二进制字符串类型
  { name: 'BINARY', label: 'BINARY', category: ColumnCategory.BINARY, requiresLength: true, defaultLength: 1, description: '固定长度二进制' },
  { name: 'VARBINARY', label: 'VARBINARY', category: ColumnCategory.BINARY, requiresLength: true, defaultLength: 1, description: '可变长度二进制' },
  { name: 'IMAGE', label: 'IMAGE', category: ColumnCategory.BINARY, description: '二进制图像' },

  // 其他类型
  { name: 'CURSOR', label: 'CURSOR', category: ColumnCategory.OTHER, description: '游标类型' },
  { name: 'TIMESTAMP', label: 'TIMESTAMP', category: ColumnCategory.OTHER, description: '时间戳类型' },
  { name: 'UNIQUEIDENTIFIER', label: 'UNIQUEIDENTIFIER', category: ColumnCategory.OTHER, description: '唯一标识符' },
  { name: 'SQL_VARIANT', label: 'SQL_VARIANT', category: ColumnCategory.OTHER, description: '变体类型' },
  { name: 'TABLE', label: 'TABLE', category: ColumnCategory.OTHER, description: '表类型' },
  { name: 'XML', label: 'XML', category: ColumnCategory.OTHER, description: 'XML数据类型' },

  // 空间类型
  { name: 'GEOGRAPHY', label: 'GEOGRAPHY', category: ColumnCategory.SPATIAL, description: '地理空间类型' },
  { name: 'GEOMETRY', label: 'GEOMETRY', category: ColumnCategory.SPATIAL, description: '几何空间类型' }
];

/**
 * 数据库类型配置映射
 */
export const DATABASE_TYPE_CONFIGS: Record<DatabaseType, DatabaseTypeConfig> = {
  [DatabaseType.MYSQL]: {
    value: DatabaseType.MYSQL,
    label: 'MySQL',
    icon: 'bi-database',
    defaultPort: 3306,
    description: 'MySQL数据库',
    supportedColumnTypes: MYSQL_COLUMN_TYPES
  },
  [DatabaseType.POSTGRESQL]: {
    value: DatabaseType.POSTGRESQL,
    label: 'PostgreSQL',
    icon: 'bi-database',
    defaultPort: 5432,
    description: 'PostgreSQL数据库',
    supportedColumnTypes: POSTGRESQL_COLUMN_TYPES
  },
  [DatabaseType.SQLITE]: {
    value: DatabaseType.SQLITE,
    label: 'SQLite',
    icon: 'bi-database',
    defaultPort: null,
    description: 'SQLite数据库',
    supportedColumnTypes: SQLITE_COLUMN_TYPES
  },
  [DatabaseType.ORACLE]: {
    value: DatabaseType.ORACLE,
    label: 'Oracle',
    icon: 'bi-database',
    defaultPort: 1521,
    description: 'Oracle数据库',
    supportedColumnTypes: ORACLE_COLUMN_TYPES
  },
  [DatabaseType.SQLSERVER]: {
    value: DatabaseType.SQLSERVER,
    label: 'SQL Server',
    icon: 'bi-database',
    defaultPort: 1433,
    description: 'Microsoft SQL Server',
    supportedColumnTypes: SQLSERVER_COLUMN_TYPES
  }
};

/**
 * 根据数据库类型获取列类型
 */
export function getColumnTypes(databaseType: DatabaseType): ColumnType[] {
  const config = DATABASE_TYPE_CONFIGS[databaseType];
  return config?.supportedColumnTypes || [];
}

/**
 * 根据数据库名称获取列类型
 */
export function getColumnTypesByName(databaseTypeName: string): ColumnType[] {
  const type = Object.values(DatabaseType).find(t => t === databaseTypeName.toLowerCase());
  return type ? getColumnTypes(type) : [];
}

/**
 * 根据类别获取列类型
 */
export function getColumnTypesByCategory(databaseType: DatabaseType, category: ColumnCategory): ColumnType[] {
  const allTypes = getColumnTypes(databaseType);
  return allTypes.filter(type => type.category === category);
}

/**
 * 获取所有支持的数据库类型配置
 */
export function getDatabaseTypeConfigs(): DatabaseTypeConfig[] {
  return Object.values(DATABASE_TYPE_CONFIGS);
}

/**
 * 获取所有支持的数据库类型
 */
export function getSupportedDatabaseTypes(): DatabaseType[] {
  return Object.values(DatabaseType);
}