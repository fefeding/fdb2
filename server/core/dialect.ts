/**
 * 数据库方言元数据
 * CLI 层根据连接类型决定：标识符引用方式、参数占位符风格、能力集。
 * 与前端 getSupportedDatabaseTypes 保持一致。
 */

export type DialectKind =
  | 'mysql'
  | 'postgres'
  | 'sqlite'
  | 'oracle'
  | 'mssql'
  | 'cockroachdb'
  | 'mongodb'
  | 'sap';

export interface DialectFeature {
  supportSchemas: boolean;
  supportProcedures: boolean;
  supportViews: boolean;
  supportTriggers: boolean;
  supportFullTextSearch: boolean;
  supportJson: boolean;
}

export interface DialectInfo {
  /** 规范化类型名（小写） */
  type: string;
  /** CLI 内部方言族 */
  kind: DialectKind;
  label: string;
  defaultPort: number | null;
  /** 参数占位符风格：'?' / '$' / 'inline'(不支持参数绑定，值内联转义) */
  paramStyle: '?' | '$' | 'inline';
  experimental?: boolean;
  features: DialectFeature;
  /** 对应方言 service 文件名（不含 .service.ts） */
  serviceFile: string;
  serviceClass: string;
}

const DIALECTS: Record<string, Partial<DialectInfo> & { type: string }> = {
  mysql: {
    type: 'mysql',
    label: 'MySQL',
    defaultPort: 3306,
    features: {
      supportSchemas: false,
      supportProcedures: true,
      supportViews: true,
      supportTriggers: true,
      supportFullTextSearch: true,
      supportJson: true
    },
    serviceFile: 'mysql',
    serviceClass: 'MySQLService'
  },
  'aurora-mysql': { type: 'mysql' },
  auroramysql: { type: 'mysql' },
  postgres: {
    type: 'postgres',
    label: 'PostgreSQL',
    defaultPort: 5432,
    features: {
      supportSchemas: true,
      supportProcedures: true,
      supportViews: true,
      supportTriggers: true,
      supportFullTextSearch: true,
      supportJson: true
    },
    serviceFile: 'postgres',
    serviceClass: 'PostgreSQLService'
  },
  postgresql: { type: 'postgres' },
  'aurora-postgres': { type: 'postgres' },
  aurorapostgres: { type: 'postgres' },
  'aurora-postgresql': { type: 'postgres' },
  sqlite: {
    type: 'sqlite',
    label: 'SQLite',
    defaultPort: null,
    features: {
      supportSchemas: false,
      supportProcedures: false,
      supportViews: true,
      supportTriggers: true,
      supportFullTextSearch: true,
      supportJson: false
    },
    serviceFile: 'sqlite',
    serviceClass: 'SQLiteService'
  },
  'better-sqlite3': { type: 'sqlite' },
  bettersqlite3: { type: 'sqlite' },
  oracle: {
    type: 'oracle',
    label: 'Oracle',
    defaultPort: 1521,
    features: {
      supportSchemas: true,
      supportProcedures: true,
      supportViews: true,
      supportTriggers: true,
      supportFullTextSearch: true,
      supportJson: false
    },
    serviceFile: 'oracle',
    serviceClass: 'OracleService'
  },
  mssql: {
    type: 'mssql',
    label: 'SQL Server',
    defaultPort: 1433,
    features: {
      supportSchemas: false,
      supportProcedures: true,
      supportViews: true,
      supportTriggers: true,
      supportFullTextSearch: true,
      supportJson: true
    },
    serviceFile: 'mssql',
    serviceClass: 'SQLServerService'
  },
  sqlserver: { type: 'mssql' },
  cockroachdb: {
    type: 'cockroachdb',
    label: 'CockroachDB',
    defaultPort: 26257,
    features: {
      supportSchemas: true,
      supportProcedures: true,
      supportViews: true,
      supportTriggers: true,
      supportFullTextSearch: true,
      supportJson: true
    },
    serviceFile: 'cockroachdb',
    serviceClass: 'CockroachDBService'
  },
  cockroach: { type: 'cockroachdb' },
  mongodb: {
    type: 'mongodb',
    label: 'MongoDB',
    defaultPort: 27017,
    experimental: true,
    features: {
      supportSchemas: false,
      supportProcedures: false,
      supportViews: false,
      supportTriggers: false,
      supportFullTextSearch: true,
      supportJson: true
    },
    serviceFile: 'mongodb',
    serviceClass: 'MongoDBService'
  },
  mongo: { type: 'mongodb' },
  sap: {
    type: 'sap',
    label: 'SAP HANA',
    defaultPort: 39013,
    features: {
      supportSchemas: true,
      supportProcedures: true,
      supportViews: true,
      supportTriggers: true,
      supportFullTextSearch: true,
      supportJson: true
    },
    serviceFile: 'sap',
    serviceClass: 'SAPHANADatabaseService'
  },
  'sap-hana': { type: 'sap' },
  saphana: { type: 'sap' }
};

