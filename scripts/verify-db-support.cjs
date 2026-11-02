/*
 * 数据库支持端到端验证脚本
 * 直接复用 dist/server 编译产物里的 ConnectionService + DatabaseService（即应用真实代码路径），
 * 对每个数据库类型跑完整链路（调用方式与 server/index.ts 路由一致）：
 *   建连 -> getDatabases -> getTables -> 建表 -> getColumns -> 插入 -> 查数据
 *   -> 改表/校验 -> 导出schema -> 删表
 *
 * 关系型（postgres/cockroachdb/oracle/mssql/sqlite）走 DDL spec 建表/改表 + SQL 查询；
 * MongoDB 走服务自身的集合方法（文档库无 SQL DDL）。
 *
 * 用法:
 *   DB_TOOL_DATA_DIR=/tmp/dbtool-verify node scripts/verify-db-support.cjs [type ...]
 *   type ∈ postgres cockroachdb oracle mssql mongodb sqlite
 */
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const dataDir = process.env.DB_TOOL_DATA_DIR || path.join(os.tmpdir(), 'dbtool-verify-' + Date.now());
process.env.DB_TOOL_DATA_DIR = dataDir;
fs.mkdirSync(dataDir, { recursive: true });

const { ConnectionService } = require(path.join(__dirname, '..', 'dist', 'server', 'service', 'connection.service.js'));
const { DatabaseService } = require(path.join(__dirname, '..', 'dist', 'server', 'service', 'database', 'database.service.js'));

const CONN = {
  postgres: { type: 'postgres', host: '127.0.0.1', port: 15432, username: 'postgres', password: 'postgres', database: 'testdb', options: {} },
  cockroachdb: { type: 'cockroachdb', host: '127.0.0.1', port: 26257, username: 'root', password: '', database: 'defaultdb', options: {} },
  oracle: { type: 'oracle', host: '127.0.0.1', port: 11521, username: 'system', password: 'oracle', database: 'freepdb1', options: {} },
  mssql: { type: 'mssql', host: '127.0.0.1', port: 11433, username: 'sa', password: 'YourStrong!Passw0rd', database: 'master', options: {} },
  mongodb: { type: 'mongodb', host: '127.0.0.1', port: 27017, username: '', password: '', database: 'testdb', options: {} },
  clickhouse: { type: 'clickhouse', host: '127.0.0.1', port: 18123, username: 'default', password: '', database: 'default', options: {} },
  sqlite: { type: 'sqlite', host: '', port: null, username: '', password: '', database: path.join(dataDir, 'verify.db'), options: {} }
};

const TABLE = 'verify_tbl';

function specBase() {
  return {
    name: TABLE, comment: 'verify table',
    columns: [
      { name: 'id', type: 'INT', nullable: false, hasDefault: false, autoIncrement: true },
      { name: 'name', type: 'VARCHAR', length: 100, nullable: true, hasDefault: false },
      { name: 'age', type: 'INT', nullable: true, hasDefault: false }
    ],
    primaryKey: ['id']
  };
}
function specAltered() {
  const s = specBase();
  s.columns.push({ name: 'email', type: 'VARCHAR', length: 200, nullable: true, hasDefault: false });
  return s;
}

function step(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(r => { console.log(`  [PASS] ${name}`); return r; })
    .catch(e => {
      const msg = e && e.message ? e.message.split('\n')[0] : String(e);
      console.log(`  [FAIL] ${name} -> ${msg}`);
      return { __error: msg };
    });
}

