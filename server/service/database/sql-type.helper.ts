/**
 * SQL 类型参数工具。
 *
 * 解决的问题：前端提交的列类型可能只带基础类型名（如 VARCHAR）而长度/精度为空，
 * 直接拼接会生成非法 SQL（MySQL 的 `VARCHAR` 必须带长度、`DECIMAL` 必须带精度）。
 * 这里按数据库补齐默认参数；类型本身已带括号（如 ENUM('a','b')、DECIMAL(10,2)）时原样返回。
 */

interface TypeDefault {
  length?: number;
  precision?: number;
  scale?: number;
}

/**
 * 各数据库中「缺参即非法」的类型的默认参数。
 * SQLite 的 VARCHAR 等不带长度也合法，因此不在此列。
 */
const TYPE_DEFAULTS: Record<string, Record<string, TypeDefault>> = {
  mysql: {
    tinyint: { length: 4 },
    smallint: { length: 6 },
    mediumint: { length: 9 },
    int: { length: 11 },
    integer: { length: 11 },
    bigint: { length: 20 },
    decimal: { precision: 10, scale: 2 },
    float: { precision: 10, scale: 2 },
    double: { precision: 16, scale: 4 },
    bit: { length: 1 },
    char: { length: 1 },
    varchar: { length: 255 },
    binary: { length: 1 },
    varbinary: { length: 255 }
  },
  postgres: {
    decimal: { precision: 10, scale: 2 },
    numeric: { precision: 10, scale: 2 },
    'character varying': { length: 255 },
    varchar: { length: 255 },
    character: { length: 1 },
    char: { length: 1 }
  },
  mssql: {
    decimal: { precision: 18, scale: 0 },
    numeric: { precision: 18, scale: 0 },
    float: { precision: 53 },
    char: { length: 1 },
    varchar: { length: 255 },
    nchar: { length: 1 },
    nvarchar: { length: 255 },
    binary: { length: 1 },
    varbinary: { length: 255 }
  },
  oracle: {
    char: { length: 1 },
    nchar: { length: 1 },
    varchar2: { length: 4000 },
    nvarchar2: { length: 2000 },
    raw: { length: 2000 }
  }
};

/** 类型是否已自带参数（如 VARCHAR(255)、DECIMAL(10,2)、ENUM('a','b')） */
export function hasTypeParams(type: string): boolean {
  return !!type && type.includes('(');
}

/** 提取类型的基础名称（去掉括号及参数） */
export function baseTypeName(type: string): string {
  if (!type) return '';
  const match = type.trim().match(/^([a-zA-Z\s]+?)\s*\(/);
  const base = match?.[1] ?? type;
  return base.trim().toLowerCase();
}

/** 把用户输入的长度/精度/小数位规整为数字，空值视为未填写 */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

/**
 * 构建列类型字符串，按数据库补齐缺失的长度/精度参数。
 *
 * @param databaseType mysql | postgres | mssql | oracle | sqlite
 * @param type 列类型（可能已带参数）
 * @param length 用户填写的长度
 * @param precision 用户填写的精度
 * @param scale 用户填写的小数位
 */
export function buildColumnType(
  databaseType: string,
  type: string,
  length?: number | string | null,
  precision?: number | string | null,
  scale?: number | string | null
): string {
  if (!type || hasTypeParams(type)) return type;

  const defaults = TYPE_DEFAULTS[String(databaseType || '').toLowerCase()]?.[baseTypeName(type)];
  if (!defaults) return type;

  if (defaults.precision != null) {
    const p = toNumber(precision) ?? defaults.precision;
    const s = toNumber(scale) ?? defaults.scale;
    return s != null ? `${type}(${p},${s})` : `${type}(${p})`;
  }

  if (defaults.length != null) {
    const l = toNumber(length) ?? defaults.length;
    return l != null ? `${type}(${l})` : type;
  }

  return type;
}

/** 转义 SQL 字符串字面量中的单引号 */
export function escapeSqlString(value: any): string {
  return String(value ?? '').replace(/'/g, "''");
}

/** 各数据库常见的函数/关键字形式默认值（应原样输出，不加引号） */
const DEFAULT_KEYWORDS = new Set([
  'current_timestamp', 'now()', 'current_date', 'current_time',
  'localtimestamp', 'localtime', 'current_user',
  'sysdate', 'systimestamp', 'getdate()', 'getutcdate()',
  'sysdatetime()', 'sysdatetimeoffset()', 'sysutcdatetime()',
  'newid()', 'newsequentialid()', 'gen_random_uuid()', 'uuid_generate_v4()'
]);

/** 默认值是否为函数/关键字形式（不加引号） */
export function isFunctionDefault(value: any): boolean {
  if (value === null || value === undefined) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (lower === 'null') return true;
  if (DEFAULT_KEYWORDS.has(lower)) return true;
  // now() / getdate() / newid() 等零参函数调用
  if (/^[a-z_][a-z0-9_]*\s*\(\s*\)$/.test(lower)) return true;
  // current_timestamp(6) 等带精度参数的时间函数
  if (/^current_timestamp\s*\(\s*\d+\s*\)$/.test(lower)) return true;
  return false;
}

/** 生成 SQL 默认值字面量（函数原样输出，其余加引号并转义） */
export function formatDefaultLiteral(value: any): string {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'NULL';
  }
  if (isFunctionDefault(value)) {
    return String(value).trim();
  }
  return `'${escapeSqlString(value)}'`;
}
