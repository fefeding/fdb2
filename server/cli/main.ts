/**
 * fdb2 CLI 入口
 * 结构: fdb2 <group> <command> [args...] [flags...]
 */
import { DbToolApi } from '../core/db-api';
import { AppError, exitCodeOf } from '../core/errors';
import { parseArgs, OptDef, splitCsv, parseKvList } from './parse';
import { humanizeResult } from './format';

export const VERSION = '2.0.0-cli';

const api = new DbToolApi();

type V = Record<string, any>;
interface Ctx {
  v: V;
  pos: string[];
  cmd: string;
}

type Handler = (ctx: Ctx) => Promise<any>;

interface CommandDef {
  extra?: OptDef[];
  pos?: number | number[];
  run: Handler;
}

const F = {
  filter: { name: 'filter', type: 'list' } as OptDef,
  filterJson: { name: 'filter-json', type: 'string' } as OptDef,
  sort: { name: 'sort', type: 'list' } as OptDef,
  select: { name: 'select', type: 'string' } as OptDef,
  column: { name: 'column', type: 'list' } as OptDef,
  file: { name: 'file', type: 'string' } as OptDef,
  format: { name: 'format', type: 'string' } as OptDef,
  unique: { name: 'unique', type: 'bool' } as OptDef,
  pattern: { name: 'pattern', type: 'string' } as OptDef,
  charset: { name: 'charset', type: 'string' } as OptDef,
  engine: { name: 'engine', type: 'string' } as OptDef,
  comment: { name: 'comment', type: 'string' } as OptDef,
  data: { name: 'data', type: 'json' } as OptDef,
  set: { name: 'set', type: 'list' } as OptDef,
  setJson: { name: 'set-json', type: 'string' } as OptDef,
  addColumn: { name: 'add-column', type: 'list' } as OptDef,
  dropColumn: { name: 'drop-column', type: 'list' } as OptDef,
  modifyColumn: { name: 'modify-column', type: 'list' } as OptDef,
  renameTo: { name: 'rename-to', type: 'string' } as OptDef,
  name: { name: 'name', type: 'string' } as OptDef,
  columns: { name: 'columns', type: 'string' } as OptDef,
  as: { name: 'as', type: 'string' } as OptDef,
  body: { name: 'body', type: 'string' } as OptDef,
  allowMulti: { name: 'allow-multi', type: 'bool' } as OptDef,
  level: { name: 'level', type: 'string' } as OptDef,
  tables: { name: 'tables', type: 'string' } as OptDef,
  mode: { name: 'mode', type: 'string' } as OptDef,
  recreate: { name: 'recreate', type: 'bool' } as OptDef,
  fromConn: { name: 'from-conn', type: 'string' } as OptDef,
  fromDb: { name: 'from-db', type: 'string' } as OptDef,
  fromTable: { name: 'from-table', type: 'string' } as OptDef,
  toConn: { name: 'to-conn', type: 'string' } as OptDef,
  toDb: { name: 'to-db', type: 'string' } as OptDef,
  toTable: { name: 'to-table', type: 'string' } as OptDef,
  dropTarget: { name: 'drop-target', type: 'bool' } as OptDef
};

const g = (v: V) => ({
  yes: !!v.yes,
  dryRun: !!v['dry-run'],
  confirm: v.confirm || null,
  write: !!v.write,
  force: !!v.force
});

async function needDb(v: V): Promise<string> {
  if (v.db) return String(v.db);
  const conn = await api.resolveConnection(v.conn || null);
  if (!conn.database) {
    throw new AppError('PARAM_ERROR', '缺少 --db 数据库名', { hint: '该连接未配置默认数据库，请用 --db <库名> 指定' });
  }
  return conn.database;
}

async function needConn(v: V): Promise<string> {
  return v.conn || null;
}

async function readStdin(): Promise<string> {
  process.stdin.setEncoding('utf8');
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  return s.trim();
}

// ================= 命令表 =================

