# FDB2 × WorkBuddy Connector

让 WorkBuddy 通过本地 CLI `fdb2`，用自然语言管理个人数据库（连接、库表结构、数据 CRUD、导入导出、备份恢复、运维）。

- 类型：CLI connector（`cli.json` 声明，依赖 WorkBuddy 的本地命令执行能力）
- 状态探测：`fdb2 auth status`（stdout 以 `Connected` 开头即就绪）
- 支持数据库：MySQL、PostgreSQL、SQLite、Oracle、SQL Server、CockroachDB、MongoDB（实验性）、SAP HANA

## 安装

前置：仓库需要先产出 `dist/`（CLI 由 TypeScript 编译）：

```bash
cd d:/code/ycnull/db_tool
npm install          # 安装依赖（含原生驱动 better-sqlite3 等可选依赖）
npm run build-server # tsc -p tsconfig.server.json → dist/server/*
npm link             # 或 npm i -g <repo 根目录>，注册全局 fdb2 命令
```

验证：

```bash
fdb2 --version
fdb2 help
fdb2 auth status          # 无连接时退出码 4 并提示先 conn add
```

> 全局安装的 `fdb2` 由 `bin/fdb2.js` 分发：`start/stop/restart/-v` 走旧的桌面服务逻辑，其余子命令（`conn/db/table/rows/...`）一律转发到 `dist/server/cli/main.js`。若提示「CLI 尚未编译」，回到仓库执行 `npm run build-server`。
> 数据与密钥落在 `~/.fdb2/`（可用环境变量 `DB_TOOL_DATA_DIR` 覆盖）：`connections.json`、`config.json`、`cli-secret`、`audit.log`。

## 技能划分（按风险从低到高）

| Skill | 覆盖范围 | 为什么单独拆 |
|---|---|---|
| `fdb2-connections` | 连接管理（list/add/test/use/update/remove） | 一切的前提；名称含糊时必须问用户 |
| `fdb2-explore` | 只读浏览：库/表/列/索引/视图/过程、行查询、导出 | 纯读，无护栏负担；含 Filter DSL 与输出解析参考 |
| `fdb2-write` | 行级数据写入：insert/insert-many/update/delete/import | 强制 dry-run + confirm 双阶段、影响行数阈值、禁无条件改删 |
| `fdb2-admin` | DDL/运维：db/table/index/view/proc、SQL 脚本、备份恢复、ops、config | 破坏性操作需 confirm + `--yes`，受保护库禁删 |

路由规则：
- 问「有哪些连接 / 怎么连」→ `fdb2-connections`
- 只读「查什么 / 看结构 / 数一数」→ `fdb2-explore`
- 改行数据「加一条 / 把…改成 / 删掉…」→ `fdb2-write`
- 改结构与管理「建表 / 删表 / 备份 / 导入导出 / 跑脚本」→ `fdb2-admin`

## 安全设计摘要

- 所有命令 `--json` 输出，密码一律 `***`。
- 查询：字段白名单（真实列）+ 参数绑定编译，无 SQL 拼接注入面。
- 写入：`--dry-run` 预演返回 HMAC 签名 `token` → `--confirm <token>` 执行；破坏性操作另需 `--yes`；影响行数 > `confirmThreshold`（默认 100）需 `--force`；全局只读模式需 `--write`。
- `sql` 逃生舱默认只读、默认单语句；只有显式命令表达不了（JOIN/聚合/CTE/脚本）才使用。
- 系统库黑名单禁止 `db drop`；每次写操作写审计日志（`fdb2 audit`）。

## 文件结构

```
connector-meta.json        # 连接器元数据（名称/描述/示例/图标）
cli.json                   # runtime/init/status/statusMatch 声明
icon.svg                   # 图标
skills/
  fdb2-connections/        # SKILL.md + references/connections.md
  fdb2-explore/            # SKILL.md + references/{cli-explore,filter-dsl,output-format}.md
  fdb2-write/              # SKILL.md + references/write-protocol.md
  fdb2-admin/              # SKILL.md + references/admin-ops.md
```

## 冒烟验证清单

```bash
fdb2 conn list --json
fdb2 types --json
fdb2 db list --json
fdb2 table list --json
fdb2 rows list <表> --limit 5 --json
fdb2 rows count <表> --json
# 写入闭环（建议先用一次性测试表）
fdb2 rows insert <表> --data '{"name":"smoke"}' --dry-run --json
fdb2 rows insert <表> --data '{"name":"smoke"}' --confirm <token> --json
fdb2 audit --json
```
