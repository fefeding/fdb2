import { describe, expect, it } from 'vitest';
import { canonicalizeTableEntity, canonicalizeTableSpec } from '../canonical';
import { diffTable } from '../diff';
import { isEmptyChangeSet } from '../../../model/ddl-spec';
import type { CanonicalTable, TableSpec } from '../../../model/ddl-spec';

/**
 * 属性测试：任何「改了又改回」的操作序列，diff 必须为空（幂等由纯函数保证）。
 * 使用固定种子的确定性 PRNG（mulberry32），失败时输出种子与操作序列，可精确复现。
 */

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 0xc0ffee;
const NAME_POOL = ['id', 'name', 'created_at', 'amount', 'status', 'user_id', 'remark'];
const TYPE_ENTRIES = [
  { entity: 'varchar(255)', spec: { type: 'VARCHAR', length: 255 } },
  { entity: 'int', spec: { type: 'INT' } },
  { entity: 'decimal(10,0)', spec: { type: 'DECIMAL', precision: 10, scale: 0 } },
  { entity: 'text', spec: { type: 'TEXT' } },
  { entity: 'date', spec: { type: 'DATE' } },
  { entity: "enum('x','y')", spec: { type: 'ENUM', customType: "enum('x','y')" } }
] as const;
const DEFAULT_POOL: Array<undefined | 0 | '' | 'NULL' | 'abc' | 'CURRENT_TIMESTAMP' | '0.50'> = [
  undefined, 0, '', 'NULL', 'abc', 'CURRENT_TIMESTAMP', '0.50'
];

interface EntityCol {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary?: boolean;
  isAutoIncrement?: boolean;
  defaultValue?: unknown;
  comment?: string;
}

function genEntity(rand: () => number) {
  const n = 2 + Math.floor(rand() * 4);
  const names = NAME_POOL.slice(0, n);
  const pkCount = rand() < 0.2 ? 0 : 1 + Math.floor(rand() * 2);
  const pkNames = new Set(names.slice(0, Math.min(pkCount, n)));
  const columns: EntityCol[] = names.map((name, i) => {
    const entry = TYPE_ENTRIES[Math.floor(rand() * TYPE_ENTRIES.length)]!;
    const def = DEFAULT_POOL[Math.floor(rand() * DEFAULT_POOL.length)];
    return {
      name,
      type: entry.entity,
      nullable: !pkNames.has(name),
      isPrimary: pkNames.has(name),
      isAutoIncrement: pkNames.has(name) && i === 0 && rand() < 0.5,
      defaultValue: def,
      comment: rand() < 0.5 ? `备注${i}` : `  备注${i}  `
    };
  });
  return { name: 'rnd_table', comment: ' 随机表 ', columns };
}

/** canonical → TableSpec：Phase E 前端要做的「等价回显」 */
function toSpec(t: CanonicalTable): TableSpec {
  return {
    name: t.name,
    comment: t.comment,
    columns: t.columns.map((c) => {
      const full = c.baseType.includes('(');
      return {
        name: c.name,
        ...(full
          ? { type: c.baseType, customType: c.baseType }
          : { type: c.baseType, length: c.length, precision: c.precision, scale: c.scale }),
        nullable: c.nullable,
        hasDefault: c.defaultKind !== 'none',
        defaultValue:
          c.defaultKind === 'none' ? undefined : c.defaultKind === 'null' ? 'NULL' : c.defaultText,
        autoIncrement: c.rawAutoIncrement,
        comment: c.comment
      };
    }),
    primaryKey: t.primaryKey.slice()
  };
}

interface Mutation {
  label: string;
  revert: (spec: TableSpec) => void;
}

function replaceCol(spec: TableSpec, name: string, next: TableSpec['columns'][number]): void {
  const i = spec.columns.findIndex((c) => c.name === name);
  if (i >= 0) spec.columns[i] = next;
}

