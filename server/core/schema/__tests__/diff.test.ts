import { describe, expect, it } from 'vitest';
import { canonicalizeTableEntity, canonicalizeTableSpec } from '../canonical';
import { diffTable } from '../diff';
import { isEmptyChangeSet } from '../../../model/ddl-spec';
import type { TableSpec } from '../../../model/ddl-spec';

const baseEntity = () => ({
  name: 'users',
  comment: '用户表',
  columns: [
    { name: 'id', type: 'int', nullable: false, isPrimary: true, isAutoIncrement: true },
    { name: 'name', type: 'varchar(64)', nullable: false },
    { name: 'age', type: 'int', nullable: true, defaultValue: 0 }
  ]
});

/** 由实体镜像出的目标 spec（等价回显，测试的"未修改"基线） */
function mirrorSpec(
  entity: ReturnType<typeof baseEntity>,
  overrides?: { pk?: string[]; specColumns?: TableSpec['columns'] }
): TableSpec {
  const pk = overrides?.pk ?? entity.columns.filter((c) => c.isPrimary).map((c) => c.name);
  return {
    name: entity.name,
    comment: entity.comment,
    columns:
      overrides?.specColumns ??
      entity.columns.map((c) => ({
        name: c.name,
        type: c.type.replace(/\(\d+(,\d+)?\)/, ''),
        length: c.type.includes('varchar') ? '64' : undefined,
        nullable: c.nullable,
        hasDefault: c.defaultValue !== undefined,
        defaultValue: c.defaultValue !== undefined ? String(c.defaultValue) : undefined,
        autoIncrement: c.isAutoIncrement
      })),
    primaryKey: pk
  };
}

function diffBoth(entity: ReturnType<typeof baseEntity>, spec: TableSpec) {
  return diffTable(canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
}

describe('主键（用户报修的 bug）', () => {
  it('勾选某列为主键又取消：零 diff，不产生任何语句', () => {
    const entity = baseEntity();
    // 勾 name 为主键（同时顶掉 id）再取消 —— 终态与初态一致
    const spec = mirrorSpec(entity, { pk: ['id'] });
    const cs = diffBoth(entity, spec);
    expect(isEmptyChangeSet(cs)).toBe(true);
  });

  it('主键 A→B：只动 primaryKey 桶，绝不产生列级 modified（旧实现的双重记账）', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity, { pk: ['name'] });
    const cs = diffBoth(entity, spec);
    expect(cs.primaryKey).toEqual({ from: ['id'], to: ['name'] });
    // 唯一允许的列级联动：id 失去主键身份 → 自增失效（emit 层需要这个信息）
    const pkChangedCols = ['id', 'name'];
    cs.modified.forEach((m) => {
      expect(pkChangedCols).toContain(m.name);
      expect(m.fields).toEqual(['autoIncrement']);
    });
    expect(cs.renamed).toEqual([]);
    expect(cs.added).toEqual([]);
    expect(cs.dropped).toEqual([]);
  });

  it('主键 A→无：from=[id], to=[]（旧前端会生成非法的 ADD PRIMARY KEY ()）', () => {
    const entity = baseEntity();
    const cs = diffBoth(entity, mirrorSpec(entity, { pk: [] }));
    expect(cs.primaryKey).toEqual({ from: ['id'], to: [] });
  });

  it('无→有：to=[name]（旧前端会多生成一条多余的 DROP PRIMARY KEY）', () => {
    const entity = {
      name: 'users',
      comment: '',
      columns: [
        { name: 'name', type: 'varchar(64)', nullable: false }
      ]
    };
    const spec = mirrorSpec(entity as any, { pk: ['name'] });
    const cs = diffBoth(entity as any, spec);
    expect(cs.primaryKey).toEqual({ from: [], to: ['name'] });
  });

  it('复合主键顺序敏感：(a,b) 与 (b,a) 是变更', () => {
    const entity = {
      name: 't',
      comment: '',
      columns: [
        { name: 'a', type: 'int', nullable: false, isPrimary: true },
        { name: 'b', type: 'int', nullable: false, isPrimary: true }
      ]
    };
    const cs = diffBoth(entity as any, mirrorSpec(entity as any, { pk: ['b', 'a'] }));
    expect(cs.primaryKey).toEqual({ from: ['a', 'b'], to: ['b', 'a'] });
  });
});

