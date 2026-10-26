import * as http from "node:http";
import * as https from "node:https";
import { ConnectionService } from './service/connection.service';
import { DatabaseService } from './service/database/database.service';

// 远程代理相关常量
const REMOTE_ID_SEP = '::';
const REMOTE_TOKEN_HEADER = 'x-db-tool-token';
// 代理请求标记：用于识别"本请求本身来自代理"，避免远程地址指向自身(或互指)时无限递归合并
const REMOTE_PROXY_HEADER = 'x-db-tool-proxy';

// 永不转发的路由：只作用于本地连接配置（无远程对应物或需要本地语义）
const LOCAL_ONLY_ROUTES = new Set<string>([
  '/api/database/getConnection',
  '/api/database/addConnection',
  '/api/database/getSupportedDatabaseTypes'
]);

// 连接配置类路由：复合 id 时转发到远程，但允许直接操作「远程代理配置」本身
const CONNECTION_CONFIG_ROUTES = new Set<string>([
  '/api/database/getConnections',
  '/api/database/getConnection',
  '/api/database/addConnection',
  '/api/database/updateConnection',
  '/api/database/deleteConnection',
  '/api/database/testConnection',
  '/api/database/getSupportedDatabaseTypes'
]);

function isRemoteConnection(conn: any): boolean {
  return !!conn && conn.type === 'remote';
}

/** 从请求中取出被操作连接的 id（body 或路径段） */
function extractConnId(pathname: string, body: any): string | undefined {
  if (pathname.startsWith('/api/database/truncateTable/') || pathname.startsWith('/api/database/dropTable/')) {
    const parts = pathname.split('/').filter(Boolean);
    return parts[3];
  }
  if (body && typeof body.id === 'string') return body.id;
  return undefined;
}

/**
 * 拆分复合 id：proxyId::remoteConnId。
 * remoteConnId 自身可能仍是复合 id（多级代理），必须保留剩余部分，不能用 split 截断。
 */
function splitProxyId(connId: string): { proxyId: string; remoteConnId: string } | null {
  const idx = connId.indexOf(REMOTE_ID_SEP);
  if (idx <= 0) return null;
  return {
    proxyId: connId.slice(0, idx),
    remoteConnId: connId.slice(idx + REMOTE_ID_SEP.length)
  };
}

/** 判断是否为指向远程的复合 id（proxyId::remoteConnId） */
async function resolveRemoteProxy(pathname: string, body: any): Promise<{ proxyConn: any; remoteConnId: string } | null> {
  if (LOCAL_ONLY_ROUTES.has(pathname)) return null;
  const connId = extractConnId(pathname, body);
  if (!connId || !connId.includes(REMOTE_ID_SEP)) return null;
  const parts = splitProxyId(connId);
  if (!parts) return null;
  const proxyConn = await connectionService.getConnectionById(parts.proxyId);
  if (!proxyConn || !isRemoteConnection(proxyConn)) return null;
  return { proxyConn, remoteConnId: parts.remoteConnId };
}

/** 解析远程响应体（远程服务统一返回 { ret, msg, data } 信封） */
function parseRemotePayload(text: string): any {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** 通过 Node 18+ 全局 fetch 调用远程服务 */
async function postRemoteByFetch(
  url: string,
  body: any,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal
    });
    const text = await resp.text();
    const payload = parseRemotePayload(text);
    if (!resp.ok) {
      throw new Error(payload?.msg || `远程服务返回 HTTP ${resp.status}`);
    }
    return payload;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('远程服务请求超时');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 低版本 Node 没有全局 fetch 时的回退实现。
 * VSCode 1.75-1.84 的扩展宿主内置 Node 16（无全局 fetch），扩展声明支持 ^1.75.0，故保留此路径。
 */
