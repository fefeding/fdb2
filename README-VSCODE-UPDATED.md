# fdb2 VSCode 扩展开发指南（更新版）

## 项目结构

```
db_tool/
├── server/                 # 现有数据库服务（核心功能）
│   ├── service/
│   │   ├── connection.service.ts    # 连接管理服务
│   │   └── database/
│   │       ├── database.service.ts  # 数据库服务
│   │       ├── mysql.service.ts     # MySQL 实现
│   │       ├── postgres.service.ts  # PostgreSQL 实现
│   │       └── ...                # 其他数据库实现
│   └── model/
│       └── connection.entity.ts     # 连接实体
├── packages/vscode/        # VSCode 扩展（复用 server 服务）
│   ├── src/
│   │   ├── extension.ts
│   │   ├── service/
│   │   │   └── DatabaseServiceBridge.ts  # 服务桥接层
│   │   ├── provider/
│   │   │   ├── DatabaseTreeProvider.ts   # 树形视图
│   │   │   └── WebViewProvider.ts        # WebView 提供者
│   │   └── typings/
│   │       └── connection.ts
│   ├── resources/
│   │   └── webview/   # WebView 前端资源
│   └── package.json
├── src/platform/vscode/    # Vue WebView 组件
│   ├── bridge.ts       # VSCode API 桥接
│   └── components/
└── vite.config.vscode.ts  # VSCode WebView 构建配置
```

## 核心架构：服务复用

### 服务桥接层 (DatabaseServiceBridge)

VSCode 扩展通过桥接层直接使用 `server` 目录下的现有服务：

```typescript
// packages/vscode/src/service/DatabaseServiceBridge.ts
import { ConnectionService } from '../../../../../server/service/connection.service';
import { DatabaseService } from '../../../../../server/service/database/database.service';

export class DatabaseServiceBridge {
  private connectionService: ConnectionService;
  private databaseService: DatabaseService;

  constructor() {
    this.connectionService = new ConnectionService();
    this.databaseService = new DatabaseService();
  }

  get connection() {
    return this.connectionService;
  }

  get database() {
    return this.databaseService;
  }
}
```

### 复用的核心服务

1. **ConnectionService** (`server/service/connection.service.ts`)
   - ✅ 连接配置管理（增删改查）
   - ✅ 连接持久化（文件存储）
   - ✅ 连接测试
   - ✅ 连接池管理
   - ✅ 支持 8 种数据库类型

2. **DatabaseService** (`server/service/database/database.service.ts`)
   - ✅ 数据库列表查询
   - ✅ 表列表查询
   - ✅ 表结构查询
   - ✅ 表数据查询
   - ✅ SQL 执行
   - ✅ 数据导出
   - ✅ 视图和存储过程管理

3. **各数据库实现** (`server/service/database/*.service.ts`)
   - ✅ MySQL (mysql.service.ts)
   - ✅ PostgreSQL (postgres.service.ts)
   - ✅ SQLite (sqlite.service.ts)
   - ✅ SQL Server (mssql.service.ts)
   - ✅ Oracle (oracle.service.ts)
   - ✅ CockroachDB (cockroachdb.service.ts)
   - ✅ MongoDB (mongodb.service.ts)
   - ✅ SAP HANA (sap.service.ts)

## 开发流程

### 1. 安装依赖

```bash
# 主项目依赖
npm install

# 安装 VSCode 扩展开发工具
npm install -g vsce
```

### 2. 构建项目

```bash
# 构建所有组件
npm run build:all

# 单独构建
npm run build              # 构建主项目
npm run build:vscode        # 构建 WebView 资源
npm run build:vscode:extension  # 构建 VSCode 扩展
```

### 3. 开发模式

```bash
# 在一个终端启动 VSCode 扩展监听
cd packages/vscode
npm run watch

# 在另一个终端启动 WebView 资源监听
vite build --config vite.config.vscode.ts --watch
```

### 4. 调试扩展

1. 在 VSCode 中打开 `db_tool/packages/vscode` 目录
2. 按 `F5` 启动扩展开发主机
3. 在新的 VSCode 窗口中测试扩展功能

### 5. 打包扩展

```bash
npm run vscode:package
```

## 核心组件说明

### 1. server/ - 现有数据库服务

这是项目的核心，包含所有数据库操作逻辑：

- `ConnectionService`: 管理数据库连接配置和连接实例
- `DatabaseService`: 提供所有数据库操作接口
- `*Service.ts`: 各数据库类型的具体实现

**这些服务被以下项目共享：**
- ✅ Web 应用（当前）
- ✅ NW.js 桌面应用（当前）
- ✅ VSCode 扩展（新增）

### 2. packages/vscode/ - VSCode 扩展

VSCode 扩展主程序，包含：

