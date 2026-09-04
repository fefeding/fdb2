/**
 * DbToolApi —— CLI 的显式接口层（单一事实来源）
 * 所有命令在此实现，直接调用服务层（ConnectionService + 方言服务），
 * 统一经过：列名白名单 → 参数化编译 → 护栏（只读/dry-run/确认/阈值）→ 审计。
 */
import { ConnectionService } from '../service/connection.service';
import { ConnectionEntity } from '../model/connection.entity';
import {
  getDialectInfo,
  normalizeDialectType,
  isDialectSupported,
  listDialects,
  quoteIdentifier
} from './dialect';
import {
  FilterNode,
  parseFilters,
  parseFilterJson,
  alwaysTrue
} from './filter-dsl';
import { parseColumnSpec, ParsedColumn } from './column-spec';
import {
  SqlBuilder,
  buildSelect,
  buildCount,
  buildInsert,
  buildUpdate,
  buildDelete,
  parseSorts,
  classifySql,
  ColumnMeta
} from './query-builder';
import { AppError } from './errors';
import { gateWrite, audit } from './guard';
import { loadConfig, updateConfig, getConfig, dataDir, readAudit } from './config';
import * as fs from 'fs';
import * as path from 'path';

export interface ApiCtx {
  conn?: string | null;
  database?: string | null;
  table?: string | null;
}

export class DbToolApi {
  private connectionService: ConnectionService;

  constructor() {
    this.connectionService = new ConnectionService();
  }

  // ============ 工具 ============

  async allConnections(): Promise<ConnectionEntity[]> {
    return this.connectionService.getAllConnections();
  }

  async resolveConnection(ref?: string | null): Promise<ConnectionEntity> {
    const list = await this.allConnections();
    const all = list.filter((c) => c.enabled !== false);
    let target: ConnectionEntity | undefined;
    if (ref) {
      target = list.find((c) => c.id === ref || c.name === ref);
      if (!target) {
        target = list.find((c) => c.name && c.name.toLowerCase() === String(ref).toLowerCase());
      }
      if (!target) {
        const names = list.map((c) => c.name || c.id);
        throw new AppError('CONN_NOT_FOUND', `连接 ${ref} 不存在`, {
          hint: names.length ? `可用连接: ${names.join(', ')}` : '还没有任何连接，请先执行 fdb2 conn add',
          details: { available: names }
        });
      }
    } else {
      const defaultId = loadConfig().defaultConnectionId;
      if (defaultId) {
        target = all.find((c) => c.id === defaultId) || list.find((c) => c.id === defaultId);
      }
      if (!target) {
        if (all.length === 1) target = all[0];
      }
      if (!target) {
        const names = all.map((c) => c.name || c.id);
        throw new AppError('NO_DEFAULT_CONN', '未指定连接，且没有默认连接', {
          hint: names.length ? `可用连接: ${names.join(', ')}；请用 --conn 指定或用 fdb2 conn use <name> 设置默认` : '还没有任何连接，请先执行 fdb2 conn add'
        });
      }
    }
    return target;
  }

  async getDataSource(conn: ConnectionEntity, database?: string) {
    return this.connectionService.getActiveConnection(conn.id, database || conn.database);
  }

  /** 动态加载方言 service（避免原生驱动在导入期全量加载） */
  loadDialectService(type: string): any {
    const info = getDialectInfo(type);
    const file = `../service/database/${info.serviceFile}.service`;
    try {
      const mod = require(file);
      const Cls = mod[info.serviceClass];
      if (!Cls) throw new Error(`未找到类 ${info.serviceClass}`);
      return new Cls();
    } catch (e: any) {
      throw new AppError('DRIVER_UNAVAILABLE', `无法加载 ${info.label} 驱动: ${e?.message || e}`, {
        hint: `数据库类型 ${type} 对应的驱动可能未安装（fdb2 安装时该可选依赖安装失败），请尝试重新安装或改用其它数据库类型`
      });
    }
  }

  sanitizeConnection(conn: ConnectionEntity): any {
    const { password, ...rest } = conn as any;
    return { ...rest, password: password ? '***' : null, hasPassword: !!password };
  }

  async ensureTable(conn: ConnectionEntity, database: string, table: string, service: any, dataSource: any): Promise<void> {
    const tables = await service.getTables(dataSource, database);
    if (!tables || !tables.some((t: any) => t.name === table)) {
      const names = (tables || []).map((t: any) => t.name).slice(0, 50);
      throw new AppError('TABLE_NOT_FOUND', `表 ${table} 不存在于数据库 ${database}`, {
        hint: names.length ? `可用表: ${names.join(', ')}` : '该数据库没有表',
        details: { availableTables: names }
      });
    }
  }

  async getColumns(conn: ConnectionEntity, database: string, table: string): Promise<ColumnMeta[]> {
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    await this.ensureTable(conn, database, table, service, ds);
    const cols = await service.getColumns(ds, database, table);
    return (cols || []).map((c: any) => ({
      name: c.name,
      type: c.type,
      isAutoIncrement: !!c.isAutoIncrement,
      isPrimary: !!c.isPrimary,
      nullable: c.nullable !== false
    }));
  }

  // ============ 连接管理 ============

  async listConnections(): Promise<any> {
    const list = await this.allConnections();
    const defaultId = loadConfig().defaultConnectionId;
    return {
      defaultConnectionId: defaultId,
      connections: list.map((c) => ({ ...this.sanitizeConnection(c), isDefault: c.id === defaultId }))
    };
  }

  async getConnectionInfo(ref: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    return this.sanitizeConnection(conn);
  }

