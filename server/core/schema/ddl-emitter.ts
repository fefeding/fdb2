/**
 * 方言 DDL 生成器：ChangeSet → 各数据库的 DDL 语句序列。
 *
 * 与历史上"前端拼 SQL / 各方言 service 各自拼 ALTER"的关键差异：
 *   1. 单一出口——预览与执行共用 emitAlterDdl，天然"所见即所得"，
 *      杜绝旧实现里"前端预览 A、后端执行 B"的分叉；
 *   2. 渲染输入是 CanonicalColumn（defaultKind 三态 + effectiveAutoIncrement clamp），
 *      MySQL MODIFY 重建整列定义时不会把 DEFAULT '' / DEFAULT 0 写丢；
 *   3. MySQL 主键/自增的鸡蛋问题有确定性编排：
 *      去自增的 MODIFY → DROP PRIMARY KEY → ADD PRIMARY KEY → 其余列语句
 *      （AUTO_INCREMENT 列必须被索引；先 ADD PK 再 MODIFY 加自增）；
 *   4. SQLite rebuild 是纯函数：固定临时表名 + 先 DROP IF EXISTS，
 *      同一输入永远得到同一语句序列（可测试、可幂等重试）。
 *
 * 纯函数不变式：emitAlterDdl(kind, c, c) === []。
 */
import type {
  CanonicalColumn,
  CanonicalTable,
  DdlCapability,
  TableChangeSet
} from '../../model/ddl-spec';
import type { DialectKind } from '../dialect';
import { diffTable } from './diff';
import { typeParamDefault } from './type-defaults';
import { isEmptyChangeSet } from '../../model/ddl-spec';

// ---------------------------------------------------------------- 引用与转义

