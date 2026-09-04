---
name: fdb2-write
display_name: FDB2 数据写入
display_name_en: FDB2 Data Write
description: 修改数据库表中的数据（增、改、删、批量导入）。当用户要新增记录、更新字段、删除行、导入数据文件时使用。所有写操作必须先 dry-run 预演拿确认令牌再执行，全程审计。
description_zh: 用自然语言增删改数据库记录（受双阶段确认保护）
description_en: Insert, update, delete and bulk-import data rows safely
category: data
version: 1.0.0
author: FDB2 团队
allowed-tools: Bash
---

# FDB2 数据写入（DML）

本技能只做**行级数据修改**（insert / update / delete / 数据文件导入）。建表、删表、视图、备份等 DDL/管理操作请交给 `fdb2-admin`；改前想先查数据请用 `fdb2-explore`。

## 铁律（违反会被护栏拒绝或视为事故）
1. 所有命令加 `--json`，按 `ok` 判断。
2. **任何写入都要两段式**：先 `--dry-run` 预演拿到 `token` → 再带 `--confirm <token>` 执行。
3. update/delete **必须带 `--filter`**，无条件更新/删除会被拒绝（`PARAM_ERROR`）。
4. 影响行数 > `confirmThreshold`（默认 100）必须加 `--force`。
5. 全局只读模式（`config set readonly true`）下必须加 `--write`。
6. 禁止修改主键列（`WRITE_NOT_ALLOWED`）。
7. 执行任何写操作前，先向用户复述影响（表、条件、预计行数、token 的 SQL），用户确认后再执行第二步。
8. token 与本次 op+SQL+参数绑定、5 分钟有效；过期/被改都会返回 `CONFIRM_EXPIRED`，重跑 `--dry-run`。
9. 不确定列名/表名时先 `fdb2 table columns <表> --json`、`fdb2 table list --json` 再动手。

## 命令映射

| 用户意图 | dry-run 预演 | 确认执行 |
|---|---|---|
| 新增一条用户 | `fdb2 rows insert users --data '{"name":"张三","age":18,"vip":false}' --dry-run --json` | 上一条返回的 token 追加 `--confirm <token>` 重跑 |
| 插入多条 | 同 `insert`（`--data` 单对象；多行走文件导入） | 同上 |
| 从 CSV/JSON 文件导入 | `fdb2 rows insert-many users --file ~/users.csv --dry-run --json` | 同上 |
| 把 id=42 的用户禁用 | `fdb2 rows update users --filter 'id=42' --set 'status=disabled' --dry-run --json` | 同上 |
| 批量把过期会员降级 | `fdb2 rows update users --filter 'vip_expire_at<2026-09-01' --set 'vip=false' --dry-run --json` | 可能需加 `--force` |
| 删除某条记录 | `fdb2 rows delete logs --filter 'id=123' --dry-run --json` | 同上 |
| 清理一年前的日志 | `fdb2 rows delete logs --filter 'created_at<2025-09-04' --dry-run --json` | 超过阈值需 `--force` |

## 两段式执行模板

```bash
# 第一步：dry-run（不写库，先算影响行数并返回 token）
fdb2 rows update users --filter 'status=active' --set 'level=2' --dry-run --json
# → { "ok": true, "dryRun": true, "estimatedRows": 3, "token": "9f2c..." , "sql": "UPDATE ...", "params": [2, "active"] }

# 第二步：向用户确认后，携带 token 真正执行
fdb2 rows update users --filter 'status=active' --set 'level=2' --confirm 9f2c --json
# → { "ok": true, "updated": 3, "sql": "UPDATE ..." }
```

> `rows insert` / `insert-many` / `rows update` / `rows delete` / `import file` 都不是破坏性操作：确认只需 `--confirm`，**不需要 `--yes`**。只有删表/清表/删库等破坏性 DDL 才需要 `--yes`（见 `fdb2-admin`）。

## 参数速查

- `--data '<JSON>'`：insert 的数据（对象）。值按列类型自动归一（数字字符串→数字等）。
- `--file <路径>`：批量导入文件。`--format csv|json` 缺省按扩展名推断。
- `--set 'k=v'`（可重复）/ `--set-json '{"k":"v"}'`：update 的赋值。二者可混用。
- `--filter '<DSL>'`：见 fdb2-explore 的 Filter DSL；update/delete 必填。
- `--limit N`：insert-many / import file 最多导入前 N 行。
- `--force`：预计影响行数超 `confirmThreshold` 时必需。
- `--write`：全局只读模式下放行。

## 安全细节
- update 用 `--filter` 缩小范围是强制的；没有 filter 直接报错。
- 导入文件时**未知列会被静默丢弃**（以表真实列为准），空串按 `NULL` 处理。
- insert 的自增主键列会自动跳过，不需要也不应传 id。
- `upsert` 未开放（`UNSUPPORTED`）：先 insert、失败再 update；或转 admin 技能用 `fdb2 sql` 写 MERGE 脚本。

## 常见错误处理
| error.code | 处理 |
|---|---|
| `REQUIRE_DRYRUN` / `CONFIRM_REQUIRED` | 漏了预演：先执行 `--dry-run`，再带 token。 |
| `CONFIRM_EXPIRED` | token 失效（>5 分钟或 op 变了）：重跑 `--dry-run` 拿新 token。 |
| `FORCE_REQUIRED` | 影响行数超过阈值：向用户说明后加 `--force` 重试。 |
| `WRITE_BLOCKED` | 只读模式：确认后加 `--write`，或 `fdb2 config set readonly false`。 |
| `WRITE_NOT_ALLOWED` | 尝试改主键列或写只读 SQL。 |
| `PARAM_ERROR` | 缺 `--filter`/`--data`/`--set`，或 JSON 不合法。 |

## 参考
- @references/write-protocol.md：双阶段确认协议与护栏完整说明
- `--filter` 条件写法见 fdb2-explore 技能（其 references/filter-dsl.md）
- `--json` 输出解析见 fdb2-explore 技能（其 references/output-format.md）
