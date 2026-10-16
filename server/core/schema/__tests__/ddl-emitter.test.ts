import { describe, expect, it } from 'vitest';
import { canonicalizeTableEntity, canonicalizeTableSpec } from '../canonical';
import { ddlCapabilities, emitAlterDdl, emitCreateDdl, tableNameEquals } from '../ddl-emitter';
import type { TableSpec } from '../../../model/ddl-spec';

const baseEntity = () => ({
  name: 'users',
  comment: '',
  columns: [
    { name: 'id', type: 'int', nullable: false, isPrimary: true, isAutoIncrement: true },
    { name: 'name', type: 'varchar(64)', nullable: false },
    { name: 'age', type: 'int', nullable: true, defaultValue: '0' }
  ]
});

function mirrorSpec(entity: ReturnType<typeof baseEntity>, overrides?: Partial<TableSpec>): TableSpec {
  return {
    name: entity.name,
    comment: entity.comment,
    columns: entity.columns.map((c) => ({
      name: c.name,
      type: c.type.replace(/\(\d+(,\d+)?\)/, ''),
      length: c.type.includes('varchar') ? '64' : undefined,
      nullable: c.nullable,
      hasDefault: c.defaultValue !== undefined,
      defaultValue: c.defaultValue !== undefined ? String(c.defaultValue) : undefined,
      autoIncrement: c.isAutoIncrement
    })),
    primaryKey: entity.columns.filter((c) => c.isPrimary).map((c) => c.name),
    ...overrides
  };
}

describe('纯函数不变式', () => {
  it.each(['mysql', 'postgres', 'sqlite', 'oracle', 'mssql'] as const)(
    '%s：未修改的表不产生任何语句',
    (kind) => {
      const entity = baseEntity();
      const out = emitAlterDdl(kind, canonicalizeTableEntity(entity), canonicalizeTableSpec(mirrorSpec(entity)));
      expect(out).toEqual([]);
    }
  );

  it('mongodb：unsupported 方言返回空数组', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity, {
      columns: [
        { name: 'id', type: 'int', nullable: false, hasDefault: false },
        { name: 'x', type: 'text', nullable: true, hasDefault: false }
      ]
    });
    expect(emitAlterDdl('mongodb', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec))).toEqual([]);
  });
});

