# Database Tool (fdb2) — VSCode 扩展

把 `fdb2` 数据库管理工具完整搬进 VSCode。复用 `db_tool/server` 的后端（`TypeORM` + 各数据库方言服务），UI 复用 `src/platform/vscode` 的 Vue 面板，通过 Webview `postMessage` 与扩展宿主通信。

## 功能

- **连接管理**：Activity Bar 中「Database Tool」视图，增 / 删 / 改 / 测试数据库连接（配置持久化在用户主目录 `~/.vscode-db-tool/connections.json`，可在设置 `dbtool.dataDir` 覆盖）。
- **对象浏览**：树形视图 连接 → 库 → 表 → 列。
- **SQL 查询**：独立查询面板，执行任意 SQL 并展示结果表格（支持 Ctrl/Cmd+Enter）。
- **数据浏览**：表数据分页查看、WHERE 筛选。
- **表结构**：列 / 索引 / 外键查看。
- **支持数据库**：MySQL、PostgreSQL、SQL Server、SQLite、Oracle、CockroachDB、MongoDB、SAP HANA、ClickHouse（Oracle/SQLite/SAP 需要原生驱动，见下文）。

## 目录结构

```
packages/vscode/
├── package.json            # 扩展清单（viewsContainers/views/commands/menus/configuration）
├── esbuild.js             # 宿主构建（打包 server + 驱动，外部化原生模块）
├── tsconfig.json
├── src/
│   ├── extension.ts        # 入口：注册树视图、命令、Webview 提供者
│   ├── prelude.ts          # 在加载 server 前设置数据目录与 reflect-metadata
│   ├── protocol.ts         # 宿主<->Webview 消息协议 + 结果规范化
│   ├── service/DatabaseBridge.ts     # 桥接 handleDatabaseRoutes
│   └── providers/
│       ├── DatabaseTreeProvider.ts   # 侧边栏树形视图
│       └── WebViewProvider.ts        # 各类面板与消息路由
└── resources/
    ├── activity-icon.svg
    └── webview/            # 由 vite.config.vscode.ts 构建（main.js）
```

## 构建与调试

扩展宿主与 Webview 分别构建：

```bash
# 1. 安装扩展依赖（esbuild / typescript / 原生驱动等）
cd packages/vscode && npm install

# 2A. 单次构建（宿主 + Webview）
cd packages/vscode && npm run build          # 等价于 esbuild + 根目录 vite build

# 2B. 监听模式（开发）
cd packages/vscode && npm run watch          # 仅宿主；Webview 改完跑 npm run build:webview

# 3. 在 VSCode 中按 F5 启动「Extension Development Host」调试
```

根目录 `db_tool` 也提供了等价脚本：`npm run build:vscode`（仅 Webview）、`npm run build:vscode:extension`（仅宿主）、`npm run vscode:dev`（宿主 watch）、`npm run vscode:package`（打包 vsix）。

## 发布

### 本地手动发布

```bash
cd packages/vscode && npm install
cd packages/vscode && npm run vscode:prepublish   # 生产构建（宿主 esbuild + Webview vite）
../../node_modules/.bin/vsce package              # 生成 .vsix
../../node_modules/.bin/vsce publish -p <PAT>    # 发布到 VS Code Marketplace
../../node_modules/.bin/ovsx publish *.vsix -p <OVSX_TOKEN>   # 发布到 Open VSX
```

### 通过 GitHub Actions 自动发布

仓库已配置 `.github/workflows/build-vsix.yml`，行为对齐 `vscode-pptx`：

- **每次 push / PR 到 `main`**：自动构建 `.vsix` 并作为 CI 产物上传（便于下载验证）。
- **打 `dbtool-v*` 标签（如 `dbtool-v1.0.1`）时**：自动创建 GitHub Release（附带 `.vsix`），并分别发布到 **VS Code Marketplace** 与 **Open VSX**。两个发布任务相互独立，一个失败不影响另一个。

前提（在仓库 `Settings → Secrets and variables → Actions` 中配置）：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `VSCODE_TOKEN` | Secret | Azure DevOps PAT，权限 `Marketplace > Manage`，属于 `package.json` 中的 `publisher` |
| `OVSX_TOKEN` | Secret（或 Variable） | Open VSX 访问令牌 |

> 标签必须与 `packages/vscode/package.json` 的 `version` 一致（脚本会自动校验），否则发布步骤会报错。发布前先在该 `package.json` 中 `version` 字段递增。

> 注意：`dbtool-v*` 标签与 Electron 应用的 `v*` 发布标签相互独立，避免两个发布流程相互干扰。

## 原生驱动说明

宿主将 `oracledb` / `better-sqlite3` / `sqlite3` / `@sap/hana-client` 设为 **external**，运行时从本扩展的 `node_modules` 加载。为使 Oracle / SQLite / SAP HANA 连接可用，需在本机针对 VSCode 宿主的 Node ABI 编译这些原生模块（例如 `npm rebuild` 或在 Electron/VSCode 环境下重新安装）。MySQL / PostgreSQL / SQL Server / ClickHouse / MongoDB / CockroachDB 为纯 JS 驱动，开箱即用。

## 协议

宿主与 Webview 通过 `postMessage` 通信，消息协议见 `src/protocol.ts`。Webview 侧桥接层为 `src/platform/vscode/bridge.ts`。
