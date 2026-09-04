# 统一输出结构（output-format）

所有命令加 `--json` 后，stdout 只输出一行（pretty-print）JSON。**WorkBuddy 一律使用 `--json` 解析，绝不解析人类文本输出**。

## 成功

```json
{
  "ok": true,
  "...": "...命令自身的 payload..."
}
```

命令 payload 都是平铺字段（见下表），不会再套一层。

## 失败

失败时 stdout 输出（`--json` 模式），同时进程退出码非 0：

```json
{
  "ok": false,
  "error": {
    "code": "TABLE_NOT_FOUND",
    "message": "表 users 不存在于数据库 app",
    "hint": "可用表: accounts, orders, ...",
    "details": { "availableTables": ["accounts", "orders"] }
  }
}
```

> 非 `--json` 模式错误走 stderr：`错误 [CODE]: message` + `提示: hint`。`--json` 模式 stdout 是唯一可信通道。

## 退出码 ↔ error.code

| 退出码 | 含义 | error.code |
|---|---|---|
| 0 | 成功 | — |
| 1 | 通用错误 | `GENERIC` 等 |
| 2 | 参数/用法错误 | `PARAM_ERROR` `UNKNOWN_COMMAND` `INVALID_FILTER` `INVALID_COLUMN_SPEC` `INVALID_OPTION` |
| 3 | 连接问题 | `CONN_NOT_FOUND` `NO_DEFAULT_CONN` |
| 4 | 未就绪 | `NOT_READY`（如无任何连接） |
| 5 | 写护栏 | `REQUIRE_DRYRUN` `CONFIRM_REQUIRED` `CONFIRM_EXPIRED` `FORCE_REQUIRED` `WRITE_BLOCKED` `WRITE_NOT_ALLOWED` `MULTI_STATEMENT_BLOCKED` |
| 6 | SQL/库层错误 | `SQL_ERROR` `DB_NOT_FOUND` `TABLE_NOT_FOUND` `COLUMN_NOT_FOUND` `UNSUPPORTED` `DRIVER_UNAVAILABLE` `EXEC_ERROR` |

## 常用 payload 形态

### rows list / rows get
```json
{ "conn": "local-mysql", "database": "app", "table": "users",
  "data": [ { "id": 1, "name": "张三" } ],
  "meta": { "rowCount": 1, "total": 37, "truncated": false, "limit": 100, "offset": 0 } }
```
- `meta.total` 仅在加 `--count` 时返回。
- `meta.truncated=true` 表示请求的 `--limit` 超过了 `maxRows` 被钳制；需要更多数据请调 `config set maxRows`。

### rows count
```json
{ "conn": "...", "database": "...", "table": "users", "count": 37, "sql": "SELECT COUNT(*) ..." }
```

### table columns
```json
{ "conn": "...", "database": "app", "table": "users",
  "columns": [ { "name": "id", "type": "int", "nullable": false, "isPrimary": true, "isAutoIncrement": true } ] }
```

### dry-run（写类命令预演）
```json
{ "ok": true, "dryRun": true, "sql": "UPDATE users SET status = ? WHERE id = ?",
  "params": ["disabled", 42], "estimatedRows": 1, "token": "a1b2c3..." }
```
`token` 用于下一步 `--confirm <token>` 执行（5 分钟内有效，与 op+sql+params 绑定）。

### 脱敏
连接对象里的密码一律是 `"password": "***"`（或 `null`）+ `hasPassword` 布尔，不存在明文泄露。

## 审计与配置
- 每次操作追加写 `~/.fdb2/audit.log`（JSON Lines）；`fdb2 audit --json` 读取最近 N 条。
- `fdb2 config show --json` 返回 `{ dataDir, config: {readonly, maxRows, confirmThreshold, protectedDatabases, defaultConnectionId}, auditLog }`。
- `fdb2 setup --json` 返回 `{ dataDir, connections, defaultConnectionId, readonly }`。
