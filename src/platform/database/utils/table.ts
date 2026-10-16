/**
 * 表元数据的通用判定（TableEntity 的跨方言差异集中在这里）。
 *
 * 各数据库方言 getTables 写入的 `type` 值并不统一：
 *  - MySQL 的 information_schema.TABLES 给 'BASE TABLE' / 'VIEW'
 *  - 其它方言可能写小写 'view'，也可能完全不填 type
 * 因此统一按「包含 VIEW」判定；缺省（无 type）按普通表处理。
 */

/** 是否视图。 */
export function isViewTable(table?: { type?: string } | null): boolean {
  return String(table?.type || '').toUpperCase().includes('VIEW');
}

/** 从混合列表（表 + 视图）中筛出普通表。 */
export function pickTables<T extends { type?: string }>(list?: T[] | null): T[] {
  return (list || []).filter((t) => !isViewTable(t));
}

/** 从混合列表（表 + 视图）中筛出视图。 */
export function pickViews<T extends { type?: string }>(list?: T[] | null): T[] {
  return (list || []).filter((t) => isViewTable(t));
}
