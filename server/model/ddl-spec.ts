/**
 * DDL 契约（单一事实来源）
 *
 * 本文件是「前端表单 <-> 后端 schema 引擎」之间唯一的类型契约，
 * 前端直接 import 本文件（前端 tsconfig 已包含 server 目录），禁止再复制一份。
 *
 * 核心不变式（由 server/core/schema 保证，测试钉死）：
 *   1. 纯函数性：ChangeSet = f(canonical(原始态), canonical(目标态))，与操作路径无关；
 *      任何"改了又改回"的 UI 操作序列，diff 结果恒为空（幂等）。
 *   2. 单归属：每个语义维度只出现在一个桶里——
 *      列定义在 modified，主键在 primaryKey（列上不存在 isPrimary），改名在 renamed。
 *   3. 归一化后比较：两侧先投影为 CanonicalTable 再 diff，
 *      表示差异（''/null/0、大小写、空格、'varchar(255)' vs {type,length}）不产生假 diff。
 *
 * 注意：ColumnSpec 有 hasDefault 布尔，解决 ColumnEntity.defaultValue?: any 的三态歧义
 *      （无法区分「无默认值」/「DEFAULT NULL」/「DEFAULT 0」/「DEFAULT ''」）。
 */

/** 默认值语义类别（归一化后的三态+表达式分类） */
export type DefaultKind = 'none' | 'null' | 'literal' | 'expression';

/**
 * 目标列定义（前端表单 -> 后端）
 * 前端负责把 UI 状态整理成该结构；不发送 UI 哨兵值（如 '__custom__'），
 * 自定义类型直接放 customType。
 */
export interface ColumnSpec {
  /** 列名（原样，不去大小写化——标识符匹配按精确名） */
  name: string;
  /** 基础类型名，如 VARCHAR / DECIMAL（大小写均可，后端归一为大写比较） */
  type: string;
  /** 完整自定义类型串，如 ENUM('a','b')、DECIMAL(20,0)；非空时忽略 type/length/precision/scale */
  customType?: string;
  /** 字符长度（string/number 均可，''/null 归一为未设置） */
  length?: number | string | null;
  /** 数值精度（precision=总位数；scale=小数位数。注意与 scale 区分） */
  precision?: number | string | null;
  /** 小数位数（DECIMAL(10,0) 的 0 必须保留，不得因假值被丢弃） */
  scale?: number | string | null;
  /** 是否允许 NULL */
  nullable: boolean;
  /** 是否有默认值。true 时以 defaultValue 文本为准（可为 ''，表示 DEFAULT ''） */
  hasDefault: boolean;
  /** 默认值文本；'NULL' 视为 DEFAULT NULL；函数/表达式按 expression 归类 */
  defaultValue?: string | null;
  /** 是否自增（原始意图；生效与否由后端按「必须依附主键」clamp） */
  autoIncrement?: boolean;
  /** 注释 */
  comment?: string;
}

/** 目标表定义（前端表单 -> 后端） */
export interface TableSpec {
  name: string;
  comment?: string;
  columns: ColumnSpec[];
  /**
   * 表级主键（复合主键按序）。主键不挂在列上——这是单归属的关键：
   * 勾选/取消主键只改这个数组，绝不产生列级 modified 记账。
   */
  primaryKey: string[];
}

/** 归一化后的列（比较用的中间形状，与来源表示无关） */
export interface CanonicalColumn {
  name: string;
  /** 大写、去空格的基础类型；自定义类型为原样 trim 的完整串 */
  baseType: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  defaultKind: DefaultKind;
  /** literal: 归一后的字面量文本；expression: 大写 trim 的表达式串；其余为空 */
  defaultText: string;
  /** 原始自增意图（不做 clamp，供"加主键时恢复自增"使用） */
  rawAutoIncrement: boolean;
  /** clamp 后的自增：rawAutoIncrement 且列在主键中 且 类型支持 */
  effectiveAutoIncrement: boolean;
  /** trim 后的注释，无注释为 '' */
  comment: string;
}

/** 归一化后的表（diff 的两个输入） */
export interface CanonicalTable {
  name: string;
  comment: string;
  columns: CanonicalColumn[];
  /** 主键列名（按序） */
  primaryKey: string[];
}

/** 列级被修改的维度（不含 name、不含主键） */
export type ColumnModifiedField = 'type' | 'nullable' | 'default' | 'comment' | 'autoIncrement';

export interface ColumnModification {
  /** 以目标列名为准 */
  name: string;
  /** 恰好发生变化的维度（空数组不可能出现） */
  fields: ColumnModifiedField[];
  before: CanonicalColumn;
  after: CanonicalColumn;
}

export interface ColumnRename {
  from: string;
  to: string;
  /** 改名的同时定义也变了（由方言层合并为 RENAME+MODIFY / CHANGE COLUMN） */
  definitionChanged: boolean;
  modifiedFields: ColumnModifiedField[];
}

/**
 * 表结构差异（互斥且完备）：
 * 任一列名至多出现在 added / dropped / renamed / modified 之一；
 * 主键变更独立于列桶；空 ChangeSet ⟺ 两表归一化后等价。
 */
export interface TableChangeSet {
  rename: { from: string; to: string } | null;
  comment: { from: string; to: string } | null;
  added: CanonicalColumn[];
  /** 被删除的原始列名（未被识别为改名的一侧） */
  dropped: string[];
  renamed: ColumnRename[];
  modified: ColumnModification[];
  /** 幸存列的相对顺序是否变化（SQLite 重建表等场景需要） */
  orderChanged: boolean;
  /** 目标完整列序（重建表时使用） */
  columnOrder: string[];
  primaryKey: { from: string[]; to: string[] } | null;
}

/** ChangeSet 是否为空（预览/保存按钮的「没有检测到任何修改」统一判据） */
export function isEmptyChangeSet(cs: TableChangeSet): boolean {
  return (
    cs.rename === null &&
    cs.comment === null &&
    cs.added.length === 0 &&
    cs.dropped.length === 0 &&
    cs.renamed.length === 0 &&
    cs.modified.length === 0 &&
    !cs.orderChanged &&
    cs.primaryKey === null
  );
}

/** 方言 DDL 能力（capabilities 接口的返回；前端据此渲染 UI，不再硬编码方言表） */
export interface DdlCapability {
  createTable: boolean;
  alterTable: boolean;
  dropTable: boolean;
  renameTable: boolean;
  alterColumn: boolean;
  renameColumn: boolean;
  alterPrimaryKey: boolean;
  tableComment: boolean;
  columnComment: boolean;
  /** native=原生 ALTER；rebuild=需重建表（SQLite）；unsupported=不支持（MongoDB） */
  alterStrategy: 'native' | 'rebuild' | 'unsupported';
  quoteStyle: 'backtick' | 'double' | 'bracket';
}

/** 预览结果：纯计算，不触碰数据库（建表场景无 diff，changeSet 为 null） */
export interface DdlPreview {
  statements: string[];
  preview: string;
  changeSet: TableChangeSet | null;
}

/** 执行结果 */
export interface DdlExecuteResult {
  statements: string[];
  /** 执行时后端重新读取的实时结构与前端 baseline 不一致时拒绝执行（409） */
  conflict?: { reason: string };
}
