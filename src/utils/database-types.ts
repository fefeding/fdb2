/**
 * 数据库类型工具函数
 */

// 导出类型定义
export * from '@/typings/database-types';

/**
 * 获取类型类别标签
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    numeric: '数值类型',
    string: '字符串类型',
    text: '文本类型',
    date_time: '日期时间类型',
    boolean: '布尔类型',
    binary: '二进制类型',
    json: 'JSON类型',
    array: '数组类型',
    spatial: '空间类型',
    other: '其他类型'
  };
  return labels[category] || category;
}

/**
 * 检查是否为数值类型
 */
export function isNumericType(type: string): boolean {
  const numericTypes = ['int', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint', 
          'decimal', 'numeric', 'float', 'double', 'real', 'number',
          'smallserial', 'serial', 'bigserial', 'money', 'smallmoney',
          'binary_float', 'binary_double'];
  return numericTypes.some(t => type.toLowerCase().includes(t));
}

/**
 * 检查是否为字符串类型
 */
export function isStringType(type: string): boolean {
  const stringTypes = ['varchar', 'char', 'text', 'longtext', 'mediumtext', 'tinytext', 
          'nvarchar', 'nchar', 'ntext', 'character varying', 'character',
          'varchar2', 'nvarchar2', 'clob', 'nclob'];
  return stringTypes.some(t => type.toLowerCase().includes(t));
}

/**
 * 检查是否为文本类型
 */
export function isTextType(type: string): boolean {
  const textTypes = ['text', 'longtext', 'mediumtext', 'tinytext', 
          'clob', 'nclob', 'ntext'];
  return textTypes.some(t => type.toLowerCase().includes(t));
}

/**
 * 检查是否为日期时间类型
 */
export function isDateTimeType(type: string): boolean {
  const dateTimeTypes = ['date', 'datetime', 'timestamp', 'time', 'year',
          'time with time zone', 'timestamp with time zone', 'timestamp with local time zone',
          'interval', 'datetimeoffset', 'datetime2', 'smalldatetime'];
  return dateTimeTypes.some(t => type.toLowerCase().includes(t));
}

/**
 * 检查是否为布尔类型
 */
export function isBooleanType(type: string): boolean {
  const booleanTypes = ['boolean', 'bool', 'bit', 'tinyint(1)'];
  return booleanTypes.some(t => type.toLowerCase().includes(t));
}

/**
 * 检查是否为二进制类型
 */
export function isBinaryType(type: string): boolean {
  const binaryTypes = ['binary', 'varbinary', 'blob', 'image', 'raw', 'long raw', 'bfile', 'bytea'];
  return binaryTypes.some(t => type.toLowerCase().includes(t));
}

/**
 * 检查是否为JSON类型
 */
export function isJsonType(type: string): boolean {
  return ['json', 'jsonb'].includes(type.toLowerCase());
}

/**
 * 检查是否为数组类型
 */
export function isArrayType(type: string): boolean {
  return type.toLowerCase().endsWith('[]');
}

/**
 * 检查是否为空间类型
 */
export function isSpatialType(type: string): boolean {
  const spatialTypes = ['geometry', 'point', 'linestring', 'polygon', 'geography',
          'sdo_geometry', 'line', 'lseg', 'box', 'path', 'circle'];
  return spatialTypes.some(t => type.toLowerCase().includes(t));
}

/**
 * 获取数据库名称的显示标签
 */
export function getDatabaseTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'mysql': 'MySQL',
    'postgres': 'PostgreSQL',
    'postgresql': 'PostgreSQL',
    'sqlite': 'SQLite',
    'oracle': 'Oracle',
    'mssql': 'SQL Server',
    'sqlserver': 'SQL Server'
  };
  return labels[type.toLowerCase()] || type;
}

/**
 * 获取数据库类型图标
 */
export function getDatabaseTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'mysql': 'bi-database',
    'postgres': 'bi-database',
    'postgresql': 'bi-database',
    'sqlite': 'bi-database',
    'oracle': 'bi-database',
    'mssql': 'bi-database',
    'sqlserver': 'bi-database'
  };
  return icons[type.toLowerCase()] || 'bi-database';
}

/**
 * 格式化默认值用于SQL
 */
export function formatDefaultValue(value: any, type: string): string {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }
  
  const lowerType = type.toLowerCase();
  
  // 数值类型不加引号
  if (isNumericType(lowerType) && !isNaN(value)) {
    return String(value);
  }
  
  // 布尔类型
  if (isBooleanType(lowerType)) {
    return value ? 'TRUE' : 'FALSE';
  }
  
  // 特殊关键字处理
  if (value.toString().toUpperCase() === 'CURRENT_TIMESTAMP' ||
      value.toString().toUpperCase() === 'NOW()' ||
      value.toString().toUpperCase() === 'CURRENT_DATE') {
    return value.toString().toUpperCase();
  }
  
  // 字符串类型加引号
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * 获取数据库特定的标识符引用方式
 */
export function getIdentifierQuote(databaseType: string): string {
  switch (databaseType.toLowerCase()) {
    case 'mysql': return '`';
    case 'postgres': return '"';
    case 'sqlite': return '"';
    case 'oracle': return '"';
    case 'mssql': return '[';
    case 'sqlserver': return '[';
    default: return '"';
  }
}

/**
 * 引用标识符
 */
export function quoteIdentifier(identifier: string, databaseType: string): string {
  const quote = getIdentifierQuote(databaseType);
  return `${quote}${identifier}${quote}`;
}

/**
 * 解析类型参数
 */
export function parseTypeDefinition(typeDef: string): { type: string; length?: number; precision?: number; scale?: number } {
  const typeMatch = typeDef.match(/^(\w+)(?:\(([^)]+)\))?/);
  if (!typeMatch) {
    return { type: typeDef.trim() };
  }
  
  const type = typeMatch[1];
  const params = typeMatch[2];
  
  let length: number | undefined;
  let precision: number | undefined;
  let scale: number | undefined;
  
  if (params) {
    const parts = params.split(',').map(p => p.trim());
    
    // 处理长度 (VARCHAR(255))
    if (parts.length === 1 && !isNaN(parseInt(parts[0]))) {
      length = parseInt(parts[0]);
    }
    
    // 处理精度和小数 (DECIMAL(10,2))
    if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
      precision = parseInt(parts[0]);
      scale = parseInt(parts[1]);
    }
  }
  
  return { type, length, precision, scale };
}

/**
 * 构建类型定义字符串
 */
export function buildTypeDefinition(type: string, length?: number, precision?: number, scale?: number): string {
  let typeDef = type;
  
  if (length !== undefined && length !== null) {
    typeDef += `(${length})`;
  } else if (precision !== undefined && precision !== null) {
    if (scale !== undefined && scale !== null) {
      typeDef += `(${precision},${scale})`;
    } else {
      typeDef += `(${precision})`;
    }
  }
  
  return typeDef;
}