function mutate(spec: TableSpec, rand: () => number, counter: { n: number }): Mutation {
  const kind = Math.floor(rand() * 9);
  const cols = () => spec.columns;
  const pick = () => cols()[Math.floor(rand() * cols().length)]!;

  switch (kind) {
    case 0: {
      // 勾选/取消主键
      const col = pick();
      const wasIn = spec.primaryKey.includes(col.name);
      const prevPk = spec.primaryKey.slice();
      spec.primaryKey = wasIn
        ? spec.primaryKey.filter((n) => n !== col.name)
        : [...spec.primaryKey, col.name];
      return { label: `togglePk(${col.name})`, revert: (s) => (s.primaryKey = prevPk.slice()) };
    }
    case 1: {
      const col = pick();
      const prev = col.nullable;
      replaceCol(spec, col.name, { ...col, nullable: !prev });
      return {
        label: `flipNullable(${col.name})`,
        revert: (s) => replaceCol(s, col.name, { ...col })
      };
    }
    case 2: {
      const col = pick();
      const entry = TYPE_ENTRIES[Math.floor(rand() * TYPE_ENTRIES.length)]!;
      const next = { ...col, ...entry.spec } as TableSpec['columns'][number];
      replaceCol(spec, col.name, next);
      return {
        label: `changeType(${col.name} -> ${JSON.stringify(entry.spec)})`,
        revert: (s) => replaceCol(s, col.name, { ...col })
      };
    }
    case 3: {
      const col = pick();
      const prev = { hasDefault: col.hasDefault, defaultValue: col.defaultValue };
      const raw = DEFAULT_POOL[Math.floor(rand() * DEFAULT_POOL.length)]!;
      const next =
        raw === undefined
          ? { ...col, hasDefault: false, defaultValue: undefined }
          : { ...col, hasDefault: true, defaultValue: raw };
      replaceCol(spec, col.name, next as TableSpec['columns'][number]);
      return {
        label: `setDefault(${col.name}, ${String(raw)})`,
        revert: (s) => replaceCol(s, col.name, { ...col, ...prev } as TableSpec['columns'][number])
      };
    }
    case 4: {
      const col = pick();
      const prev = col.comment;
      const next = rand() < 0.5 ? '  新注释  ' : '';
      replaceCol(spec, col.name, { ...col, comment: next } as TableSpec['columns'][number]);
      return {
        label: `setComment(${col.name})`,
        revert: (s) => replaceCol(s, col.name, { ...col, comment: prev } as TableSpec['columns'][number])
      };
    }
    case 5: {
      const name = `zz_new_${counter.n++}`;
      spec.columns.push({
        name,
        type: 'VARCHAR',
        length: 64,
        nullable: true,
        hasDefault: false,
        comment: ''
      });
      return {
        label: `addCol(${name})`,
        revert: (s) => {
          s.columns = s.columns.filter((c) => c.name !== name);
        }
      };
    }
    case 6: {
      const candidates = spec.columns.filter(
        (c) => !spec.primaryKey.includes(c.name) && !c.name.startsWith('zz_new_')
      );
      if (candidates.length === 0) return mutate(spec, rand, counter);
      const col = candidates[Math.floor(rand() * candidates.length)]!;
      const idx = spec.columns.findIndex((c) => c.name === col.name);
      spec.columns.splice(idx, 1);
      return {
        label: `removeCol(${col.name})`,
        revert: (s) => {
          s.columns.splice(Math.min(idx, s.columns.length), 0, col);
        }
      };
    }
    case 7: {
      const col = pick();
      const wasInPk = spec.primaryKey.includes(col.name);
      const prevPk = spec.primaryKey.slice();
      const newName = `${col.name}_v2`;
      replaceCol(spec, col.name, { ...col, name: newName });
      spec.primaryKey = spec.primaryKey.map((n) => (n === col.name ? newName : n));
      return {
        label: `renameCol(${col.name} -> ${newName})`,
        revert: (s) => {
          replaceCol(s, newName, { ...col });
          s.primaryKey = prevPk.slice();
        }
      };
    }
    default: {
      const col = pick();
      const next = { ...col, autoIncrement: !col.autoIncrement };
      replaceCol(spec, col.name, next);
      return {
        label: `toggleAutoIncrement(${col.name})`,
        revert: (s) => replaceCol(s, col.name, { ...col })
      };
    }
  }
}

