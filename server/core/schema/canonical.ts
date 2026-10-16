/**
 * 归一化投影：把「数据库实体形状」和「前端表单形状」投影到同一个 CanonicalTable。
 *
 * 目标：表示差异不产生假 diff——
 *   'varchar(255)' 与 { type:'VARCHAR', length:'255' } 等价；
 *   0 / '0'、'' / DEFAULT ''、'NULL' / DEFAULT NULL / 无默认值 三态可区分且各自恒等；
 *   注释前后空格、数值字面量的 '007'/'0.50' 等书写差异被消除。
 *
 * 不变式：canonicalize 是纯函数且幂等（对已是 canonical 形状的对象无副作用）。
 * rawAutoIncrement 不做 clamp（保留原始意图，供"加主键时恢复自增"），
 * effectiveAutoIncrement 按「自增必须依附主键」派生——两侧同一规则，比较恒稳。
 */
import type { CanonicalColumn, CanonicalTable, DefaultKind, TableSpec } from '../../model/ddl-spec';

/** 单参数即精度的类型（DECIMAL(10) → precision 而非 length） */
const PRECISION_TYPES = new Set(['DECIMAL', 'NUMERIC', 'DEC', 'NUMBER']);
/** 支持自增的整数族类型（首个 token 匹配） */
const AUTO_INCREMENT_TOKENS = new Set([
  'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT',
  'SERIAL', 'BIGSERIAL', 'SMALLSERIAL'
]);
/** 无括号也按表达式处理的默认值关键字 */
const EXPRESSION_KEYWORDS = new Set([
  'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_USER',
  'LOCALTIME', 'LOCALTIMESTAMP', 'SYSDATE', 'SYSGUID', 'SESSION_USER'
]);

function trimmed(v: unknown): string {
  return String(v == null ? '' : v).trim();
}

/** ''/null/undefined → undefined；'0' → 0（假值不丢弃）；非数字 → undefined */
function normalizeNumber(v: number | string | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const s = String(v).trim();
  if (s === '') return undefined;
  if (!/^\d+$/.test(s)) return undefined;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
}

/** 数值字面量归一：'007'→'7'，'0.50'→'0.5'，'-0'→'0'（字符串实现，避免大数精度损失） */
export function normalizeNumericLiteral(s: string): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return s;
  const int = (m[2] ?? '').replace(/^0+(?=\d)/, '');
  const frac = (m[3] || '').replace(/0+$/, '');
  const text = frac === '' ? int : `${int}.${frac}`;
  if (text === '0' && m[1] === '-') return '0';
  return m[1] === '-' && text !== '0' ? `-${text}` : text;
}

function normalizeLiteralText(s: string): string {
  const up = s.toUpperCase();
  if (up === 'TRUE') return 'true';
  if (up === 'FALSE') return 'false';
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return normalizeNumericLiteral(s);
  return s;
}

function isExpressionText(s: string): boolean {
  if (EXPRESSION_KEYWORDS.has(s.toUpperCase())) return true;
  // 函数调用：now()、nextval('seq')、uuid()
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(s)) return true;
  // PG 类型标注：'0'::character varying（整体在外层已按带引号前缀处理）
  if (s.includes('::')) return true;
  return false;
}

/**
 * 默认值三态+表达式分类。
 * @param raw      原始值（实体侧：driver 原样，可能是 0/''/'NULL'/null；表单侧：文本）
 * @param hasDefault 表单侧显式标记；实体侧不传（undefined 表示未知，按 raw 推断）
 */
export function classifyDefault(raw: unknown, hasDefault?: boolean): { kind: DefaultKind; text: string } {
  if (hasDefault === false) return { kind: 'none', text: '' };
  if (raw === undefined || raw === null) {
    // 表单声明有默认值但未给文本 → 按字面量空串（DEFAULT ''）处理，绝不回落成 none
    return hasDefault === true ? { kind: 'literal', text: '' } : { kind: 'none', text: '' };
  }
  if (typeof raw === 'boolean') return { kind: 'literal', text: raw ? 'true' : 'false' };
  if (typeof raw === 'number') {
    return Number.isFinite(raw)
      ? { kind: 'literal', text: normalizeNumericLiteral(String(raw)) }
      : { kind: 'expression', text: String(raw) };
  }
  const s = String(raw).trim();
  if (s === '') return { kind: 'literal', text: '' }; // MySQL DEFAULT '' 与「无默认」必须可区分
  if (s.toUpperCase() === 'NULL') return { kind: 'null', text: '' };
  // 带引号前缀：'abc' / '' / '0'::character varying
  const q = /^'((?:[^']|'')*)'(.*)$/.exec(s);
  if (q) {
    const rest = (q[2] ?? '').trim();
    if (rest === '') return { kind: 'literal', text: (q[1] ?? '').replace(/''/g, "'") };
    return { kind: 'expression', text: s.toUpperCase() }; // 'x'::type 等 PG 表达式
  }
  if (isExpressionText(s)) return { kind: 'expression', text: s.toUpperCase() };
  return { kind: 'literal', text: normalizeLiteralText(s) };
}