export function normalizeDialectType(type: string): string | null {
  if (!type) return null;
  const entry = DIALECTS[type.toLowerCase()];
  if (!entry) return null;
  return entry.type || type.toLowerCase();
}

export function isDialectSupported(type: string): boolean {
  return normalizeDialectType(type) !== null;
}

export function getDialectInfo(type: string): DialectInfo {
  const normalized = normalizeDialectType(type) || type.toLowerCase();
  const full = (DIALECTS as any)[normalized];
  return {
    type: normalized,
    kind: full && full.serviceFile ? (normalized as DialectKind) : resolveKind(normalized),
    label: (full && full.label) || normalized.toUpperCase(),
    defaultPort: (full && full.defaultPort) ?? null,
    paramStyle: (full && full.paramStyle) || kindParamStyle(normalized),
    experimental: (full && full.experimental) || false,
    features: (full && full.features) || {
      supportSchemas: false,
      supportProcedures: true,
      supportViews: true,
      supportTriggers: false,
      supportFullTextSearch: false,
      supportJson: false
    },
    serviceFile: (full && full.serviceFile) || resolveServiceFile(normalized),
    serviceClass: (full && full.serviceClass) || resolveServiceClass(normalized)
  };
}

function kindParamStyle(type: string): '?' | '$' | 'inline' {
  switch (type) {
    case 'postgres':
    case 'cockroachdb':
      return '$';
    case 'oracle':
    case 'mssql':
    case 'mongodb':
    case 'sap':
      return 'inline';
    default:
      return '?';
  }
}

function resolveKind(type: string): DialectKind {
  switch (type) {
    case 'postgres': return 'postgres';
    case 'sqlite': return 'sqlite';
    case 'oracle': return 'oracle';
    case 'mssql': return 'mssql';
    case 'cockroachdb': return 'cockroachdb';
    case 'mongodb': return 'mongodb';
    case 'sap': return 'sap';
    default: return 'mysql';
  }
}

function resolveServiceFile(type: string): string {
  switch (type) {
    case 'postgres': return 'postgres';
    case 'sqlite': return 'sqlite';
    case 'oracle': return 'oracle';
    case 'mssql': return 'mssql';
    case 'cockroachdb': return 'cockroachdb';
    case 'mongodb': return 'mongodb';
    case 'sap': return 'sap';
    default: return 'mysql';
  }
}

function resolveServiceClass(type: string): string {
  switch (type) {
    case 'postgres': return 'PostgreSQLService';
    case 'sqlite': return 'SQLiteService';
    case 'oracle': return 'OracleService';
    case 'mssql': return 'SQLServerService';
    case 'cockroachdb': return 'CockroachDBService';
    case 'mongodb': return 'MongoDBService';
    case 'sap': return 'SAPHANADatabaseService';
    default: return 'MySQLService';
  }
}

/** 标识符加引号 */
export function quoteIdentifier(type: string, identifier: string): string {
  const kind = getDialectInfo(type).kind;
  if (kind === 'mysql') {
    return '`' + String(identifier).replace(/`/g, '``') + '`';
  }
  return '"' + String(identifier).replace(/"/g, '""') + '"';
}

/** 参数占位符风格 */
export function paramStyleOf(type: string): '?' | '$' | 'inline' {
  return getDialectInfo(type).paramStyle;
}

/** 全部支持的数据库类型（供 fdb2 types 输出） */
export function listDialects(): Array<{ type: string; label: string; defaultPort: number | null; experimental: boolean }> {
  const seen: Record<string, boolean> = {};
  const result: Array<{ type: string; label: string; defaultPort: number | null; experimental: boolean }> = [];
  for (const key of Object.keys(DIALECTS)) {
    const info = getDialectInfo(key);
    if (info.type !== key) continue; // 别名跳过
    if (seen[info.type]) continue;
    seen[info.type] = true;
    result.push({ type: info.type, label: info.label, defaultPort: info.defaultPort, experimental: info.experimental || false });
  }
  return result;
}
