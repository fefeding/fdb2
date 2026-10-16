import { describe, expect, it } from 'vitest';
import {
  canonicalizeTableEntity,
  canonicalizeTableSpec,
  classifyDefault,
  canonicalizeType,
  diffColumnFields,
  normalizeNumericLiteral
} from '../canonical';
import type { TableSpec } from '../../../model/ddl-spec';

describe('classifyDefault：三态 + 表达式分类（消灭 || 兜底吃掉假值）', () => {
  it('0 / false / 空串是真实默认值，不得回落为 none', () => {
    expect(classifyDefault(0)).toEqual({ kind: 'literal', text: '0' });
    expect(classifyDefault('0')).toEqual({ kind: 'literal', text: '0' });
    expect(classifyDefault(false)).toEqual({ kind: 'literal', text: 'false' });
    expect(classifyDefault('')).toEqual({ kind: 'literal', text: '' }); // MySQL DEFAULT ''
  });

  it('无默认值 / DEFAULT NULL / 显式标记 三者可区分', () => {
    expect(classifyDefault(undefined)).toEqual({ kind: 'none', text: '' });
    expect(classifyDefault(null)).toEqual({ kind: 'none', text: '' });
    expect(classifyDefault('NULL')).toEqual({ kind: 'null', text: '' });
    expect(classifyDefault('null')).toEqual({ kind: 'null', text: '' });
    expect(classifyDefault('x', false)).toEqual({ kind: 'none', text: '' }); // hasDefault=false 优先
    expect(classifyDefault(undefined, true)).toEqual({ kind: 'literal', text: '' }); // DEFAULT ''（显式）
  });

  it('引号字面量与 PG 类型标注', () => {
    expect(classifyDefault("'abc'")).toEqual({ kind: 'literal', text: 'abc' });
    expect(classifyDefault("'0'::character varying")).toEqual({
      kind: 'expression',
      text: "'0'::CHARACTER VARYING"
    });
  });

  it('表达式默认值：关键字与函数调用', () => {
    expect(classifyDefault('CURRENT_TIMESTAMP')).toEqual({
      kind: 'expression',
      text: 'CURRENT_TIMESTAMP'
    });
    expect(classifyDefault('now()')).toEqual({ kind: 'expression', text: 'NOW()' });
    expect(classifyDefault("nextval('s')")).toEqual({ kind: 'expression', text: "NEXTVAL('S')" });
  });

  it('数值书写差异归一：007→7、0.50→0.5、-0→0', () => {
    expect(normalizeNumericLiteral('007')).toBe('7');
    expect(normalizeNumericLiteral('0.50')).toBe('0.5');
    expect(normalizeNumericLiteral('-0')).toBe('0');
    expect(classifyDefault('0.50')).toEqual({ kind: 'literal', text: '0.5' });
    expect(diffColumnBetween('0.5', '0.50')).toBe(false); // 同一默认值
  });
});

describe('canonicalizeType：全串与拆分字段两种表示等价', () => {
  it("实体 'varchar(255)' 与表单 {type:'VARCHAR', length:'255'} 等价", () => {
    const a = canonicalizeType({ type: 'varchar(255)', length: 255 });
    const b = canonicalizeType({ type: 'VARCHAR', length: '255' });
    expect(a).toEqual(b);
    expect(a.baseType).toBe('VARCHAR');
    expect(a.length).toBe(255);
  });

  it('DECIMAL(10,0)：scale=0 必须保留（假值不丢弃）', () => {
    const a = canonicalizeType({ type: 'decimal(10,0)' });
    const b = canonicalizeType({ type: 'DECIMAL', precision: '10', scale: '0' });
    expect(a).toEqual(b);
    expect(a.precision).toBe(10);
    expect(a.scale).toBe(0);
  });

  it("单参数精度类型：'decimal(10)' 解析为 precision", () => {
    expect(canonicalizeType({ type: 'decimal(10)' })).toEqual({
      baseType: 'DECIMAL',
      precision: 10,
      scale: undefined
    });
  });

  it("非数字参数（ENUM）整体原样保留", () => {
    const a = canonicalizeType({ type: "enum('a','b')" });
    const b = canonicalizeType({ type: 'ENUM', customType: "enum('a','b')" });
    expect(a).toEqual(b);
    expect(a.baseType).toBe("enum('a','b')");
  });

  it('大小写与空格归一', () => {
    expect(canonicalizeType({ type: ' varchar ' }).baseType).toBe('VARCHAR');
  });
});