describe('重命名检测（防 DROP+ADD 数据丢失）', () => {
  const entityWith = (name: string) => ({
    name: 't',
    comment: '',
    columns: [{ name, type: 'int', nullable: false }]
  });

  it('usr_nme → user_name：进 renamed 桶，不进 added/dropped', () => {
    const entity = entityWith('usr_nme');
    const spec: TableSpec = {
      name: 't',
      comment: '',
      primaryKey: [],
      columns: [{ name: 'user_name', type: 'INT', nullable: false, hasDefault: false }]
    };
    const cs = diffBoth(entity as any, spec);
    expect(cs.renamed).toEqual([
      { from: 'usr_nme', to: 'user_name', definitionChanged: false, modifiedFields: [] }
    ]);
    expect(cs.added).toEqual([]);
    expect(cs.dropped).toEqual([]);
    expect(cs.modified).toEqual([]);
  });

  it('改名 + 改定义：renamed.definitionChanged，不重复进 modified', () => {
    const entity = entityWith('usr_nme');
    const spec: TableSpec = {
      name: 't',
      comment: '',
      primaryKey: [],
      columns: [{ name: 'user_name', type: 'BIGINT', nullable: false, hasDefault: false }]
    };
    const cs = diffBoth(entity as any, spec);
    expect(cs.renamed[0]!.definitionChanged).toBe(true);
    expect(cs.renamed[0]!.modifiedFields).toEqual(['type']);
    expect(cs.modified).toEqual([]); // 单归属：不在 renamed 之外重复记账
  });

  it('完全无关的名称不构成改名', () => {
    const entity = {
      name: 't',
      comment: '',
      columns: [{ name: 'aaa', type: 'int', nullable: false }]
    };
    const spec: TableSpec = {
      name: 't',
      comment: '',
      primaryKey: [],
      columns: [{ name: 'zzz', type: 'INT', nullable: false, hasDefault: false }]
    };
    const cs = diffBoth(entity as any, spec);
    expect(cs.renamed).toEqual([]);
    expect(cs.added.map((c) => c.name)).toEqual(['zzz']);
    expect(cs.dropped).toEqual(['aaa']);
  });
});

describe('列级与表级', () => {
  it('类型参数变化：fields 恰为 [type]', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity);
    spec.columns[1] = { ...spec.columns[1]!, length: 128 } as TableSpec['columns'][number];
    const cs = diffBoth(entity, spec);
    expect(cs.modified).toHaveLength(1);
    expect(cs.modified[0]!.name).toBe('name');
    expect(cs.modified[0]!.fields).toEqual(['type']);
  });

  it('DEFAULT 0 → 无默认：是真实变更，必须检出（旧代码会因空值兜底漏检）', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity);
    spec.columns[2] = {
      ...spec.columns[2]!, hasDefault: false
    } as TableSpec['columns'][number];
    const cs = diffBoth(entity, spec);
    expect(cs.modified[0]!.fields).toEqual(['default']);
  });

  it('改表名 / 改表注释', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity);
    spec.name = 'users_v2';
    spec.comment = '新注释';
    const cs = diffBoth(entity, spec);
    expect(cs.rename).toEqual({ from: 'users', to: 'users_v2' });
    expect(cs.comment).toEqual({ from: '用户表', to: '新注释' });
    expect(cs.modified).toEqual([]);
  });

  it('增列 / 删列', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity);
    spec.columns.push({
      name: 'email', type: 'VARCHAR', length: 128, nullable: true, hasDefault: false
    } as TableSpec['columns'][number]);
    let cs = diffBoth(entity, spec);
    expect(cs.added.map((c) => c.name)).toEqual(['email']);

    const spec2 = mirrorSpec(entity);
    spec2.columns = spec2.columns.filter((c) => c.name !== 'age');
    cs = diffBoth(entity, spec2);
    expect(cs.dropped).toEqual(['age']);
  });

  it('幸存列顺序变化：orderChanged=true 且不产生列级变更', () => {
    const entity = {
      name: 't',
      comment: '',
      columns: [
        { name: 'a', type: 'int', nullable: true },
        { name: 'b', type: 'int', nullable: true },
        { name: 'c', type: 'int', nullable: true }
      ]
    };
    const spec: TableSpec = {
      name: 't',
      comment: '',
      primaryKey: [],
      columns: [
        { name: 'a', type: 'INT', nullable: true, hasDefault: false },
        { name: 'c', type: 'INT', nullable: true, hasDefault: false },
        { name: 'b', type: 'INT', nullable: true, hasDefault: false }
      ]
    };
    const cs = diffBoth(entity as any, spec);
    expect(cs.orderChanged).toBe(true);
    expect(cs.columnOrder).toEqual(['a', 'c', 'b']);
    expect(cs.modified).toEqual([]);
    expect(cs.added).toEqual([]);
    expect(cs.dropped).toEqual([]);
  });
});

describe('幂等', () => {
  it('diffTable(x, x) 为空', () => {
    const entity = baseEntity();
    const c = canonicalizeTableEntity(entity);
    expect(isEmptyChangeSet(diffTable(c, c))).toBe(true);
  });
});