describe('MySQL', () => {
  it('改列类型：MODIFY COLUMN 重建整列定义', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity, {
      columns: [
        { name: 'id', type: 'int', nullable: false, hasDefault: false, autoIncrement: true },
        { name: 'name', type: 'varchar', length: '128', nullable: false, hasDefault: false },
        { name: 'age', type: 'int', nullable: true, hasDefault: true, defaultValue: '0' }
      ],
      primaryKey: ['id']
    });
    const out = emitAlterDdl('mysql', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out).toEqual([
      "ALTER TABLE `users` MODIFY COLUMN `name` VARCHAR(128) NOT NULL"
    ]);
  });

  it('改名且改定义：合并为一条 CHANGE COLUMN（保留数据与列位置）', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity, {
      columns: [
        { name: 'id', type: 'int', nullable: false, hasDefault: false, autoIncrement: true },
        { name: 'name2', type: 'varchar', length: '128', nullable: true, hasDefault: false },
        { name: 'age', type: 'int', nullable: true, hasDefault: true, defaultValue: '0' }
      ],
      primaryKey: ['id']
    });
    const out = emitAlterDdl('mysql', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out).toEqual([
      "ALTER TABLE `users` CHANGE COLUMN `name` `name2` VARCHAR(128)"
    ]);
  });

  it('默认值三态：DEFAULT 0 不丢、DEFAULT \'\' 可表达、无默认不出子句', () => {
    const entity = {
      name: 't',
      columns: [
        { name: 'a', type: 'int', nullable: true },
        { name: 'b', type: 'int', nullable: true, defaultValue: '5' },
        { name: 'c', type: 'varchar(10)', nullable: true }
      ]
    };
    const spec: TableSpec = {
      name: 't',
      columns: [
        { name: 'a', type: 'int', nullable: true, hasDefault: true, defaultValue: '0' },
        { name: 'b', type: 'int', nullable: true, hasDefault: false }, // 撤销默认值 → none
        { name: 'c', type: 'varchar', length: '10', nullable: true, hasDefault: true, defaultValue: '' }
      ],
      primaryKey: []
    };
    const out = emitAlterDdl('mysql', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out).toContain("ALTER TABLE `t` MODIFY COLUMN `a` INT DEFAULT 0");
    expect(out).toContain("ALTER TABLE `t` MODIFY COLUMN `b` INT"); // 无 DEFAULT 子句（撤销默认值）
    expect(out).toContain("ALTER TABLE `t` MODIFY COLUMN `c` VARCHAR(10) DEFAULT ''");
    expect(out.join('\n')).not.toContain('DEFAULT NULL');
  });

  it('主键 A→B：去自增先于 DROP PRIMARY KEY，ADD PRIMARY KEY 先于加自增的 MODIFY', () => {
    const entity = {
      name: 't',
      columns: [
        { name: 'id', type: 'bigint', nullable: false, isPrimary: true, isAutoIncrement: true },
        { name: 'uid', type: 'bigint', nullable: true }
      ]
    };
    // 主键 id → uid，且 uid 要自增（effectiveAutoIncrement false→true）、id 去自增（true→false）
    const spec: TableSpec = {
      name: 't',
      columns: [
        { name: 'id', type: 'bigint', nullable: false, hasDefault: false },
        { name: 'uid', type: 'bigint', nullable: false, hasDefault: false, autoIncrement: true }
      ],
      primaryKey: ['uid']
    };
    const out = emitAlterDdl('mysql', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out).toEqual([
      'ALTER TABLE `t` MODIFY COLUMN `id` BIGINT NOT NULL', // 1) 先去 id 自增（去自增语句已含 id 的全部变化）
      // 2) DROP 与 ADD 必须在同一条语句内：拆开会让表出现「无主键 + 仍有自增列」中间态（ER_WRONG_AUTO_KEY）
      'ALTER TABLE `t` DROP PRIMARY KEY, ADD PRIMARY KEY (`uid`)',
      'ALTER TABLE `t` MODIFY COLUMN `uid` BIGINT NOT NULL AUTO_INCREMENT' // 3) 主键就位后再加自增
    ]);
  });

  it('主键扩为复合（自增列仍在主键内）：同样合并为单条 DROP+ADD，且不产生去自增语句', () => {
    const entity = {
      name: 't',
      columns: [
        { name: 'id', type: 'bigint', nullable: false, isPrimary: true, isAutoIncrement: true },
        { name: 'uid', type: 'bigint', nullable: false }
      ]
    };
    const spec: TableSpec = {
      name: 't',
      columns: [
        { name: 'id', type: 'bigint', nullable: false, hasDefault: false, autoIncrement: true },
        { name: 'uid', type: 'bigint', nullable: false, hasDefault: false }
      ],
      primaryKey: ['id', 'uid'] // id 仍是主键且仍自增
    };
    const out = emitAlterDdl('mysql', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    // 关键：不能出现单独的 DROP PRIMARY KEY（执行时 id 还是自增列 → 1075）
    expect(out.some((s) => s === 'ALTER TABLE `t` DROP PRIMARY KEY')).toBe(false);
    expect(out).toContain('ALTER TABLE `t` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `uid`)');
  });

  it('新增自增列并设为主键：ADD COLUMN 不带 AUTO_INCREMENT，主键就位后再 MODIFY 加上', () => {
    const entity = {
      name: 't',
      columns: [{ name: 'name', type: 'varchar(64)', nullable: true }]
    };
    const spec: TableSpec = {
      name: 't',
      columns: [
        { name: 'id', type: 'bigint', nullable: false, hasDefault: false, autoIncrement: true },
        { name: 'name', type: 'varchar', length: '64', nullable: true, hasDefault: false }
      ],
      primaryKey: ['id']
    };
    const out = emitAlterDdl('mysql', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out).toEqual([
      // 1) 先建列（不带 AUTO_INCREMENT——此刻还没有键）
      'ALTER TABLE `t` ADD COLUMN `id` BIGINT NOT NULL',
      // 2) 建主键（原表无主键，故只有 ADD）
      'ALTER TABLE `t` ADD PRIMARY KEY (`id`)',
      // 3) 再补 AUTO_INCREMENT
      'ALTER TABLE `t` MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT'
    ]);
  });

  it('取消主键（新主键为空）：只 DROP，绝不生成 ADD PRIMARY KEY ()', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity, { primaryKey: [] });
    const out = emitAlterDdl('mysql', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out).toContain('ALTER TABLE `users` DROP PRIMARY KEY');
    expect(out.some((s) => s.includes('ADD PRIMARY KEY'))).toBe(false);
  });
});

