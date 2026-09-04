/**
 * SQL 编译器
 * 输入：方言类型 + 真实列集合 + 过滤树/排序/数据
 * 输出：带参数绑定的 SQL（mysql/pg/cockroach/sqlite），
 *      其它方言（oracle/mssql/sap）采用安全值内联。
 * 安全保证：
 *   1. 字段名一律先做白名单校验（真实列集合），防止注入与幻觉列名；
 *   2. 值优先走绑定参数，永不字符串拼接；
 *   3. 标识符按方言引用；
 *   4. 行数/偏移强制整数。
 */
import { quoteIdentifier, paramStyleOf } from './dialect';
import { FilterNode } from './filter-dsl';
import { AppError } from './errors';

export interface ColumnMeta {
  name: string;
  type?: string;
  isAutoIncrement?: boolean;
  isPrimary?: boolean;
  nullable?: boolean;
}

export interface CompiledQuery {
  sql: string;
  params: any[];
}

function isNumeric(v: any): boolean {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPlainObject(v: any): boolean {
  return v !== null && typeof v === 'object' && !(v instanceof Date);
}

/** 内联模式下的字面量（oracle/mssql/sap 使用） */
export function renderLiteral(dbType: string, value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') {
    const kind = dbType === 'mysql' ? 'mysql' : dbType;
    return kind === 'mysql' ? (value ? '1' : '0') : value ? 'TRUE' : 'FALSE';
  }
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (isPlainObject(value) || Array.isArray(value)) {
    const json = JSON.stringify(value);
    return `'${String(json).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

class Collector {
  constructor(private dbType: string) {}

  /** 返回条件右侧的 SQL 片段，并把值放入 params（inline 模式直接渲染） */
  value(v: any): { sql: string; params: any[] } {
    const style = paramStyleOf(this.dbType);
    if (style === 'inline') {
      return { sql: renderLiteral(this.dbType, v), params: [] };
    }
    // '?' 或 '$n'：先按出现顺序计数
    return { sql: '%P%', params: [v] };
  }
}

function escapeLike(s: string): string {
  return String(s).replace(/[\\%_]/g, (m) => '\\' + m);
}

export class SqlBuilder {
  private dbType: string;
  private quote: (id: string) => string;
  private cols: Map<string, ColumnMeta>;

  constructor(dbType: string, columns: ColumnMeta[]) {
    this.dbType = dbType;
    this.quote = (id) => quoteIdentifier(dbType, id);
    this.cols = new Map();
    for (const c of columns || []) this.cols.set(c.name, c);
  }

  get hasColumns(): boolean {
    return this.cols.size > 0;
  }

  /** 白名单校验 + 候选列名提示 */
  checkField(field: string): void {
    if (this.cols.has(field)) return;
    if (this.cols.size === 0) return; // 没有列信息时不强制（保留逃生能力）
    const names = Array.from(this.cols.keys());
    const suggestion = suggestField(field, names);
    throw new AppError('COLUMN_NOT_FOUND', `表/集合中不存在列 ${field}`, {
      hint: suggestion ? `你是否想找: ${suggestion}？` : undefined,
      details: { availableColumns: names.slice(0, 50) }
    });
  }

  /** 编译过滤树 */
  where(node: FilterNode | null): CompiledQuery {
    const out = this.node(node || null);
    if (!out) return { sql: '', params: [] };
    return out;
  }

  private node(n: FilterNode | null): { sql: string; params: any[] } | null {
    if (!n) return null;
    if (n.type === 'leaf') {
      return this.leaf(n.leaf);
    }
    if (n.type === 'not') {
      const inner = this.node(n.child);
      if (!inner) return null;
      return { sql: `(NOT (${inner.sql}))`, params: inner.params };
    }
    const join = n.type === 'and' ? ' AND ' : ' OR ';
    const parts: Array<{ sql: string; params: any[] }> = [];
    for (const child of n.children) {
      const sub = this.node(child);
      if (sub) parts.push(sub);
    }
    if (parts.length === 0) return null;
    const sql = parts.map((p) => `(${p.sql})`).join(join);
    const params = parts.reduce((acc, p) => acc.concat(p.params), [] as any[]);
    return { sql, params };
  }

  private leaf(leaf: any): { sql: string; params: any[] } {
    const { field, op, value } = leaf;
    // alwaysTrue 哨兵：field='' op=eq value=1 → "1=1"
    if (field === '' && op === 'eq' && value === 1) {
      return { sql: '1=1', params: [] };
    }
    this.checkField(field);
    const f = this.quote(field);
    const style = paramStyleOf(this.dbType);
    const mk = (v: any) => this.collapse(field, v);
    const nv = (v: any) => this.normValue(field, v);

    switch (op) {
      case 'eq':
      case 'neq':
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte': {
        const vv = nv(value);
        const symbol = { eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=' }[op];
        return { sql: `${f} ${symbol} ${mk(vv)}`, params: this.pick(field, vv) };
      }
      case 'like':
      case 'likeCase':
      case 'starts':
      case 'ends': {
        let pattern: string;
        const raw = String(value == null ? '' : value);
        if (op === 'starts') pattern = escapeLike(raw) + '%';
        else if (op === 'ends') pattern = '%' + escapeLike(raw);
        else pattern = '%' + escapeLike(raw) + '%';
        return { sql: `${f} LIKE ${mk(pattern)}`, params: this.pick(field, pattern) };
      }
      case 'in':
      case 'nin': {
        const rawArr = Array.isArray(value) ? value : [];
        const arr = rawArr.map((v: any) => nv(v));
        if (arr.length === 0) {
          return op === 'in' ? { sql: '1=0', params: [] } : { sql: '1=1', params: [] };
        }
        if (style === 'inline') {
          const list = arr.map((v: any) => renderLiteral(this.dbType, v)).join(', ');
          return { sql: `${f} ${op === 'in' ? 'IN' : 'NOT IN'} (${list})`, params: [] };
        }
        const marks = arr.map(() => '%P%').join(', ');
        return { sql: `${f} ${op === 'in' ? 'IN' : 'NOT IN'} (${marks})`, params: arr };
      }
      case 'between': {
        const arr = Array.isArray(value) ? value : [];
        const lo = nv(arr[0]);
        const hi = nv(arr[1]);
        if (style === 'inline') {
          return {
            sql: `${f} BETWEEN ${renderLiteral(this.dbType, lo)} AND ${renderLiteral(this.dbType, hi)}`,
            params: []
          };
        }
        return { sql: `${f} BETWEEN %P% AND %P%`, params: [lo, hi] };
      }
      case 'isNull':
        return { sql: `${f} IS NULL`, params: [] };
      case 'notNull':
        return { sql: `${f} IS NOT NULL`, params: [] };
      default:
        throw new AppError('INVALID_FILTER', `不支持的操作: ${op}`);
    }
  }

  /** 按列类型归一化值：int/decimal 列收到数字字符串时转 number，boolean 列归一 */
  normValue(field: string, v: any): any {
    if (v === null || v === undefined || v === '') return v;
    const meta = this.cols.get(field);
    if (!meta) return v;
    const raw = String(meta.type || '').toLowerCase();
    const base = raw.split('(')[0].trim();
    if (/int|serial|bit|mediumint|tinyint/.test(base)) {
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    }
    if (/dec|float|double|numeric|real|money/.test(base)) {
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    }
    if (/bool/.test(base)) {
      if (v === true || v === false) return v;
      if (v === 'true' || v === '1' || v === 1) return true;
      if (v === 'false' || v === '0' || v === 0) return false;
      return v;
    }
    return v;
  }

  /** '%P%' → 实际占位符（? 或 $n），并收集参数 */
  private collapse(field: string, v: any): string {
    const style = paramStyleOf(this.dbType);
    if (style === 'inline') {
      return renderLiteral(this.dbType, v);
    }
    return '%P%';
  }

  private pick(field: string, v: any): any[] {
    const style = paramStyleOf(this.dbType);
    if (style === 'inline') return [];
    return [v];
  }

  /** 将收集到的 param 数组按出现顺序填充占位符 */
  static finalize(dbType: string, sql: string, params: any[]): CompiledQuery {
    const style = paramStyleOf(dbType);
    if (style === 'inline') {
      // inline 模式下 SQL 中不应有 %P%
      return { sql: sql.replace(/%P%/g, '?'), params: [] };
    }
    if (style === '$') {
      let i = 0;
      const out = sql.replace(/%P%/g, () => {
        i += 1;
        return `$${i}`;
      });
      return { sql: out, params };
    }
    return { sql: sql.replace(/%P%/g, '?'), params };
  }
}

/** 由多条语句片段合成最终 SQL */
export function compose(dbType: string, statement: { sql: string; params: any[] }): CompiledQuery {
  return SqlBuilder.finalize(dbType, statement.sql, statement.params);
}

export function buildSelect(
  dbType: string,
  table: string,
  columns: ColumnMeta[],
  opts: {
    select?: string[];
    where?: FilterNode | null;
    sorts?: Array<{ field: string; dir: 'asc' | 'desc' }>;
    limit?: number | null;
    offset?: number;
    countOnly?: boolean;
  }
): CompiledQuery {
  const builder = new SqlBuilder(dbType, columns);
  const q = quoteIdentifier(dbType, table);

  let selectPart = '*';
  if (opts.countOnly) {
    selectPart = 'COUNT(*) AS total';
  } else if (opts.select && opts.select.length > 0) {
    for (const s of opts.select) builder.checkField(s);
    selectPart = opts.select.map((s) => quoteIdentifier(dbType, s)).join(', ');
  }

  const where = builder.where(opts.where || null);
  let sql = `SELECT ${selectPart} FROM ${q}`;
  const params: any[] = [];
  if (where.sql) {
    sql += ` WHERE ${where.sql}`;
    params.push(...where.params);
  }

  if (!opts.countOnly) {
    if (opts.sorts && opts.sorts.length > 0) {
      const orderParts: string[] = [];
      for (const s of opts.sorts) {
        builder.checkField(s.field);
        orderParts.push(`${quoteIdentifier(dbType, s.field)} ${s.dir === 'desc' ? 'DESC' : 'ASC'}`);
      }
      sql += ` ORDER BY ${orderParts.join(', ')}`;
    }
    const limit = opts.limit != null ? Math.floor(opts.limit) : null;
    const offset = opts.offset != null ? Math.floor(opts.offset) : 0;
    if (limit != null) {
      if (dbType === 'oracle') {
        sql += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      } else if (dbType === 'mssql' && offset > 0) {
        sql += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      } else if (dbType === 'mssql') {
        sql += ` OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;
      } else {
        sql += ` LIMIT ${limit} OFFSET ${offset}`;
      }
    } else if (offset > 0) {
      if (dbType === 'oracle' || dbType === 'mssql') {
        sql += ` OFFSET ${offset} ROWS`;
      } else {
        sql += ` LIMIT 18446744073709551615 OFFSET ${offset}`;
      }
    }
  }

  return compose(dbType, { sql, params });
}