describe('属性：往返幂等', () => {
  it('任意随机 UI 操作序列全部撤销后，diff 必须为空（200 组）', () => {
    for (let i = 0; i < 200; i++) {
      const rand = mulberry32(SEED + i);
      const entity = genEntity(rand);
      const canon = canonicalizeTableEntity(entity);
      const spec = toSpec(canon);
      const counter = { n: 0 };
      const mutations: Mutation[] = [];
      const k = 1 + Math.floor(rand() * 8);
      for (let j = 0; j < k; j++) mutations.push(mutate(spec, rand, counter));

      const cs = diffTable(canon, canonicalizeTableSpec(spec));
      if (!isEmptyChangeSet(cs)) {
        // 有变更属正常；继续撤销后再验证
      }
      for (let j = mutations.length - 1; j >= 0; j--) mutations[j]!.revert(spec);

      const csFinal = diffTable(canon, canonicalizeTableSpec(spec));
      if (!isEmptyChangeSet(csFinal)) {
        throw new Error(
          `往返后 diff 非空 [seed=${SEED + i}] ops=${mutations.map((m) => m.label).join(' -> ')} :: ${JSON.stringify(csFinal)}`
        );
      }
    }
  });

  it('「实体 → canonical → 回显」零 diff（Phase E 前端回显的契约，200 组）', () => {
    for (let i = 0; i < 200; i++) {
      const rand = mutaberryOf(SEED * 31 + i);
      const entity = genEntity(rand);
      const canon = canonicalizeTableEntity(entity);
      const cs = diffTable(canon, canonicalizeTableSpec(toSpec(canon)));
      if (!isEmptyChangeSet(cs)) {
        throw new Error(
          `回显产生假 diff [seed=${SEED * 31 + i}] :: ${JSON.stringify(entity)} :: ${JSON.stringify(cs)}`
        );
      }
    }
  });
});

function mutaberryOf(seed: number): () => number {
  return mulberry32(seed);
}