const connCmds: Record<string, CommandDef> = {
  list: {
    run: async () => api.listConnections()
  },
  get: {
    pos: 1,
    run: async ({ pos }) => api.getConnectionInfo(pos[0])
  },
  add: {
    extra: [F.name],
    run: async ({ v }) => {
      const opts = parseKvList(v.option || []);
      if (v.ssl) opts.ssl = true;
      let password = v.password;
      if (v['password-stdin']) password = await readStdin();
      return api.addConnection({
        name: v.name,
        type: v.type,
        host: v.host,
        port: v.port,
        database: v.database,
        username: v.username,
        password,
        options: opts
      });
    }
  },
  update: {
    pos: 1,
    run: async ({ v, pos }) => {
      const updates: Record<string, any> = {};
      for (const k of ['name', 'host', 'port', 'database', 'username', 'password', 'type', 'enabled']) {
        if (v[k] !== undefined) {
          updates[k] = k === 'enabled' ? !(v[k] === 'false' || v[k] === '0') : v[k];
        }
      }
      if (v.option) updates.options = parseKvList(v.option || []);
      if (v['password-stdin']) updates.password = await readStdin();
      return api.updateConnection(pos[0], updates);
    }
  },
  remove: {
    pos: 1,
    run: async ({ pos }) => api.deleteConnection(pos[0])
  },
  test: {
    pos: 1,
    run: async ({ pos }) => {
      const r = await api.testConnectionByRef(pos[0]);
      if (!r.ok) throw new AppError('CONN_NOT_FOUND', `连接 ${pos[0]} 测试失败`, { hint: '请检查主机/端口/账号/密码/网络' });
      return r;
    }
  },
  use: {
    pos: 1,
    run: async ({ pos }) => api.setDefaultConnection(pos[0])
  },
  current: {
    run: async () => api.currentConnection()
  }
};

const dbCmds: Record<string, CommandDef> = {
  list: {
    run: async ({ v }) => api.listDatabases(await needConn(v))
  },
  info: {
    pos: 1,
    run: async ({ v, pos }) => api.databaseInfo(await needConn(v), await needDb(v))
  },
  create: {
    pos: 1,
    extra: [F.charset],
    run: async ({ v, pos }) => api.createDatabaseCmd(await needConn(v), pos[0], v.charset, g(v))
  },
  drop: {
    pos: 1,
    run: async ({ v, pos }) => api.dropDatabaseCmd(await needConn(v), pos[0], g(v))
  }
};

const tableCmds: Record<string, CommandDef> = {
  list: {
    extra: [F.pattern],
    run: async ({ v }) => api.listTables(await needConn(v), await needDb(v), v.pattern)
  },
  info: {
    pos: 1,
    run: async ({ v, pos }) => api.tableInfo(await needConn(v), await needDb(v), pos[0])
  },
  columns: {
    pos: 1,
    run: async ({ v, pos }) => {
      const r = await api.tableInfo(await needConn(v), await needDb(v), pos[0]);
      return { conn: r.conn, database: r.database, table: r.table.name, columns: r.table.columns || [] };
    }
  },
  indexes: {
    pos: 1,
    run: async ({ v, pos }) => api.listIndexes(await needConn(v), await needDb(v), pos[0])
  },
  fks: {
    pos: 1,
    run: async ({ v, pos }) => {
      const r = await api.tableInfo(await needConn(v), await needDb(v), pos[0]);
      return { conn: r.conn, database: r.database, table: r.table.name, foreignKeys: r.table.foreignKeys || [] };
    }
  },
  stats: {
    pos: 1,
    run: async ({ v, pos }) => {
      const r = await api.tableInfo(await needConn(v), await needDb(v), pos[0]);
      return { conn: r.conn, database: r.database, table: r.table.name, rowCount: r.table.rowCount, size: r.table.size, engine: r.table.engine };
    }
  },
  create: {
    pos: 1,
    extra: [F.column, F.engine, F.charset, F.comment],
    run: async ({ v, pos }) =>
      api.createTableCmd(await needConn(v), await needDb(v), pos[0], v.column || [], {
        engine: v.engine,
        charset: v.charset,
        comment: v.comment,
        ...g(v)
      })
  },
  alter: {
    pos: 1,
    extra: [F.addColumn, F.dropColumn, F.modifyColumn, F.renameTo],
    run: async ({ v, pos }) =>
      api.alterTableCmd(await needConn(v), await needDb(v), pos[0], {
        addColumn: v['add-column'] || [],
        dropColumn: v['drop-column'] || [],
        modifyColumn: v['modify-column'] || [],
        renameTo: v['rename-to'],
        ...g(v)
      })
  },
  rename: {
    pos: 2,
    run: async ({ v, pos }) =>
      api.alterTableCmd(await needConn(v), await needDb(v), pos[0], {
        renameTo: pos[1],
        ...g(v)
      })
  },
  drop: {
    pos: 1,
    run: async ({ v, pos }) => api.dropTableCmd(await needConn(v), await needDb(v), pos[0], { ...g(v), truncate: false })
  },
  truncate: {
    pos: 1,
    run: async ({ v, pos }) => api.dropTableCmd(await needConn(v), await needDb(v), pos[0], { ...g(v), truncate: true })
  }
};

