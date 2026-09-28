import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

/**
 * ClickHouse 连接封装
 * ClickHouse 没有官方 TypeORM 驱动，这里直接使用其 HTTP 接口（默认端口 8123）。
 * 该对象对外暴露与 TypeORM DataSource 类似的最小接口：
 *   query(sql, params?) / options / isInitialized / destroy()
 * 以便复用现有 BaseDatabaseService 体系。
 */
export class ClickHouseConnection {
  public options: any;
  public isInitialized = true;
  private baseUrl: string;
  private auth?: string;
  private defaultDatabase: string;

  private timeout: number;

  constructor(connectionConfig: any) {
    const config = connectionConfig || {};
    const secure = !!(config.options && (config.options.secure || config.options.ssl));
    const proto = secure ? 'https' : 'http';
    const host = config.host || 'localhost';
    const port = config.port || 8123;
    this.baseUrl = `${proto}://${host}:${port}`;
    this.defaultDatabase = config.database && config.database !== 'default' ? config.database : 'default';
    this.timeout = Number((config.options && config.options.requestTimeout) || 30000);

    this.options = {
      type: 'clickhouse',
      host,
      port,
      username: config.username,
      password: config.password,
      database: config.database || this.defaultDatabase,
      ...(config.options || {})
    };

    // ClickHouse 默认用户为 default；即使未填用户名也应携带鉴权头
    const username = config.username || 'default';
    const token = Buffer.from(`${username}:${config.password || ''}`).toString('base64');
    this.auth = `Basic ${token}`;
  }

  /**
   * 执行 SQL。
   * - 读查询（SELECT/SHOW/DESCRIBE/EXPLAIN/WITH）返回解析后的行数组（JSONEachRow）。
   * - 其它（DDL/DML）返回空数组。
   */
  async query(sql: string, params?: any[]): Promise<any> {
    let finalSql = sql;
    if (params && params.length) {
      finalSql = ClickHouseConnection.fillParams(sql, params);
    }
    const isRead = /^\s*(select|with|show|describe|desc|explain|exists|use)\b/i.test(finalSql);
    if (isRead) {
      // 去掉结尾分号，避免 "...; FORMAT ..." 语法错误
      const cleanSql = finalSql.replace(/;\s*$/, '');
      // 使用 JSONStringsEachRow：所有值均以字符串返回，避免 UInt64 等超出 JS 安全整数范围导致精度丢失
      const text = await this.post(`${cleanSql} FORMAT JSONStringsEachRow`);
      if (!text || !text.trim()) return [];
      return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => ClickHouseConnection.safeParse(line));
    }
    await this.post(finalSql);
    return [];
  }

  /**
   * 解析 JSONEachRow 单行。
   * ClickHouse 可能输出 NaN/Infinity（非法 JSON），解析失败时回退为原始字符串。
   */
  private static safeParse(line: string): any {
    try {
      return JSON.parse(line);
    } catch {
      try {
        const normalized = line
          .replace(/:\s*NaN/g, ': null')
          .replace(/:\s*Infinity/g, ': null')
          .replace(/:\s*-Infinity/g, ': null');
        return JSON.parse(normalized);
      } catch {
        return line;
      }
    }
  }

  /**
   * 执行查询并返回原始文本（用于导出 CSV/原生格式）。
   */
  async queryRaw(sql: string, format: string = 'CSVWithNames'): Promise<string> {
    return this.post(`${sql.replace(/;\s*$/, '')} FORMAT ${format}`);
  }

  async destroy(): Promise<void> {
    this.isInitialized = false;
  }

  private databasePath(): string {
    return `/?database=${encodeURIComponent(this.defaultDatabase)}`;
  }

  private post(body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsed = url.parse(this.baseUrl);
      const data = Buffer.from(body, 'utf8');
      const headers: Record<string, any> = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': data.length
      };
      if (this.auth) headers['Authorization'] = this.auth;

      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          hostname: parsed.hostname,
          port: parsed.port,
          path: this.databasePath(),
          method: 'POST',
          headers
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            const status = res.statusCode || 0;
            if (status >= 400) {
              reject(new Error(`ClickHouse 错误 (${status}): ${text.trim()}`));
            } else {
              resolve(text);
            }
          });
        }
      );
      req.on('error', (err) => reject(err));
      req.setTimeout(this.timeout, () => {
        req.destroy(new Error(`ClickHouse 请求超时（${this.timeout}ms）`));
      });
      req.write(data);
      req.end();
    });
  }

  /** 将 SQL 中的 ? 占位符按顺序替换为安全字面量（仅用于服务内部兜底） */
  private static fillParams(sql: string, params: any[]): string {
    let i = 0;
    return sql.replace(/\?/g, () => {
      const v = params[i++];
      return ClickHouseConnection.escapeLiteral(v);
    });
  }

  /**
   * 转义 ClickHouse 字符串字面量。
   * ClickHouse 字符串中以反斜杠作为转义符：\\ 表示反斜杠，\' 表示单引号，
   * 不能使用 SQL 标准的双写单引号（''）。
   */
  static escapeLiteral(value: any): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value instanceof Date) {
      const s = value.toISOString().slice(0, 19).replace('T', ' ');
      return `'${ClickHouseConnection.escapeString(s)}'`;
    }
    if (typeof value === 'object') {
      return `'${ClickHouseConnection.escapeString(JSON.stringify(value))}'`;
    }
    return `'${ClickHouseConnection.escapeString(String(value))}'`;
  }

  private static escapeString(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