function postRemoteByNodeHttp(
  url: string,
  body: any,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      reject(new Error(`远程服务地址无效: ${url}`));
      return;
    }
    const payload = Buffer.from(JSON.stringify(body ?? {}));
    const lib = target.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: (target.pathname || '/') + (target.search || ''),
        method: 'POST',
        headers: { ...headers, 'Content-Length': payload.length }
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { raw += chunk; });
        res.on('end', () => {
          const data = parseRemotePayload(raw);
          const status = res.statusCode || 0;
          if (status < 200 || status >= 300) {
            reject(new Error(data?.msg || `远程服务返回 HTTP ${status}`));
            return;
          }
          resolve(data);
        });
      }
    );
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('远程服务请求超时')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/** 统一的远程调用入口：优先全局 fetch，低版本回退 node:http(s)；返回 { ret, msg, data } 信封 */
async function postRemote(
  url: string,
  body: any,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<any> {
  if (typeof fetch === 'function') {
    return await postRemoteByFetch(url, body, headers, timeoutMs);
  }
  return await postRemoteByNodeHttp(url, body, headers, timeoutMs);
}

/** 构造带令牌与代理标记的请求头 */
function buildRemoteHeaders(proxyConn: any): Record<string, string> {
  const headers: Record<string, string> = { [REMOTE_PROXY_HEADER]: '1' };
  const token = proxyConn?.options?.remoteToken;
  if (token) headers[REMOTE_TOKEN_HEADER] = String(token);
  return headers;
}

/** 把请求原样转发到远程 db_tool 服务端（自动解包远程响应，避免二次包装） */
async function proxyToRemote(proxyConn: any, remoteConnId: string, pathname: string, body: any): Promise<any> {
  const base = String(proxyConn.options?.remoteUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('远程代理连接缺少 remoteUrl');
  let targetPath = pathname;
  if (pathname.startsWith('/api/database/truncateTable/') || pathname.startsWith('/api/database/dropTable/')) {
    const parts = pathname.split('/').filter(Boolean);
    // 不做 URL 编码：连接 id 由本地生成（仅含安全字符），而对端解析路径段时不做 decode，
    // 编码会把 ':' 变成 %3A 导致对端无法解析复合 id。
    parts[3] = remoteConnId;
    targetPath = '/' + parts.join('/');
  }
  const targetBody = { ...body, id: remoteConnId };
  const env = await postRemote(`${base}${targetPath}`, targetBody, buildRemoteHeaders(proxyConn), 60000);
  if (env && typeof env === 'object' && env.ret && env.ret !== 0) {
    throw new Error(env.msg || '远程服务执行失败');
  }
  return env?.data;
}

/** 拉取远程服务上的连接列表（用于网关模式合并，单层、过滤嵌套代理配置） */
async function fetchRemoteConnections(proxyConn: any): Promise<{ list: any[]; error?: string }> {
  const base = String(proxyConn.options?.remoteUrl || '').replace(/\/+$/, '');
  if (!base) return { list: [], error: '缺少 remoteUrl' };
  try {
    const env = await postRemote(`${base}/api/database/getConnections`, {}, buildRemoteHeaders(proxyConn), 10000);
    if (env && env.ret && env.ret !== 0) {
      console.warn('[remote] 获取远程连接列表失败:', env.msg);
      return { list: [], error: env.msg || '远程服务返回错误' };
    }
    return { list: Array.isArray(env?.data) ? env.data : [] };
  } catch (e: any) {
    console.warn('[remote] 获取远程连接列表失败:', e?.message);
    return { list: [], error: e?.message || '远程服务不可达' };
  }
}

/** 网关模式：本地连接列表 = 本地连接 + 远程代理暴露的连接 */
async function handleGetConnectionsWithProxy(): Promise<any[]> {
  const locals = await connectionService.getAllConnections();
  // 并行拉取各远程服务，避免多个远程时串行等待
  const remoteResults = await Promise.all(
    locals.map(conn => (isRemoteConnection(conn) ? fetchRemoteConnections(conn) : Promise.resolve(null)))
  );
  const result: any[] = [];
  locals.forEach((conn, index) => {
    if (!isRemoteConnection(conn)) {
      result.push(conn);
      return;
    }
    const remote = remoteResults[index];
    // 代理配置本身保留（用于编辑/删除），标记 _isProxy
    result.push({ ...conn, _isProxy: true, _remoteError: remote?.error });
    for (const rc of remote?.list || []) {
      if (rc.type === 'remote' || rc._isProxy) continue; // 不暴露嵌套代理配置
      const safe = { ...rc };
      delete safe.password; // 不把远程库的密码下发到客户端
      result.push({
        ...safe,
        id: `${conn.id}${REMOTE_ID_SEP}${rc.id}`,
        _proxyId: conn.id,
        _remote: true,
        _remoteName: conn.name
      });
    }
  });
  return result;
}

/** 测试远程代理连接（探活远程服务） */
async function testRemoteConnection(conn: any): Promise<boolean> {
  const base = String(conn.options?.remoteUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('缺少 remoteUrl');
  const env = await postRemote(`${base}/api/database/getConnections`, {}, buildRemoteHeaders(conn), 10000);
  if (env && env.ret && env.ret !== 0) throw new Error(env.msg || '远程服务返回错误');
  return true;
}

// 初始化服务实例
const connectionService = new ConnectionService();
const databaseService = new DatabaseService();


// 数据库相关路由处理
export async function handleDatabaseRoutes(pathname: string, body: any, headers?: any) {
  try {
    // 远程访问令牌校验（仅当远程服务端设置了 DB_TOOL_REMOTE_TOKEN 且请求经由 HTTP 入口时生效）
    const envToken = process.env.DB_TOOL_REMOTE_TOKEN;
    if (envToken && headers) {
      const incoming = String(headers[REMOTE_TOKEN_HEADER] || headers['x-db-tool-token'] || '');
      if (incoming !== envToken) {
        throw new Error('远程访问令牌无效');
      }
    }

    // 网关模式：合并远程服务暴露的连接
    if (pathname === '/api/database/getConnections') {
      // 请求本身来自代理时不再二次合并，避免远程地址指向自身(或互指)造成无限递归
      if (headers && headers[REMOTE_PROXY_HEADER]) {
        return await connectionService.getAllConnections();
      }
      return await handleGetConnectionsWithProxy();
    }

    // 远程代理连接本身的测试：直接探活远程服务
    if (pathname === '/api/database/testConnection' && body && isRemoteConnection(body)) {
      return await testRemoteConnection(body);
    }

    // 复合 id（proxyId::remoteConnId）→ 转发到远程：
    // 覆盖数据操作（查询/建表/改结构等）与连接配置的增删改
    const proxy = await resolveRemoteProxy(pathname, body);
    if (proxy) {
      return await proxyToRemote(proxy.proxyConn, proxy.remoteConnId, pathname, body);
    }

    // 对「远程代理配置」本身做数据操作时给出明确提示（配置本身的增删改是允许的）
    if (!CONNECTION_CONFIG_ROUTES.has(pathname)) {
      const connId = extractConnId(pathname, body);
      if (connId && !connId.includes(REMOTE_ID_SEP)) {
        const conn = await connectionService.getConnectionById(connId);
        if (conn && isRemoteConnection(conn)) {
          if (pathname === '/api/database/closeConnection') return true; // 代理配置本身无需关闭
          throw new Error(`请选择「${conn.name}」代理下的具体数据库连接进行操作`);
        }
      }
    }

    // /api/database/getConnection
    if (pathname === '/api/database/getConnection') {
      const { id } = body;
      const result = await connectionService.getConnectionById(id);
      return result;
    }

    // /api/database/addConnection
    if (pathname === '/api/database/addConnection') {
      const result = await connectionService.addConnection(body);
      return result;
    }

    // /api/database/updateConnection
    if (pathname === '/api/database/updateConnection') {
      const { id, ...updates } = body;
      if (!id) throw Error('Missing parameter: id');
      const result = await connectionService.updateConnection(id, updates);
      return result;
    }

    // /api/database/deleteConnection
    if (pathname === '/api/database/deleteConnection') {
      const { id } = body;
      if (!id) throw Error('Missing parameter: id');
      await connectionService.deleteConnection(id);
      return true;
    }

    // /api/database/testConnection
    if (pathname === '/api/database/testConnection') {
      const result = await connectionService.testConnection(body);
      return result;
    }

    // /api/database/getDatabases
    if (pathname === '/api/database/getDatabases') {
      const { id } = body;
      if (!id) throw Error('Missing parameter: id');
      const result = await databaseService.getDatabases(id);
      return result;
    }

    // /api/database/getDatabaseInfo
    if (pathname === '/api/database/getDatabaseInfo') {
      const { id, database } = body;
      if (!id || !database) throw Error('Missing parameters: id, database');
      const result = await databaseService.getDatabaseInfo(id, database);
      return result;
    }

    // /api/database/getTables
    if (pathname === '/api/database/getTables') {
      const { id, database } = body;
      if (!id || !database) throw Error('Missing parameters: id, database');
      const result = await databaseService.getTables(id, database);
      return result;
    }

    // /api/database/getTableInfo
    if (pathname === '/api/database/getTableInfo') {
      const { id, database, table } = body;
      if (!id || !database || !table) throw Error('Missing parameters: id, database, table');
      const result = await databaseService.getTableInfo(id, database, table);
      return result;
    }

    // /api/database/getTableData
    if (pathname === '/api/database/getTableData') {
      const { id, database, table, page = 1, pageSize = 100, where, orderBy } = body;
      if (!id || !database || !table) throw Error('Missing parameters: id, database, table');
      const result = await databaseService.getTableData(id, database, table, page, pageSize, where, orderBy);
      return result;
    }

    // /api/database/executeQuery
    if (pathname === '/api/database/executeQuery') {
      const { id, sql, database } = body;
      if (!id || !sql) throw Error('Missing parameters: id, sql');
      if (!sql.trim()) throw Error('SQL语句不能为空');
      const result = await databaseService.executeQuery(id, sql, database);
      return result;
    }

    // /api/database/closeConnection
    if (pathname === '/api/database/closeConnection') {
      const { id } = body;
      if (!id) throw Error('Missing parameter: id');
      await connectionService.closeConnection(id);
      await connectionService.closeAllConnectionsForId(id);
      return true;
    }

    // /api/database/getSupportedDatabaseTypes
    if (pathname === '/api/database/getSupportedDatabaseTypes') {
      const types = databaseService.getSupportedDatabaseTypes();
      return types;
    }

    // /api/database/createDatabase
    if (pathname === '/api/database/createDatabase') {
      const { id, databaseName, options } = body;
      if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
      await databaseService.createDatabase(id, databaseName, options);
      return { success: true };
    }

    // /api/database/dropDatabase
    if (pathname === '/api/database/dropDatabase') {
      const { id, databaseName } = body;
      if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
      await databaseService.dropDatabase(id, databaseName);
      return { success: true };
    }

    // /api/database/exportSchema
    if (pathname === '/api/database/exportSchema') {
      const { id, databaseName } = body;
      if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
      const schema = await databaseService.exportSchema(id, databaseName);
      return { success: true, schema };
    }

    // /api/database/viewLogs
    if (pathname === '/api/database/viewLogs') {
      const { id, databaseName, limit = 100 } = body;
      if (!id) throw Error('Missing parameter: id');
      const logs = await databaseService.viewLogs(id, databaseName, limit);
      return { success: true, logs };
    }

    // /api/database/backup
    if (pathname === '/api/database/backup') {
      const { id, databaseName, options } = body;
      if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
      const result = await databaseService.backupDatabase(id, databaseName, options);
      return { success: true, result };
    }

    // /api/database/restore
    if (pathname === '/api/database/restore') {
      const { id, databaseName, filePath, options } = body;
      if (!id || !databaseName || !filePath) throw Error('Missing parameters: id, databaseName, filePath');
      await databaseService.restoreDatabase(id, databaseName, filePath, options);
      return { success: true };
    }

    // /api/database/getStats
    if (pathname === '/api/database/getStats') {
      const { id, databaseName } = body;
      if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
      const stats = await databaseService.getDatabaseStats(id, databaseName);
      return { success: true, stats };
    }

    // /api/database/optimize
    if (pathname === '/api/database/optimize') {
      const { id, databaseName } = body;
      if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
      const results = await databaseService.optimizeDatabase(id, databaseName);
      return { success: true, results };
    }

    // /api/database/analyze
    if (pathname === '/api/database/analyze') {
      const { id, databaseName } = body;
      if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
      const results = await databaseService.analyzeTables(id, databaseName);
      return { success: true, results };
    }

    // /api/database/repair
    if (pathname === '/api/database/repair') {
      const { id, databaseName } = body;
      if (!id || !databaseName) throw Error('Missing parameters: id, databaseName');
      const results = await databaseService.repairTables(id, databaseName);
      return { success: true, results };
    }

    // /api/database/exportTableData
    if (pathname === '/api/database/exportTableData') {
      const { id, database, table, format = 'json', where } = body;
      if (!id || !database || !table) throw Error('Missing parameters: id, database, table');

      // 获取所有数据
      const result = await databaseService.getTableData(id, database, table, 1, 10000, where);
      return result;
    }

    // /api/database/exportTableDataToSQL
    if (pathname === '/api/database/exportTableDataToSQL') {
      const { id, database, table, options } = body;
      if (!id || !database || !table) throw Error('Missing parameters: id, database, table');

      // 调用数据库服务导出表数据到SQL文件
      const exportPath = await databaseService.exportTableDataToSQL(id, database, table, options);
      return exportPath;
    }

    // /api/database/exportTableDataToCSV
    if (pathname === '/api/database/exportTableDataToCSV') {
      const { id, database, table, options } = body;
      if (!id || !database || !table) throw Error('Missing parameters: id, database, table');

      // 调用数据库服务导出表数据到CSV文件
      const exportPath = await databaseService.exportTableDataToCSV(id, database, table, options);
      return exportPath;
    }

    // /api/database/exportTableDataToJSON
    if (pathname === '/api/database/exportTableDataToJSON') {
      const { id, database, table, options } = body;
      if (!id || !database || !table) throw Error('Missing parameters: id, database, table');

      // 调用数据库服务导出表数据到JSON文件
      const exportPath = await databaseService.exportTableDataToJSON(id, database, table, options);
      return exportPath;
    }

    // /api/database/exportTableDataToExcel
    if (pathname === '/api/database/exportTableDataToExcel') {
      const { id, database, table, options } = body;
      if (!id || !database || !table) throw Error('Missing parameters: id, database, table');

      // 调用数据库服务导出表数据到Excel文件
      const exportPath = await databaseService.exportTableDataToExcel(id, database, table, options);
      return exportPath;
    }

    // /api/database/refreshTableCache（手动全量拉取表列表，忽略预览缓存）
    if (pathname === '/api/database/refreshTableCache') {
      const { id, database } = body;
      if (!id || !database) throw Error('Missing parameters');

      const result = await databaseService.refreshTableCache(id, database);
      return result;
    }

    // /api/database/previewCreateTable（纯计算：目标态 TableSpec -> 建表 DDL 与方言能力）
    if (pathname === '/api/database/previewCreateTable') {
      const { id, database, spec } = body;
      if (!id || !database || !spec) throw Error('Missing parameters');

      const result = await databaseService.previewCreateTable(id, database, spec);
      return result;
    }

    // /api/database/executeCreateTable（执行：后端检测重名后生成并执行建表语句）
    if (pathname === '/api/database/executeCreateTable') {
      const { id, database, spec } = body;
      if (!id || !database || !spec) throw Error('Missing parameters');

      const result = await databaseService.executeCreateTable(id, database, spec);
      return result;
    }

    // /api/database/previewAlterTable（纯计算：目标态 TableSpec -> DDL 语句与变更集）
    if (pathname === '/api/database/previewAlterTable') {
      const { id, database, tableName, spec } = body;
      if (!id || !database || !tableName || !spec) throw Error('Missing parameters');

      const result = await databaseService.previewAlterTable(id, database, tableName, spec);
      return result;
    }

    // /api/database/executeAlterTable（执行：后端重读实时结构生成并执行，所见即所得）
    if (pathname === '/api/database/executeAlterTable') {
      const { id, database, tableName, spec } = body;
      if (!id || !database || !tableName || !spec) throw Error('Missing parameters');

      const result = await databaseService.executeAlterTable(id, database, tableName, spec);
      return result;
    }

    // /api/database/syncTable
    if (pathname === '/api/database/syncTable') {
      const { id, syncConfig } = body;
      if (!id || !syncConfig) throw Error('Missing parameters');

      const result = await databaseService.syncTable(id, syncConfig);
      return result;
    }

    // /api/database/insertData
    if (pathname === '/api/database/insertData') {
      const { id, database, table, data } = body;
      if (!id || !database || !table || !data) throw Error('Missing parameters');

      // 获取数据库服务实例以使用正确的语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);

      // 获取表的列信息，用于过滤自增字段
      const columns = await dbService.getColumns(dataSource, database, table);

      const sql = generateInsertSQL(dataSource.options.type as string, table, data, dbService, columns);
      const result = await databaseService.executeQuery(id, sql, database);
      return { sql, result };
    }

    // /api/database/updateData
    if (pathname === '/api/database/updateData') {
      const { id, database, table, data, where } = body;
      if (!id || !database || !table || !data || !where) throw Error('Missing parameters');

      // 获取数据库服务实例以使用正确的语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);

      const sql = generateUpdateSQL(dataSource.options.type as string, table, data, where, dbService);
      const result = await databaseService.executeQuery(id, sql, database);
      return { sql, result };
    }

    // /api/database/deleteData
    if (pathname === '/api/database/deleteData') {
      const { id, database, table, where } = body;
      if (!id || !database || !table || !where) throw Error('Missing parameters');

      // 获取数据库服务实例以使用正确的语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);

      const sql = generateDeleteSQL(dataSource.options.type as string, table, where, dbService);
      const result = await databaseService.executeQuery(id, sql, database);
      return { success: true, sql, result };
    }

    // /api/database/truncateTable/:id/:database/:table
    if (pathname.startsWith('/api/database/truncateTable/')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length < 5) throw Error('Invalid URL format');
      const id = parts[3];
      const database = parts[4];
      const table = parts[5];
      if (!id || !database || !table) throw Error('Missing parameters');

      // 使用数据库服务生成正确的TRUNCATE语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);
      const sql = `TRUNCATE TABLE ${dbService['quoteIdentifier'](table)}`;
      const result = await databaseService.executeQuery(id, sql, database);
      return { success: true, sql, result };
    }

    // /api/database/dropTable/:id/:database/:table
    if (pathname.startsWith('/api/database/dropTable/')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length < 5) throw Error('Invalid URL format');
      const id = parts[3];
      const database = parts[4];
      const table = parts[5];
      if (!id || !database || !table) throw Error('Missing parameters');

      // 使用数据库服务生成正确的DROP语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);
      const sql = `DROP TABLE ${dbService['quoteIdentifier'](table)}`;
      const result = await databaseService.executeQuery(id, sql, database);
      return { success: true, sql, result };
    }

    // /api/database/getViews
    if (pathname === '/api/database/getViews') {
      const { id, database } = body;
      if (!id || !database) throw Error('Missing parameters: id, database');

      const result = await databaseService.getViews(id, database);
      return result;
    }

    // /api/database/getViewDefinition
    if (pathname === '/api/database/getViewDefinition') {
      const { id, database, viewName } = body;
      if (!id || !database || !viewName) throw Error('Missing parameters: id, database, viewName');

      const result = await databaseService.getViewDefinition(id, database, viewName);
      return result;
    }

    // /api/database/createView
    if (pathname === '/api/database/createView') {
      const { id, database, viewName, definition } = body;
      if (!id || !database || !viewName || !definition) throw Error('Missing parameters: id, database, viewName, definition');

      // 使用数据库服务生成正确的CREATE VIEW语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);
      // 防御：若传入的已是完整 CREATE VIEW 语句（SQLite/Oracle 的 getViewDefinition 形态），
      // 直接执行，避免拼成 `CREATE VIEW v AS CREATE VIEW v AS ...`
      const def = String(definition).trim();
      const isFullCreate = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:ALGORITHM\s*=\s*\w+\s+)?VIEW\s/is.test(def);
      const sql = isFullCreate ? def : `CREATE VIEW ${dbService['quoteIdentifier'](viewName)} AS ${def}`;
      const result = await databaseService.executeQuery(id, sql, database);
      return { success: true, sql, result };
    }

    // /api/database/dropView
    if (pathname === '/api/database/dropView') {
      const { id, database, viewName } = body;
      if (!id || !database || !viewName) throw Error('Missing parameters: id, database, viewName');

      // 使用数据库服务生成正确的DROP VIEW语法
      const dataSource = await databaseService['connectionService'].getActiveConnection(id, database);
      const dbService = databaseService['getDatabaseService'](dataSource.options.type as string);
      const sql = `DROP VIEW ${dbService['quoteIdentifier'](viewName)}`;
      const result = await databaseService.executeQuery(id, sql, database);
      return { success: true, sql, result };
    }

    // /api/database/getProcedures
    if (pathname === '/api/database/getProcedures') {
      const { id, database } = body;
      if (!id || !database) throw Error('Missing parameters: id, database');

      const result = await databaseService.getProcedures(id, database);
      return result;
    }

    // /api/database/getProcedureDefinition
    if (pathname === '/api/database/getProcedureDefinition') {
      const { id, database, procedureName } = body;
      if (!id || !database || !procedureName) throw Error('Missing parameters: id, database, procedureName');

      const result = await databaseService.getProcedureDefinition(id, database, procedureName);
      return result;
    }

    throw Error('API endpoint not found');
  }
  catch (error: any) {
    if (error?.detail) error.message += ' ' + error.detail;
    throw error;
  }
}