const indexCmds: Record<string, CommandDef> = {
  list: {
    pos: 1,
    run: async ({ v, pos }) => api.listIndexes(await needConn(v), await needDb(v), pos[0])
  },
  create: {
    pos: 1,
    extra: [F.name, F.columns, F.unique],
    run: async ({ v, pos }) =>
      api.createIndexCmd(await needConn(v), await needDb(v), pos[0], v.name, splitCsv(v.columns), {
        unique: !!v.unique,
        ...g(v)
      })
  },
  drop: {
    pos: 2,
    run: async ({ v, pos }) => api.dropIndexCmd(await needConn(v), await needDb(v), pos[0], pos[1], g(v))
  }
};

const rowsCmds: Record<string, CommandDef> = {
  list: {
    pos: 1,
    extra: [F.select, F.filter, F.filterJson, F.sort],
    run: async ({ v, pos }) =>
      api.rowsList(await needConn(v), await needDb(v), pos[0], {
        select: splitCsv(v.select),
        filters: v.filter || [],
        filterJson: v['filter-json'],
        sorts: v.sort || [],
        limit: v.limit,
        offset: v.offset,
        count: !!v.count
      })
  },
  get: {
    pos: 1,
    extra: [F.filter],
    run: async ({ v, pos }) => {
      if (!v.filter || !v.filter.length) {
        throw new AppError('PARAM_ERROR', 'rows get 需要 --filter，如 --filter id=42');
      }
      const r = await api.rowsList(await needConn(v), await needDb(v), pos[0], {
        filters: v.filter,
        filterJson: v['filter-json'],
        limit: 1
      });
      return { conn: r.conn, database: r.database, table: r.table, data: r.data };
    }
  },
  count: {
    pos: 1,
    extra: [F.filter, F.filterJson],
    run: async ({ v, pos }) => api.rowsCount(await needConn(v), await needDb(v), pos[0], { filters: v.filter || [], filterJson: v['filter-json'] })
  },
  insert: {
    pos: 1,
    extra: [F.data],
    run: async ({ v, pos }) => {
      if (!v.data) throw new AppError('PARAM_ERROR', 'insert 需要 --data <json>');
      return api.rowsInsert(await needConn(v), await needDb(v), pos[0], v.data, g(v));
    }
  },
  'insert-many': {
    pos: 1,
    extra: [F.file, F.format],
    run: async ({ v, pos }) => {
      if (!v.file) throw new AppError('PARAM_ERROR', 'insert-many 需要 --file <csv|json>');
      return api.importFile(await needConn(v), await needDb(v), pos[0], v.file, {
        format: v.format,
        limit: v.limit,
        ...g(v)
      });
    }
  },
  update: {
    pos: 1,
    extra: [F.filter, F.filterJson, F.set, F.setJson],
    run: async ({ v, pos }) => {
      let setData: Record<string, any> = {};
      if (v.setJson) {
        try {
          setData = typeof v['set-json'] === 'string' ? JSON.parse(v['set-json']) : v['set-json'];
        } catch (e) {
          throw new AppError('PARAM_ERROR', '--set-json 不是合法 JSON');
        }
      }
      setData = { ...parseKvList(v.set || []), ...setData };
      return api.rowsUpdate(await needConn(v), await needDb(v), pos[0], setData, {
        filters: v.filter || [],
        filterJson: v['filter-json'],
        ...g(v)
      });
    }
  },
  delete: {
    pos: 1,
    extra: [F.filter, F.filterJson],
    run: async ({ v, pos }) =>
      api.rowsDelete(await needConn(v), await needDb(v), pos[0], {
        filters: v.filter || [],
        filterJson: v['filter-json'],
        ...g(v)
      })
  },
  upsert: {
    pos: 1,
    run: async () => {
      throw new AppError('UNSUPPORTED', 'upsert 暂未提供，请用 insert 失败后再 update 两步完成', {
        hint: '复杂合并逻辑请使用 fdb2 sql --write（需先 dry-run 确认）'
      });
    }
  }
};