export function buildCount(dbType: string, table: string, columns: ColumnMeta[], where?: FilterNode | null): CompiledQuery {
  return buildSelect(dbType, table, columns, { where, countOnly: true });
}

export function buildInsert(
  dbType: string,
  table: string,
  columns: ColumnMeta[],
  data: Record<string, any>,
  opts?: { skipAutoIncrement?: boolean }
): CompiledQuery {
  const builder = new SqlBuilder(dbType, columns);
  const q = quoteIdentifier(dbType, table);

  const skipAuto = opts?.skipAutoIncrement !== false;
  const entries: Array<{ name: string; value: any }> = [];
  for (const key of Object.keys(data)) {
    builder.checkField(key);
    const meta = columns.find((c) => c.name === key);
    if (skipAuto && meta && meta.isAutoIncrement) continue;
    entries.push({ name: key, value: builder.normValue(key, data[key]) });
  }
  if (entries.length === 0) {
    throw new AppError('PARAM_ERROR', '没有可插入的字段（所有字段均为自增列或被过滤）');
  }

  const style = paramStyleOf(dbType);
  const names = entries.map((e) => quoteIdentifier(dbType, e.name)).join(', ');
  let marks: string;
  const params: any[] = [];
  if (style === 'inline') {
    marks = entries.map((e) => renderLiteral(dbType, e.value)).join(', ');
  } else {
    marks = entries.map(() => '%P%').join(', ');
    params.push(...entries.map((e) => e.value));
  }
  const sql = `INSERT INTO ${q} (${names}) VALUES (${marks})`;
  return compose(dbType, { sql, params });
}