// 工具函数
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // 处理包含逗号、引号、换行符的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}


function generateInsertSQL(dbType: string, tableName: string, data: any, dbService: any, columns?: any[]): string {
  // 如果提供了列信息，过滤掉自增字段
  let filteredData = data;
  if (columns && columns.length > 0) {
    filteredData = {};
    Object.keys(data).forEach(key => {
      const column = columns.find((col: any) => col.name === key);
      // 如果列存在且不是自增字段，则包含在 INSERT 语句中
      if (!column || !column.isAutoIncrement) {
        filteredData[key] = data[key];
      }
    });
  }

  const columnNames = Object.keys(filteredData);
  const values = Object.values(filteredData);

  const quotedColumns = columnNames.map(col => dbService.quoteIdentifier(col)).join(', ');
  const quotedValues = values.map(val => formatValue(dbType, val)).join(', ');

  return `INSERT INTO ${dbService.quoteIdentifier(tableName)} (${quotedColumns}) VALUES (${quotedValues});`;
}

function generateUpdateSQL(dbType: string, tableName: string, data: any, where: any, dbService: any): string {
  const setClause = Object.entries(data)
    .map(([key, value]) => `${dbService.quoteIdentifier(key)} = ${formatValue(dbType, value)}`)
    .join(', ');

  const whereClause = Object.entries(where)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return `${dbService.quoteIdentifier(key)} IS NULL`;
      }
      return `${dbService.quoteIdentifier(key)} = ${formatValue(dbType, value)}`;
    })
    .join(' AND ');

  return `UPDATE ${dbService.quoteIdentifier(tableName)} SET ${setClause} WHERE ${whereClause};`;
}