const viewCmds: Record<string, CommandDef> = {
  list: { run: async ({ v }) => api.listViews(await needConn(v), await needDb(v)) },
  show: {
    pos: 1,
    run: async ({ v, pos }) => api.getViewDefinitionCmd(await needConn(v), await needDb(v), pos[0])
  },
  create: {
    pos: 1,
    extra: [F.as],
    run: async ({ v, pos }) => api.createViewCmd(await needConn(v), await needDb(v), pos[0], v.as, g(v))
  },
  drop: {
    pos: 1,
    run: async ({ v, pos }) => api.dropViewCmd(await needConn(v), await needDb(v), pos[0], g(v))
  }
};

const procCmds: Record<string, CommandDef> = {
  list: { run: async ({ v }) => api.listProcedures(await needConn(v), await needDb(v)) },
  show: {
    pos: 1,
    run: async ({ v, pos }) => api.getProcedureDefinitionCmd(await needConn(v), await needDb(v), pos[0])
  },
  create: {
    pos: 1,
    extra: [F.body],
    run: async ({ v, pos }) => {
      throw new AppError('UNSUPPORTED', '存储过程创建涉及复杂方言语法，请使用桌面端或 fdb2 sql', {
        hint: '如需执行现成脚本可: fdb2 sql --write --allow-multi < 脚本.sql'
      });
    }
  },
  drop: {
    pos: 1,
    run: async ({ v, pos }) => api.dropProcedureCmd(await needConn(v), await needDb(v), pos[0], g(v))
  }
};

const exportCmds: Record<string, CommandDef> = {
  rows: {
    pos: 1,
    extra: [F.format, F.filter, F.filterJson],
    run: async ({ v, pos }) =>
      api.exportRowsFile(await needConn(v), await needDb(v), pos[0], v.format || 'json', v.out, {
        filters: v.filter || [],
        filterJson: v['filter-json'],
        limit: v.limit
      })
  },
  schema: {
    run: async ({ v }) => api.exportSchemaCmd(await needConn(v), await needDb(v), v.out)
  },
  dump: {
    pos: 1,
    run: async ({ v, pos }) => api.backupCmd(await needConn(v), pos[0], v.out)
  }
};

const importCmds: Record<string, CommandDef> = {
  file: {
    pos: 1,
    extra: [F.file, F.format],
    run: async ({ v, pos }) => {
      if (!v.file) throw new AppError('PARAM_ERROR', 'import file 需要 --file <csv|json>');
      return api.importFile(await needConn(v), await needDb(v), pos[0], v.file, {
        format: v.format,
        limit: v.limit,
        ...g(v)
      });
    }
  }
};

const opsCmds: Record<string, CommandDef> = {
  stats: {
    run: async ({ v }) => api.statsCmd(await needConn(v), await needDb(v))
  },
  health: {
    run: async ({ v }) => {
      const conn = await api.resolveConnection(v.conn || null);
      return api.testConnectionByRef(conn.name || conn.id);
    }
  },
  optimize: {
    run: async ({ v }) => api.maintenanceCmd(await needConn(v), await needDb(v), 'optimize', g(v))
  },
  analyze: {
    run: async ({ v }) => api.maintenanceCmd(await needConn(v), await needDb(v), 'analyze', g(v))
  },
  repair: {
    run: async ({ v }) => api.maintenanceCmd(await needConn(v), await needDb(v), 'repair', g(v))
  },
  logs: {
    extra: [F.level],
    run: async ({ v }) => api.logsCmd(await needConn(v), v.db, v.limit || 100)
  }
};

