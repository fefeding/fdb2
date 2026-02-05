# fdb2 VSCode 扩展开发指南

## 项目结构

```
db_tool/
├── packages/
│   ├── core/              # 共享核心数据库服务
│   │   ├── src/
│   │   │   ├── database/  # 数据库连接实现
│   │   │   └── typings/   # 类型定义
│   │   └── package.json
│   └── vscode/            # VSCode 扩展
│       ├── src/
│       │   ├── extension.ts
│       │   ├── provider/   # 树形视图和 WebView 提供者
│       │   └── service/   # 连接管理等服务
│       ├── resources/
│       │   └── webview/   # WebView 前端资源
│       └── package.json
├── src/
│   └── platform/
│       └── vscode/        # Vue WebView 组件
│           ├── bridge.ts   # VSCode API 桥接
│           ├── components/
│           └── entry/
└── vite.config.vscode.ts  # VSCode WebView 构建配置
```

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
npm run build:core          # 构建核心服务
npm run build:vscode        # 构建 WebView 资源
npm run build:vscode:extension  # 构建 VSCode 扩展
```

### 3. 开发模式

```bash
# 在一个终端启动 VSCode 扩展监听
npm run vscode:dev

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

这将生成 `.vsix` 文件，可以安装到 VSCode 中。

## 核心组件说明

### 1. packages/core

共享的数据库服务层，提供：
- `DatabaseConnection`: 数据库连接基类
- `MySQLConnection`: MySQL 实现
- `ConnectionManager`: 连接管理器

### 2. packages/vscode

VSCode 扩展主程序，包含：
- `extension.ts`: 扩展入口点
- `DatabaseTreeProvider`: 侧边栏树形视图
- `WebViewProvider`: WebView 面板提供者
- `ConnectionManager`: 连接管理（持久化）

### 3. src/platform/vscode

Vue WebView 组件，通过桥接层与扩展通信：
- `bridge.ts`: VSCode API 桥接
- `ConnectionPanel.vue`: 连接管理面板
- `QueryPanel.vue`: SQL 查询面板
- `DatabasePanel.vue`: 数据库管理面板

## 功能特性

### 已实现

- [x] VSCode 扩展基础架构
- [x] 侧边栏数据库连接树形视图
- [x] WebView 面板通信机制
- [x] 连接管理（添加、编辑、删除、测试）
- [x] SQL 查询面板
- [x] 数据库管理面板
- [x] Vue 组件适配 VSCode WebView
- [x] 共享核心数据库服务层

### 待实现

- [ ] PostgreSQL、SQLite 等其他数据库连接
- [ ] 真实的数据库查询集成
- [ ] 表数据查看和编辑
- [ ] 表结构查看
- [ ] SQL 格式化和语法高亮
- [ ] 查询历史记录
- [ ] 数据导出功能
- [ ] 智能提示和自动补全

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

## 注意事项

1. **WebView 资源**: WebView 中的本地资源需要使用 `webview.asWebviewUri()` 处理
2. **消息安全**: 验证消息来源，防止 XSS 攻击
3. **状态持久化**: 使用 VSCode 的 `globalState` 存储连接配置
4. **性能优化**: WebView 中的 Vue 应用需要优化，避免内存泄漏
5. **跨平台**: 确保数据库驱动在不同平台可用

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

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
