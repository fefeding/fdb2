# fdb2 VSCode Extension

fBDB2 的 VSCode 扩展版本，提供强大的数据库管理功能。

## 功能特性

- 📊 支持多种数据库：MySQL、PostgreSQL、SQLite、SQL Server、Oracle 等
- 🔌 连接管理：添加、编辑、删除、测试数据库连接
- 💻 SQL 查询：内置 SQL 编辑器，支持快速查询
- 🗄️ 数据库管理：浏览数据库、表、视图结构
- 📋 表数据查看：快速浏览表数据
- 🎨 美观的 UI：基于 Vue 3 的现代化界面
- ⚡ 高性能：优化的查询和渲染性能

## 快速开始

### 安装扩展

从 VSCode 扩展市场搜索 "fdb2" 或手动安装 `.vsix` 文件。

### 添加连接

1. 点击左侧活动栏的数据库图标
2. 点击 "+" 按钮添加连接
3. 填写连接信息
4. 测试连接
5. 保存连接

### 执行查询

1. 点击侧边栏的连接
2. 点击 "打开查询面板"
3. 输入 SQL 语句
4. 按 Ctrl+Enter 执行

## 使用说明

详细使用说明请参考 [主项目 README](../../README.md)。

## 开发

### 构建扩展

```bash
npm run build:all
```

### 开发模式

```bash
npm run vscode:dev
```

### 打包

```bash
npm run vscode:package
```

## 许可证

MIT License