const rootCmds: Record<string, CommandDef> = {
  conn: { run: async () => api.listConnections() },
  conns: { run: async () => api.listConnections() },
  types: { run: async () => api.types() },
  current: { run: async () => api.currentConnection() },
  setup: { run: async () => api.setupInfo() },
  audit: {
    run: async ({ v }) => api.auditLog(v.limit || 100)
  },
  sql: {
    extra: [F.allowMulti],
    run: async ({ v, pos }) => {
      const sqlText = v.posSql || pos[0];
      if (!sqlText) throw new AppError('PARAM_ERROR', 'sql 需要 SQL 文本');
      return api.runSql(await needConn(v), v.db, sqlText, {
        write: !!v.write,
        limit: v.limit,
        allowMulti: !!v['allow-multi'],
        yes: !!v.yes,
        dryRun: !!v['dry-run'],
        confirm: v.confirm || null
      });
    }
  }
};

// 允许在任意子命令尾部追加 SQL（fdb2 sql '...'）
const groups: Record<string, Record<string, CommandDef>> = {
  conn: connCmds,
  db: dbCmds,
  table: tableCmds,
  index: indexCmds,
  rows: rowsCmds,
  view: viewCmds,
  proc: procCmds,
  export: exportCmds,
  import: importCmds,
  ops: opsCmds
};

const authCmds: Record<string, CommandDef> = {
  login: {
    run: async () => {
      return {
        message: '本工具通过本地连接配置访问数据库，无第三方账号。请在 WorkBuddy 对话中提供连接信息，或执行 fdb2 conn add 添加连接。'
      };
    }
  },
  logout: {
    run: async () => {
      // 清空默认连接，保留连接配置（不删除用户数据）
      const { updateConfig } = require('../core/config');
      updateConfig({ defaultConnectionId: null });
      return { message: '已登出：默认连接已清除（连接配置保留）。可通过 fdb2 conn use <name> 重新设置默认连接。' };
    }
  },
  status: {
    run: async () => {
      const list = await api.allConnections();
      const cfg = require('../core/config').getConfig();
      if (list.length === 0) {
        throw new AppError('NOT_READY', 'Not connected: no database connection configured', {
          hint: '请先执行 fdb2 conn add 添加数据库连接'
        });
      }
      return { status: 'Connected', message: `Connected: ${list.length} connections available`, defaultConnection: cfg.defaultConnectionId || null, connections: list.length };
    }
  }
};

// ================= 执行 =================

function collectDefs(def: CommandDef): OptDef[] {
  return def.extra || [];
}

