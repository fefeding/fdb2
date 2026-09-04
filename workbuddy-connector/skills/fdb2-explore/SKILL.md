---
name: fdb2-explore
display_name: FDB2 数据探索
display_name_en: FDB2 Data Explorer
description: 只读浏览数据库结构与数据。当用户想看有哪些库/表/字段/索引、行数统计、查询记录或导出数据时使用。
description_zh: 用自然语言浏览与查询数据库结构与数据（只读）
description_en: Explore and query database schema and data with natural language (read-only)
category: data
version: 1.0.0
author: FDB2 团队
allowed-tools: Bash
---

# FDB2 数据探索（只读）

## 铁律
1. 所有命令必须加 `--json`，按 `ok` 判断成败。
2. **禁止用 `fdb2 sql` 做本技能已覆盖的事。** 只有遇到显式命令无法表达时才允许逃生舱：
   多表 JOIN、GROUP BY 聚合、窗口函数、CTE/递归、子查询。
3. 不确定列名时**先 `fdb2 table columns <表> --json`**，再构造 `--filter`，不要猜。
4. 不确定表属于哪个库时**先 `fdb2 db list` / `fdb2 table list --db <库>`** 确认。
5. 不指定连接时默认使用默认连接；结果异常先 `fdb2 conn list` 核对。

## 标准探索链路
1. 确认库：`fdb2 db list --json`
2. 找表：`fdb2 table list --db <库> [--pattern 'user%'] --json`
3. 看结构：`fdb2 table columns <表> --db <库> --json`（含类型/主键/自增/默认值）
4. 看数据：`fdb2 rows list <表> --db <库> [--filter ...] [--sort ...] --json`

## 查询语义映射（Filter DSL）
结构化筛选，把自然语言翻译成 `--filter`：
- “18 岁以上” → `--filter 'age>18'`
- “状态是 active 或禁用” → `--filter 'status in active,disabled'`
- “名字里含 zhang” → `--filter 'name~zhang'`
- “邮箱以 @qq.com 结尾” → `--filter 'email$@qq.com'`
- “不是 vip” → `--filter 'vip=false'`
- “注册时间为空” → `--filter 'deleted_at null'`
- 多个条件叠加是 AND：`--filter 'age>18' --filter 'status=active'`
- 排序：`--sort created_at:desc --sort id:asc`
- 只看部分字段：`--select id,name,email`
- 多条 `--filter` 语义 → 再 @references/filter-dsl.md

## 输出解析
- `rows list` 结果里 `data` 为行数组，`meta.rowCount` 行数，`meta.total`（加 `--count` 才有总数）。
- `meta.truncated=true` 表示被行数上限截断，需要时用 `--limit` 显式扩大（上限由 `config set maxRows` 控制）。

## 常见错误
| error.code | 处理 |
|---|---|
| `DB_NOT_FOUND` | `fdb2 db list --json` 确认库名 |
| `TABLE_NOT_FOUND` | `fdb2 table list --db <库> --json` 确认表名，注意库可能用错 |
| `COLUMN_NOT_FOUND` | 用返回的 `hint` 候选列名替换后重试 |
| `CONN_NOT_FOUND` | `fdb2 conn list --json` 核对连接名 |
| `INVALID_FILTER` | 检查 `--filter` 语法：字段不能带引号、值带特殊字符需转义 |

## 分页与导出
- 分页：`--offset` + `--limit`（例如第 2 页每页 20：`--limit 20 --offset 20`）。
- 导出：`fdb2 export rows <表> --db <库> --format csv --out <路径> --json`；全库表清单看 `table list`。

## 参考
- @references/cli-explore.md：只读命令全表
- @references/filter-dsl.md：Filter DSL 完整规范
- @references/output-format.md：统一输出结构
