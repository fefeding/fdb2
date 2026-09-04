/**
 * 轻量参数解析器（零依赖）
 * 支持：--k v、--k=v、-a v；可重复 list 参数（--filter a --filter b）
 */
import { AppError } from '../core/errors';

export type OptType = 'bool' | 'string' | 'int' | 'list' | 'json';

export interface OptDef {
  name: string;
  alias?: string;
  type: OptType;
}

export interface Parsed {
  pos: string[];
  values: Record<string, any>;
}

/** 全局通用选项（每个命令都可用） */
export const GLOBAL_DEFS: OptDef[] = [
  { name: 'json', type: 'bool' },
  { name: 'quiet', type: 'bool' },
  { name: 'yes', type: 'bool' },
  { name: 'write', type: 'bool' },
  { name: 'dry-run', alias: 'dry', type: 'bool' },
  { name: 'confirm', type: 'string' },
  { name: 'force', type: 'bool' },
  { name: 'conn', type: 'string' },
  { name: 'db', type: 'string' },
  { name: 'limit', type: 'int' },
  { name: 'offset', type: 'int' },
  { name: 'count', type: 'bool' },
  { name: 'out', type: 'string' },
  // 连接参数
  { name: 'name', type: 'string' },
  { name: 'type', type: 'string' },
  { name: 'host', type: 'string' },
  { name: 'port', type: 'int' },
  { name: 'database', type: 'string' },
  { name: 'username', type: 'string' },
  { name: 'password', type: 'string' },
  { name: 'password-stdin', type: 'bool' },
  { name: 'ssl', type: 'bool' },
  { name: 'option', type: 'list' },
  { name: 'enabled', type: 'string' }
];

export function parseArgs(argv: string[], extraDefs: OptDef[] = []): Parsed {
  const defs = extraDefs.concat(GLOBAL_DEFS);
  const index: Record<string, OptDef> = {};
  for (const d of defs) {
    index['--' + d.name] = d;
    if (d.alias) index['-' + d.alias] = d;
  }

  const pos: string[] = [];
  const values: Record<string, any> = {};
  let i = 0;

  const setVal = (def: OptDef, rawVal: string | null, hasEq: boolean) => {
    if (def.type === 'bool') {
      values[def.name] = hasEq ? !(rawVal === 'false' || rawVal === '0') : true;
      return;
    }
    if (rawVal === null || rawVal === undefined) {
      throw new AppError('PARAM_ERROR', `选项 --${def.name} 缺少值`);
    }
    if (def.type === 'int') {
      const n = Math.floor(Number(rawVal));
      if (!Number.isFinite(n)) throw new AppError('PARAM_ERROR', `选项 --${def.name} 需要整数，收到: ${rawVal}`);
      values[def.name] = n;
    } else if (def.type === 'list') {
      if (!values[def.name]) values[def.name] = [];
      values[def.name].push(rawVal);
    } else if (def.type === 'json') {
      try {
        values[def.name] = JSON.parse(rawVal);
      } catch (e) {
        throw new AppError('PARAM_ERROR', `选项 --${def.name} 需要合法 JSON，收到: ${rawVal}`);
      }
    } else {
      values[def.name] = rawVal;
    }
  };

  while (i < argv.length) {
    const token = argv[i];
    if (token === '--') {
      pos.push(...argv.slice(i + 1));
      break;
    }
    if (token.startsWith('--') || (token.startsWith('-') && token.length > 1 && !/^-\d/.test(token))) {
      const eq = token.indexOf('=');
      const key = eq > 0 ? token.slice(0, eq) : token;
      const def = index[key];
      if (!def) {
        throw new AppError('PARAM_ERROR', `未知选项: ${token}`, { hint: `可用选项: ${Object.keys(index).join(' ')}` });
      }
      if (eq > 0) {
        setVal(def, token.slice(eq + 1), true);
        i++;
      } else if (def.type === 'bool') {
        setVal(def, null, false);
        i++;
      } else {
        const next = argv[i + 1];
        if (next === undefined) throw new AppError('PARAM_ERROR', `选项 --${def.name} 缺少值`);
        setVal(def, next, false);
        i += 2;
      }
    } else {
      pos.push(token);
      i++;
    }
  }
  return { pos, values };
}

/** k=v 列表解析 */
export function parseKvList(list: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const item of list || []) {
    const eq = item.indexOf('=');
    if (eq <= 0) throw new AppError('PARAM_ERROR', `选项格式应为 k=v，收到: ${item}`);
    const k = item.slice(0, eq).trim();
    const v = item.slice(eq + 1).trim();
    out[k] = coerceOptValue(v);
  }
  return out;
}

/** csv 拆分（--select a,b） */
export function splitCsv(s?: string): string[] {
  if (!s) return [];
  return String(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function coerceOptValue(v: string): any {
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  if (v !== '' && !Number.isNaN(n) && String(v).trim() !== '') return n;
  return v;
}