describe('PostgreSQL', () => {
  it('按 fields 精确输出：只改 nullable 时只有一条 SET/DROP NOT NULL', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity, {
      columns: [
        { name: 'id', type: 'int', nullable: false, hasDefault: false, autoIncrement: true },
        { name: 'name', type: 'varchar', length: '64', nullable: true, hasDefault: false },
        { name: 'age', type: 'int', nullable: true, hasDefault: true, defaultValue: '0' }
      ],
      primaryKey: ['id']
    });
    const out = emitAlterDdl('postgres', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out).toEqual(['ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL']);
  });

  it('改默认值：SET DEFAULT / DROP DEFAULT 精确区分', () => {
    const entity = {
      name: 't',
      columns: [
        { name: 'a', type: 'int', nullable: true, defaultValue: '0' },
        { name: 'b', type: 'int', nullable: true, defaultValue: '1' }
      ]
    };
    const spec: TableSpec = {
      name: 't',
      columns: [
        { name: 'a', type: 'int', nullable: true, hasDefault: false },          // 撤销默认值
        { name: 'b', type: 'int', nullable: true, hasDefault: true, defaultValue: '2' } // 换默认值
      ],
      primaryKey: []
    };
    const out = emitAlterDdl('postgres', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out).toEqual([
      'ALTER TABLE "t" ALTER COLUMN "a" DROP DEFAULT',
      'ALTER TABLE "t" ALTER COLUMN "b" SET DEFAULT 2'
    ]);
  });

  it('改名后定义也变：RENAME COLUMN 仍最先执行', () => {
    const entity = {
      name: 't',
      columns: [{ name: 'nm', type: 'varchar(10)', nullable: false }]
    };
    const spec: TableSpec = {
      name: 't',
      columns: [{ name: 'nm2', type: 'varchar', length: '20', nullable: false, hasDefault: false }],
      primaryKey: []
    };
    const out = emitAlterDdl('postgres', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out[0]).toBe('ALTER TABLE "t" RENAME COLUMN "nm" TO "nm2"');
    expect(out).toContain('ALTER TABLE "t" ALTER COLUMN "nm2" SET DATA TYPE VARCHAR(20)');
  });
});

