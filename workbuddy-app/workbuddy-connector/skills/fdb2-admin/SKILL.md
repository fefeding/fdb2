---
name: fdb2-admin
display_name: FDB2 库表与运维管理
display_name_en: FDB2 Admin & Ops
description: 结构与运维级操作：建库删库、建表改表删表、索引、视图、存储过程、导入导出、备份恢复、SQL 脚本、维护命令与配置。当用户要改表结构、跑 SQL 脚本、备份或管理数据库本身时使用。
description_zh: 用自然语言执行库表结构变更、导入导出、备份恢复与运维操作
description_en: Schema changes, import/export, backup/restore and ops via natural language
category: data
version: 1.0.0
author: FDB2 团队
allowed-tools: Bash
---

# FDB2 库表与运维管理（Admin / Ops）

处理**结构变更与运维**。行级数据增删改请转 `fdb2-write`；只读浏览请转 `fdb2-explore`。

## 铁律
1. 所有命令加 `--json`。
2. **DDL 与恢复全部要两段式确认**：先 `--dry-run` 拿 token → 再 `--confirm <token>`；删表/清表/删库/恢复等破坏性操作**还必须加 `--yes`**。
3. 影响行数超阈值需 `--force`（本类命令多为结构操作，一般不涉及；导入、脚本例外）。
4. 只读模式下一切写操作需 `--write`。
5. 绝不删除受保护库（`mysql`/`sys`/`postgres` 等系统库，见 @references/admin-ops.md）。
6. 破坏性命令（drop/truncate/restore）执行前向用户复述将要删除的对象，得到明确同意才执行。
7. 不确定表/列名先查 `fdb2 table list` / `fdb2 table columns`。
8. `sql` 逃生舱默认只读；写脚本必须 `--write`，多语句必须 `--allow-multi`（建议直接管道喂文件，避免转义问题）。

## 命令映射

| 用户意图 | 命令示例 |
|---|---|
| 创建数据库 | `fdb2 db create app --charset utf8mb4 --dry-run --json` → `--confirm <token>` |
| 删除数据库 | `fdb2 db drop old_app --dry-run --json` → `--confirm <token> --yes` |
| 建表 | `fdb2 table create users --column 'id:int:primary:auto_increment' --column 'name:varchar:len=64:not_null' --column 'email:varchar:len=128' --dry-run --json` → confirm |
| 加列 | `fdb2 table alter users --add-column 'nickname:varchar:len=32' --dry-run --json` → confirm + yes |
| 删列 | `fdb2 table alter users --drop-column old_col --dry-run --json` → confirm + yes |
| 改列 | `fdb2 table alter users --modify-column 'name:varchar:len=128:not_null' --dry-run --json` → confirm + yes |
| 重命名表 | `fdb2 table rename old_name new_name --dry-run --json` → confirm + yes |
| 清空表 | `fdb2 table truncate logs_2020 --dry-run --json` → confirm + yes |
| 删表 | `fdb2 table drop logs_2020 --dry-run --json` → confirm + yes |
| 建唯一索引 | `fdb2 index create users --name uk_email --columns email --unique --dry-run --json` → confirm |
| 删索引 | `fdb2 index drop users uk_email --dry-run --json` → confirm + yes |
| 建视图 | `fdb2 view create v_active_users --as 'SELECT id,name FROM users WHERE status=1' --dry-run --json` → confirm |
| 删视图 | `fdb2 view drop v_old --dry-run --json` → confirm + yes |
| 删存储过程 | `fdb2 proc drop my_proc --dry-run --json` → confirm + yes |
| 导出表结构 | `fdb2 export schema --db app --out ~/backups/app_schema.sql --json` |
| 导出单表数据 | `fdb2 export rows users --format csv --out ~/backups/users.csv --json` |
| 全库备份 | `fdb2 backup app --out ~/backups --json`（按方言能力） |
| 恢复 | `fdb2 restore app --file ~/backups/app.sql --dry-run --json` → confirm + yes |
| 导入数据到表 | `fdb2 import file users --file ~/users.csv --dry-run --json` → confirm |
| 维护（MySQL） | `fdb2 ops optimize --db app --dry-run --json` → confirm + yes（analyze/repair 同） |
| 库统计 / 健康 | `fdb2 ops stats --json`、`fdb2 ops health --json`、`fdb2 ops logs --json` |
| 跑 SQL 脚本 | `fdb2 sql --write --allow-multi < ~/migrate.sql`（stdin 管道） |
| 查看配置 | `fdb2 config show --json` |
| 审计 | `fdb2 audit --json` |

## 列定义 DSL（--column / --add-column / --modify-column）

`名称:类型[:约束]`，约束以 `:` 分隔，可写：
`primary`、`auto_increment`(或 `ai`)、`not_null`、`null`、`unique`、
`default=<值>`、`comment=<文本>`、`len=<n>`(等价 `长度(n)`)、`precision=<p[,s]>`。
含 `:` 的默认值/注释需用 `\:` 转义。

```bash
--column 'id:int:primary:auto_increment'
--column 'name:varchar:len=64:not_null'
--column 'amount:decimal:precision=10,2:default=0'
--column 'created_at:timestamp:default=CURRENT_TIMESTAMP'
--column 'note:text:comment=备注信息'
```

方言差异由 CLI 自动处理（如 PG 的 auto_increment → `SERIAL`、SQLite → `INTEGER PRIMARY KEY AUTOINCREMENT`）。**MongoDB 不支持建表类 DDL**（返回 `UNSUPPORTED`）。

## 破坏性清单（必须 `--yes`）
`db drop`、`table drop/truncate/alter/rename`、`index drop`、`view drop`、`proc drop`、`restore`、`ops optimize/analyze/repair`、`sql` 脚本含 DDL。
非破坏但也要 dry-run 的：`db create`、`table create`、`index create`、`view create`、`import file`。

## SQL 逃生舱
- 只读：`fdb2 sql 'SELECT ...'`。
- 写/DDL：`fdb2 sql --write --allow-multi < 脚本.sql`（stdin），或 `fdb2 sql "UPDATE ..." --write --dry-run` → confirm。
- 默认单语句；`--allow-multi` 开启多语句。DDL 语句在 confirm 基础上需要 `--yes`。
- 存储过程创建不支持交互式 CLI（方言差异大）：`fdb2 proc create` 会提示改用桌面端或 SQL 脚本方式。

## 配置与审计
```bash
fdb2 config show --json
fdb2 config set readonly true            # 打开只读（所有写需 --write）
fdb2 config set maxRows 2000
fdb2 config set confirmThreshold 500
fdb2 audit --json                        # 最近审计
fdb2 setup --json                        # 数据目录/连接数/只读状态
```

## 参考
- @references/admin-ops.md：命令参数与破坏性确认矩阵
- 两段式确认协议细节见 fdb2-write 技能（其 references/write-protocol.md）
- `--json` 输出解析见 fdb2-explore 技能（其 references/output-format.md）