describe('属性：单维度记账（每处变更恰好出现一次）', () => {
  const cases = [1, 2, 3, 42, 777, 2026];

  it('每个单点变更只落在它唯一的桶里', () => {
    for (const i of cases) {
      const rand = mulberry32(SEED * 7 + i);
      const entity = genEntity(rand);
      const canon = canonicalizeTableEntity(entity);
      const spec = toSpec(canon);

      let s: TableSpec;
      const check = (cs: ReturnType<typeof diffTable>, expect_: (cs: ReturnType<typeof diffTable>) => void, label: string) => {
        try {
          expect_(cs);
        } catch (e) {
          throw new Error(`[seed=${SEED * 7 + i}] ${label} :: ${JSON.stringify(cs)}\n${(e as Error).message}`);
        }
      };

      // -- togglePk：primaryKey 桶；若有列级联动，仅允许 autoIncrement 字段且列为主键成员变化者
      s = { ...spec, columns: spec.columns.slice(), primaryKey: spec.primaryKey.slice() };
      const target = s.columns[0]!;
      const wasIn = s.primaryKey.includes(target.name);
      s.primaryKey = wasIn
        ? s.primaryKey.filter((n) => n !== target.name)
        : [...s.primaryKey, target.name];
      check(
        diffTable(canon, canonicalizeTableSpec(s)),
        (cs) => {
          expect(cs.added).toEqual([]);
          expect(cs.dropped).toEqual([]);
          expect(cs.renamed).toEqual([]);
          expect(cs.comment).toBeNull();
          expect(cs.rename).toBeNull();
          expect(cs.modified.every((mm) => mm.fields.every((f) => f === 'autoIncrement'))).toBe(true);
        },
        `togglePk(${target.name})`
      );

      // -- flipNullable：仅 modified.fields 含 'nullable'
      s = { ...spec, columns: spec.columns.slice(), primaryKey: spec.primaryKey.slice() };
      replaceCol(s, s.columns[0]!.name, { ...s.columns[0]!, nullable: !s.columns[0]!.nullable });
      check(
        diffTable(canon, canonicalizeTableSpec(s)),
        (cs) => {
          expect(cs.added).toEqual([]);
          expect(cs.dropped).toEqual([]);
          expect(cs.renamed).toEqual([]);
          expect(cs.primaryKey).toBeNull();
          cs.modified.forEach((mm) =>
            expect(mm.fields.every((f) => f === 'nullable')).toBe(true)
          );
        },
        'flipNullable'
      );

      // -- changeType：仅 modified.fields 含 'type'（可联动 autoIncrement）；选一个必然不同的类型
      s = { ...spec, columns: spec.columns.slice(), primaryKey: spec.primaryKey.slice() };
      {
        const c0 = s.columns[0]!;
        const nextType = c0.type === 'TEXT' && !c0.customType ? 'BIGINT' : 'TEXT';
        replaceCol(s, c0.name, {
          ...c0,
          type: nextType,
          length: undefined,
          precision: undefined,
          scale: undefined,
          customType: undefined
        } as TableSpec['columns'][number]);
      }
      check(
        diffTable(canon, canonicalizeTableSpec(s)),
        (cs) => {
          expect(cs.added).toEqual([]);
          expect(cs.dropped).toEqual([]);
          expect(cs.renamed).toEqual([]);
          expect(cs.primaryKey).toBeNull();
          expect(cs.modified.length).toBe(1);
          expect(cs.modified[0]!.fields[0]).toBe('type');
          expect(cs.modified[0]!.fields.every((f) => f === 'type' || f === 'autoIncrement')).toBe(true);
        },
        'changeType'
      );

      // -- rename：仅 renamed 桶
      s = { ...spec, columns: spec.columns.slice(), primaryKey: spec.primaryKey.slice() };
      const r0 = s.columns[0]!;
      const r0InPk = s.primaryKey.includes(r0.name);
      const r0New = `${r0.name}_v2`;
      replaceCol(s, r0.name, { ...r0, name: r0New });
      if (r0InPk) s.primaryKey = s.primaryKey.map((n) => (n === r0.name ? r0New : n));
      check(
        diffTable(canon, canonicalizeTableSpec(s)),
        (cs) => {
          expect(cs.added).toEqual([]);
          expect(cs.dropped).toEqual([]);
          expect(cs.modified).toEqual([]);
          expect(cs.primaryKey).toBeNull();
          expect(cs.renamed).toEqual([
            { from: r0.name, to: r0New, definitionChanged: false, modifiedFields: [] }
          ]);
        },
        `renameCol(${r0.name})`
      );

      // -- addCol / removeCol：仅 added / dropped
      s = { ...spec, columns: spec.columns.slice(), primaryKey: spec.primaryKey.slice() };
      s.columns.push({
        name: 'zz_chk_add', type: 'VARCHAR', length: 8, nullable: true, hasDefault: false, comment: ''
      });
      check(
        diffTable(canon, canonicalizeTableSpec(s)),
        (cs) => {
          expect(cs.added.map((c) => c.name)).toEqual(['zz_chk_add']);
          expect(cs.dropped).toEqual([]);
          expect(cs.modified).toEqual([]);
        },
        'addCol'
      );

      s = { ...spec, columns: spec.columns.slice(), primaryKey: spec.primaryKey.slice() };
      const removable = s.columns.find(
        (c) => !s.primaryKey.includes(c.name) && !c.name.startsWith('zz_')
      );
      if (removable) {
        s.columns = s.columns.filter((c) => c.name !== removable.name);
        check(
          diffTable(canon, canonicalizeTableSpec(s)),
          (cs) => {
            expect(cs.dropped).toEqual([removable.name]);
            expect(cs.added).toEqual([]);
            expect(cs.renamed).toEqual([]);
          },
          `removeCol(${removable.name})`
        );
      }
    }
  });
});
