/**
 * 「缺参即非法」的列类型在各方言下的默认参数。
 *
 * 背景：前端表单允许只填基础类型名（如 VARCHAR）而不填长度/精度，直接拼接会生成
 * 非法 SQL——MySQL 的 `VARCHAR` 必须带长度、`DECIMAL` 必须带精度，否则报
 * ER_PARSE_ERROR。缺参时按本表补齐，保证生成的 DDL 合法。
 *
 * 刻意不列默认的情况：
 *   - SQLite：VARCHAR/DECIMAL 不带长度同样合法，保持原样输出（避免无意义的类型膨胀）；
 *   - ClickHouse / SAP / MongoDB：类型体系不要求长度，或改表本就不支持。
 *
 * 这是全项目唯一的默认参数来源；service 层的 sql-type.helper 已改为复用本表，
 * 避免两处参数漂移。
 */
import type { DialectKind } from '../dialect';

export interface TypeParamDefault {
  length?: number;
  precision?: number;
  scale?: number;
}

/** PostgreSQL 与 CockroachDB 共用同一套数值/字符默认值 */
const PG_DEFAULTS: Record<string, TypeParamDefault> = {
  decimal: { precision: 10, scale: 2 },
  numeric: { precision: 10, scale: 2 },
  'character varying': { length: 255 },
  varchar: { length: 255 },
  character: { length: 1 },
  char: { length: 1 }
};

export const TYPE_PARAM_DEFAULTS: Record<DialectKind, Record<string, TypeParamDefault>> = {
  mysql: {
    // 整数刻意不设默认：MySQL 的 INT/TINYINT 等裸写合法，括号里的"显示宽度"自 8.0.17 起
    // 已废弃，补成 INT(11) 既是无意义噪音，也会与实时结构里的 `int` 产生假差异。
    decimal: { precision: 10, scale: 2 },
    float: { precision: 10, scale: 2 },
    double: { precision: 16, scale: 4 },
    bit: { length: 1 },
    char: { length: 1 },
    varchar: { length: 255 },
    binary: { length: 1 },
    varbinary: { length: 255 }
  },
  postgres: PG_DEFAULTS,
  cockroachdb: PG_DEFAULTS,
  sqlite: {},
  oracle: {
    char: { length: 1 },
    nchar: { length: 1 },
    varchar2: { length: 4000 },
    nvarchar2: { length: 2000 },
    raw: { length: 2000 }
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
  mongodb: {},
  sap: {},
  clickhouse: {}
};

/**
 * 取某方言下某类型的默认参数；无默认值返回 undefined（即该类型允许裸写）。
 * 比较按基础类型名的小写形式，与 canonical 化后的大小写无关。
 */
export function typeParamDefault(kind: DialectKind, baseType: string): TypeParamDefault | undefined {
  if (!baseType) return undefined;
  return TYPE_PARAM_DEFAULTS[kind]?.[String(baseType).trim().toLowerCase()];
}