async function runType(type) {
  const cfg = CONN[type];
  if (!cfg) { console.log(`未知类型: ${type}`); return; }
  const isMongo = type === 'mongodb';
  console.log(`\n==================== ${type} ====================`);
  const connService = new ConnectionService();
  await connService.init();
  const dispatcher = new DatabaseService();
  dispatcher.connectionService = connService;

  const baseOf = async (database) => {
    const ds = await connService.getActiveConnection(id, database);
    return { ds, base: dispatcher['getDatabaseService'](ds.options.type) };
  };

  const conn = await connService.addConnection({ ...cfg, name: 'verify_' + type, enabled: true });
  const id = conn.id;
  const db = cfg.database;

  await step('testConnection', async () => {
    const ok = await connService.testConnection(conn);
    if (!ok) throw new Error('连接测试失败');
  });

  await step('getDatabases', async () => {
    const list = await dispatcher.getDatabases(id);
    if (!Array.isArray(list)) throw new Error('返回非数组');
    return list;
  });

  await step('getTables(初始)', async () => {
    const list = await dispatcher.getTables(id, db);
    if (!Array.isArray(list)) throw new Error('返回非数组');
    return list;
  });

  // 清理残留
  await (async () => {
    try { const { ds, base } = await baseOf(db); await base.dropTable(ds, db, TABLE); } catch (e) { /* ignore */ }
  })();

  if (isMongo) {
    await step('createTable(集合)', async () => {
      const { ds, base } = await baseOf(db);
      await base.createTable(ds, db, specBase());
    });
    await step('getTables(建表后含 verify_tbl)', async () => {
      const list = await dispatcher.getTables(id, db);
      const found = list.some(t => String(t.name).toLowerCase() === TABLE.toLowerCase());
      if (!found) throw new Error('建表后未找到 ' + TABLE);
      return list;
    });
    await step('insertData', async () => {
      const { ds, base } = await baseOf(db);
      await base.insertData(ds, db, TABLE, { name: 'alice', age: 30 });
      await base.insertData(ds, db, TABLE, { name: 'bob', age: 25 });
    });
    await step('getTableData(原生find)', async () => {
      const { ds } = await baseOf(db);
      const docs = await ds.driver.queryRunner.databaseConnection.db(db).collection(TABLE).find().toArray();
      if (!Array.isArray(docs) || docs.length < 2) throw new Error('数据行不足');
      return docs;
    });
    await step('getColumns(插入后)', async () => {
      const { ds, base } = await baseOf(db);
      const cols = await base.getColumns(ds, db, TABLE);
      if (!Array.isArray(cols) || cols.length < 3) throw new Error('列数不足: ' + (cols && cols.length));
      return cols.map(c => c.name + ':' + c.type);
    });
    await step('exportSchema', async () => {
      const s = await dispatcher.exportSchema(id, db);
      if (!s || !s.trim()) throw new Error('schema 为空');
      return s;
    });
    await step('dropTable(清理)', async () => {
      const { ds, base } = await baseOf(db);
      await base.dropTable(ds, db, TABLE);
    });
  } else {
    await step('previewCreateTable', async () => {
      const p = await dispatcher.previewCreateTable(id, db, specBase());
      if (!p.preview || !p.preview.trim()) throw new Error('预览为空');
      return p.preview;
    });

    await step('executeCreateTable', async () => {
      const r = await dispatcher.executeCreateTable(id, db, specBase());
      if (!r.statements || r.statements.length === 0) throw new Error('未生成建表语句');
      return r.statements;
    });

    await step('getTables(建表后含 verify_tbl)', async () => {
      const list = await dispatcher.getTables(id, db);
      const found = list.some(t => String(t.name).toLowerCase() === TABLE.toLowerCase());
      if (!found) throw new Error('建表后未找到 ' + TABLE);
      return list;
    });

    await step('getColumns', async () => {
      const { ds, base } = await baseOf(db);
      const cols = await base.getColumns(ds, db, TABLE);
      if (!Array.isArray(cols) || cols.length < 3) throw new Error('列数不足: ' + (cols && cols.length));
      return cols.map(c => c.name + ':' + c.type);
    });

    await step('insertData', async () => {
      const { ds, base } = await baseOf(db);
      const cols = await base.getColumns(ds, db, TABLE);
      const ins = (data) => {
        const names = cols.filter(c => !c.isAutoIncrement).map(c => base['quoteIdentifier'](c.name));
        const vals = cols.filter(c => !c.isAutoIncrement).map(c => data[c.name] === undefined ? 'NULL' : (typeof data[c.name] === 'string' ? `'${String(data[c.name]).replace(/'/g, "''")}'` : String(data[c.name])));
        return `INSERT INTO ${base['quoteIdentifier'](TABLE)} (${names.join(',')}) VALUES (${vals.join(',')})`;
      };
      await dispatcher.executeQuery(id, ins({ name: 'alice', age: 30 }), db);
      await dispatcher.executeQuery(id, ins({ name: 'bob', age: 25 }), db);
    });

    await step('getTableData', async () => {
      const r = await dispatcher.getTableData(id, db, TABLE, 1, 100);
      if (!r || !Array.isArray(r.data) || r.data.length < 2) throw new Error('数据行不足');
      return r.data;
    });

    await step('executeQuery(SELECT COUNT)', async () => {
      const { base } = await baseOf(db);
      const r = await dispatcher.executeQuery(id, `SELECT COUNT(*) AS c FROM ${base['quoteIdentifier'](TABLE)}`, db);
      return r;
    });

    await step('previewAlterTable(加 email 列)', async () => {
      const p = await dispatcher.previewAlterTable(id, db, TABLE, specAltered());
      if (!p.preview || !p.preview.trim()) throw new Error('预览为空');
      return p.preview;
    });

    await step('executeAlterTable(加 email 列)', async () => {
      const r = await dispatcher.executeAlterTable(id, db, TABLE, specAltered());
      if (!r.statements || r.statements.length === 0) throw new Error('未生成改表语句');
      return r.statements;
    });

    await step('getColumns(改表后含 email)', async () => {
      const { ds, base } = await baseOf(db);
      const cols = await base.getColumns(ds, db, TABLE);
      const hasEmail = cols.some(c => String(c.name).toLowerCase() === 'email');
      if (!hasEmail) throw new Error('改表后未找到 email 列');
      return cols.map(c => c.name);
    });

    await step('exportSchema', async () => {
      const s = await dispatcher.exportSchema(id, db);
      if (!s || !s.trim()) throw new Error('schema 为空');
      return s;
    });

    await step('dropTable(清理)', async () => {
      const { ds, base } = await baseOf(db);
      await base.dropTable(ds, db, TABLE);
    });
  }

  try { await connService.closeAllConnections(); } catch (e) { /* ignore */ }
}

(async () => {
  const args = process.argv.slice(2);
  const types = args.length ? args : ['postgres', 'cockroachdb', 'oracle', 'mssql', 'mongodb', 'sqlite'];
  console.log('数据目录:', dataDir);
  for (const t of types) { await runType(t); }
  console.log('\n==================== 完成 ====================');
  process.exit(0);
})().catch(e => { console.error('harness 崩溃:', e); process.exit(1); });
