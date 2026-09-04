/**
 * 过滤条件 DSL：把自然语言里的结构化筛选条件解析成条件树，
 * 由 query-builder 编译为带白名单校验与参数绑定的 SQL。
 *
 * 行内语法  --filter "<field><op><value>"
 *   =  !=  <>  >  >=  <  <=
 *   ~  包含子串(模糊)    ^  前缀    $  后缀
 *   ~c 区分大小写包含
 *   in/nin 集合      between 区间      null/notnull 空值
 *   值中逗号用 \, 转义
 *
 * 复杂逻辑 --filter-json '{"or":[...],"and":[...]}'
 */

export interface FilterLeaf {
  field: string;
  op:
    | 'eq' | 'neq'
    | 'gt' | 'gte' | 'lt' | 'lte'
    | 'like' | 'likeCase' | 'starts' | 'ends'
    | 'in' | 'nin' | 'between'
    | 'isNull' | 'notNull';
  value?: any;
}

export type FilterNode =
  | { type: 'and'; children: FilterNode[] }
  | { type: 'or'; children: FilterNode[] }
  | { type: 'not'; child: FilterNode }
  | { type: 'leaf'; leaf: FilterLeaf };

export function alwaysTrue(): FilterNode {
  return { type: 'leaf', leaf: { field: '', op: 'eq', value: 1 } };
}

/** 单个条件文本解析 */
export function parseFilterExpr(expr: string): FilterLeaf {
  if (expr == null || typeof expr !== 'string') {
    throw new Error('条件为空');
  }
  const text = expr.trim();
  if (!text) {
    throw new Error('条件为空');
  }

  const nullMatch = /^([^\s=<>~^$!]+)\s*(null|notnull|isnull|notnull)$/i.exec(text);
  if (nullMatch) {
    const op = nullMatch[2].toLowerCase();
    return { field: nullMatch[1], op: op === 'isnull' || op === 'null' ? 'isNull' : 'notNull' };
  }

  // 操作符顺序：多字符在前
  const ops = [
    ['!=', 'neq'],
    ['<>', 'neq'],
    ['>=', 'gte'],
    ['<=', 'lte'],
    ['~c', 'likeCase'],
    ['~', 'like'],
    ['like', 'like'],
    ['starts', 'starts'],
    ['ends', 'ends'],
    ['in', 'in'],
    ['nin', 'nin'],
    ['between', 'between'],
    ['>', 'gt'],
    ['<', 'lt'],
    ['=', 'eq'],
    ['^', 'starts'],
    ['$', 'ends']
  ];

  for (const [sym, op] of ops) {
    const idx = text.indexOf(sym);
    if (idx > 0) {
      const field = text.slice(0, idx).trim();
      let rawValue = text.slice(idx + sym.length).trim();
      if (!field || rawValue === '') {
        continue;
      }
      if (op === 'in' || op === 'nin' || op === 'between') {
        const parts = splitEscaped(rawValue);
        return { field, op: op as any, value: parts };
      }
      return { field, op: op as any, value: unescapeValue(rawValue) };
    }
  }

  throw new Error(`无法解析条件: ${expr}（支持 = != > < >= <= ~ ^ $ in nin between null）`);
}

function splitEscaped(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let escaped = false;
  for (const ch of value) {
    if (escaped) {
      current += ch;
      escaped = false;
    } else if (ch === '\\') {
      escaped = true;
    } else if (ch === ',') {
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

function unescapeValue(value: string): string {
  return value.replace(/\\,/g, ',').trim();
}

/** 解析 --filter 重复参数（多个 AND） */
export function parseFilters(exprs: string[]): FilterNode {
  const leaves = (exprs || []).filter(Boolean).map((e) => parseFilterExpr(e));
  if (leaves.length === 0) return alwaysTrue();
  if (leaves.length === 1) return { type: 'leaf', leaf: leaves[0] };
  return { type: 'and', children: leaves.map((l) => ({ type: 'leaf' as const, leaf: l })) };
}

/** 解析 --filter-json 复杂条件 */
export function parseFilterJson(jsonStr: string): FilterNode {
  let raw: any;
  try {
    raw = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('--filter-json 不是合法 JSON');
  }
  return parseJsonNode(raw);
}

function parseJsonNode(node: any): FilterNode {
  if (!node || typeof node !== 'object') {
    throw new Error('filter-json 节点必须是对象');
  }
  if (node.and) {
    return { type: 'and', children: (Array.isArray(node.and) ? node.and : [node.and]).map(parseJsonNode) };
  }
  if (node.or) {
    return { type: 'or', children: (Array.isArray(node.or) ? node.or : [node.or]).map(parseJsonNode) };
  }
  if (node.not) {
    return { type: 'not', child: parseJsonNode(node.not) };
  }
  const field = node.field ?? node.f;
  if (!field) throw new Error('filter-json 条件缺少 field');
  const opRaw = (node.op ?? '=') as string;
  const value = node.value !== undefined ? node.value : node.v;
  const leaf: FilterLeaf = {
    field: String(field),
    op: normalizeOp(opRaw),
    value
  };
  return { type: 'leaf', leaf };
}

function normalizeOp(op: string): FilterLeaf['op'] {
  const map: Record<string, FilterLeaf['op']> = {
    '=': 'eq', '==': 'eq', eq: 'eq',
    '!=': 'neq', '<>': 'neq', neq: 'neq',
    '>': 'gt', gt: 'gt', '>=': 'gte', gte: 'gte',
    '<': 'lt', lt: 'lt', '<=': 'lte', lte: 'lte',
    '~': 'like', like: 'like', 'contains': 'like',
    '~c': 'likeCase', likecase: 'likeCase',
    '^': 'starts', starts: 'starts', 'starts_with': 'starts',
    '$': 'ends', ends: 'ends', 'ends_with': 'ends',
    in: 'in', 'not_in': 'nin', nin: 'nin',
    between: 'between',
    'is_null': 'isNull', isnull: 'isNull', null: 'isNull', 'is null': 'isNull',
    'not_null': 'notNull', notnull: 'notNull', 'not null': 'notNull'
  };
  const key = String(op).toLowerCase();
  if (map[key]) return map[key];
  throw new Error(`不支持的操作符: ${op}`);
}