function generateDeleteSQL(dbType: string, tableName: string, where: any, dbService: any): string {
  const whereClause = Object.entries(where)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return `${dbService.quoteIdentifier(key)} IS NULL`;
      }
      return `${dbService.quoteIdentifier(key)} = ${formatValue(dbType, value)}`;
    })
    .join(' AND ');

  return `DELETE FROM ${dbService.quoteIdentifier(tableName)} WHERE ${whereClause};`;
}

function formatValue(dbType: string, value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    if (dbType === 'postgres' || dbType === 'postgresql') {
      return `'${value.toISOString()}'`;
    } else if (dbType === 'sqlite') {
      return `'${value.toISOString()}'`;
    } else if (dbType === 'mssql') {
      return `'${value.toISOString()}'`;
    } else {
      return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
  }

  // 数组或对象类型需要 JSON 序列化
  if (typeof value === 'object' && value !== null) {
    try {
      const jsonStr = JSON.stringify(value);
      return `'${jsonStr.replace(/'/g, "''")}'`;
    } catch (e) {
      // 序列化失败时，作为普通字符串处理
      return `'${String(value).replace(/'/g, "''")}'`;
    }
  }

  // 处理字符串（包括空字符串 ''）
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isNumberType(type: string): boolean {
  return ['int', 'bigint', 'tinyint', 'smallint', 'mediumint'].includes(type);
}