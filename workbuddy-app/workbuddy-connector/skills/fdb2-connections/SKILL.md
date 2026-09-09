---
name: fdb2-connections
display_name: FDB2 数据库连接管理
display_name_en: FDB2 Database Connections
description: 管理数据库连接。当用户需要新增、查看、修改、删除、测试或切换数据库连接时使用，也用于连接信息缺失时引导用户提供。
description_zh: 用自然语言管理数据库连接：列出、新增、测试、切换、修改、删除
description_en: Manage database connections in natural language
category: data
version: 1.0.0
author: jiamao
allowed-tools: Bash
---

# FDB2 数据库连接管理

连接由 `fdb2` CLI 统一读写，数据落在本地数据目录（如 `~/.fdb2/`，可用环境变量 `DB_TOOL_DATA_DIR` 覆盖）。**CLI 按名称或 id 寻址连接。**

> ⚠️ **严禁直接读取、解析或编辑 `~/.fdb2/` 下的任何数据文件**（connections.json、config.json、audit.log、fdb2.server.* 等）。这些文件由 CLI 内部读写，直接读取会绕过脱敏与护栏、可能读到中间态或陈旧数据，且输出不可信。一切连接操作只能通过下方 CLI 命令完成。

## 铁律
1. **所有连接操作只通过 `fdb2` CLI，绝不读数据文件**；所有命令加 `--json`，以 `ok` 判断成败，以 `error.code` 定位问题。
2. **连接名不明确时必须询问用户**，不要猜测连接名称。
3. 展示给用户的任何输出中，密码一律显示为 `***`（CLI 默认已脱敏，不要要求明文密码）。
4. 新增连接优先让用户提供：类型、名称、主机、端口、账号、密码、数据库；缺哪些问哪些。

## 命令映射

| 用户意图 | 命令 |
|---|---|
| 我有哪些数据库连接？ | `fdb2 conn list --json` |
| 显示某个连接的详情 | `fdb2 conn get <名称或id> --json` |
| 新增一个 MySQL 连接 | `fdb2 conn add --name <n> --type mysql --host <h> --port 3306 --database <d> --username <u> --password <p> --json` |
| 新增 SQLite 文件库 | `fdb2 conn add --name <n> --type sqlite --database <绝对路径> --json` |
| 测试连接是否可用 | `fdb2 conn test <名称或id> --json` |
| 设为默认连接 | `fdb2 conn use <名称或id> --json` |
| 修改连接（如换密码） | `fdb2 conn update <名称或id> --password <新密码> --json` |
| 删除连接 | `fdb2 conn remove <名称或id> --json` |
| 当前默认连接 | `fdb2 current --json` |
| 支持哪些数据库类型 | `fdb2 types --json` |
| 查看 Web 服务地址（浏览器访问） | `fdb2 server status --json` |
| 启动 Web 服务（未运行时） | `fdb2 start` |

> **Web 访问流程**：用户想通过浏览器可视化操作数据库时，先 `fdb2 server status --json`；若返回 `running: false`，执行 `fdb2 start`（后台启动服务），等待 1~2 秒后再次 `fdb2 server status --json` 取实际端口与 `url`。`fdb2 server status` 返回 `{running, port, url}`，端口可能非默认 9800（被占用时自动递增），以实际返回的 `url` 为准，再告知用户访问地址。

支持类型：mysql、postgres、sqlite、oracle、mssql、cockroachdb、mongodb（实验性）、sap。

## 密码安全
- 不建议在命令行直接带 `--password`（会进入 shell 历史）；优先提示用户使用 `--password-stdin` 或让用户在对话中授权后由你传递一次。
- 连接测试失败时的排查顺序：主机可达性 → 端口 → 账号 → 数据库名是否存在 → 是否需 SSL（加 `--ssl`）。

## 常见错误处理
| error.code | 处理 |
|---|---|
| `CONN_NOT_FOUND` | 用 `fdb2 conn list --json` 重新确认可用连接后再试 |
| `NO_DEFAULT_CONN` | 需要让用户指定连接，或先 `fdb2 conn use <name>` 设置默认 |
| `DRIVER_UNAVAILABLE` | 对应数据库驱动未安装，建议用户重新执行安装命令 |

## 参考
- @references/connections.md：连接参数与默认端口速查