describe('SQLite 重建表', () => {
  it('输出确定性序列：固定临时表名、改名列从旧名取值、新列用默认值占位', () => {
    const entity = {
      name: 't',
      columns: [
        { name: 'id', type: 'integer', nullable: false, isPrimary: true, isAutoIncrement: true },
        { name: 'nm', type: 'text', nullable: false },
        { name: 'gone', type: 'text', nullable: true }
      ]
    };
    const spec: TableSpec = {
      name: 't',
      columns: [
        { name: 'id', type: 'integer', nullable: false, hasDefault: false, autoIncrement: true },
        { name: 'nm2', type: 'text', nullable: true, hasDefault: false },         // nm 改名并放开非空
        { name: 'created', type: 'text', nullable: true, hasDefault: true, defaultValue: "'x'" }
      ],
      primaryKey: ['id']
    };
    const out = emitAlterDdl('sqlite', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(out).toEqual([
      '-- SQLite 不支持直接 ALTER 列/主键，以下为重建表序列（请置于事务中执行）',
      'PRAGMA foreign_keys = OFF',
      'DROP TABLE IF EXISTS "_rebuild_t"',
      'CREATE TABLE "_rebuild_t" (\n  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,\n  "nm2" TEXT,\n  "created" TEXT DEFAULT \'x\'\n)',
      'INSERT INTO "_rebuild_t" ("id", "nm2", "created") SELECT "id", "nm", \'x\' FROM "t"',
      'DROP TABLE "t"',
      'ALTER TABLE "_rebuild_t" RENAME TO "t"',
      'PRAGMA foreign_keys = ON'
    ]);
  });

  it('纯函数：同一输入两次调用输出完全一致（可幂等重试）', () => {
    const entity = baseEntity();
    const spec = mirrorSpec(entity, {
      columns: [
        { name: 'id', type: 'int', nullable: false, hasDefault: false, autoIncrement: true },
        { name: 'title', type: 'varchar', length: '64', nullable: false, hasDefault: false },
        { name: 'age', type: 'int', nullable: true, hasDefault: true, defaultValue: '0' }
      ],
      primaryKey: ['id']
    });
    const a = emitAlterDdl('sqlite', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    const b = emitAlterDdl('sqlite', canonicalizeTableEntity(entity), canonicalizeTableSpec(spec));
    expect(a).toEqual(b);
  });
});

describe('能力声明', () => {
  it('sqlite 声明 rebuild、不支持 alterColumn/注释，但支持改主键（走整表重建）', () => {
    const caps = ddlCapabilities('sqlite');
    expect(caps.alterStrategy).toBe('rebuild');
    expect(caps.alterColumn).toBe(false);
    // 重建表可以正确落地新的主键并保留数据，故按真实能力声明为支持
    expect(caps.alterPrimaryKey).toBe(true);
    expect(caps.tableComment).toBe(false);
  });

  it('mssql 用 bracket 引用、mongodb 全不支持', () => {
    expect(ddlCapabilities('mssql').quoteStyle).toBe('bracket');
    expect(ddlCapabilities('mongodb').alterStrategy).toBe('unsupported');
    expect(ddlCapabilities('mysql').quoteStyle).toBe('backtick');
  });
});

describe('emitCreateDdl：建表单一出口', () => {
  const spec: TableSpec = {
    name: 'users',
    comment: '用户表',
    columns: [
      { name: 'id', type: 'int', nullable: false, hasDefault: false, autoIncrement: true },
      { name: 'name', type: 'varchar', length: '64', nullable: false, hasDefault: false, comment: '姓名' },
      { name: 'age', type: 'int', nullable: true, hasDefault: true, defaultValue: '0' }
    ],
    primaryKey: ['id']
  };
  const canon = () => canonicalizeTableSpec(spec);

  it('mysql：表级主键 + ENGINE=InnoDB utf8mb4 + 内联表/列注释 + DEFAULT 0 裸输出', () => {
    const out = emitCreateDdl('mysql', canon());
    expect(out).toEqual([
      "CREATE TABLE `users` (\n" +
        "  `id` INT NOT NULL AUTO_INCREMENT,\n" +
        "  `name` VARCHAR(64) NOT NULL COMMENT '姓名',\n" +
        "  `age` INT DEFAULT 0,\n" +
        "  PRIMARY KEY (`id`)\n" +
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表'"
    ]);
  });

  it('mysql：ifNotExists 选项输出 IF NOT EXISTS', () => {
    const out = emitCreateDdl('mysql', canon(), { ifNotExists: true });
    expect(out[0]).toContain('CREATE TABLE IF NOT EXISTS `users`');
  });

  it('postgres：表级 PRIMARY KEY + GENERATED ALWAYS AS IDENTITY + COMMENT ON 后置（修复旧版 int SERIAL 语法错误）', () => {
    const out = emitCreateDdl('postgres', canon());
    expect(out[0]).toBe(
      "CREATE TABLE \"users\" (\n" +
        '  "id" INT NOT NULL GENERATED ALWAYS AS IDENTITY,\n' +
        '  "name" VARCHAR(64) NOT NULL,\n' +
        '  "age" INT DEFAULT 0,\n' +
        '  PRIMARY KEY ("id")\n' +
        ')'
    );
    expect(out[1]).toBe("COMMENT ON TABLE \"users\" IS '用户表'");
    expect(out[2]).toBe("COMMENT ON COLUMN \"users\".\"name\" IS '姓名'");
  });

  it('sqlite：单列自增主键内联 PRIMARY KEY AUTOINCREMENT、表级注释被忽略、多列主键用表级约束', () => {
    const out = emitCreateDdl('sqlite', canon());
    expect(out).toEqual([
      "CREATE TABLE \"users\" (\n" +
        '  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,\n' + // 自增主键在 SQLite 必须落到字面 INTEGER
        '  "name" VARCHAR(64) NOT NULL,\n' +
        '  "age" INT DEFAULT 0\n' +
        ')'
    ]);
    // 多列主键：列不内联，表级约束
    const multi = emitCreateDdl('sqlite', canonicalizeTableSpec({
      ...spec,
      columns: spec.columns.map((c) => ({ ...c, autoIncrement: false })),
      primaryKey: ['id', 'name']
    }));
    expect(multi[0]).toContain('"id" INT NOT NULL');
    expect(multi[0]).toContain('PRIMARY KEY ("id", "name")');
    expect(multi[0]).not.toContain('PRIMARY KEY AUTOINCREMENT');
  });

  it('mssql：IDENTITY(1,1) + 三段名前缀 + sp_addextendedproperty 注释后置', () => {
    const out = emitCreateDdl('mssql', canon(), { mssqlDatabase: 'mydb' });
    expect(out[0]).toBe(
      "CREATE TABLE [mydb].[dbo].[users] (\n" +
        '  [id] INT NOT NULL IDENTITY(1,1),\n' +
        '  [name] VARCHAR(64) NOT NULL,\n' +
        '  [age] INT DEFAULT 0,\n' +
        '  PRIMARY KEY ([id])\n' +
        ')'
    );
    expect(out[1]).toContain("sp_addextendedproperty @name=N'MS_Description', @value=N'用户表'");
    expect(out[2]).toContain("@level2type=N'COLUMN', @level2name=N'name'");
  });

  it('oracle：标识符大写 + COMMENT ON 后置', () => {
    const out = emitCreateDdl('oracle', canon());
    expect(out[0]).toContain('CREATE TABLE "USERS" (');
    expect(out[0]).toContain('"ID" INT NOT NULL');
    expect(out[1]).toBe("COMMENT ON TABLE \"USERS\" IS '用户表'");
  });

  it('clickhouse：ENGINE 尾缀 + 主键落 ORDER BY + 无主键 ORDER BY tuple()', () => {
    const out = emitCreateDdl('clickhouse', canon());
    expect(out[0]).toContain(') ENGINE = MergeTree');
    expect(out[0]).toContain(' ORDER BY (`id`)');
    const noPk = emitCreateDdl('clickhouse', canonicalizeTableSpec({ ...spec, primaryKey: [] }));
    expect(noPk[0]).toContain(' ORDER BY tuple()');
  });

  it('clickhouse：可空列包装 Nullable(...) 且不写 NOT NULL（裸类型即不可空）', () => {
    const out = emitCreateDdl('clickhouse', canon());
    // age 可空 → Nullable；id/name 不可空 → 裸类型
    expect(out[0]).toContain('`age` Nullable(INT) DEFAULT 0');
    expect(out[0]).toContain('`id` INT');
    expect(out[0]).toContain('`name` VARCHAR(64)');
    expect(out[0]).not.toContain('NOT NULL');
    // 已是 Nullable 的类型不重复包装
    const already = emitCreateDdl('clickhouse', canonicalizeTableSpec({
      ...spec,
      columns: [{ name: 'a', type: 'Nullable(String)', nullable: true, hasDefault: false }],
      primaryKey: []
    }));
    expect(already[0]).toContain('`a` Nullable(String)');
    expect(already[0]).not.toContain('Nullable(Nullable(');
  });

  it('tableNameEquals：按方言大小写语义判断重名', () => {
    // PG/Oracle/SQLite/MSSQL 等标识符不敏感（PG 会把裸标识符落成小写）
    expect(tableNameEquals('postgres', 'Users', 'users')).toBe(true);
    expect(tableNameEquals('oracle', 'Users', 'USERS')).toBe(true);
    expect(tableNameEquals('mysql', 'users', 'users')).toBe(true);
    // ClickHouse / MongoDB 严格区分大小写
    expect(tableNameEquals('clickhouse', 'Users', 'users')).toBe(false);
    expect(tableNameEquals('mongodb', 'Users', 'users')).toBe(false);
  });

  it('sqlite：自增列类型强制 INTEGER（INT/BIGINT + AUTOINCREMENT 在 SQLite 是语法错误）', () => {
    // 用户填 int / bigint 时 canonical 保留原类型名，SQLite 侧必须落到字面 INTEGER
    for (const t of ['int', 'bigint']) {
      const out = emitCreateDdl('sqlite', canonicalizeTableSpec({ ...spec, columns: [{ name: 'id', type: t, nullable: false, hasDefault: false, autoIncrement: true }] }));
      expect(out[0]).toContain('"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT');
    }
    // 非自增列保持用户类型字面
    const plain = emitCreateDdl('sqlite', canonicalizeTableSpec({ ...spec, columns: [{ name: 'id', type: 'int', nullable: false, hasDefault: false }], primaryKey: [] }));
    expect(plain[0]).toContain('"id" INT NOT NULL');
  });

  it('sap：CREATE COLUMN TABLE + 表级 COMMENT 后缀（对齐旧方言 createTable，避免丢表注释）', () => {
    const out = emitCreateDdl('sap', canon());
    expect(out[0]).toContain('CREATE COLUMN TABLE "users" (');
    expect(out[0]).toContain('"id" INT NOT NULL GENERATED BY DEFAULT AS IDENTITY');
    expect(out[0]).toContain("COMMENT '姓名'"); // 列注释内联
    expect(out[0]).toContain(") COMMENT '用户表'"); // 表注释后缀
  });

  it('非 SQL 方言返回空数组（调用方按 caps.createTable 拒绝）', () => {
    expect(emitCreateDdl('mongodb', canon())).toEqual([]);
  });
});