async function runCommand(argv: string[]): Promise<{ cmdLabel: string; payload: any }> {
  const first = argv[0] || '';

  // 根命令
  if (!first || first === 'help' || first === '-h' || first === '--help') {
    return { cmdLabel: 'help', payload: { help: helpText() } };
  }

  if (first === 'auth') {
    const sub = argv[1] || 'status';
    const def = authCmds[sub];
    if (!def) throw new AppError('UNKNOWN_COMMAND', `未知 auth 子命令: ${sub}`);
    const { pos, values } = parseArgs(argv.slice(2), collectDefs(def));
    return { cmdLabel: `auth:${sub}`, payload: await def.run({ v: values, pos, cmd: sub }) };
  }

  if (first === 'config') {
    return runConfig(argv.slice(1));
  }

  if (first === 'backup') {
    const { pos, values } = parseArgs(argv.slice(1), [F.format]);
    if (!pos[0]) throw new AppError('PARAM_ERROR', 'backup <db> [--out <dir>]');
    return { cmdLabel: 'backup', payload: await api.backupCmd(await needConn(values), pos[0], values.out) };
  }
  if (first === 'restore') {
    const { pos, values } = parseArgs(argv.slice(1), [F.file]);
    if (!pos[0] || !values.file) throw new AppError('PARAM_ERROR', 'restore <db> --file <path>');
    return { cmdLabel: 'restore', payload: await api.restoreCmd(await needConn(values), pos[0], values.file, g(values)) };
  }

  // group 命令
  const group = groups[first];
  if (group) {
    const sub = argv[1] || 'list';
    const def = group[sub];
    if (!def) throw new AppError('UNKNOWN_COMMAND', `未知 ${first} 子命令: ${sub}`, { hint: helpGroup(first) });
    const { pos, values } = parseArgs(argv.slice(2), collectDefs(def));
    const minPos = def.pos === undefined ? 0 : Array.isArray(def.pos) ? Math.max(...def.pos) + 1 : def.pos;
    if (pos.length < minPos) {
      throw new AppError('PARAM_ERROR', `fdb2 ${first} ${sub} 缺少参数`);
    }
    return { cmdLabel: `${first}:${sub}`, payload: await def.run({ v: values, pos, cmd: sub }) };
  }

  const rootDef = rootCmds[first];
  if (rootDef) {
    const { pos, values } = parseArgs(argv.slice(1), collectDefs(rootDef));
    // sql 特殊：允许整段 SQL 作为位置参数（可能含空格，由 shell 引号传入）
    // 无位置参数时若 stdin 被重定向（非 TTY）则从 stdin 读取（支持 fdb2 sql < script.sql）
    if (first === 'sql') {
      if (pos.length > 0) {
        values.posSql = pos.join(' ');
      } else if (process.stdin.isTTY === false) {
        values.posSql = await readStdin();
      }
      pos.length = 0;
    }
    return { cmdLabel: first, payload: await rootDef.run({ v: values, pos, cmd: first }) };
  }

  if (first === '-v' || first === '--version' || first === 'version') {
    return { cmdLabel: 'version', payload: { version: VERSION } };
  }

  throw new AppError('UNKNOWN_COMMAND', `未知命令: ${first}`, { hint: helpText() });
}

async function runConfig(argv: string[]): Promise<{ cmdLabel: string; payload: any }> {
  const sub = argv[0] || 'show';
  const cfgApi = require('../core/config');
  if (sub === 'show') {
    return { cmdLabel: 'config:show', payload: await api.configShow() };
  }
  if (sub === 'get') {
    const { pos, values } = parseArgs(argv.slice(1), []);
    if (!pos[0]) throw new AppError('PARAM_ERROR', 'config get <key>');
    const show = await api.configShow();
    return { cmdLabel: 'config:get', payload: { key: pos[0], value: (show.config as any)[pos[0]] ?? null } };
  }
  if (sub === 'set') {
    const { pos, values } = parseArgs(argv.slice(1), []);
    if (pos.length < 2) throw new AppError('PARAM_ERROR', 'config set <key> <value>');
    return { cmdLabel: 'config:set', payload: await api.configSet(pos[0], pos[1]) };
  }
  throw new AppError('UNKNOWN_COMMAND', `未知 config 子命令: ${sub}`, { hint: 'config show | get <key> | set <key> <value>' });
}