export function buildUpdate(
  dbType: string,
  table: string,
  columns: ColumnMeta[],
  setData: Record<string, any>,
  where?: FilterNode | null
): CompiledQuery {
  const builder = new SqlBuilder(dbType, columns);
  const q = quoteIdentifier(dbType, table);
  const style = paramStyleOf(dbType);
  const params: any[] = [];

  const setKeys = Object.keys(setData);
  if (setKeys.length === 0) throw new AppError('PARAM_ERROR', '缺少 --set 字段');
  const setParts: string[] = [];
  for (const key of setKeys) {
    builder.checkField(key);
    const meta = columns.find((c) => c.name === key);
    if (meta && meta.isPrimary) {
      throw new AppError('WRITE_NOT_ALLOWED', `禁止修改主键列 ${key}`);
    }
    const val = builder.normValue(key, setData[key]);
    if (style === 'inline') {
      setParts.push(`${quoteIdentifier(dbType, key)} = ${renderLiteral(dbType, val)}`);
    } else {
      setParts.push(`${quoteIdentifier(dbType, key)} = %P%`);
      params.push(val);
    }
  }

  const wherePart = builder.where(where || null);
  let sql = `UPDATE ${q} SET ${setParts.join(', ')}`;
  if (wherePart.sql) {
    sql += ` WHERE ${wherePart.sql}`;
    params.push(...wherePart.params);
  } else {
    throw new AppError('PARAM_ERROR', 'UPDATE 必须带过滤条件');
  }
  return compose(dbType, { sql, params });
}

