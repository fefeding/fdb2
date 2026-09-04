/**
 * CLI 统一错误码与错误类型
 * 退出码：
 *   0 成功
 *   1 通用错误（GENERIC）
 *   2 参数/用法错误（PARAM_ERROR、UNKNOWN_COMMAND、INVALID_FILTER）
 *   3 连接不存在（CONN_NOT_FOUND、NO_DEFAULT_CONN）
 *   4 未就绪（NOT_READY）
 *   5 需确认/预演（REQUIRE_DRYRUN、CONFIRM_REQUIRED、CONFIRM_EXPIRED、FORCE_REQUIRED、WRITE_BLOCKED、MULTI_STATEMENT_BLOCKED）
 *   6 SQL/数据库错误（SQL_ERROR、DB_NOT_FOUND、TABLE_NOT_FOUND、COLUMN_NOT_FOUND、UNSUPPORTED、DRIVER_UNAVAILABLE）
 */

export class AppError extends Error {
  code: string;
  hint?: string;
  details?: any;

  constructor(code: string, message: string, opts?: { hint?: string; details?: any }) {
    super(message);
    this.code = code;
    this.hint = opts?.hint;
    this.details = opts?.details;
  }
}

export function exitCodeOf(code: string): number {
  switch (code) {
    case 'PARAM_ERROR':
    case 'UNKNOWN_COMMAND':
    case 'INVALID_FILTER':
    case 'INVALID_COLUMN_SPEC':
    case 'INVALID_OPTION':
      return 2;
    case 'CONN_NOT_FOUND':
    case 'NO_DEFAULT_CONN':
      return 3;
    case 'NOT_READY':
      return 4;
    case 'REQUIRE_DRYRUN':
    case 'CONFIRM_REQUIRED':
    case 'CONFIRM_EXPIRED':
    case 'FORCE_REQUIRED':
    case 'WRITE_BLOCKED':
    case 'MULTI_STATEMENT_BLOCKED':
    case 'WRITE_NOT_ALLOWED':
      return 5;
    case 'SQL_ERROR':
    case 'DB_NOT_FOUND':
    case 'TABLE_NOT_FOUND':
    case 'COLUMN_NOT_FOUND':
    case 'UNSUPPORTED':
    case 'DRIVER_UNAVAILABLE':
    case 'EXEC_ERROR':
      return 6;
    default:
      return 1;
  }
}