function quote(kind: DialectKind, name: string): string {
  const n = String(name);
  switch (kind) {
    case 'mysql':
      return '`' + n.replace(/`/g, '``') + '`';
    case 'clickhouse':
      // 与 CAPS 声明的 quoteStyle: 'backtick' 一致（ClickHouse 默认反引号）
      return '`' + n.replace(/`/g, '``') + '`';
    case 'mssql':
      return '[' + n.replace(/]/g, ']]') + ']';
    case 'oracle':
      // Oracle 未加引号的标识符默认大写；沿用前端既有行为统一大写
      return '"' + n.toUpperCase().replace(/"/g, '""') + '"';
    default:
      return '"' + n.replace(/"/g, '""') + '"';
  }
}

function esc(s: string): string {
  return String(s).replace(/'/g, "''");
}

// ---------------------------------------------------------------- 类型与默认值渲染



/**
 * CanonicalColumn → 类型串（canonical 化的逆投影；自定义类型全串原样）
 *
 * kind 必填：仅填了基础类型名（VARCHAR）而未填长度时，MySQL 等方言下必须补默认参数，
 * 否则会生成 `VARCHAR` 这类非法类型（ER_PARSE_ERROR）。默认参数见 type-defaults。
 */
export function renderType(col: CanonicalColumn, kind: DialectKind): string {
  // 含 '(' 或引号 → canonicalizeType 判定为自定义全串（ENUM('a','b') 等），原样输出
  if (/[(']/.test(col.baseType)) return col.baseType;

  let length = col.length;
  let precision = col.precision;
  let scale = col.scale;

  // 三项都没指定时才套默认；已填任意一项即尊重用户显式输入
  if (length === undefined && precision === undefined && scale === undefined) {
    const d = typeParamDefault(kind, col.baseType);
    if (d) {
      if (d.length !== undefined) length = d.length;
      if (d.precision !== undefined) precision = d.precision;
      if (d.scale !== undefined) scale = d.scale;
    }
  }

  if (precision !== undefined && scale !== undefined) {
    return `${col.baseType}(${precision},${scale})`;
  }
  if (precision !== undefined) return `${col.baseType}(${precision})`;
  if (length !== undefined) return `${col.baseType}(${length})`;
  return col.baseType;
}

/** literal 是否按数字/布尔裸输出（不加引号） */
function isBareLiteral(text: string): boolean {
  if (/^-?\d+(\.\d+)?$/.test(text)) return true;
  const up = text.toUpperCase();
  return up === 'TRUE' || up === 'FALSE';
}

/** 默认值的 DEFAULT 子句片段（不带 DEFAULT 关键字）；null 表示无默认值 */
export function renderDefault(col: CanonicalColumn): string | null {
  switch (col.defaultKind) {
    case 'none':
      return null;
    case 'null':
      return 'NULL';
    case 'expression':
      return col.defaultText;
    case 'literal':
      return isBareLiteral(col.defaultText) ? col.defaultText : `'${esc(col.defaultText)}'`;
    default:
      return null;
  }
}

// ---------------------------------------------------------------- 能力声明

const CAPS: Record<DialectKind, DdlCapability> = {
  mysql: {
    createTable: true, alterTable: true, dropTable: true, renameTable: true,
    alterColumn: true, renameColumn: true, alterPrimaryKey: true,
    tableComment: true, columnComment: true,
    alterStrategy: 'native', quoteStyle: 'backtick'
  },
  postgres: {
    createTable: true, alterTable: true, dropTable: true, renameTable: true,
    alterColumn: true, renameColumn: true, alterPrimaryKey: true,
    tableComment: true, columnComment: true,
    alterStrategy: 'native', quoteStyle: 'double'
  },
  cockroachdb: {
    createTable: true, alterTable: true, dropTable: true, renameTable: true,
    alterColumn: true, renameColumn: true, alterPrimaryKey: false,
    tableComment: true, columnComment: true,
    alterStrategy: 'native', quoteStyle: 'double'
  },
  sqlite: {
    createTable: true, alterTable: true, dropTable: true, renameTable: true,
    alterColumn: false, renameColumn: true,
    // SQLite 原生 ALTER 不支持改主键，但 alterStrategy='rebuild' 会整表重建，
    // 主键变更可以正确落地并保留数据 → 按真实能力声明为支持（旧值 false 会误禁 UI）
    alterPrimaryKey: true,
    tableComment: false, columnComment: false,
    alterStrategy: 'rebuild', quoteStyle: 'double'
  },
  oracle: {
    createTable: true, alterTable: true, dropTable: true, renameTable: true,
    alterColumn: true, renameColumn: true, alterPrimaryKey: true,
    tableComment: true, columnComment: true,
    alterStrategy: 'native', quoteStyle: 'double'
  },
  mssql: {
    createTable: true, alterTable: true, dropTable: true, renameTable: true,
    // 主键约束名由 SQL Server 自动生成（PK__<table>__<hash>），变更集里推不出来，
    // 但可以在生成语句前回查 sys.key_constraints 拿到真实名（见 getPrimaryKeyConstraintName）
    // → 声明为支持；确实定位不到时由 buildAlterPlan 报明确错误，而不是静默无语句
    alterColumn: true, renameColumn: true, alterPrimaryKey: true,
    tableComment: true, columnComment: true,
    alterStrategy: 'native', quoteStyle: 'bracket'
  },
  mongodb: {
    createTable: false, alterTable: false, dropTable: true, renameTable: false,
    alterColumn: false, renameColumn: false, alterPrimaryKey: false,
    tableComment: false, columnComment: false,
    alterStrategy: 'unsupported', quoteStyle: 'double'
  },
  sap: {
    createTable: true, alterTable: false, dropTable: true, renameTable: true,
    alterColumn: false, renameColumn: false, alterPrimaryKey: false,
    tableComment: false, columnComment: false,
    alterStrategy: 'unsupported', quoteStyle: 'double'
  },
  clickhouse: {
    createTable: true, alterTable: true, dropTable: true, renameTable: true,
    alterColumn: true, renameColumn: false, alterPrimaryKey: false,
    tableComment: true, columnComment: true,
    alterStrategy: 'native', quoteStyle: 'backtick'
  }
};

export function ddlCapabilities(kind: DialectKind): DdlCapability {
  return { ...(CAPS[kind] ?? CAPS.mysql) };
}

/**
 * 生成 ALTER 所需的、无法从变更集推断的运行时信息。
 * mssqlPkConstraintName：SQL Server 主键约束名是自动生成的（PK__<table>__<hash>），
 * 必须回查系统表获得；缺失时 DROP CONSTRAINT 必然失败，由调用方先判为错误。
 */
export interface AlterDdlOptions {
  mssqlPkConstraintName?: string;
}

// ---------------------------------------------------------------- ALTER 主入口

/**
 * 结构变更 DDL：内部完成 diff 并按方言渲染。
 * 语句顺序有语义（MySQL PK/AI 编排、SQLite rebuild），调用方必须按序执行。
 */
export function emitAlterDdl(
  kind: DialectKind,
  original: CanonicalTable,
  desired: CanonicalTable,
  opts?: AlterDdlOptions
): string[] {
  if (CAPS[kind]?.alterStrategy === 'unsupported') return [];
  const cs = diffTable(original, desired);
  if (isEmptyChangeSet(cs)) return []; // SQLite rebuild 等策略下"未修改"绝不能触发重建
  switch (kind) {
    case 'mysql':
      return emitMysqlAlter(cs, desired);
    case 'postgres':
    case 'cockroachdb':
      return emitPgAlter(kind, cs, desired);
    case 'sqlite':
      // 对齐旧实现：仅新增列时走 ADD COLUMN 快速路径，避免整表重建拷贝数据
      if (cs.added.length > 0 && cs.renamed.length === 0 && cs.modified.length === 0 &&
          cs.dropped.length === 0 && !cs.primaryKey && !cs.rename && !cs.comment && !cs.orderChanged) {
        return cs.added.map((col) => {
          let def = `${quote('sqlite', col.name)} ${renderType(col, 'sqlite')}`;
          if (!col.nullable) def += ' NOT NULL';
          const dv = renderDefault(col);
          if (dv !== null) def += ` DEFAULT ${dv}`;
          return `ALTER TABLE ${quote('sqlite', desired.name)} ADD COLUMN ${def}`;
        });
      }
      return emitSqliteRebuild(original, desired, cs);
    case 'oracle':
      return emitOracleAlter(cs, desired);
    case 'mssql':
      return emitMssqlAlter(cs, desired, opts?.mssqlPkConstraintName);
    case 'clickhouse':
      return emitClickHouseAlter(cs, desired);
    default:
      return [];
  }
}

/**
 * 表名等价判断：按方言的大小写语义比较。
 * PG/CockroachDB 会把裸标识符落成小写、Oracle/SAP 落成大写、SQLite/MSSQL 一般不敏感，
 * 只有 ClickHouse/MongoDB 的标识符严格区分大小写——统一用 === 会漏判（PG 下 `Users` 与 `users` 冲突）。
 */
export function tableNameEquals(kind: DialectKind, a: string, b: string): boolean {
  if (a === b) return true;
  if (kind === 'clickhouse' || kind === 'mongodb') return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// ---------------------------------------------------------------- CREATE TABLE

/** emitCreateDdl 的可选参数 */
export interface EmitCreateOptions {
  /** 输出 CREATE TABLE IF NOT EXISTS（导出/同步场景） */
  ifNotExists?: boolean;
  /** mssql 三段名前缀（数据库名）——对齐方言 createTable 的 [db].[dbo].[table] 行为 */
  mssqlDatabase?: string;
  /** clickhouse 表引擎（默认 MergeTree） */
  engine?: string;
  /** 表名覆盖（SQLite rebuild 复用同一渲染，固定临时表名） */
  tableNameOverride?: string;
}

/**
 * 建表 DDL：所有运行时建表（前端创建表 / syncTable 方言 createTable / SQLite rebuild 临时表）
 * 的单一出口。输入 CanonicalTable（经 canonicalizeTableSpec / canonicalizeTableEntity 投影），
 * 方言差异集中在此——顺带修复旧方言 createTable 的共知缺陷：
 *   - PG/CRDB 曾输出 `"col" int SERIAL` 与内联 `COMMENT`（均为语法错误）；
 *   - SQLite 曾丢失主键、AUTOINCREMENT 脱离 PRIMARY KEY 单独输出；
 *   - 默认值用 `if (defaultValue)` 假值兜底（DEFAULT 0 丢失）且一律加引号（`DEFAULT '5'`）。
 */
export function emitCreateDdl(
  kind: DialectKind,
  table: CanonicalTable,
  opts: EmitCreateOptions = {}
): string[] {
  const name = opts.tableNameOverride ?? table.name;
  const ine = opts.ifNotExists ? ' IF NOT EXISTS' : '';
  switch (kind) {
    case 'mysql':
      return [emitMysqlCreate(table, name, ine)];
    case 'postgres':
    case 'cockroachdb':
      return emitPgCreate(kind, table, name, ine);
    case 'sqlite':
      return [emitSqliteCreate(name, ine, table)];
    case 'oracle':
      return emitOracleCreate(table, name, ine);
    case 'mssql':
      return emitMssqlCreate(table, name, ine, opts.mssqlDatabase);
    case 'clickhouse':
      return [emitClickhouseCreate(table, name, ine, opts.engine ?? 'MergeTree')];
    case 'sap':
      return [emitSapCreate(table, name)];
    default:
      // mongodb 等非 SQL 方言由调用方按 caps.createTable 拒绝
      return [];
  }
}

function emitMysqlCreate(table: CanonicalTable, name: string, ine: string): string {
  const q = (n: string) => quote('mysql', n);
  const defs = table.columns.map((col) => mysqlColumnDef('mysql', col));
  if (table.primaryKey.length > 0) {
    defs.push(`PRIMARY KEY (${table.primaryKey.map(q).join(', ')})`);
  }
  // 表选项对齐旧前端 create 行为：InnoDB + utf8mb4（方言旧版缺失引擎项）
  let sql = `CREATE TABLE${ine} ${q(name)} (\n  ${defs.join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
  if (table.comment) sql += ` COMMENT='${esc(table.comment)}'`;
  return sql;
}

/** PG/CRDB 列定义（CREATE 与 ALTER ADD COLUMN 共用） */
function pgColumnDef(kind: DialectKind, col: CanonicalColumn): string {
  const q = (n: string) => quote(kind, n);
  let def = `${q(col.name)} ${renderType(col, kind)}`;
  if (!col.nullable) def += ' NOT NULL';
  const dv = renderDefault(col);
  if (dv !== null) def += ` DEFAULT ${dv}`;
  if (col.effectiveAutoIncrement && !/SERIAL/i.test(renderType(col, kind))) {
    def += ' GENERATED ALWAYS AS IDENTITY';
  }
  return def;
}

function emitPgCreate(kind: DialectKind, table: CanonicalTable, name: string, ine: string): string[] {
  const q = (n: string) => quote(kind, n);
  const defs = table.columns.map((col) => pgColumnDef(kind, col));
  if (table.primaryKey.length > 0) {
    defs.push(`PRIMARY KEY (${table.primaryKey.map(q).join(', ')})`);
  }
  const out = [`CREATE TABLE${ine} ${q(name)} (\n  ${defs.join(',\n  ')}\n)`];
  if (table.comment) out.push(`COMMENT ON TABLE ${q(name)} IS '${esc(table.comment)}'`);
  for (const col of table.columns) {
    if (col.comment) out.push(`COMMENT ON COLUMN ${q(name)}.${q(col.name)} IS '${esc(col.comment)}'`);
  }
  return out;
}

function emitSqliteCreate(name: string, ine: string, table: CanonicalTable): string {
  const q = (n: string) => quote('sqlite', n);
  // 单列主键内联（INTEGER PRIMARY KEY AUTOINCREMENT 隐式 rowid 主键）；多列用表级约束
  const singlePk = table.primaryKey.length === 1 ? table.primaryKey[0]! : null;
  const defs = table.columns.map((col) => {
    // SQLite 的 AUTOINCREMENT 要求列类型字面为 INTEGER（INT/BIGINT 均不合法）
    const isRowidPk = singlePk === col.name && col.effectiveAutoIncrement;
    const type = isRowidPk ? 'INTEGER' : renderType(col, 'sqlite');
    let def = `${q(col.name)} ${type}`;
    if (!col.nullable) def += ' NOT NULL';
    const dv = renderDefault(col);
    if (dv !== null) def += ` DEFAULT ${dv}`;
    if (singlePk === col.name) {
      def += col.effectiveAutoIncrement ? ' PRIMARY KEY AUTOINCREMENT' : ' PRIMARY KEY';
    }
    return def;
  });
  if (!singlePk && table.primaryKey.length > 0) {
    defs.push(`PRIMARY KEY (${table.primaryKey.map(q).join(', ')})`);
  }
  return `CREATE TABLE${ine} ${q(name)} (\n  ${defs.join(',\n  ')}\n)`;
}

function emitOracleCreate(table: CanonicalTable, name: string, ine: string): string[] {
  const q = (n: string) => quote('oracle', n);
  const defs = table.columns.map((col) => oracleColumnDef(col));
  if (table.primaryKey.length > 0) {
    defs.push(`PRIMARY KEY (${table.primaryKey.map(q).join(', ')})`);
  }
  const out = [`CREATE TABLE${ine} ${q(name)} (\n  ${defs.join(',\n  ')}\n)`];
  if (table.comment) out.push(`COMMENT ON TABLE ${q(name)} IS '${esc(table.comment)}'`);
  for (const col of table.columns) {
    if (col.comment) out.push(`COMMENT ON COLUMN ${q(name)}.${q(col.name)} IS '${esc(col.comment)}'`);
  }
  return out;
}

function emitMssqlCreate(
  table: CanonicalTable,
  name: string,
  ine: string,
  mssqlDatabase?: string
): string[] {
  const q = (n: string) => quote('mssql', n);
  const qualified = mssqlDatabase ? `[${mssqlDatabase}].[dbo].${q(name)}` : q(name);
  const defs = table.columns.map((col) => {
    let def = `${q(col.name)} ${renderType(col, 'mssql')}`;
    if (!col.nullable) def += ' NOT NULL';
    const dv = renderDefault(col);
    if (dv !== null) def += ` DEFAULT ${dv}`;
    if (col.effectiveAutoIncrement) def += ' IDENTITY(1,1)';
    return def;
  });
  if (table.primaryKey.length > 0) {
    defs.push(`PRIMARY KEY (${table.primaryKey.map(q).join(', ')})`);
  }
  const out = [`CREATE TABLE${ine} ${qualified} (\n  ${defs.join(',\n  ')}\n)`];
  if (table.comment) out.push(mssqlTableComment(name, table.comment));
  for (const col of table.columns) {
    if (col.comment) out.push(mssqlColumnComment(name, col.name, col.comment));
  }
  return out;
}

function mssqlTableComment(table: string, comment: string): string {
  return (
    `EXEC sp_addextendedproperty @name=N'MS_Description', @value=N'${esc(comment)}', ` +
    `@level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'TABLE', @level1name=N'${esc(table)}'`
  );
}

function emitClickhouseCreate(
  table: CanonicalTable,
  name: string,
  ine: string,
  engine: string
): string {
  const q = (n: string) => quote('clickhouse', n);
  const defs = table.columns.map((col) => {
    // ClickHouse 的可空性由 Nullable(...) 表达，裸类型即不可空；
    // 不能同时写 NOT NULL（与 Nullable 冲突且是 no-op）。已是 Nullable(...) 的不重复包装。
    const base = renderType(col, 'clickhouse');
    const type = col.nullable && !/^Nullable\(/i.test(base) ? `Nullable(${base})` : base;
    let def = `${q(col.name)} ${type}`;
    const dv = renderDefault(col);
    if (dv !== null) def += ` DEFAULT ${dv}`;
    if (col.comment) def += ` COMMENT '${esc(col.comment)}'`;
    return def;
  });
  // ClickHouse 的主键语义必须落在 ENGINE 之后的 ORDER BY（主键默认即排序键）
  let sql = `CREATE TABLE${ine} ${q(name)} (\n  ${defs.join(',\n  ')}\n) ENGINE = ${engine}`;
  sql += table.primaryKey.length > 0
    ? ` ORDER BY (${table.primaryKey.map(q).join(', ')})`
    : ' ORDER BY tuple()';
  if (table.comment) sql += ` COMMENT '${esc(table.comment)}'`;
  return sql;
}

/** SAP HANA：CREATE COLUMN TABLE（方言 createTable 既有形态，含内联 COMMENT 与 IDENTITY） */
function emitSapCreate(table: CanonicalTable, name: string): string {
  const q = (n: string) => quote('sap', n);
  const defs = table.columns.map((col) => {
    let def = `${q(col.name)} ${renderType(col, 'sap')}`;
    if (!col.nullable) def += ' NOT NULL';
    const dv = renderDefault(col);
    if (dv !== null) def += ` DEFAULT ${dv}`;
    if (col.effectiveAutoIncrement) def += ' GENERATED BY DEFAULT AS IDENTITY';
    if (col.comment) def += ` COMMENT '${esc(col.comment)}'`;
    return def;
  });
  if (table.primaryKey.length > 0) {
    defs.push(`PRIMARY KEY (${table.primaryKey.map(q).join(', ')})`);
  }
  // 表注释为 HANA 的表级 COMMENT 后缀（对齐旧方言 createTable 行为）
  let sql = `CREATE COLUMN TABLE ${q(name)} (\n  ${defs.join(',\n  ')}\n)`;
  if (table.comment) sql += ` COMMENT '${esc(table.comment)}'`;
  return sql;
}

// ---------------------------------------------------------------- MySQL

/** 整列定义（CREATE / CHANGE COLUMN / MODIFY COLUMN 共用） */
function mysqlColumnDef(kind: DialectKind, col: CanonicalColumn): string {
  let def = `${quote(kind, col.name)} ${renderType(col, kind)}`;
  if (!col.nullable) def += ' NOT NULL';
  const dv = renderDefault(col);
  if (dv !== null) def += ` DEFAULT ${dv}`;
  if (col.effectiveAutoIncrement) def += ' AUTO_INCREMENT';
  if (col.comment) def += ` COMMENT '${esc(col.comment)}'`;
  return def;
}

function emitMysqlAlter(cs: TableChangeSet, desired: CanonicalTable): string[] {
  const q = (n: string) => quote('mysql', n);
  const out: string[] = [];
  const byName = new Map(desired.columns.map((c) => [c.name, c]));
  const table = cs.rename ? cs.rename.from : desired.name;

  const newPkSet = new Set(cs.primaryKey ? cs.primaryKey.to : desired.primaryKey);

  // ---- 1) 去自增：MySQL 的 AUTO_INCREMENT 列"必须是一个键"。
  // 主键被替换/删除前必须先降级，否则随后的 DROP PRIMARY KEY 会让表出现
  //「无主键 + 仍有自增列」的中间态 → ER_WRONG_AUTO_KEY (1075)。
  const downgraded = new Set<string>();
  const downgrade = (col: CanonicalColumn) => {
    if (downgraded.has(col.name)) return;
    downgraded.add(col.name);
    out.push(`ALTER TABLE ${q(table)} MODIFY COLUMN ${mysqlColumnDef('mysql', { ...col, effectiveAutoIncrement: false })}`);
  };
  for (const m of cs.modified) {
    if (m.before.effectiveAutoIncrement && !m.after.effectiveAutoIncrement) downgrade(m.after);
  }
  // 兜底：目标态仍标自增却不在新主键中的列（UI 已禁止，直传 spec 时可能发生）
  if (cs.primaryKey) {
    for (const col of desired.columns) {
      if (col.effectiveAutoIncrement && !newPkSet.has(col.name)) downgrade(col);
    }
  }

  // ---- 2) 新增列（先于主键变更：新主键可能包含这些列）。
  // 自增单独延后：ADD COLUMN 时键还不存在，带 AUTO_INCREMENT 同样触发 ER_WRONG_AUTO_KEY。
  for (const col of cs.added) {
    out.push(`ALTER TABLE ${q(table)} ADD COLUMN ${mysqlColumnDef('mysql', { ...col, effectiveAutoIncrement: false })}`);
  }
  const addedNeedAi = new Set(cs.added.filter((c) => c.effectiveAutoIncrement).map((c) => c.name));

  // ---- 3) 主键变更：DROP 与 ADD 必须合并进同一条 ALTER 语句。
  // 拆成两条时第一条执行完表处于无主键中间态，若表上仍有自增列即报错。
  if (cs.primaryKey) {
    const parts: string[] = [];
    if (cs.primaryKey.from.length > 0) parts.push('DROP PRIMARY KEY');
    if (cs.primaryKey.to.length > 0) {
      parts.push(`ADD PRIMARY KEY (${cs.primaryKey.to.map(q).join(', ')})`);
    }
    if (parts.length > 0) out.push(`ALTER TABLE ${q(table)} ${parts.join(', ')}`);
  }

  // ---- 4) 加自增：主键就位之后才能声明 AUTO_INCREMENT
  const upgraded = new Set<string>();
  const upgrade = (col: CanonicalColumn) => {
    if (upgraded.has(col.name)) return;
    upgraded.add(col.name);
    out.push(`ALTER TABLE ${q(table)} MODIFY COLUMN ${mysqlColumnDef('mysql', col)}`);
  };
  for (const name of addedNeedAi) {
    const col = byName.get(name);
    if (col?.effectiveAutoIncrement) upgrade(col);
  }
  for (const m of cs.modified) {
    if (!m.before.effectiveAutoIncrement && m.after.effectiveAutoIncrement) upgrade(m.after);
  }

  // ---- 5) 改名（含定义变化时合并为一条 CHANGE COLUMN——保留列位置与数据）
  for (const r of cs.renamed) {
    const after = byName.get(r.to);
    if (!after) continue;
    if (r.definitionChanged) {
      out.push(`ALTER TABLE ${q(table)} CHANGE COLUMN ${q(r.from)} ${mysqlColumnDef('mysql', after)}`);
    } else {
      out.push(`ALTER TABLE ${q(table)} RENAME COLUMN ${q(r.from)} TO ${q(r.to)}`);
    }
  }

  // ---- 6) 其余列定义修改（自增的升/降级已在 1)/4) 处理）
  for (const m of cs.modified) {
    if (downgraded.has(m.name) || upgraded.has(m.name)) continue;
    out.push(`ALTER TABLE ${q(table)} MODIFY COLUMN ${mysqlColumnDef('mysql', m.after)}`);
  }

  // ---- 7) 删除列（先于表重命名，使用旧表名）
  for (const name of cs.dropped) {
    out.push(`ALTER TABLE ${q(table)} DROP COLUMN ${q(name)}`);
  }

  // 7) 表注释（新表名语义，但 MySQL 表未改名时无歧义；改名场景随 8) 生效）
  if (cs.comment) {
    out.push(`ALTER TABLE ${q(cs.rename ? cs.rename.to : table)} COMMENT='${esc(cs.comment.to)}'`);
  }

  // 8) 表重命名最后执行（避免前述语句引用失效）
  if (cs.rename) {
    out.push(`RENAME TABLE ${q(cs.rename.from)} TO ${q(cs.rename.to)}`);
  }
  return out;
}

// ---------------------------------------------------------------- PostgreSQL / CockroachDB

function emitPgAlter(kind: DialectKind, cs: TableChangeSet, desired: CanonicalTable): string[] {
  const q = (n: string) => quote(kind, n);
  const out: string[] = [];
  const byName = new Map(desired.columns.map((c) => [c.name, c]));
  const table = cs.rename ? cs.rename.from : desired.name;

  // 表注释
  if (cs.comment) {
    out.push(`COMMENT ON TABLE ${q(table)} IS '${esc(cs.comment.to)}'`);
  }

  // 改名（改名后定义变化用新名继续 ALTER；RENAME 必须先于其它 ALTER 执行）
  for (const r of cs.renamed) {
    out.push(`ALTER TABLE ${q(table)} RENAME COLUMN ${q(r.from)} TO ${q(r.to)}`);
    const after = byName.get(r.to);
    if (after && r.definitionChanged) {
      pushPgColumnAlters(out, kind, table, after, r.modifiedFields);
      if (r.modifiedFields.includes('comment')) {
        pushPgColumnComment(out, kind, table, after);
      }
    }
  }

  // 新增列
  for (const col of cs.added) {
    out.push(`ALTER TABLE ${q(table)} ADD COLUMN ${pgColumnDef(kind, col)}`);
    if (col.comment) pushPgColumnComment(out, kind, table, col);
  }

  // 修改列：按 fields 精确输出（单归属——不再无条件输出三条冗余语句）
  for (const m of cs.modified) {
    pushPgColumnAlters(out, kind, table, m.after, m.fields);
    if (m.fields.includes('comment')) {
      pushPgColumnComment(out, kind, table, m.after);
    }
  }

  // 删除列
  for (const name of cs.dropped) {
    out.push(`ALTER TABLE ${q(table)} DROP COLUMN ${q(name)}`);
  }

  // 主键
  if (cs.primaryKey) {
    if (cs.primaryKey.from.length > 0) {
      out.push(`ALTER TABLE ${q(table)} DROP CONSTRAINT ${q(`${table}_pkey`)}`);
    }
    if (cs.primaryKey.to.length > 0) {
      out.push(`ALTER TABLE ${q(table)} ADD CONSTRAINT ${q(`${table}_pkey`)} PRIMARY KEY (${cs.primaryKey.to.map(q).join(', ')})`);
    }
  }

  // 表重命名最后执行
  if (cs.rename) {
    out.push(`ALTER TABLE ${q(cs.rename.from)} RENAME TO ${q(cs.rename.to)}`);
  }
  return out;
}

function pushPgColumnAlters(
  out: string[],
  kind: DialectKind,
  table: string,
  col: CanonicalColumn,
  fields: TableChangeSet['modified'][number]['fields']
): void {
  const q = (n: string) => quote(kind, n);
  if (fields.includes('type')) {
    out.push(`ALTER TABLE ${q(table)} ALTER COLUMN ${q(col.name)} SET DATA TYPE ${renderType(col, kind)}`);
  }
  if (fields.includes('nullable')) {
    out.push(
      col.nullable
        ? `ALTER TABLE ${q(table)} ALTER COLUMN ${q(col.name)} DROP NOT NULL`
        : `ALTER TABLE ${q(table)} ALTER COLUMN ${q(col.name)} SET NOT NULL`
    );
  }
  if (fields.includes('default')) {
    const dv = renderDefault(col);
    out.push(
      dv === null
        ? `ALTER TABLE ${q(table)} ALTER COLUMN ${q(col.name)} DROP DEFAULT`
        : `ALTER TABLE ${q(table)} ALTER COLUMN ${q(col.name)} SET DEFAULT ${dv}`
    );
  }
  // autoIncrement 字段变化（PG 需要序列迁移，渲染层按 IDENTITY 表达）
  if (fields.includes('autoIncrement')) {
    if (col.effectiveAutoIncrement && !/SERIAL/i.test(renderType(col, kind))) {
      out.push(`ALTER TABLE ${q(table)} ALTER COLUMN ${q(col.name)} ADD GENERATED ALWAYS AS IDENTITY`);
    } else {
      out.push(`ALTER TABLE ${q(table)} ALTER COLUMN ${q(col.name)} DROP IDENTITY IF EXISTS`);
    }
  }
}

function pushPgColumnComment(
  out: string[],
  kind: DialectKind,
  table: string,
  col: CanonicalColumn
): void {
  const q = (n: string) => quote(kind, n);
  out.push(`COMMENT ON COLUMN ${q(table)}.${q(col.name)} IS '${esc(col.comment)}'`);
}

// ---------------------------------------------------------------- SQLite（重建表）

function emitSqliteRebuild(
  original: CanonicalTable,
  desired: CanonicalTable,
  cs: TableChangeSet
): string[] {
  const q = (n: string) => quote('sqlite', n);
  const table = cs.rename ? cs.rename.from : desired.name;
  const temp = `_rebuild_${table}`;
  const renameToOld = new Map(cs.renamed.map((r) => [r.to, r.from]));

  // CREATE：按 desired 全量列建临时表——与前端建表共用 emitCreateDdl（单一出口）
  const createSql = emitCreateDdl('sqlite', desired, { tableNameOverride: temp })[0] ?? '';

  // INSERT ... SELECT：改名列从旧名取值；新列用默认值/NULL 占位；删除列不迁移
  const pairs = desired.columns.map((col) => {
    const oldName = renameToOld.get(col.name);
    if (oldName) return { target: col.name, expr: q(oldName) };
    const originalCol = original.columns.find((c) => c.name === col.name);
    if (originalCol) return { target: col.name, expr: q(col.name) };
    const dv = renderDefault(col);
    return { target: col.name, expr: dv ?? 'NULL' };
  });

  const out: string[] = [];
  out.push('-- SQLite 不支持直接 ALTER 列/主键，以下为重建表序列（请置于事务中执行）');
  out.push('PRAGMA foreign_keys = OFF');
  out.push(`DROP TABLE IF EXISTS ${q(temp)}`);
  out.push(createSql);
  out.push(`INSERT INTO ${q(temp)} (${pairs.map((p) => q(p.target)).join(', ')}) SELECT ${pairs.map((p) => p.expr).join(', ')} FROM ${q(table)}`);
  out.push(`DROP TABLE ${q(table)}`);
  out.push(`ALTER TABLE ${q(temp)} RENAME TO ${q(desired.name)}`);
  out.push('PRAGMA foreign_keys = ON');
  return out;
}

// ---------------------------------------------------------------- Oracle

function emitOracleAlter(cs: TableChangeSet, desired: CanonicalTable): string[] {
  const q = (n: string) => quote('oracle', n);
  const out: string[] = [];
  const byName = new Map(desired.columns.map((c) => [c.name, c]));
  const table = cs.rename ? cs.rename.from : desired.name;

  if (cs.comment) {
    out.push(`COMMENT ON TABLE ${q(table)} IS '${esc(cs.comment.to)}'`);
  }

  for (const r of cs.renamed) {
    out.push(`ALTER TABLE ${q(table)} RENAME COLUMN ${q(r.from)} TO ${q(r.to)}`);
    const after = byName.get(r.to);
    if (after && r.definitionChanged) {
      out.push(`ALTER TABLE ${q(table)} MODIFY (${oracleColumnDef(after)})`);
      if (r.modifiedFields.includes('comment')) {
        out.push(`COMMENT ON COLUMN ${q(table)}.${q(after.name)} IS '${esc(after.comment)}'`);
      }
    }
  }

  for (const col of cs.added) {
    out.push(`ALTER TABLE ${q(table)} ADD (${oracleColumnDef(col)})`);
    if (col.comment) {
      out.push(`COMMENT ON COLUMN ${q(table)}.${q(col.name)} IS '${esc(col.comment)}'`);
    }
  }

  for (const m of cs.modified) {
    out.push(`ALTER TABLE ${q(table)} MODIFY (${oracleColumnDef(m.after)})`);
    if (m.fields.includes('comment')) {
      out.push(`COMMENT ON COLUMN ${q(table)}.${q(m.after.name)} IS '${esc(m.after.comment)}'`);
    }
  }

  for (const name of cs.dropped) {
    out.push(`ALTER TABLE ${q(table)} DROP COLUMN ${q(name)}`);
  }

  if (cs.primaryKey) {
    if (cs.primaryKey.from.length > 0) {
      out.push(`ALTER TABLE ${q(table)} DROP CONSTRAINT ${q(`${table}_pkey`)}`);
    }
    if (cs.primaryKey.to.length > 0) {
      out.push(`ALTER TABLE ${q(table)} ADD CONSTRAINT ${q(`${table}_pkey`)} PRIMARY KEY (${cs.primaryKey.to.map(q).join(', ')})`);
    }
  }

  if (cs.rename) {
    out.push(`ALTER TABLE ${q(cs.rename.from)} RENAME TO ${q(cs.rename.to)}`);
  }
  return out;
}

function oracleColumnDef(col: CanonicalColumn): string {
  let def = `${quote('oracle', col.name)} ${renderType(col, 'oracle')}`;
  if (!col.nullable) def += ' NOT NULL';
  const dv = renderDefault(col);
  if (dv !== null) def += ` DEFAULT ${dv}`;
  if (col.effectiveAutoIncrement && /NUMBER|NUMERIC|DEC/i.test(renderType(col, 'oracle'))) {
    def += ' GENERATED BY DEFAULT AS IDENTITY';
  }
  return def;
}

// ---------------------------------------------------------------- ClickHouse

/**
 * ClickHouse：ADD / DROP / MODIFY / RENAME COLUMN。
 *
 * 注意两点与通用方言的差异：
 *   - 可空性由 Nullable(...) 表达，裸类型即不可空，不能写 NOT NULL（与 emitClickhouseCreate 一致）；
 *   - 主键=排序键（ORDER BY），不是普通约束，变更需 MODIFY ORDER BY 且限制很多，
 *     能力表已声明 alterPrimaryKey=false，调用方会先报明确错误，故这里不臆造主键语句。
 */
function emitClickHouseAlter(cs: TableChangeSet, desired: CanonicalTable): string[] {
  const q = (n: string) => quote('clickhouse', n);
  const out: string[] = [];
  const byName = new Map(desired.columns.map((c) => [c.name, c]));
  const table = cs.rename ? cs.rename.from : desired.name;

  const defOf = (col: CanonicalColumn): string => {
    const base = renderType(col, 'clickhouse');
    const type = col.nullable && !/^Nullable\(/i.test(base) ? `Nullable(${base})` : base;
    let def = `${q(col.name)} ${type}`;
    const dv = renderDefault(col);
    if (dv !== null) def += ` DEFAULT ${dv}`;
    if (col.comment) def += ` COMMENT '${esc(col.comment)}'`;
    return def;
  };

  for (const col of cs.added) {
    out.push(`ALTER TABLE ${q(table)} ADD COLUMN ${defOf(col)}`);
  }

  // 重命名：先改名，再补一条 MODIFY COLUMN 应用同时发生的定义变化
  for (const r of cs.renamed) {
    out.push(`ALTER TABLE ${q(table)} RENAME COLUMN ${q(r.from)} TO ${q(r.to)}`);
    const after = byName.get(r.to);
    if (after && r.definitionChanged) {
      out.push(`ALTER TABLE ${q(table)} MODIFY COLUMN ${defOf(after)}`);
    }
  }

  for (const m of cs.modified) {
    out.push(`ALTER TABLE ${q(table)} MODIFY COLUMN ${defOf(m.after)}`);
  }

  for (const name of cs.dropped) {
    out.push(`ALTER TABLE ${q(table)} DROP COLUMN ${q(name)}`);
  }

  if (cs.comment) {
    out.push(`ALTER TABLE ${q(table)} MODIFY COMMENT '${esc(cs.comment.to)}'`);
  }

  if (cs.rename) {
    out.push(`RENAME TABLE ${q(cs.rename.from)} TO ${q(cs.rename.to)}`);
  }

  return out;
}

// ---------------------------------------------------------------- SQL Server

function emitMssqlAlter(
  cs: TableChangeSet,
  desired: CanonicalTable,
  pkConstraintName?: string
): string[] {
  const q = (n: string) => quote('mssql', n);
  const out: string[] = [];
  const byName = new Map(desired.columns.map((c) => [c.name, c]));
  const table = cs.rename ? cs.rename.from : desired.name;
  const newPkSet = new Set(desired.primaryKey);

  if (cs.comment) {
    out.push(mssqlTableComment(table, cs.comment.to));
  }

  for (const r of cs.renamed) {
    out.push(`EXEC sp_rename N'dbo.${esc(table)}.${esc(r.from)}', N'${esc(r.to)}', N'COLUMN'`);
    const after = byName.get(r.to);
    if (after && r.definitionChanged) {
      pushMssqlColumnAlter(out, table, after);
    }
  }

  for (const col of cs.added) {
    let def = `ALTER TABLE ${q(table)} ADD ${q(col.name)} ${renderType(col, 'mssql')}`;
    if (!col.nullable) def += ' NOT NULL';
    const dv = renderDefault(col);
    if (dv !== null) def += ` DEFAULT ${dv}`;
    out.push(def);
    if (col.effectiveAutoIncrement) {
      // IDENTITY 不能 ALTER 添加，仅提示
      out.push(`-- 列 ${col.name} 需要自增：SQL Server 不支持对已有列追加 IDENTITY`);
    }
    if (col.comment) {
      out.push(mssqlColumnComment(table, col.name, col.comment));
    }
  }

  for (const m of cs.modified) {
    if (m.fields.includes('type') || m.fields.includes('nullable')) {
      pushMssqlColumnAlter(out, table, m.after);
    }
    if (m.fields.includes('default')) {
      const dv = renderDefault(m.after);
      const cname = `DF_${table}_${m.after.name}`;
      if (dv === null) {
        out.push(`ALTER TABLE ${q(table)} DROP CONSTRAINT ${q(cname)}`);
      } else {
        out.push(`ALTER TABLE ${q(table)} ADD CONSTRAINT ${q(cname)} DEFAULT ${dv} FOR ${q(m.after.name)}`);
      }
    }
    if (m.fields.includes('autoIncrement')) {
      out.push(`-- 列 ${m.after.name} 自增变更：SQL Server 不支持对已有列追加/移除 IDENTITY`);
    }
    if (m.fields.includes('comment')) {
      out.push(mssqlColumnComment(table, m.after.name, m.after.comment));
    }
  }

  for (const name of cs.dropped) {
    out.push(`ALTER TABLE ${q(table)} DROP COLUMN ${q(name)}`);
  }

  if (cs.primaryKey) {
    if (cs.primaryKey.from.length > 0) {
      // 删除旧主键必须用系统表查到的真实约束名；拿不到时调用方已判为错误，不会走到这里
      out.push(`ALTER TABLE ${q(table)} DROP CONSTRAINT ${q(pkConstraintName || `${table}_pkey`)}`);
    }
    if (cs.primaryKey.to.length > 0) {
      // 新建主键的约束名由我们指定，后续变更即可按同名回查到
      out.push(`ALTER TABLE ${q(table)} ADD CONSTRAINT ${q(`${table}_pkey`)} PRIMARY KEY (${cs.primaryKey.to.map(q).join(', ')})`);
    }
  }

  if (cs.rename) {
    out.push(`EXEC sp_rename N'dbo.${esc(cs.rename.from)}', N'${esc(cs.rename.to)}'`);
  }
  void newPkSet;
  return out;
}

function pushMssqlColumnAlter(out: string[], table: string, col: CanonicalColumn): void {
  const q = (n: string) => quote('mssql', n);
  out.push(
    `ALTER TABLE ${q(table)} ALTER COLUMN ${q(col.name)} ${renderType(col, 'mssql')} ${col.nullable ? 'NULL' : 'NOT NULL'}`
  );
}

function mssqlColumnComment(table: string, column: string, comment: string): string {
  return (
    `EXEC sp_addextendedproperty @name=N'MS_Description', @value=N'${esc(comment)}', @level0type=N'SCHEMA', @level0name=N'dbo', ` +
    `@level1type=N'TABLE', @level1name=N'${esc(table)}', @level2type=N'COLUMN', @level2name=N'${esc(column)}'`
  );
}
