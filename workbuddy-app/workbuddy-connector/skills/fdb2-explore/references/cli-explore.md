# 只读命令全表（fdb2-explore）

> 本文件是 `fdb2-explore` 的完整命令清单。所有命令都必须追加 `--json`，以返回的 `ok` 判断成败。
> 连接定位：不传 `--conn` 时使用默认连接（仅一个连接时自动使用）。`--db` 缺省时使用该连接的默认库，连接无默认库会报 `PARAM_ERROR` 并提示用 `--db`。

## 数据库（库级只读）

| 命令 | 说明 | 关键返回字段 |
|---|---|---|
| `fdb2 db list --json` | 列出该连接可见的全部数据库 | `databases: string[]` |
| `fdb2 db info <db> --json` | 单库信息（大小/字符集等，随方言变化） | `info` |

## 表结构（只读）

| 命令 | 说明 | 关键返回字段 |
|---|---|---|
| `fdb2 table list --json` | 当前库全部表 | `tableCount`、`tables[]`（name/type/engine/rowCount/size/comment） |
| `fdb2 table list --pattern 'user%' --json` | 按名字过滤（支持 `%`/`*` 通配，忽略大小写，整名匹配） | 同上 |
| `fdb2 table columns <表> --json` | 列清单（推荐写条件前先查这个） | `table`、`columns[]` |
| `fdb2 table info <表> --json` | 表全信息 | `table.{columns,indexes,foreignKeys,rowCount,size,engine,comment}` |
| `fdb2 table indexes <表> --json` | 索引 | `indexes[]` |
| `fdb2 table fks <表> --json` | 外键 | `foreignKeys[]` |
| `fdb2 table stats <表> --json` | 行数/大小/引擎 | `rowCount/size/engine` |
| `fdb2 index list <表> --json` | 同 `table indexes` | `indexes[]` |

`columns` 每项通常包含：`name`、`type`（可能还有 `length`/`precision`）、`nullable`、`isPrimary`、`isAutoIncrement`、`unique`、`defaultValue`、`comment`，以及方言特有字段。

## 行数据（只读）

| 命令 | 说明 |
|---|---|
| `fdb2 rows list <表> --json` | 查询行。默认 100 行、上限 `maxRows`（默认 1000，可 `config set maxRows`）。 |
| `fdb2 rows get <表> --filter 'id=42' --json` | 取单条（内部 limit 1，必须带 `--filter`）。 |
| `fdb2 rows count <表> [--filter ...] --json` | 只返回 `count` 总数，不取数据。 |

`rows list` 附加参数：

| 参数 | 示例 | 说明 |
|---|---|---|
| `--select` | `--select id,name,email` | 只取指定列（做列名白名单校验） |
| `--filter`（可重复） | `--filter 'age>18'` | 结构化为条件，AND 叠加；完整语法见同目录 filter-dsl.md |
| `--filter-json` | `--filter-json '{"or":[...]}'` | 复杂 and/or/not 条件树 |
| `--sort`（可重复） | `--sort created_at:desc` | `字段:asc|desc` |
| `--limit` | `--limit 50` | 行数（被 `maxRows` 上限钳制） |
| `--offset` | `--offset 100` | 分页偏移 |
| `--count` | `--count` | 同时返回 `meta.total`（满足条件的总行数） |

## 视图 / 存储过程（只读）

| 命令 | 说明 |
|---|---|
| `fdb2 view list --json` | 视图清单 |
| `fdb2 view show <名称> --json` | 视图定义 SQL |
| `fdb2 proc list --json` | 存储过程清单 |
| `fdb2 proc show <名称> --json` | 过程定义（方言支持时） |

## SQL 逃生舱（只读）

显式命令无法表达的复杂查询（多表 JOIN、GROUP BY/HAVING、窗口函数、CTE/WITH、子查询、UNION）用：

```bash
fdb2 sql 'SELECT u.name, COUNT(o.id) AS cnt
          FROM users u LEFT JOIN orders o ON o.user_id = u.id
          GROUP BY u.name ORDER BY cnt DESC' --json
```

规则：
- 默认只读：`SELECT`/`SHOW`/`DESCRIBE`/`DESC`/`EXPLAIN`/`PRAGMA`/`WITH` 之外的语句都会被拒绝（`WRITE_NOT_ALLOWED`）。需要写库请转 `fdb2-admin` 技能并携带 `--write`。
- 默认禁止多语句（`MULTI_STATEMENT_BLOCKED`）；SELECT 脚本可加 `--allow-multi`。
- 结果截断到 `maxRows`；`--limit` 可调小。
- 也可管道输入：`cat q.sql | fdb2 sql --json`。

## 导出（把只读结果落盘）

```bash
# 数据导出：格式 json / csv / sql
fdb2 export rows <表> --format csv --out ~/exports/users.csv --filter 'age>18' --json
```

不传 `--out` 时写到当前目录 `{表}_export.{fmt}`。返回 `path` 与 `rowCount`。

## 运维（只读）

| 命令 | 说明 |
|---|---|
| `fdb2 ops stats --json` | 库总大小、表数、每表行数/大小 |
| `fdb2 ops health --json` | 连通性 `{name, ok}` |
| `fdb2 ops logs --limit 50 --json` | 数据库自身日志（尽力而为，按方言能力） |

## 典型 JSON 示例

```json
# fdb2 rows list users --filter 'age>18' --sort created_at:desc --limit 5 --count --json
{
  "ok": true,
  "conn": "local-mysql",
  "database": "app",
  "table": "users",
  "data": [ { "id": 42, "name": "张三", "age": 25 } ],
  "meta": { "rowCount": 1, "total": 37, "truncated": false, "limit": 5, "offset": 0 }
}
```
