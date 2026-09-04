# Admin/Ops 命令与确认矩阵

## 库级

| 命令 | 示例 | dry-run | --yes | 说明 |
|---|---|---|---|---|
| `db list` | `fdb2 db list --json` | - | - | 只读 |
| `db info <库>` | `fdb2 db info app --json` | - | - | 只读 |
| `db create <库>` | `fdb2 db create app --charset utf8mb4 --dry-run --json` | ✔ | - | 非破坏 |
| `db drop <库>` | `fdb2 db drop old_app --dry-run --json` | ✔ | ✔ | 破坏；受保护库被拒 |

## 表级

| 命令 | 参数 | dry-run | --yes |
|---|---|---|---|
| `table list` | `[--pattern 'user%']` | - | - |
| `table info/columns/indexes/fks/stats <表>` | `--db` | - | - |
| `table create <表>` | `--column '<spec>'`（可重复）、`--engine`、`--charset`、`--comment` | ✔ | - |
| `table alter <表>` | `--add-column '<spec>'` / `--drop-column <列>` / `--modify-column '<spec>'`（可重复）、`--rename-to <新名>` | ✔ | ✔ |
| `table rename <旧> <新>` | - | ✔ | ✔ |
| `table truncate <表>` | - | ✔ | ✔（清空） |
| `table drop <表>` | - | ✔ | ✔ |

方言注意：`table columns` 返回 `{table, columns[]}`；`table info` 返回完整结构；SQLite 不支持 `--modify-column`（`UNSUPPORTED`）。

## 索引

| 命令 | 参数 | dry-run | --yes |
|---|---|---|---|
| `index list <表>` | - | - | - |
| `index create <表>` | `--name <索引名>`、`--columns a,b`、`[--unique]` | ✔ | - |
| `index drop <表> <索引名>` | - | ✔ | ✔ |

## 视图 / 存储过程

| 命令 | 参数 | dry-run | --yes |
|---|---|---|---|
| `view list` | - | - | - |
| `view show <名>` | - | - | - |
| `view create <名>` | `--as '<SELECT ...>'` | ✔ | - |
| `view drop <名>` | - | ✔ | ✔ |
| `proc list / show <名>` | - | - | - |
| `proc drop <名>` | - | ✔ | ✔ |
| `proc create` | 不支持 | - | - |

## 导入 / 导出 / 备份 / 恢复

| 命令 | 参数 | dry-run | --yes | 说明 |
|---|---|---|---|---|
| `export rows <表>` | `--format json\|csv\|sql`、`--out <路径>`、`[--filter]`、`[--limit]` | - | - | 写本地文件，不写库 |
| `export schema` | `--db <库>`、`[--out]` | - | - | 方言生成建表 SQL；无 `--out` 时返回 `schema` 文本 |
| `export dump <表>` | `[--out]` | - | - | 方言 `backupDatabase` |
| `import file <表>` | `--file <路径>`、`[--format csv\|json]`、`[--limit]` | ✔ | - | 未知列丢弃、类型自动转换 |
| `rows insert-many <表>` | 同 `import file` | ✔ | - | 与 import file 等价 |
| `backup <库>` | `[--out <目录>]` | - | - | 非破坏、无需 token |
| `restore <库>` | `--file <路径>` | ✔ | ✔ | 破坏性恢复 |

## 运维（ops）

| 命令 | dry-run | --yes | 说明 |
|---|---|---|---|
| `ops stats` | - | - | 库总览（表数/大小/行数） |
| `ops health` | - | - | `{name, ok}` 连通性 |
| `ops logs` | - | - | 数据库日志（`--limit`，尽力而为） |
| `ops optimize` | ✔ | ✔ | 仅 MySQL（`OPTIMIZE TABLE` 全表） |
| `ops analyze` | ✔ | ✔ | 仅 MySQL |
| `ops repair` | ✔ | ✔ | 仅 MySQL |

## 其它根命令

| 命令 | 说明 |
|---|---|
| `sql '<SQL>'` | 逃生舱：默认只读；`--write` 放行写/DDL；`--allow-multi` 允许多语句；支持 stdin 管道 `fdb2 sql --write --allow-multi < x.sql`；`--limit` 截断结果 |
| `config show / get <k> / set <k> <v>` | 配置：`readonly`、`maxRows`、`confirmThreshold`、`protectedDatabases`、`defaultConnectionId` |
| `audit [--limit N]` | 审计日志（上限 500） |
| `setup` | 数据目录、连接数、默认连接、只读状态 |
| `auth status` | `Connected: N connections available`（WorkBuddy statusMatch 前缀） |
| `backup/restore` | 见上表 |

## 受保护库（默认，禁止 db drop）
`information_schema`、`performance_schema`、`mysql`、`sys`、`postgres`、`template0`、`template1`、`master`、`model`、`msdb`、`tempdb`、`system`、`saphanadb`、`SYS`。
可用 `fdb2 config set protectedDatabases 'a,b'` 覆盖。

## 完整破坏性示例（drop table）

```bash
# ① 预演（返回 token，不写库）
fdb2 table drop tmp_orders_2024 --dry-run --json
# → { "ok": true, "dryRun": true, "sql": "DROP TABLE `tmp_orders_2024`", "token": "ab12..." }

# ② 明确告知用户将删除 tmp_orders_2024，同意后执行（破坏性 → 必须 --yes）
fdb2 table drop tmp_orders_2024 --confirm ab12 --yes --json
# → { "ok": true, "dropped": "tmp_orders_2024", "sql": "DROP TABLE `tmp_orders_2024`" }
```

## 跑迁移脚本（推荐方式）

```bash
# 脚本含多条 DDL + DML：--write --allow-multi，从 stdin 读取避免 shell 转义
fdb2 sql --write --allow-multi --conn local-mysql --db app < ~/migrations/20260904_add_col.sql --json
```