describe('canonicalizeTable*：跨表示等价与自增 clamp', () => {
  const entity = {
    name: 'users',
    comment: '用户',
    columns: [
      { name: 'id', type: 'int', nullable: false, isPrimary: true, isAutoIncrement: true, length: 11 },
      { name: 'name', type: 'varchar(64)', nullable: true, defaultValue: '', comment: ' 名字 ' },
      { name: 'amount', type: 'decimal(10,0)', nullable: true, defaultValue: 0 }
    ]
  };

  /** Phase E 前端应做的回显：canonical → TableSpec */
  function echoSpec(): TableSpec {
    const t = canonicalizeTableEntity(entity);
    const mapDefault = (i: number): Pick<TableSpec['columns'][number], 'hasDefault' | 'defaultValue'> => {
      const c = t.columns[i]!;
      switch (c.defaultKind) {
        case 'none': return { hasDefault: false };
        case 'null': return { hasDefault: true, defaultValue: 'NULL' };
        case 'literal': return { hasDefault: true, defaultValue: c.defaultText };
        case 'expression': return { hasDefault: true, defaultValue: c.defaultText };
      }
    };
    const mk = (i: number, extra: Record<string, unknown> = {}) => {
      const c = t.columns[i]!;
      const full = c.baseType.includes('(');
      return {
        name: c.name,
        ...(full ? { type: c.baseType, customType: c.baseType } : { type: c.baseType, length: c.length, precision: c.precision, scale: c.scale }),
        nullable: c.nullable,
        ...mapDefault(i),
        comment: c.comment,
        ...extra
      };
    };
    return {
      name: t.name,
      comment: t.comment,
      columns: [
        mk(0, { autoIncrement: true }),
        mk(1),
        mk(2)
      ],
      primaryKey: t.primaryKey
    };
  }

  it('「实体 → canonical → 表单回显」全程零 diff（往返幂等的基石）', () => {
    const before = canonicalizeTableEntity(entity);
    const after = canonicalizeTableSpec(echoSpec());
    expect(diffColumnFields(before.columns[0]!, after.columns[0]!)).toEqual([]);
    expect(diffColumnFields(before.columns[1]!, after.columns[1]!)).toEqual([]);
    expect(diffColumnFields(before.columns[2]!, after.columns[2]!)).toEqual([]);
  });

  it('rawAutoIncrement 不被 clamp 吞掉（供"加主键时恢复自增"）', () => {
    const t = canonicalizeTableEntity({
      name: 't',
      columns: [{ name: 'id', type: 'int', nullable: false, isAutoIncrement: true, isPrimary: false }]
    });
    expect(t.columns[0]!.rawAutoIncrement).toBe(true);
    expect(t.columns[0]!.effectiveAutoIncrement).toBe(false); // 无主键 → 不生效
  });

  it('clamp 是两侧同一规则：非主键列勾自增不产生列级 diff', () => {
    const before = canonicalizeTableEntity({
      name: 't',
      columns: [{ name: 'id', type: 'int', nullable: false, isPrimary: false, isAutoIncrement: false }]
    });
    const after = canonicalizeTableSpec({
      name: 't',
      primaryKey: [],
      columns: [{ name: 'id', type: 'INT', nullable: false, hasDefault: false, autoIncrement: true }] // 勾了自增但非主键
    });
    expect(diffColumnFields(before.columns[0]!, after.columns[0]!)).toEqual([]);
  });

  it('注释 trim：两侧空格差异不算改动', () => {
    const before = canonicalizeTableEntity({
      name: 't',
      columns: [{ name: 'a', type: 'int', nullable: true, comment: 'x' }]
    });
    const after = canonicalizeTableSpec({
      name: 't',
      primaryKey: [],
      columns: [{ name: 'a', type: 'INT', nullable: true, hasDefault: false, comment: ' x ' }]
    });
    expect(diffColumnFields(before.columns[0]!, after.columns[0]!)).toEqual([]);
  });
});

function diffColumnBetween(aRaw: string, bRaw: string): boolean {
  const col = (defaultValue: unknown) => ({
    name: 'x', type: 'int', nullable: true, defaultValue, isPrimary: false
  });
  const before = canonicalizeTableEntity({ name: 't', columns: [col(aRaw)] }).columns[0]!;
  const specCol = (defaultValue: string) => ({
    name: 'x', type: 'INT', nullable: true, hasDefault: true, defaultValue
  });
  const after = canonicalizeTableSpec({
    name: 't', primaryKey: [], columns: [specCol(bRaw)]
  }).columns[0]!;
  return diffColumnFields(before, after).includes('default');
}
