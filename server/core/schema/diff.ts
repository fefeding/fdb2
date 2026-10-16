/**
 * 结构化差异：reconcile(canonical(原始态), canonical(目标态)) → TableChangeSet
 *
 * 单归属（与前端旧实现的关键差异）：
 *   - 改名且同时改定义的列，只出现在 renamed 桶（携带 modifiedFields），
 *     不再像旧前端那样同时进 renamedColumns + modifiedColumns 双重记账；
 *   - 主键不参与列级比较，独立成桶；纯重命名主键列不构成主键变更（先做改名映射）；
 *   - added / dropped / renamed / modified 按列名互斥。
 *
 * 幂等保证：diffTable(c, c) 为空 ChangeSet；任何往返操作后终态==初态 ⟹ 空 ChangeSet。
 * 重命名检测沿用前端既有启发式（前缀关系 / 少量编辑），行为不回退。
 */
import type { CanonicalColumn, CanonicalTable, TableChangeSet } from '../../model/ddl-spec';
import { diffColumnFields } from './canonical';
import { levenshtein } from '../query-builder';

/** 两个列名是否可能属于同一次重命名：前缀关系 3 分，少量编辑 1 分，否则 0 */
function renameNameScore(oldName: string, newName: string): number {
  const a = String(oldName || '').trim().toLowerCase();
  const b = String(newName || '').trim().toLowerCase();
  if (!a || !b || a === b) return 0;
  if (a.startsWith(b) || b.startsWith(a)) return 3;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen > 0 && levenshtein(a, b) <= Math.max(1, Math.floor(maxLen / 3))) return 1;
  return 0;
}

/** 把新增列与删除列中名称相近的配对（否则改名会被当成 DROP+ADD，导致数据丢失） */
function matchRenamedColumns(
  added: CanonicalColumn[],
  dropped: CanonicalColumn[]
): Array<{ oldColumn: CanonicalColumn; newColumn: CanonicalColumn }> {
  const pairs: Array<{ oldColumn: CanonicalColumn; newColumn: CanonicalColumn }> = [];
  const usedOld = new Set<number>();
  added.forEach((newCol, newIndex) => {
    let bestScore = 0;
    let bestOldIndex = -1;
    dropped.forEach((oldCol, oldIndex) => {
      if (usedOld.has(oldIndex)) return;
      const score = renameNameScore(oldCol.name, newCol.name);
      if (score === 0) return;
      const total = score + (oldIndex === newIndex ? 0.1 : 0); // 顺序位置一致的候选优先
      if (total > bestScore) {
        bestScore = total;
        bestOldIndex = oldIndex;
      }
    });
    if (bestOldIndex >= 0) {
      usedOld.add(bestOldIndex);
      const oldCol = dropped[bestOldIndex];
      if (oldCol) pairs.push({ oldColumn: oldCol, newColumn: newCol });
    }
  });
  return pairs;
}

/** 表结构 diff：输入两侧均为归一化后的 CanonicalTable */
export function diffTable(original: CanonicalTable, desired: CanonicalTable): TableChangeSet {
  const rename =
    original.name !== desired.name ? { from: original.name, to: desired.name } : null;
  const comment =
    original.comment !== desired.comment
      ? { from: original.comment, to: desired.comment }
      : null;

  const originalMap = new Map(original.columns.map((c) => [c.name, c]));
  const desiredNames = new Set(desired.columns.map((c) => c.name));

  const added = desired.columns.filter((c) => !originalMap.has(c.name));
  const dropped = original.columns.filter((c) => !desiredNames.has(c.name));

  // 重命名检测
  const renamedPairs = matchRenamedColumns(added, dropped);
  const renamedSet = new Set(renamedPairs.map((p) => p.newColumn.name));
  const droppedSet = new Set(dropped.map((c) => c.name));
  const renamedFromSet = new Set(renamedPairs.map((p) => p.oldColumn.name));
  const realAdded = added.filter((c) => !renamedSet.has(c.name));
  const realDroppedNames = dropped.map((c) => c.name).filter((n) => !renamedFromSet.has(n));

  const renamed = renamedPairs.map(({ oldColumn, newColumn }) => {
    const fields = diffColumnFields(oldColumn, newColumn);
    return {
      from: oldColumn.name,
      to: newColumn.name,
      definitionChanged: fields.length > 0,
      modifiedFields: fields
    };
  });

  // 列级修改：同名且定义变化（不含主键——主键在表级）
  const modified = desired.columns
    .filter((c) => originalMap.has(c.name) && !renamedSet.has(c.name))
    .map((c) => {
      const before = originalMap.get(c.name);
      if (!before) throw new Error(`diff 内部错误：列 ${c.name} 应存在于原始侧`);
      const fields = diffColumnFields(before, c);
      return { name: c.name, fields, before, after: c };
    })
    .filter((m) => m.fields.length > 0);

  // 幸存列（含改名后的新名）的相对顺序是否变化
  const renameMap = new Map(renamedPairs.map((p) => [p.oldColumn.name, p.newColumn.name]));
  const survivorSet = new Set<string>([
    ...original.columns.filter((c) => !droppedSet.has(c.name)).map((c) => renameMap.get(c.name) ?? c.name),
    ...renamedSet
  ]);
  const originalSurviving = original.columns
    .map((c) => renameMap.get(c.name) ?? c.name)
    .filter((n) => survivorSet.has(n));
  const desiredSurviving = desired.columns
    .map((c) => c.name)
    .filter((n) => survivorSet.has(n));
  const orderChanged = originalSurviving.join(',') !== desiredSurviving.join(',');

  // 主键比较：先把改名映射应用到原侧——纯重命名主键列不是主键变更
  const pkRenameMap = renameMap;
  const originalPkMapped = original.primaryKey.map((n) => pkRenameMap.get(n) ?? n);
  const primaryKey =
    originalPkMapped.join(',') !== desired.primaryKey.join(',')
      ? { from: original.primaryKey, to: desired.primaryKey }
      : null;

  return {
    rename,
    comment,
    added: realAdded,
    dropped: realDroppedNames,
    renamed,
    modified,
    orderChanged,
    columnOrder: desired.columns.map((c) => c.name),
    primaryKey
  };
}
