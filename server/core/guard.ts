/**
 * 写操作护栏
 *  - 全局只读模式（config.readonly=true 时所有写操作需 --write）
 *  - 破坏性操作必须带 --yes
 *  - 有条件写操作（update/delete）必须 先 dry-run 拿 confirmToken，再带 token 执行
 *  - 影响行数超过阈值需 --force
 *  - token 与 op+sql+params 绑定，5 分钟有效（进程无关，跨调用可验证）
 */
import * as crypto from 'crypto';
import { getSecret, getConfig } from './config';
import { AppError } from './errors';

export interface WriteOpts {
  dryRun?: boolean;
  confirm?: string | null;
  yes?: boolean;
  force?: boolean;
  write?: boolean;
}

const TOKEN_WINDOW_MS = 5 * 60 * 1000;

export function computeToken(op: string, sql: string, params: any[]): string {
  const secret = getSecret();
  const bucket = Math.floor(Date.now() / TOKEN_WINDOW_MS);
  const payload = `${op}|${sql}|${JSON.stringify(params)}|${bucket}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 24);
}

export function verifyToken(token: string, op: string, sql: string, params: any[]): boolean {
  if (!token) return false;
  const secret = getSecret();
  const now = Date.now();
  const bucket = Math.floor(now / TOKEN_WINDOW_MS);
  for (let back = 0; back < 2; back++) {
    const b = bucket - back;
    const payload = `${op}|${sql}|${JSON.stringify(params)}|${b}`;
    const expect = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 24);
    if (expect === token) return true;
  }
  return false;
}

/** 检查全局只读模式 */
export function checkReadonly(write: boolean | undefined): void {
  const cfg = getConfig();
  if (cfg.readonly && !write) {
    throw new AppError('WRITE_BLOCKED', '当前为只读模式，写操作被禁止', {
      hint: '如需临时允许，请加 --write 或执行 fdb2 config set readonly false'
    });
  }
}

/** 影响行数阈值 */
export function confirmThreshold(): number {
  return getConfig().confirmThreshold ?? 100;
}

/** 检查行数是否超阈值（超阈值需 --force） */
export function checkThreshold(rows: number, force: boolean | undefined): void {
  if (rows > confirmThreshold() && !force) {
    throw new AppError('FORCE_REQUIRED', `操作将影响 ${rows} 行，超过阈值 ${confirmThreshold()}`, {
      hint: '确认无误后请附加 --force 重新 dry-run/执行'
    });
  }
}

/**
 * 写操作统一入口：
 *  - dryRun=true：估算行数，返回 token（不执行）
 *  - 有 confirm：校验 token 并放行
 *  - 破坏性操作（destructive=true）还需 --yes
 */
export function gateWrite(
  opts: {
    op: string;
    sql: string;
    params: any[];
    estimatedRows?: number | null;
    destructive?: boolean;
    write?: boolean;
    dryRun?: boolean;
    confirm?: string | null;
    yes?: boolean;
    force?: boolean;
  }
): { mode: 'execute' | 'dryrun'; token?: string } {
  checkReadonly(opts.write);

  const { op, sql, params } = opts;
  const destructive = !!opts.destructive;

  if (opts.dryRun) {
    // 预演：校验阈值但不执行
    if (opts.estimatedRows != null) {
      checkThreshold(opts.estimatedRows, opts.force);
    }
    const token = computeToken(op, sql, params);
    return { mode: 'dryrun', token };
  }

  // 正式执行路径
  if (opts.confirm) {
    if (!verifyToken(opts.confirm, op, sql, params)) {
      throw new AppError('CONFIRM_EXPIRED', '确认令牌无效或已过期', {
        hint: '请重新执行 dry-run 获取新令牌'
      });
    }
    if (destructive && !opts.yes) {
      throw new AppError('CONFIRM_REQUIRED', '破坏性操作还需 --yes 二次确认', {
        hint: '请附加 --yes 再次执行'
      });
    }
    if (opts.estimatedRows != null) {
      checkThreshold(opts.estimatedRows, opts.force);
    }
    return { mode: 'execute' };
  }

  // 无 dry-run 也无 token
  if (destructive) {
    throw new AppError('CONFIRM_REQUIRED', '破坏性操作必须先 dry-run 获取确认令牌，再携带 --confirm <token> 与 --yes 执行', {
      hint: '步骤：1) fdb2 ... --dry-run  2) fdb2 ... --confirm <token> --yes'
    });
  }
  throw new AppError('REQUIRE_DRYRUN', '写操作必须先 dry-run 预演', {
    hint: '步骤：1) fdb2 ... --dry-run  2) fdb2 ... --confirm <token>'
  });
}

/** 审计一个操作 */
export function audit(opts: {
  action: string;
  conn?: string | null;
  database?: string | null;
  table?: string | null;
  kind?: string | null;
  sql?: string | null;
  params?: any;
  rows?: number | null;
  ok: boolean;
  error?: string | null;
}): void {
  // 延迟 require 避免循环依赖
  const { appendAudit } = require('./config') as typeof import('./config');
  appendAudit({ ...opts } as any);
}