function helpText(): string {
  return `fdb2 — 数据库命令行工具（支持 8 种数据库）

用法: fdb2 <命令> [参数]

连接管理:
  conn list                       列出全部连接
  conn get <name|id>              查看连接详情
  conn add --name <n> --type <t> --database <d> [--host] [--port] [--username] [--password]
  conn update <name|id> [--host ...] [--password-stdin]
  conn remove <name|id>           删除连接
  conn test <name|id>             连通性测试
  conn use <name|id>              设为默认连接
  current                         显示当前默认连接
  types                           支持的数据库类型

数据库:
  db list | db info <db> | db create <db> [--charset] | db drop <db>

表 / 索引 / 视图 / 过程:
  table list [--pattern] | table columns <t> | table info <t>
  table indexes <t> | table fks <t> | table stats <t>
  table create <t> --column 'name:varchar:len=64:not_null' [--column ...]
  table alter <t> --add-column ... | --drop-column <c> | --modify-column ... | --rename-to <n>
  table drop <t> | table truncate <t>
  index list <t> | index create <t> --name idx --columns a,b [--unique] | index drop <t> <name>
  view list | show <n> | create <n> --as '<SELECT...>' | drop <n>
  proc list | show <n> | drop <n>

行数据（显式接口，禁止裸拼 SQL）:
  rows list <t> [--select a,b] [--filter 'age>=18']... [--sort created_at:desc] [--limit] [--count]
  rows get  <t> --filter 'id=42'
  rows count <t> [--filter ...]
  rows insert <t> --data '{"name":"a"}'
  rows insert-many <t> --file rows.csv
  rows update <t> --filter <expr> --set 'status=active' [--dry-run]
  rows delete <t> --filter <expr> [--dry-run]

导入导出 / 备份 / 运维:
  export rows <t> --format json|csv|sql [--out <f>]
  export schema [--out <f>] | export dump <db> [--out <f>]
  import file <t> --file <f> [--format csv|json]
  backup <db> [--out <dir>] | restore <db> --file <f>
  ops stats | optimize | analyze | repair | logs | health

其它:
  sql '<SQL>' [--write] [--limit]       SQL 逃生舱（默认只读、禁多语句）
  config show | get <key> | set <key> <value>
  audit [--limit N] | setup | auth status | help

写操作安全协议（必须）:
  1. 先执行 --dry-run 预演，获得预计影响行数与 confirmToken
  2. 用户确认后携带 --confirm <token>（破坏性操作另加 --yes）执行
  影响行数超过阈值(默认100)需 --force；全局只读模式下需 --write
  MongoDB 为实验性支持。所有命令可用 --json 输出机器可读结果。`;
}

function helpGroup(group: string): string {
  const map: Record<string, string[]> = {
    conn: ['list', 'get', 'add', 'update', 'remove', 'test', 'use', 'current'],
    db: ['list', 'info', 'create', 'drop'],
    table: ['list', 'info', 'columns', 'indexes', 'fks', 'stats', 'create', 'alter', 'rename', 'drop', 'truncate'],
    index: ['list', 'create', 'drop'],
    rows: ['list', 'get', 'count', 'insert', 'insert-many', 'update', 'delete'],
    view: ['list', 'show', 'create', 'drop'],
    proc: ['list', 'show', 'drop'],
    export: ['rows', 'schema', 'dump'],
    import: ['file'],
    ops: ['stats', 'health', 'optimize', 'analyze', 'repair', 'logs']
  };
  return `fdb2 ${group} <${(map[group] || []).join('|')}>`;
}

export async function run(argv: string[]): Promise<number> {
  let jsonMode = argv.includes('--json');
  let quiet = argv.includes('--quiet');
  try {
    const { cmdLabel, payload } = await runCommand(argv);
    if (cmdLabel === 'help') {
      process.stdout.write(payload.help + '\n');
      return 0;
    }
    if (cmdLabel === 'version') {
      process.stdout.write(payload.version + '\n');
      return 0;
    }
    if (cmdLabel === 'auth:status') {
      // 状态检查文本（statusMatch 依赖固定前缀）
      process.stdout.write(payload.status === 'Connected' ? payload.message + '\n' : 'Not connected\n');
      return 0;
    }
    if (jsonMode) {
      process.stdout.write(JSON.stringify({ ok: true, ...payload }, null, 2) + '\n');
    } else {
      const text = humanizeResult(cmdLabel, payload);
      process.stdout.write(text.endsWith('\n') ? text : text + '\n');
    }
    return 0;
  } catch (err: any) {
    const appErr = err instanceof AppError ? err : new AppError('EXEC_ERROR', err?.message || String(err), { hint: err?.hint });
    const code = appErr.code;
    const exit = exitCodeOf(code);
    if (jsonMode) {
      process.stdout.write(
        JSON.stringify(
          { ok: false, error: { code, message: appErr.message, hint: appErr.hint || undefined, details: appErr.details } },
          null,
          2
        ) + '\n'
      );
    } else {
      process.stderr.write(`错误 [${code}]: ${appErr.message}\n`);
      if (appErr.hint) process.stderr.write(`提示: ${appErr.hint}\n`);
    }
    return exit;
  }
}
