# 写操作双阶段确认协议

CLI 对一切写操作强制「预演 → 确认令牌 → 执行」，令牌由本地密钥（`~/.fdb2/cli-secret`）做 HMAC-SHA256 签名，与操作类型 + 完整 SQL + 参数绑定，**5 分钟有效、跨进程可验证**。任何偏离都会得到明确的 error.code 而不是静默执行。

## 护栏检查顺序（gateWrite）

```
1. 全局只读（config.readonly=true）且未带 --write        → WRITE_BLOCKED
2. 带 --dry-run：
     预估行数 > confirmThreshold 且未带 --force          → FORCE_REQUIRED
     否则返回 { dryRun, sql, params, estimatedRows, token }
3. 带 --confirm <token>：
     校验 token 与 op+sql+params（当前/上一时间桶）       → 失败: CONFIRM_EXPIRED
     若为破坏性操作且未带 --yes                          → CONFIRM_REQUIRED
     预估行数超阈值未带 --force                          → FORCE_REQUIRED
     全部通过 → 执行
4. 两者都没有：
     破坏性操作                                          → CONFIRM_REQUIRED（提示先 dry-run + --yes）
     普通写操作                                          → REQUIRE_DRYRUN
```

## 破坏性 vs 普通写

| 类别 | 是否需要 `--yes` | 典型命令 |
|---|---|---|
| 普通写 | 否（`--confirm` 即可） | `rows insert` `rows insert-many` `rows update` `rows delete` `import file` |
| 破坏性 | 是（`--confirm` + `--yes`） | `db drop` `table drop/truncate/alter/rename` `index drop` `view drop` `proc drop` `restore` `ops optimize/analyze/repair` `sql` 中的 DDL |

> 注：update/delete 的预演会先跑一次 COUNT 得到 `estimatedRows`；破坏性操作（drop 等）无法预知行数，`estimatedRows` 为 `null`，不触发阈值检查，但必须有 `--yes`。

## 阈值与配置

| 配置项 | 默认 | 作用 | 设置 |
|---|---|---|---|
| `readonly` | `false` | true 时所有写操作需 `--write` | `fdb2 config set readonly true/false` |
| `maxRows` | `1000` | 查询行数上限 | `fdb2 config set maxRows 2000` |
| `confirmThreshold` | `100` | 影响行数超过需 `--force` | `fdb2 config set confirmThreshold 500` |
| `protectedDatabases` | 见下 | 禁止 `db drop` 的库名单 | `fdb2 config set protectedDatabases 'mysql,sys'` |

默认受保护库：`information_schema, performance_schema, mysql, sys, postgres, template0, template1, master, model, msdb, tempdb, system, saphanadb, SYS`。对它们执行 `db drop` 返回 `WRITE_NOT_ALLOWED`。

## 完整流程示例（update）

```bash
# ① 预演
fdb2 rows update users --filter 'vip=false' --set 'level=1' --dry-run --json
# { "ok": true, "dryRun": true,
#   "sql": "UPDATE users SET level = ? WHERE vip = ?", "params": [1, false],
#   "estimatedRows": 3, "token": "3f8a2b..." }

# ② 向用户确认「将更新 users 中 3 行 vip=false 的用户 level=1」后执行
fdb2 rows update users --filter 'vip=false' --set 'level=1' --confirm 3f8a2b --json
# { "ok": true, "updated": 3, "sql": "UPDATE ...", "result": [...] }
```

若第①步预计影响 500 行（>100）：返回 `FORCE_REQUIRED`，需 `--force` 重跑①，再拿新 token 执行②。

## 完整流程示例（破坏性 drop）

```bash
fdb2 table drop old_logs --dry-run --json        # → 返回 token（estimatedRows 为 null）
fdb2 table drop old_logs --confirm <token> --yes  # 破坏性必须补 --yes
```

## 审计
- 每次写操作（含被护栏拒绝的路径之外、真正执行成功的操作；连接测试等也会记）追加一条 JSON 到 `~/.fdb2/audit.log`。
- 审计字段：`ts action conn database table kind sql params rows ok error`。
- 查看：`fdb2 audit --json` 或 `fdb2 audit --limit 500`。

## 不可做的事（硬限制）
- 无条件 `update` / `delete`（无 `--filter`）→ `PARAM_ERROR`。
- 修改主键列 → `WRITE_NOT_ALLOWED`。
- 删除受保护数据库 → `WRITE_NOT_ALLOWED`。
- 未带 `--write` 对表执行写 SQL 逃生舱 → `WRITE_NOT_ALLOWED`。
- 默认多语句 SQL → `MULTI_STATEMENT_BLOCKED`（`fdb2 sql` 需要 `--allow-multi`）。

## 端到端约定
1. dry-run 的返回即「执行承诺」：token 换执行只能原样复现同一条命令（token 与 SQL/参数绑定）。
2. 若用户要求跳过预演、直接给确认，也仍按协议走一次 `--dry-run`——预演本身不写库，是唯一能拿到有效 token 的途径。
3. 出错时把 `error.code` + `hint` 原样呈现给用户，按 hint 补参数重试。
