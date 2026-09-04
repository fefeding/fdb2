/**
 * 列定义 DSL：name:type[:约束...]
 * 约束: primary | auto_increment | not_null | null | unique
 *       default=<v> | comment=<str> | len=<n> | precision=<p[,s]>
 * 示例: id:int:primary:auto_increment
 *       name:varchar:len=64:not_null
 *       amount:decimal:precision=10,2:default=0
 */

export interface ParsedColumn {
  name: string;
  /** 类型全名（含长度），如 varchar(64) */
  type: string;
  /** 基础类型，如 varchar */
  baseType: string;
  nullable: boolean;
  isPrimary: boolean;
  isAutoIncrement: boolean;
  unique: boolean;
  defaultValue?: any;
  hasDefault: boolean;
  comment?: string;
  length?: number;
  precision?: number;
  scale?: number;
  /** 原始 spec 字符串 */
  raw: string;
}

export function parseColumnSpec(spec: string): ParsedColumn {
  if (!spec || typeof spec !== 'string') throw new Error('列定义不能为空');
  const parts = splitColon(spec);
  if (parts.length < 2) {
    throw new Error(`列定义格式应为 "名称:类型[:约束...]"，收到: ${spec}`);
  }
  const name = parts[0].trim();
  const typeRaw = parts[1].trim();
  if (!name || !typeRaw) throw new Error(`列定义无效: ${spec}`);

  const col: ParsedColumn = {
    name,
    type: typeRaw,
    baseType: typeRaw.split('(')[0].trim().toLowerCase(),
    nullable: true,
    isPrimary: false,
    isAutoIncrement: false,
    unique: false,
    hasDefault: false,
    raw: spec
  };

  // 提取类型长度
  const lenMatch = /\((\d+)(?:,\s*(\d+))?\)/.exec(typeRaw);
  if (lenMatch) {
    col.length = parseInt(lenMatch[1], 10);
    if (lenMatch[2]) col.precision = parseInt(lenMatch[1], 10);
    if (lenMatch[2]) col.scale = parseInt(lenMatch[2], 10);
    col.type = typeRaw; // 保持原样
  } else {
    // 无长度时按基础类型输出
    col.type = col.baseType;
  }

  for (const rawMod of parts.slice(2)) {
    const mod = rawMod.trim();
    const lower = mod.toLowerCase();
    if (lower === 'primary') {
      col.isPrimary = true;
    } else if (lower === 'auto_increment' || lower === 'ai') {
      col.isAutoIncrement = true;
      col.isPrimary = true;
    } else if (lower === 'not_null' || lower === 'notnull') {
      col.nullable = false;
    } else if (lower === 'null' || lower === 'nullable') {
      col.nullable = true;
    } else if (lower === 'unique') {
      col.unique = true;
    } else if (lower.startsWith('default=')) {
      col.hasDefault = true;
      col.defaultValue = parseDefault(mod.slice('default='.length));
    } else if (lower.startsWith('comment=')) {
      col.comment = unquote(mod.slice('comment='.length));
    } else if (lower.startsWith('len=')) {
      col.length = parseInt(mod.slice('len='.length), 10);
      col.type = `${col.baseType}(${col.length})`;
    } else if (lower.startsWith('length=')) {
      col.length = parseInt(mod.slice('length='.length), 10);
      col.type = `${col.baseType}(${col.length})`;
    } else if (lower.startsWith('precision=')) {
      const pv = mod.slice('precision='.length).split(',');
      col.precision = parseInt(pv[0], 10);
      if (pv[1] !== undefined) {
        col.scale = parseInt(pv[1], 10);
        col.type = `${col.baseType}(${col.precision},${col.scale})`;
      } else {
        col.type = `${col.baseType}(${col.precision})`;
      }
    } else {
      throw new Error(`列 "${name}" 的约束无效: ${mod}`);
    }
  }

  return col;
}

function splitColon(spec: string): string[] {
  // 用 '\' 转义冒号
  const parts: string[] = [];
  let current = '';
  let escaped = false;
  for (const ch of spec) {
    if (escaped) {
      current += ch;
      escaped = false;
    } else if (ch === '\\') {
      escaped = true;
    } else if (ch === ':') {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (escaped) current += '\\';
  parts.push(current);
  return parts;
}

function unquote(s: string): string {
  const t = s.trim();
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseDefault(raw: string): any {
  const v = raw.trim();
  const up = v.toUpperCase();
  if (up === 'NULL') return null;
  if (up === 'TRUE') return true;
  if (up === 'FALSE') return false;
  if (up === 'CURRENT_TIMESTAMP' || up === 'NOW()' || up === 'CURRENT_DATE') return up;
  // 数字
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return unquote(v);
}