export function buildDelete(
  dbType: string,
  table: string,
  columns: ColumnMeta[],
  where?: FilterNode | null
): CompiledQuery {
  const builder = new SqlBuilder(dbType, columns);
  const q = quoteIdentifier(dbType, table);
  const wherePart = builder.where(where || null);
  if (!wherePart.sql) {
    throw new AppError('PARAM_ERROR', 'DELETE 必须带过滤条件');
  }
  const sql = `DELETE FROM ${q} WHERE ${wherePart.sql}`;
  return compose(dbType, { sql, params: wherePart.params });
}

/** 排序参数解析：field:asc|desc（可重复） */
export function parseSorts(list: string[]): Array<{ field: string; dir: 'asc' | 'desc' }> {
  const result: Array<{ field: string; dir: 'asc' | 'desc' }> = [];
  for (const item of list || []) {
    const t = String(item).trim();
    if (!t) continue;
    const m = /^([^:]+)(?::(asc|desc))?$/i.exec(t);
    if (!m) throw new AppError('INVALID_OPTION', `排序格式应为 field:asc|desc，收到: ${t}`);
    result.push({ field: m[1].trim(), dir: (m[2] || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc' });
  }
  return result;
}

/** Levenshtein 最短距离 */
export function levenshtein(a: string, b: string): number {
  const dp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

export function suggestField(input: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestScore = 3; // 编辑距离 <=2 才算接近
  const lower = String(input).toLowerCase();
  for (const c of candidates) {
    if (c.toLowerCase() === lower) return c;
    const d = levenshtein(lower, c.toLowerCase());
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }
  return best;
}

/** SQL 语句类型分类（逃生舱防护） */
export function classifySql(sql: string): { kind: 'select' | 'write' | 'ddl' | 'multi' | 'other'; statements: string[] } {
  const trimmed = String(sql).trim().replace(/;+\s*$/, '');
  const statements = trimmed
    .split(/;\s*(?=(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE|REPLACE|MERGE|GRANT|REVOKE|BEGIN|COMMIT|ROLLBACK|SET|CALL|EXEC)\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (statements.length > 1) {
    return { kind: 'multi', statements };
  }
  const first = (statements[0] || trimmed).toUpperCase().replace(/\(.*/, '');
  if (/^SELECT|^SHOW|^DESCRIBE|^DESC\b|^EXPLAIN|^PRAGMA|^WITH\b/.test(first)) return { kind: 'select', statements };
  if (/^INSERT|^UPDATE|^DELETE|^REPLACE|^MERGE/.test(first)) return { kind: 'write', statements };
  if (/^CREATE|^ALTER|^DROP|^TRUNCATE|^RENAME|^GRANT|^REVOKE/.test(first)) return { kind: 'ddl', statements };
  if (/^CALL|^EXEC/.test(first)) return { kind: 'other', statements };
  return { kind: 'other', statements };
}