  async addConnection(input: {
    name: string;
    type: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    options?: Record<string, any>;
  }): Promise<any> {
    const type = normalizeDialectType(input.type);
    if (!type || !isDialectSupported(input.type)) {
      throw new AppError('PARAM_ERROR', `不支持的数据库类型: ${input.type}`, {
        hint: `支持: ${listDialects().map((d) => `${d.type}(${d.label})`).join(', ')}`
      });
    }
    if (!input.name || !String(input.name).trim()) throw new AppError('PARAM_ERROR', '缺少连接名称 --name');
    const info = getDialectInfo(type);
    const conn: any = {
      name: String(input.name).trim(),
      type,
      host: input.host || (type === 'sqlite' ? null : 'localhost'),
      port: input.port ?? info.defaultPort,
      database: input.database,
      username: input.username || null,
      password: input.password || null,
      options: input.options || {}
    };
    if (!conn.database) {
      throw new AppError('PARAM_ERROR', '缺少数据库名/文件路径 --database');
    }
    const saved = await this.connectionService.addConnection(conn);
    return this.sanitizeConnection(saved);
  }

  async updateConnection(ref: string, updates: Record<string, any>): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const patch: Record<string, any> = {};
    const allowed = ['name', 'host', 'port', 'database', 'username', 'password', 'enabled', 'options'];
    for (const k of Object.keys(updates)) {
      if (allowed.includes(k)) patch[k] = updates[k];
    }
    if (updates.type) {
      const t = normalizeDialectType(updates.type);
      if (!t) throw new AppError('PARAM_ERROR', `不支持的数据库类型: ${updates.type}`);
      patch.type = t;
    }
    if (Object.keys(patch).length === 0) throw new AppError('PARAM_ERROR', '没有可更新的字段');
    const saved = await this.connectionService.updateConnection(conn.id, patch as any);
    return this.sanitizeConnection(saved);
  }

  async deleteConnection(ref: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    await this.connectionService.deleteConnection(conn.id);
    const cfg = loadConfig();
    if (cfg.defaultConnectionId === conn.id) {
      updateConfig({ defaultConnectionId: null });
    }
    return { deleted: conn.name || conn.id };
  }

  async testConnectionByRef(ref: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const ok = await this.connectionService.testConnection(conn);
    audit({ action: 'conn.test', conn: conn.name, ok, error: ok ? null : '连接测试失败' });
    return { name: conn.name, ok };
  }

  async setDefaultConnection(ref: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    updateConfig({ defaultConnectionId: conn.id });
    return { defaultConnection: conn.name || conn.id };
  }

  async currentConnection(): Promise<any> {
    const conn = await this.resolveConnection(null);
    return { ...this.sanitizeConnection(conn), isDefault: true };
  }

  async types(): Promise<any> {
    const list = listDialects();
    return { count: list.length, types: list };
  }

  // ============ 数据库 ============

  async listDatabases(ref?: string | null): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn);
    const dbs = await service.getDatabases(ds);
    return { conn: conn.name, databases: dbs || [] };
  }

  async databaseInfo(ref: string | null | undefined, database: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const info = await service.getDatabaseInfo(ds, database);
    return { conn: conn.name, database, info };
  }

  async createDatabaseCmd(ref: string | null | undefined, database: string, charset: string | undefined, opts: any): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn);
    const label = `CREATE DATABASE ${database}`;
    const g = gateWrite({ op: 'db.create', sql: label, params: [], destructive: false, dryRun: opts.dryRun, confirm: opts.confirm, write: opts.write, force: opts.force });
    if (g.mode === 'dryrun') {
      return { dryRun: true, sql: label, token: g.token, estimatedRows: 0 };
    }
    await service.createDatabase(ds, database, charset ? { charset } : undefined);
    audit({ action: 'db.create', conn: conn.name, database, sql: label, ok: true });
    return { conn: conn.name, created: database, sql: label };
  }

  async dropDatabaseCmd(ref: string | null | undefined, database: string, opts: any): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const protectedList = getConfig().protectedDatabases || [];
    if (protectedList.map((s: string) => s.toLowerCase()).includes(String(database).toLowerCase())) {
      throw new AppError('WRITE_NOT_ALLOWED', `${database} 是系统库/受保护数据库，禁止删除`, {
        hint: `受保护名单: ${protectedList.join(', ')}`
      });
    }
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const sql = `DROP DATABASE ${quoteIdentifier(conn.type, database)}`;
    const g = gateWrite({ op: 'db.drop', sql, params: [], destructive: true, ...opts });
    if (g.mode === 'dryrun') {
      return { dryRun: true, sql, token: g.token, estimatedRows: null };
    }
    await service.dropDatabase(ds, database);
    audit({ action: 'db.drop', conn: conn.name, database, sql, ok: true });
    return { dropped: database, sql };
  }

  // ============ 表 ============

  async listTables(ref: string | null | undefined, database: string, pattern?: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    let tables = await service.getTables(ds, database);
    if (pattern) {
      const re = new RegExp('^' + String(pattern).replace(/%/g, '.*').replace(/\*/g, '.*') + '$', 'i');
      tables = (tables || []).filter((t: any) => re.test(t.name));
    }
    return {
      conn: conn.name,
      database,
      tableCount: (tables || []).length,
      tables: (tables || []).map((t: any) => ({
        name: t.name,
        type: t.type || null,
        engine: t.engine || null,
        rowCount: t.rowCount || 0,
        size: t.dataSize || 0,
        comment: t.comment || null
      }))
    };
  }

  async tableInfo(ref: string | null | undefined, database: string, table: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    await this.ensureTable(conn, database, table, service, ds);
    const info = await service.getTableInfo(ds, database, table);
    return {
      conn: conn.name,
      database,
      table: {
        name: info.name,
        engine: info.engine,
        rowCount: info.rowCount,
        size: info.dataSize,
        comment: info.comment,
        columns: info.columns || [],
        indexes: info.indexes || [],
        foreignKeys: info.foreignKeys || []
      }
    };
  }

  async createTableCmd(
    ref: string | null | undefined,
    database: string,
    table: string,
    specs: string[],
    opts: { engine?: string; charset?: string; comment?: string; yes?: boolean; dryRun?: boolean; confirm?: string; write?: boolean; force?: boolean }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    if (!specs || specs.length === 0) throw new AppError('PARAM_ERROR', '建表至少需要一个 --column');
    if (getDialectInfo(conn.type).kind === 'mongodb') {
      throw new AppError('UNSUPPORTED', 'MongoDB 文档模型暂不支持该命令（experimental）', { hint: 'MongoDB 为实验性支持，请使用桌面端管理集合结构' });
    }
    const columns: ParsedColumn[] = specs.map((s) => parseColumnSpec(s));
    const kind = getDialectInfo(conn.type).kind;
    const q = (id: string) => quoteIdentifier(conn.type, id);
    const tableName = q(table);

    const lines: string[] = [];
    const pkCols: string[] = [];
    for (const c of columns) {
      const parts = [q(c.name), typeFor(kind, c)];
      if (c.isAutoIncrement) {
        if (kind === 'mysql') {
          parts.push('AUTO_INCREMENT');
        } else if (kind === 'postgres' || kind === 'cockroachdb') {
          parts[1] = c.baseType.includes('big') ? 'BIGSERIAL' : c.baseType.includes('small') ? 'SMALLSERIAL' : 'SERIAL';
          parts.pop();
        } else if (kind === 'sqlite') {
          parts[1] = 'INTEGER PRIMARY KEY AUTOINCREMENT';
          pkCols.push(c.name);
          parts.pop();
        } else if (kind === 'mssql') {
          parts.push('IDENTITY(1,1)');
        } else if (kind === 'oracle') {
          parts.push('GENERATED BY DEFAULT AS IDENTITY');
        } else if (kind === 'sap') {
          parts.push('GENERATED BY DEFAULT AS IDENTITY');
        }
      }
      if (!c.nullable && !(kind === 'sqlite' && c.isAutoIncrement)) parts.push('NOT NULL');
      if (c.hasDefault) {
        parts.push(`DEFAULT ${formatDdlDefault(c.defaultValue)}`);
      }
      if (c.unique) {
        parts.push('UNIQUE');
      }
      if (c.comment && (kind === 'mysql' || kind === 'mssql')) {
        parts.push(`COMMENT '${String(c.comment).replace(/'/g, "''")}'`);
      }
      if (c.isPrimary) pkCols.push(c.name);
      lines.push(parts.join(' '));
    }
    if (pkCols.length > 1) {
      lines.push(`PRIMARY KEY (${pkCols.map((c) => q(c)).join(', ')})`);
    }
    let sql = `CREATE TABLE ${tableName} (\n  ${lines.join(',\n  ')}\n)`;
    if (kind === 'mysql') {
      const suffix: string[] = [];
      if (opts.engine) suffix.push(`ENGINE=${opts.engine}`);
      if (opts.charset) suffix.push(`DEFAULT CHARSET=${opts.charset}`);
      if (suffix.length) sql += ` ${suffix.join(' ')}`;
    }
    if (opts.comment && kind === 'mysql') {
      sql += ` COMMENT='${String(opts.comment).replace(/'/g, "''")}'`;
    }
    if (kind === 'sqlite') {
      sql = sql.replace(/\)\s*$/, ')');
    }
    sql += ';';

    const g = gateWrite({ op: 'table.create', sql, params: [], destructive: false, yes: opts.yes, dryRun: opts.dryRun, confirm: opts.confirm, write: opts.write });
    if (g.mode === 'dryrun') {
      return { dryRun: true, sql, token: g.token, estimatedRows: 0 };
    }
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    await ds.query(sql);
    audit({ action: 'table.create', conn: conn.name, database, table, sql, ok: true });
    return { created: table, sql };
  }

  async alterTableCmd(
    ref: string | null | undefined,
    database: string,
    table: string,
    opts: {
      addColumn?: string[];
      dropColumn?: string[];
      modifyColumn?: string[];
      renameTo?: string;
      yes?: boolean;
      dryRun?: boolean;
      confirm?: string;
      write?: boolean;
      force?: boolean;
    }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const type = conn.type;
    const service = this.loadDialectService(type);
    const ds = await this.getDataSource(conn, database);
    await this.ensureTable(conn, database, table, service, ds);
    const kind = getDialectInfo(type).kind;
    const statements: string[] = [];
    const q = (id: string) => quoteIdentifier(type, id);

    const colDef = (c: ParsedColumn): string => {
      const parts = [q(c.name), c.type];
      if (c.isAutoIncrement && kind === 'mysql') parts.push('AUTO_INCREMENT');
      if (!c.nullable) parts.push('NOT NULL');
      if (c.hasDefault) parts.push(`DEFAULT ${formatDdlDefault(c.defaultValue)}`);
      if (c.comment) parts.push(`COMMENT '${String(c.comment).replace(/'/g, "''")}'`);
      return parts.join(' ');
    };

    for (const s of opts.addColumn || []) {
      const c = parseColumnSpec(s);
      statements.push(`ALTER TABLE ${q(table)} ADD COLUMN ${colDef(c)}`);
    }
    for (const s of opts.dropColumn || []) {
      statements.push(`ALTER TABLE ${q(table)} DROP COLUMN ${q(s)}`);
    }
    for (const s of opts.modifyColumn || []) {
      const c = parseColumnSpec(s);
      if (kind === 'sqlite') {
        throw new AppError('UNSUPPORTED', 'SQLite 不支持直接修改列，请用 add-column/drop-column 或重建表');
      }
      const kw = kind === 'mysql' ? 'MODIFY COLUMN' : kind === 'mssql' ? 'ALTER COLUMN' : 'ALTER COLUMN';
      statements.push(`ALTER TABLE ${q(table)} ${kw} ${colDef(c)}`);
    }
    if (opts.renameTo) {
      if (kind === 'mysql') statements.push(`ALTER TABLE ${q(table)} RENAME TO ${q(opts.renameTo)}`);
      else statements.push(`ALTER TABLE ${q(table)} RENAME TO ${q(opts.renameTo)}`);
    }
    if (statements.length === 0) throw new AppError('PARAM_ERROR', 'alter 需要 --add-column/--drop-column/--modify-column/--rename-to 之一');
    const label = statements.join('; ');
    const g = gateWrite({ op: 'table.alter', sql: label, params: [], destructive: true, yes: opts.yes, dryRun: opts.dryRun, confirm: opts.confirm, write: opts.write });
    if (g.mode === 'dryrun') {
      return { dryRun: true, sql: statements, token: g.token, estimatedRows: null };
    }
    for (const s of statements) {
      await ds.query(s);
    }
    audit({ action: 'table.alter', conn: conn.name, database, table, sql: label, ok: true });
    return { altered: table, sql: statements };
  }

  async dropTableCmd(
    ref: string | null | undefined,
    database: string,
    table: string,
    opts: { yes?: boolean; dryRun?: boolean; confirm?: string; write?: boolean; force?: boolean; truncate?: boolean }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    await this.ensureTable(conn, database, table, service, ds);
    const action = opts.truncate ? 'TRUNCATE TABLE' : 'DROP TABLE';
    const sql = `${action} ${quoteIdentifier(conn.type, table)}`;
    const g = gateWrite({ op: opts.truncate ? 'table.truncate' : 'table.drop', sql, params: [], destructive: true, ...opts });
    if (g.mode === 'dryrun') {
      return { dryRun: true, sql, token: g.token, estimatedRows: null };
    }
    await ds.query(sql);
    audit({ action: opts.truncate ? 'table.truncate' : 'table.drop', conn: conn.name, database, table, sql, ok: true });
    return { [opts.truncate ? 'truncated' : 'dropped']: table, sql };
  }

  // ============ 索引 ============

  async listIndexes(ref: string | null | undefined, database: string, table: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    await this.ensureTable(conn, database, table, service, ds);
    const indexes = await service.getIndexes(ds, database, table);
    return { conn: conn.name, database, table, indexes: indexes || [] };
  }

  async createIndexCmd(
    ref: string | null | undefined,
    database: string,
    table: string,
    name: string,
    columns: string[],
    opts: { unique?: boolean; yes?: boolean; dryRun?: boolean; confirm?: string; write?: boolean }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    if (!name || !columns || columns.length === 0) throw new AppError('PARAM_ERROR', 'index create 需要 --name 和 --columns c1,c2');
    const cols = await this.getColumns(conn, database, table);
    const b = new SqlBuilder(conn.type, cols);
    for (const c of columns) b.checkField(c);
    const sql = `CREATE ${opts.unique ? 'UNIQUE ' : ''}INDEX ${quoteIdentifier(conn.type, name)} ON ${quoteIdentifier(conn.type, table)} (${columns.map((c) => quoteIdentifier(conn.type, c)).join(', ')})`;
    const g = gateWrite({ op: 'index.create', sql, params: [], destructive: false, yes: opts.yes, dryRun: opts.dryRun, confirm: opts.confirm, write: opts.write });
    if (g.mode === 'dryrun') return { dryRun: true, sql, token: g.token, estimatedRows: 0 };
    const ds = await this.getDataSource(conn, database);
    await ds.query(sql);
    audit({ action: 'index.create', conn: conn.name, database, table, sql, ok: true });
    return { created: name, sql };
  }

  async dropIndexCmd(
    ref: string | null | undefined,
    database: string,
    table: string,
    name: string,
    opts: { yes?: boolean; dryRun?: boolean; confirm?: string; write?: boolean }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const kind = getDialectInfo(conn.type).kind;
    const sql =
      kind === 'mysql'
        ? `DROP INDEX ${quoteIdentifier(conn.type, name)} ON ${quoteIdentifier(conn.type, table)}`
        : `DROP INDEX ${quoteIdentifier(conn.type, name)}`;
    const g = gateWrite({ op: 'index.drop', sql, params: [], destructive: true, yes: opts.yes, dryRun: opts.dryRun, confirm: opts.confirm, write: opts.write });
    if (g.mode === 'dryrun') return { dryRun: true, sql, token: g.token, estimatedRows: null };
    const ds = await this.getDataSource(conn, database);
    await ds.query(sql);
    audit({ action: 'index.drop', conn: conn.name, database, table, sql, ok: true });
    return { dropped: name, sql };
  }

  // ============ 行数据 ============

  private async whereTree(filters: string[] | undefined, filterJson: string | undefined): Promise<FilterNode> {
    let node = parseFilters(filters || []);
    if (filterJson) {
      const j = parseFilterJson(filterJson);
      node = { type: 'and', children: [node, j] };
    }
    return node;
  }

  async rowsList(
    ref: string | null | undefined,
    database: string,
    table: string,
    opts: {
      select?: string[];
      filters?: string[];
      filterJson?: string;
      sorts?: string[];
      limit?: number;
      offset?: number;
      count?: boolean;
      conn?: any;
    }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const maxRows = getConfig().maxRows ?? 1000;
    const columns = await this.getColumns(conn, database, table);
    const where = await this.whereTree(opts.filters, opts.filterJson);
    const sorts = parseSorts(opts.sorts || []);
    const requested = opts.limit ?? 100;
    const limit = Math.min(Math.max(1, Math.floor(requested)), maxRows);
    const offset = Math.floor(opts.offset || 0);

    const q = buildSelect(conn.type, table, columns, { select: opts.select, where, sorts, limit, offset });
    const ds = await this.getDataSource(conn, database);
    const rows = await ds.query(q.sql, q.params);
    let total: number | null = null;
    if (opts.count) {
      const cq = buildCount(conn.type, table, columns, where);
      const cr = await ds.query(cq.sql, cq.params);
      total = cr && cr[0] ? Number(cr[0].total || 0) : rows.length;
    }
    audit({
      action: 'rows.list',
      conn: conn.name,
      database,
      table,
      sql: q.sql,
      params: q.params.length ? q.params : null,
      rows: rows.length,
      ok: true
    });
    return {
      conn: conn.name,
      database,
      table,
      data: rows,
      meta: {
        rowCount: rows.length,
        total,
        truncated: requested > limit,
        limit,
        offset
      }
    };
  }

  async rowsCount(ref: string | null | undefined, database: string, table: string, opts: { filters?: string[]; filterJson?: string }): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const columns = await this.getColumns(conn, database, table);
    const where = await this.whereTree(opts.filters, opts.filterJson);
    const q = buildCount(conn.type, table, columns, where);
    const ds = await this.getDataSource(conn, database);
    const r = await ds.query(q.sql, q.params);
    const total = r && r[0] ? Number(r[0].total || 0) : 0;
    return { conn: conn.name, database, table, count: total, sql: q.sql };
  }

  async rowsInsert(
    ref: string | null | undefined,
    database: string,
    table: string,
    data: Record<string, any>,
    opts: { dryRun?: boolean; confirm?: string; write?: boolean; force?: boolean; yes?: boolean }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new AppError('PARAM_ERROR', 'insert 需要 --data <json>');
    }
    const columns = await this.getColumns(conn, database, table);
    const q = buildInsert(conn.type, table, columns, data);
    const g = gateWrite({ op: 'rows.insert', sql: q.sql, params: q.params, estimatedRows: 1, dryRun: opts.dryRun, confirm: opts.confirm, write: opts.write });
    if (g.mode === 'dryrun') {
      return { dryRun: true, sql: q.sql, params: q.params, estimatedRows: 1, token: g.token };
    }
    const ds = await this.getDataSource(conn, database);
    const result = await ds.query(q.sql, q.params);
    audit({ action: 'rows.insert', conn: conn.name, database, table, sql: q.sql, params: q.params.length ? q.params : null, rows: 1, ok: true });
    return { inserted: 1, sql: q.sql, result };
  }

  async rowsUpdate(
    ref: string | null | undefined,
    database: string,
    table: string,
    setData: Record<string, any>,
    opts: { filters?: string[]; filterJson?: string; dryRun?: boolean; confirm?: string; write?: boolean; force?: boolean; yes?: boolean }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    if (!setData || Object.keys(setData).length === 0) throw new AppError('PARAM_ERROR', 'update 需要 --set k=v');
    if (!opts.filters || opts.filters.length === 0) {
      throw new AppError('PARAM_ERROR', 'update 必须带过滤条件 --filter', { hint: '为防误操作，禁止无条件更新' });
    }
    const columns = await this.getColumns(conn, database, table);
    const where = await this.whereTree(opts.filters, opts.filterJson);
    const q = buildUpdate(conn.type, table, columns, setData, where);
    const ds = await this.getDataSource(conn, database);
    const cq = buildCount(conn.type, table, columns, where);
    const cr = await ds.query(cq.sql, cq.params);
    const estimated = cr && cr[0] ? Number(cr[0].total || 0) : 0;
    const g = gateWrite({ op: 'rows.update', sql: q.sql, params: q.params, estimatedRows: estimated, dryRun: opts.dryRun, confirm: opts.confirm, write: opts.write, force: opts.force });
    if (g.mode === 'dryrun') {
      return { dryRun: true, sql: q.sql, params: q.params, estimatedRows: estimated, token: g.token };
    }
    const result = await ds.query(q.sql, q.params);
    audit({ action: 'rows.update', conn: conn.name, database, table, sql: q.sql, params: q.params.length ? q.params : null, rows: estimated, ok: true });
    return { updated: estimated, sql: q.sql, result };
  }

  async rowsDelete(
    ref: string | null | undefined,
    database: string,
    table: string,
    opts: { filters?: string[]; filterJson?: string; dryRun?: boolean; confirm?: string; write?: boolean; force?: boolean; yes?: boolean }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    if (!opts.filters || opts.filters.length === 0) {
      throw new AppError('PARAM_ERROR', 'delete 必须带过滤条件 --filter', { hint: '为防误操作，禁止无条件删除' });
    }
    const columns = await this.getColumns(conn, database, table);
    const where = await this.whereTree(opts.filters, opts.filterJson);
    const q = buildDelete(conn.type, table, columns, where);
    const ds = await this.getDataSource(conn, database);
    const cq = buildCount(conn.type, table, columns, where);
    const cr = await ds.query(cq.sql, cq.params);
    const estimated = cr && cr[0] ? Number(cr[0].total || 0) : 0;
    const g = gateWrite({ op: 'rows.delete', sql: q.sql, params: q.params, estimatedRows: estimated, dryRun: opts.dryRun, confirm: opts.confirm, write: opts.write, force: opts.force });
    if (g.mode === 'dryrun') {
      return { dryRun: true, sql: q.sql, params: q.params, estimatedRows: estimated, token: g.token };
    }
    const result = await ds.query(q.sql, q.params);
    audit({ action: 'rows.delete', conn: conn.name, database, table, sql: q.sql, params: q.params.length ? q.params : null, rows: estimated, ok: true });
    return { deleted: estimated, sql: q.sql, result };
  }

  // ============ 视图 / 存储过程 ============

  async listViews(ref: string | null | undefined, database: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const views = await service.getViews(ds, database);
    return { conn: conn.name, database, views: views || [] };
  }

  async getViewDefinitionCmd(ref: string | null | undefined, database: string, name: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const definition = await service.getViewDefinition(ds, database, name);
    return { conn: conn.name, database, view: name, definition };
  }

  async createViewCmd(
    ref: string | null | undefined,
    database: string,
    name: string,
    definition: string,
    opts: any
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    if (!definition) throw new AppError('PARAM_ERROR', 'create view 需要 --as "<SELECT ...>"');
    const sql = `CREATE VIEW ${quoteIdentifier(conn.type, name)} AS ${definition}`;
    const g = gateWrite({ op: 'view.create', sql, params: [], destructive: false, ...opts });
    if (g.mode === 'dryrun') return { dryRun: true, sql, token: g.token, estimatedRows: 0 };
    const ds = await this.getDataSource(conn, database);
    await ds.query(sql);
    audit({ action: 'view.create', conn: conn.name, database, sql, ok: true });
    return { created: name, sql };
  }

  async dropViewCmd(ref: string | null | undefined, database: string, name: string, opts: any): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const sql = `DROP VIEW ${quoteIdentifier(conn.type, name)}`;
    const g = gateWrite({ op: 'view.drop', sql, params: [], destructive: true, ...opts });
    if (g.mode === 'dryrun') return { dryRun: true, sql, token: g.token, estimatedRows: null };
    const ds = await this.getDataSource(conn, database);
    await ds.query(sql);
    audit({ action: 'view.drop', conn: conn.name, database, sql, ok: true });
    return { dropped: name, sql };
  }

  async listProcedures(ref: string | null | undefined, database: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const procedures = await service.getProcedures(ds, database);
    return { conn: conn.name, database, procedures: procedures || [] };
  }

  async getProcedureDefinitionCmd(ref: string | null | undefined, database: string, name: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const definition = await service.getProcedureDefinition(ds, database, name);
    return { conn: conn.name, database, procedure: name, definition };
  }

  async dropProcedureCmd(ref: string | null | undefined, database: string, name: string, opts: any): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const sql = `DROP PROCEDURE ${quoteIdentifier(conn.type, name)}`;
    const g = gateWrite({ op: 'proc.drop', sql, params: [], destructive: true, ...opts });
    if (g.mode === 'dryrun') return { dryRun: true, sql, token: g.token, estimatedRows: null };
    const ds = await this.getDataSource(conn, database);
    await ds.query(sql);
    audit({ action: 'proc.drop', conn: conn.name, database, sql, ok: true });
    return { dropped: name, sql };
  }

  // ============ 导入导出 ============

  async exportRowsFile(
    ref: string | null | undefined,
    database: string,
    table: string,
    format: string,
    outFile?: string,
    opts: { filters?: string[]; filterJson?: string; limit?: number; write?: boolean } = {}
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const fmt = (format || 'json').toLowerCase();
    const columns = await this.getColumns(conn, database, table);
    const where = await this.whereTree(opts.filters, opts.filterJson);
    const maxRows = getConfig().maxRows ?? 1000;
    const limit = opts.limit ? Math.min(Math.floor(opts.limit), maxRows * 10) : maxRows;
    const q = buildSelect(conn.type, table, columns, { where, limit });
    const ds = await this.getDataSource(conn, database);
    const rows = await ds.query(q.sql, q.params);

    const file = outFile || `${table}_export.${fmt === 'sql' ? 'sql' : fmt}`;
    const abs = path.resolve(file);
    const dir = path.dirname(abs);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fmt === 'json') {
      fs.writeFileSync(abs, JSON.stringify(rows, null, 2), 'utf8');
    } else if (fmt === 'csv') {
      fs.writeFileSync(abs, toCsv(rows), 'utf8');
    } else if (fmt === 'sql') {
      const lines: string[] = [];
      const colNames = columns.map((c) => c.name);
      for (const row of rows) {
        const vals = colNames
          .map((c) => (row[c] === null || row[c] === undefined ? 'NULL' : `'${String(row[c]).replace(/'/g, "''")}'`))
          .join(', ');
        lines.push(`INSERT INTO ${quoteIdentifier(conn.type, table)} (${colNames.map((c) => quoteIdentifier(conn.type, c)).join(', ')}) VALUES (${vals});`);
      }
      fs.writeFileSync(abs, lines.join('\n'), 'utf8');
    } else {
      throw new AppError('PARAM_ERROR', `不支持的导出格式 ${format}，支持 json/csv/sql`, { hint: 'xlsx 暂不支持，请用 json/csv' });
    }
    audit({ action: 'export.rows', conn: conn.name, database, table, sql: q.sql, params: q.params.length ? q.params : null, rows: rows.length, ok: true });
    return { conn: conn.name, database, table, format: fmt, path: abs, rowCount: rows.length };
  }

  async exportSchemaCmd(ref: string | null | undefined, database: string, outFile?: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const schema = await service.exportSchema(ds, database);
    if (outFile) {
      const abs = path.resolve(outFile);
      const dir = path.dirname(abs);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(abs, schema, 'utf8');
      return { conn: conn.name, database, path: abs };
    }
    return { conn: conn.name, database, schema };
  }

  async importFile(
    ref: string | null | undefined,
    database: string,
    table: string,
    file: string,
    opts: { format?: string; dryRun?: boolean; confirm?: string; write?: boolean; force?: boolean; yes?: boolean; limit?: number }
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    if (!fs.existsSync(file)) throw new AppError('PARAM_ERROR', `文件不存在: ${file}`);
    const fmt = (opts.format || path.extname(file).replace('.', '').toLowerCase() || 'csv');
    const columns = await this.getColumns(conn, database, table);
    const columnNames = new Set(columns.map((c) => c.name));

    let rows: any[];
    if (fmt === 'json') {
      rows = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(rows)) rows = [rows];
    } else if (fmt === 'csv') {
      rows = parseCsv(fs.readFileSync(file, 'utf8'));
    } else {
      throw new AppError('PARAM_ERROR', `不支持的导入格式 ${fmt}，支持 csv/json`);
    }
    if (opts.limit) rows = rows.slice(0, Math.floor(opts.limit));

    const clean = rows.map((r) => {
      const out: Record<string, any> = {};
      for (const k of Object.keys(r)) {
        const key = k.trim();
        if (!columnNames.has(key)) continue;
        const meta = columns.find((c) => c.name === key);
        out[key] = coerce(r[key], meta && meta.type ? meta.type : undefined);
      }
      return out;
    });
    const label = `IMPORT ${rows.length} rows into ${table}`;
    const g = gateWrite({ op: 'import.file', sql: label, params: [], estimatedRows: rows.length, dryRun: opts.dryRun, confirm: opts.confirm, write: opts.write, force: opts.force, yes: opts.yes });
    if (g.mode === 'dryrun') {
      return { dryRun: true, estimatedRows: rows.length, token: g.token, sql: label };
    }
    const ds = await this.getDataSource(conn, database);
    const service = this.loadDialectService(conn.type);
    await service.bulkInsert(ds, database, table, clean);
    audit({ action: 'import.file', conn: conn.name, database, table, sql: label, rows: rows.length, ok: true });
    return { imported: rows.length, table };
  }

  async backupCmd(ref: string | null | undefined, database: string, outFile?: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const result = await service.backupDatabase(ds, database, outFile ? { path: path.dirname(path.resolve(outFile)) } : undefined);
    audit({ action: 'backup', conn: conn.name, database, sql: `BACKUP ${database}`, ok: true });
    return { conn: conn.name, database, backupPath: result };
  }

  async restoreCmd(ref: string | null | undefined, database: string, filePath: string, opts: any): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const label = `RESTORE ${database} FROM ${filePath}`;
    const g = gateWrite({ op: 'restore', sql: label, params: [], destructive: true, ...opts });
    if (g.mode === 'dryrun') return { dryRun: true, sql: label, token: g.token, estimatedRows: null };
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    await service.restoreDatabase(ds, database, filePath);
    audit({ action: 'restore', conn: conn.name, database, sql: label, ok: true });
    return { restored: database };
  }

  // ============ 运维 ============

  async statsCmd(ref: string | null | undefined, database: string): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const tables = await service.getTables(ds, database);
    const size = await service.getDatabaseSize(ds, database);
    return {
      conn: conn.name,
      database,
      stats: {
        tableCount: tables.length,
        size,
        tables: tables.map((t: any) => ({ name: t.name, rowCount: t.rowCount || 0, size: t.dataSize || 0 }))
      }
    };
  }

  async maintenanceCmd(
    ref: string | null | undefined,
    database: string,
    action: 'optimize' | 'analyze' | 'repair',
    opts: any
  ): Promise<any> {
    const conn = await this.resolveConnection(ref);
    if (getDialectInfo(conn.type).kind !== 'mysql') {
      throw new AppError('UNSUPPORTED', `${action} 仅支持 MySQL`);
    }
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database);
    const tables = await service.getTables(ds, database);
    const keyword = action.toUpperCase();
    const statements = tables.map((t: any) => `${keyword} TABLE ${quoteIdentifier(conn.type, t.name)}`);
    const label = statements.join('; ');
    const g = gateWrite({ op: `ops.${action}`, sql: label, params: [], destructive: true, ...opts });
    if (g.mode === 'dryrun') return { dryRun: true, sql: statements, token: g.token, estimatedRows: null };
    const results: any[] = [];
    for (const s of statements) {
      try {
        const r = await ds.query(s);
        results.push({ sql: s, success: true, result: r });
      } catch (e: any) {
        results.push({ sql: s, success: false, error: e?.message || String(e) });
      }
    }
    audit({ action: `ops.${action}`, conn: conn.name, database, sql: label, ok: true });
    return { conn: conn.name, database, action, results };
  }

  async logsCmd(ref: string | null | undefined, database: string | null | undefined, limit: number): Promise<any> {
    const conn = await this.resolveConnection(ref);
    const service = this.loadDialectService(conn.type);
    const ds = await this.getDataSource(conn, database || undefined);
    const logs = await service.viewLogs(ds, database || undefined, Math.min(Math.max(1, limit || 100), 1000));
    return { conn: conn.name, database: database || null, logs: logs || [] };
  }

  // ============ SQL 逃生舱 ============

  async runSql(ref: string | null | undefined, database: string | null | undefined, sql: string, opts: { write?: boolean; limit?: number; allowMulti?: boolean; yes?: boolean; dryRun?: boolean; confirm?: string }): Promise<any> {
    const conn = await this.resolveConnection(ref);
    if (!sql || !String(sql).trim()) throw new AppError('PARAM_ERROR', 'SQL 不能为空');
    const cls = classifySql(sql);
    const isWrite = cls.kind === 'write' || cls.kind === 'ddl';

    if (cls.kind === 'multi' && !opts.allowMulti) {
      throw new AppError('MULTI_STATEMENT_BLOCKED', '默认禁止多语句 SQL', { hint: '确认需要时请附加 --allow-multi' });
    }
    if (isWrite && !opts.write) {
      throw new AppError('WRITE_NOT_ALLOWED', '默认只允许只读 SQL', { hint: '确认需要写入时请附加 --write' });
    }
    if (isWrite) {
      // 写语句必须带过滤限制或明确允许
      const g = gateWrite({ op: 'sql.write', sql, params: [], destructive: cls.kind === 'ddl', yes: opts.yes, dryRun: opts.dryRun, confirm: opts.confirm, write: true });
      if (g.mode === 'dryrun') {
        return { dryRun: true, sql, token: g.token, estimatedRows: null };
      }
    }

    const ds = await this.getDataSource(conn, database || undefined);
    let result: any;
    if (cls.kind === 'select') {
      const maxRows = getConfig().maxRows ?? 1000;
      const effective = sql.trim().replace(/;+\s*$/, '');
      const limited = opts.limit ? Math.min(Math.floor(opts.limit), maxRows) : maxRows;
      if (cls.kind === 'select') {
        result = await ds.query(effective);
        if (Array.isArray(result) && result.length > limited) {
          result = result.slice(0, limited);
        }
      } else {
        result = await ds.query(sql);
      }
    } else {
      result = await ds.query(sql);
    }
    audit({ action: 'sql.exec', conn: conn.name, database, sql, kind: cls.kind, rows: Array.isArray(result) ? result.length : undefined as any, ok: true });
    return {
      conn: conn.name,
      database: database || null,
      kind: cls.kind,
      data: Array.isArray(result) ? result : result,
      meta: { rowCount: Array.isArray(result) ? result.length : null }
    };
  }

  // ============ 工具命令 ============

  async configShow(): Promise<any> {
    return { dataDir: dataDir(), config: getConfig(), auditLog: getDataLogPath() };
  }

  async configSet(key: string, value: string): Promise<any> {
    const cfg = getConfig();
    const parsed = coerceConfigValue(value);
    if (key === 'readonly') {
      updateConfig({ readonly: !!parsed });
    } else if (key === 'defaultConnectionId') {
      updateConfig({ defaultConnectionId: parsed == null ? null : String(parsed) });
    } else if (key === 'maxRows') {
      updateConfig({ maxRows: Math.max(1, Math.floor(Number(parsed) || 1000)) });
    } else if (key === 'confirmThreshold') {
      updateConfig({ confirmThreshold: Math.max(0, Math.floor(Number(parsed) || 100)) });
    } else if (key === 'protectedDatabases') {
      updateConfig({ protectedDatabases: String(value).split(',').map((s) => s.trim()).filter(Boolean) });
    } else if (key in cfg) {
      updateConfig({ [key]: parsed } as any);
    } else {
      throw new AppError('PARAM_ERROR', `未知配置项: ${key}`, { hint: '可用: readonly / maxRows / confirmThreshold / protectedDatabases / defaultConnectionId' });
    }
    return { key, value, config: getConfig() };
  }

  async auditLog(limit: number): Promise<any> {
    return { logs: readAudit(Math.min(Math.max(1, limit || 100), 500)) };
  }

  async setupInfo(): Promise<any> {
    const conns = await this.allConnections();
    const cfg = getConfig();
    return {
      dataDir: dataDir(),
      connections: conns.length,
      defaultConnectionId: cfg.defaultConnectionId || null,
      readonly: !!cfg.readonly
    };
  }
}

function toCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => esc(row[h])).join(','));
  }
  return lines.join('\n');
}

function parseCsv(content: string): any[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQ = false;
        } else cur += ch;
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]);
  const result: any[] = [];
  for (const l of lines.slice(1)) {
    const cells = parseLine(l);
    const row: Record<string, any> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] !== undefined ? cells[i] : '';
    });
    result.push(row);
  }
  return result;
}

function coerce(v: any, type?: string): any {
  if (v === '' || v === null || v === undefined) return v === '' ? null : v;
  const t = (type || '').toLowerCase();
  if (t.includes('int')) {
    const n = Number(v);
    return isNaN(n) ? v : n;
  }
  if (t.includes('decimal') || t.includes('float') || t.includes('double') || t.includes('numeric') || t.includes('real')) {
    const n = Number(v);
    return isNaN(n) ? v : n;
  }
  if (t.includes('bool')) {
    if (v === true || v === 'true' || v === '1' || v === 1) return true;
    if (v === false || v === 'false' || v === '0' || v === 0) return false;
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  if (v !== '' && !isNaN(n) && /^-?\d+(\.\d+)?$/.test(String(v))) return n;
  return v;
}

function coerceConfigValue(v: string): any {
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  if (!isNaN(n) && String(v).trim() !== '') return n;
  return v;
}

function formatDdlDefault(v: any): string {
  if (v === null) return 'NULL';
  const up = String(v).toUpperCase();
  if (up === 'CURRENT_TIMESTAMP' || up === 'NOW()' || up === 'CURRENT_DATE') return up;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** 列类型输出（用户 DSL 已含长度时原样大写；没有长度时按基础类型） */
function typeFor(kind: string, c: ParsedColumn): string {
  return c.type.toUpperCase();
}

function getDataLogPath(): string {
  return path.join(dataDir(), 'audit.log');
}