/** 类型归一：接受 { type:'varchar(255)', length:255 } 或 { type:'VARCHAR', length:'255' } 或 customType 全串 */
export function canonicalizeType(input: {
  type?: string;
  customType?: string;
  length?: number | string | null;
  precision?: number | string | null;
  scale?: number | string | null;
}): { baseType: string; length?: number; precision?: number; scale?: number } {
  const custom = trimmed(input.customType);
  if (custom) return { baseType: custom }; // ENUM('a','b') 等整体原样比较
  const raw = trimmed(input.type);
  if (!raw) return { baseType: '' };

  const length = normalizeNumber(input.length);
  const precision = normalizeNumber(input.precision);
  const scale = normalizeNumber(input.scale);

  const m = /^([A-Za-z0-9_ ]+?)\s*\(([^)]*)\)$/.exec(raw);
  if (!m) return { baseType: raw.toUpperCase(), length, precision, scale };

  const base = (m[1] ?? '').trim().toUpperCase();
  const params = (m[2] ?? '').split(',').map((p) => p.trim());
  // 参数含非数字（ENUM('a','b')）：整体按自定义串处理，避免拆坏
  if (!params.every((p) => /^\d+$/.test(p))) return { baseType: raw };
  if (params.length >= 2) {
    return {
      baseType: base,
      precision: precision ?? normalizeNumber(params[0] ?? ''),
      scale: scale ?? normalizeNumber(params[1] ?? '')
    };
  }
  if (length !== undefined) return { baseType: base, length };
  if (precision !== undefined) return { baseType: base, precision, scale };
  if (PRECISION_TYPES.has(base)) return { baseType: base, precision: normalizeNumber(params[0] ?? ''), scale };
  return { baseType: base, length: normalizeNumber(params[0] ?? '') };
}

function autoIncrementCapable(baseType: string): boolean {
  const token = /^([A-Za-z0-9_]+)/.exec(baseType);
  return !!token && AUTO_INCREMENT_TOKENS.has((token[1] ?? '').toUpperCase());
}

type LooseColumn = Record<string, any>;

function buildColumn(src: LooseColumn, primaryKey: Set<string>): CanonicalColumn {
  const name = trimmed(src.name);
  const t = canonicalizeType({
    type: src.type,
    customType: src.customType,
    length: src.length,
    precision: src.precision,
    scale: src.scale
  });
  const d = classifyDefault(src.defaultValue, src.hasDefault);
  const rawAutoIncrement = !!(src.isAutoIncrement ?? src.autoIncrement);
  return {
    name,
    baseType: t.baseType,
    length: t.length,
    precision: t.precision,
    scale: t.scale,
    nullable: !!src.nullable,
    defaultKind: d.kind,
    defaultText: d.text,
    rawAutoIncrement,
    effectiveAutoIncrement: rawAutoIncrement && primaryKey.has(name) && autoIncrementCapable(t.baseType),
    comment: trimmed(src.comment)
  };
}

/** 数据库实体侧（live 结构 / getColumns 结果）→ CanonicalTable */
export function canonicalizeTableEntity(table: {
  name?: string;
  comment?: string;
  columns?: LooseColumn[];
}): CanonicalTable {
  const cols = table.columns || [];
  const pk = new Set(
    cols.filter((c) => !!c.isPrimary).map((c) => trimmed(c.name)).filter(Boolean)
  );
  return {
    name: trimmed(table.name),
    comment: trimmed(table.comment),
    columns: cols.map((c) => buildColumn(c, pk)),
    primaryKey: [...pk]
  };
}

/** 前端目标侧（TableSpec）→ CanonicalTable */
export function canonicalizeTableSpec(spec: TableSpec): CanonicalTable {
  const pkNames = (spec.primaryKey || []).map((n) => trimmed(n)).filter(Boolean);
  const pk = new Set(pkNames);
  return {
    name: trimmed(spec.name),
    comment: trimmed(spec.comment),
    columns: (spec.columns || []).map((c) => buildColumn(c, pk)),
    primaryKey: pkNames
  };
}

/** 列定义（不含列名、不含主键）是否等价；返回发生变化的维度集合 */
export function diffColumnFields(
  before: CanonicalColumn,
  after: CanonicalColumn
): Array<'type' | 'nullable' | 'default' | 'comment' | 'autoIncrement'> {
  const fields: Array<'type' | 'nullable' | 'default' | 'comment' | 'autoIncrement'> = [];
  if (
    before.baseType !== after.baseType ||
    before.length !== after.length ||
    before.precision !== after.precision ||
    before.scale !== after.scale
  ) {
    fields.push('type');
  }
  if (before.nullable !== after.nullable) fields.push('nullable');
  if (before.defaultKind !== after.defaultKind || before.defaultText !== after.defaultText) {
    fields.push('default');
  }
  if (before.comment !== after.comment) fields.push('comment');
  if (before.effectiveAutoIncrement !== after.effectiveAutoIncrement) fields.push('autoIncrement');
  return fields;
}