- `extension.ts`: 扩展入口点
- `DatabaseServiceBridge`: 服务桥接层（复用 server 服务）
- `DatabaseTreeProvider`: 侧边栏树形视图
- `WebViewProvider`: WebView 面板提供者

### 3. src/platform/vscode/ - Vue WebView 组件

Vue 组件通过桥接层与扩展通信：

- `bridge.ts`: VSCode API 桥接
- `ConnectionPanel.vue`: 连接管理面板
- `QueryPanel.vue`: SQL 查询面板
- `DatabasePanel.vue`: 数据库管理面板

## 功能特性

### 已实现（复用现有服务）

- ✅ 8 种数据库支持（MySQL、PostgreSQL、SQLite、SQL Server、Oracle、CockroachDB、MongoDB、SAP HANA）
- ✅ 连接管理（添加、编辑、删除、测试）
- ✅ 数据库列表查询
- ✅ 表列表查询
- ✅ 表结构查询
- ✅ 表数据查询
- ✅ SQL 查询执行
- ✅ 视图管理
- ✅ 存储过程管理
- ✅ 数据导出（JSON、CSV、SQL、Excel）
- ✅ 侧边栏树形视图
- ✅ WebView 面板通信机制
- ✅ Vue 组件适配 VSCode WebView

### 扩展 UI 特性

- ✅ 连接管理面板
- ✅ SQL 查询面板
- ✅ 数据库管理面板
- ✅ 实时连接状态
- ✅ 查询结果显示
- ✅ 表数据浏览

## VSCode API 桥接

VSCode 扩展通过 `postMessage` 与 WebView 通信：

### 扩展 → WebView

```typescript
panel.webview.postMessage({
  command: 'connections',
  data: connections
});
```

### WebView → 扩展

```typescript
vscode.postMessage({
  command: 'addConnection',
  data: connection
});
```

## 数据流

```
VSCode Extension
    ↓
DatabaseServiceBridge (桥接层)
    ↓
server/service/*.service.ts (现有服务)
    ↓
数据库驱动 (mysql2, pg, sqlite3, etc.)
```

## 配置说明

### VSCode 配置

用户可以在 `settings.json` 中配置：

```json
{
  "fdb2.defaultPort": 3306,
  "fdb2.queryLimit": 100,
  "fdb2.autoReconnect": true
}
```

### 数据存储

连接配置存储在 `~/.fdb2/connections.json`，与桌面应用共享。

## 构建产物

```
packages/vscode/
├── out/              # 编译后的扩展代码
├── resources/
│   └── webview/      # 构建后的 Vue 资源
│       ├── connection.js
│       ├── query.js
│       └── database.js
└── fdb2-vscode-1.0.0.vsix  # 扩展包
```

## 发布流程

### 1. 更新版本号

```bash
cd packages/vscode
npm version patch/minor/major
```

### 2. 构建扩展

```bash
npm run compile
```

### 3. 打包

```bash
vsce package
```

### 4. 发布到市场

```bash
vsce publish
```

## 优势

### 核心功能复用

1. **单一代码库**: 数据库操作逻辑只维护一份
2. **功能同步**: Web 版、桌面版、VSCode 版功能完全一致
3. **Bug 修复**: 一次修复，所有平台受益
4. **快速迭代**: 新功能只需在一个地方实现

### 架构优势

1. **低耦合**: VSCode 扩展通过接口访问服务，不依赖具体实现
2. **易扩展**: 未来可以轻松添加其他平台（如独立 Electron 应用）
3. **易测试**: 服务可以独立于 UI 进行测试
4. **易维护**: 清晰的层次结构，职责明确

## 注意事项

1. **服务复用**: VSCode 扩展直接使用 `server` 下的服务，无需重复实现
2. **WebView 资源**: WebView 中的本地资源需要使用 `webview.asWebviewUri()` 处理
3. **消息安全**: 验证消息来源，防止 XSS 攻击
4. **状态持久化**: 连接配置使用文件存储（与桌面应用共享）
5. **性能优化**: WebView 中的 Vue 应用需要优化，避免内存泄漏
6. **跨平台**: 确保数据库驱动在不同平台可用

## 故障排除

### WebView 无法加载

检查 `localResourceRoots` 配置是否正确：

```typescript
localResourceRoots: [
  vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'webview'))
]
```

### 消息通信失败

确保消息发送方和接收方的命令名称一致。

### 数据库连接失败

检查：
- 连接配置是否正确
- 数据库驱动是否安装
- 防火墙设置
- `~/.fdb2/connections.json` 权限

### 服务未找到错误

确保 `server/service/` 目录已编译（`npm run build-server`）

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. 优先在 `server/service/` 中实现核心功能
2. VSCode 扩展通过桥接层调用服务
3. 确保功能在所有平台上都能正常工作
4. 提交前运行 `npm run build:all` 确保构建成功

## 许可证

MIT License
