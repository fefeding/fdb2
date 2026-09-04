/**
 * CLI 本地状态管理
 * - ~/.fdb2/config.json ：默认连接、只读开关、限额、生产库黑名单
 * - ~/.fdb2/cli-secret  ：confirmToken 签名密钥（进程无关、跨调用可验证）
 * - ~/.fdb2/audit.log   ：审计日志（每次命令一行 JSON）
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getDataDir, getDataPath, ensureDataDir } from '../utils/data-dir';

export interface CliConfig {
  defaultConnectionId?: string | null;
  readonly?: boolean;
  /** 默认查询行数上限 */
  maxRows?: number;
  /** 写操作影响行数阈值，超过需要 --force */
  confirmThreshold?: number;
  /** 不可删除的数据库名单 */
  protectedDatabases?: string[];
}

const DEFAULT_CONFIG: CliConfig = {
  defaultConnectionId: null,
  readonly: false,
  maxRows: 1000,
  confirmThreshold: 100,
  protectedDatabases: [
    'information_schema',
    'performance_schema',
    'mysql',
    'sys',
    'postgres',
    'template0',
    'template1',
    'master',
    'model',
    'msdb',
    'tempdb',
    'system',
    'saphanadb',
    'SYS'
  ]
};

let _cache: CliConfig | null = null;

export function loadConfig(): CliConfig {
  if (_cache) return _cache;
  ensureDataDir();
  const p = getDataPath('config.json');
  try {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      _cache = { ...DEFAULT_CONFIG, ...raw };
      return _cache!;
    }
  } catch (e) {
    // 配置损坏时回退默认
  }
  _cache = { ...DEFAULT_CONFIG };
  return _cache!;
}

export function saveConfig(cfg: CliConfig): CliConfig {
  ensureDataDir();
  const p = getDataPath('config.json');
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
  try {
    if (process.platform !== 'win32') fs.chmodSync(p, 0o600);
  } catch {
    /* ignore */
  }
  _cache = cfg;
  return cfg;
}

export function updateConfig(partial: Partial<CliConfig>): CliConfig {
  const next = { ...loadConfig(), ...partial };
  return saveConfig(next);
}

export function getConfig(): CliConfig {
  return loadConfig();
}

/** 获取 confirmToken 签名密钥（首次自动生成并持久化） */
export function getSecret(): string {
  ensureDataDir();
  const p = getDataPath('cli-secret');
  try {
    if (fs.existsSync(p)) {
      const s = fs.readFileSync(p, 'utf8').trim();
      if (s) return s;
    }
  } catch (e) {
    /* ignore */
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(p, secret, 'utf8');
  try {
    if (process.platform !== 'win32') fs.chmodSync(p, 0o600);
  } catch {
    /* ignore */
  }
  return secret;
}

/** 数据目录位置（输出给用户） */
export function dataDir(): string {
  return getDataDir();
}

/** 审计日志 */
export function appendAudit(entry: {
  ts?: string;
  action: string;
  conn?: string | null;
  database?: string | null;
  table?: string | null;
  kind?: string;
  sql?: string | null;
  params?: any;
  rows?: number | null;
  ok: boolean;
  error?: string | null;
}): void {
  try {
    ensureDataDir();
    const line = JSON.stringify({
      ts: entry.ts || new Date().toISOString(),
      action: entry.action,
      conn: entry.conn || null,
      database: entry.database || null,
      table: entry.table || null,
      kind: entry.kind || null,
      sql: entry.sql || null,
      params: entry.params || null,
      rows: entry.rows ?? null,
      ok: entry.ok,
      error: entry.error || null
    });
    fs.appendFileSync(getDataPath('audit.log'), line + '\n', 'utf8');
  } catch (e) {
    // 审计失败不阻断命令
  }
}

export function readAudit(limit = 100): any[] {
  try {
    const p = getDataPath('audit.log');
    if (!fs.existsSync(p)) return [];
    const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
    const result = lines.slice(-limit).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
    return result;
  } catch (e) {
    return [];
  }
}
