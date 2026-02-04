# fdb2 - 数据库管理工具

一款轻量级、跨平台的数据库管理工具，支持多种数据库类型，提供类似 Navicat Premium 的使用体验。

## 快速开始

### 安装

```bash
# 全局安装（推荐）
npm install -g fdb2

# 或使用 yarn
yarn global add fdb2

# 或使用 pnpm
pnpm add -g fdb2
```

### 启动服务

```bash
# 启动数据库管理工具
fdb2 start

# 停止服务
fdb2 stop

# 查看服务状态
fdb2 status

# 重启服务
fdb2 restart
```

### 访问应用

启动服务后，在浏览器中打开（具体路径请看输出的信息，端口有可能变化）：
```
http://localhost:9800
```

## 功能特性

### 连接管理
- 支持 8 种数据库类型：MySQL、PostgreSQL、SQLite、SQL Server、Oracle、CockroachDB、MongoDB、SAP HANA
- 可视化连接配置界面，操作简单直观
- 一键测试连接，快速验证配置
- 连接信息本地安全存储，无需重复输入

### 数据库结构
- 清晰的数据库信息概览
- 详细的表结构查看
- 完整的列信息、索引、外键关系展示
- 实时显示数据库大小和统计信息

### 数据操作
- 表数据快速查看和分页浏览
- 灵活的条件查询和排序
- 便捷的数据插入、编辑、删除
- 支持导出数据为 JSON、CSV 格式

### SQL 查询
- 代码编辑器风格的 SQL 输入框
- SQL 语法格式化，提升可读性
- 自动保存查询历史记录
- 批量查询结果展示

### 核心优势
- **零配置启动**：全局安装后即可使用，无需复杂配置
- **跨平台支持**：Windows、macOS、Linux 全平台兼容
- **轻量高效**：资源占用低
- **本地存储**：数据保存在本地，安全可靠
- **离线使用**：无需联网即可管理本地数据库

## 使用指南

### 添加数据库连接

1. 打开浏览器访问 `http://localhost:9800`
2. 点击左侧导航的"连接管理"
3. 点击"新增连接"按钮
4. 填写连接信息：
   - **连接名称**：自定义名称，便于识别（如：生产环境 MySQL）
   - **数据库类型**：选择对应的数据库类型
   - **主机地址**：数据库服务器地址（本地数据库使用 `localhost` 或 `127.0.0.1`）
   - **端口**：数据库服务端口（会自动填充默认端口）
   - **数据库名称**：要连接的数据库名
   - **用户名/密码**：数据库认证信息
5. 点击"测试连接"验证配置是否正确
6. 保存连接配置

### 查看数据库结构

1. 在左侧导航选择"数据库结构"
2. 选择已配置的数据库连接
3. 选择要查看的数据库
4. 浏览表列表和详细信息：
   - **表基本信息**：行数、大小等统计信息
   - **列定义**：数据类型、约束、默认值等
   - **索引信息**：主键、唯一索引、普通索引
   - **外键关系**：表之间的关联关系

### 查看和编辑表数据

1. 在表列表中点击"数据"按钮
2. 设置查询条件：
   - **WHERE 条件**：输入过滤条件（如：`id > 100`）
   - **排序字段**：指定排序方式（如：`create_time DESC`）
   - **每页显示**：调整分页大小（10/50/100/500）
3. 点击"查询"按钮执行查询
4. 支持的操作：
   - **查看详情**：点击行查看完整数据
   - **编辑记录**：修改数据后保存
   - **删除记录**：删除不需要的数据
   - **插入新数据**：点击"新增"按钮添加数据
   - **导出数据**：选择 JSON 或 CSV 格式导出

### 执行 SQL 查询

1. 点击左侧导航的"SQL 查询"
2. 选择数据库连接
3. 在编辑器中输入 SQL 语句
4. 快捷操作：
   - **Ctrl + Enter**（Windows）或 **Cmd + Enter**（Mac）：快速执行
   - 点击"格式化"按钮：美化 SQL 语句
   - 查看历史记录：点击历史记录按钮选择之前的查询
5. 查看查询结果，支持导出功能

### 常用 SQL 示例

```sql
-- 查询表前 10 条数据
SELECT * FROM table_name LIMIT 10;

-- 按条件查询
SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC;

-- 统计数据
SELECT COUNT(*) as total, status FROM users GROUP BY status;

-- 插入数据
INSERT INTO users (name, email, status) VALUES ('张三', 'zhangsan@example.com', 'active');

-- 更新数据
UPDATE users SET status = 'inactive' WHERE last_login < '2024-01-01';

-- 删除数据
DELETE FROM logs WHERE created_at < '2024-01-01';
```

## 支持的数据库类型

| 数据库类型 | 默认端口 | 特性 |
|-----------|---------|------|
| MySQL | 3306 | 支持存储过程、触发器、视图、全文搜索 |
| PostgreSQL | 5432 | 支持存储过程、触发器、视图、JSON 类型 |
| SQLite | - | 轻量级，文件型数据库，无需服务器 |
| SQL Server | 1433 | 微软数据库，支持存储过程、触发器、视图 |
| Oracle | 1521 | 企业级数据库，功能强大 |
| CockroachDB | 26257 | 分布式 SQL 数据库，兼容 PostgreSQL |
| MongoDB | 27017 | NoSQL 文档数据库 |
| SAP HANA | 39013 | 内存数据库，高性能分析 |

**兼容性说明**：
- MariaDB、TiDB 兼容 MySQL，选择 MySQL 类型即可
- Aurora MySQL 兼容 MySQL，选择 MySQL 类型即可
- Aurora PostgreSQL 兼容 PostgreSQL，选择 PostgreSQL 类型即可
- Better-SQLite3 兼容 SQLite，选择 SQLite 类型即可

## 常见问题

### 安装和启动

**Q: 安装后无法启动服务？**

A: 请检查以下几点：
1. 确认已正确安装：`npm install -g fdb2`
2. 检查 Node.js 版本（建议 v14 或更高）：`node --version`
3. 查看错误信息：`fdb2 start --verbose`
4. 检查端口是否被占用

**Q: 如何更换端口？**

A: 可以通过环境变量设置端口：
```bash
# Windows
set PORT=8080
fdb2 start

# Mac/Linux
PORT=8080 fdb2 start
```

### 连接问题

**Q: 连接数据库失败怎么办？**

A: 请按以下步骤排查：
1. 确认数据库服务正在运行
2. 检查网络连接和端口是否正确
3. 验证用户名和密码是否正确
4. 检查数据库是否允许远程连接
5. 查看数据库防火墙设置

**Q: SQLite 数据库连接失败？**

A: SQLite 连接需要提供数据库文件路径：
- 绝对路径：`D:\data\mydb.sqlite`
- 相对路径：`./data/mydb.sqlite`（相对于数据目录）
- 确保文件存在且有读取权限

### 数据操作

**Q: 查询结果为空？**

A: 可能的原因：
1. 表中确实没有数据
2. WHERE 条件过于严格
3. 数据库名称或表名错误
4. 查询权限不足

**Q: 无法编辑或删除数据？**

A: 请检查：
1. 是否有足够的数据库权限
2. 表是否有外键约束
3. 数据是否被锁定
4. 查看数据库错误日志

### 性能问题

**Q: 查询速度很慢？**

A: 优化建议：
1. 添加适当的索引
2. 限制查询结果数量（使用 LIMIT）
3. 避免使用 `SELECT *`，只查询需要的字段
4. 优化 WHERE 条件
5. 考虑分批处理大数据量

**Q: 数据库信息加载很慢？**

A: 可能的原因：
1. 数据库中表数量过多
2. 表数据量过大
3. 网络延迟
4. 数据库性能问题

### 数据安全

**Q: 连接密码安全吗？**

A: 当前版本密码以明文形式存储在本地配置文件中。建议：
1. 不要在公共电脑上保存敏感数据库连接
2. 定期更换数据库密码
3. 使用只读权限的账号进行日常操作
4. 生产环境建议使用加密连接（SSL/TLS）

**Q: 如何备份数据库连接配置？**

A: 复制配置文件即可：
```bash
# Windows
copy C:\Users\用户名\.db-tool\connections.json D:\backup\

# Mac/Linux
cp ~/.db-tool/connections.json ~/backup/
```

### 更新和卸载

**Q: 如何更新到最新版本？**

A: 重新安装即可：
```bash
npm update -g fdb2
```

**Q: 如何完全卸载？**

A: 执行以下步骤：
```bash
# 卸载程序
npm uninstall -g fdb2

# 删除数据目录（可选，会删除所有连接配置）
# Windows
rmdir /s C:\Users\用户名\.db-tool

# Mac/Linux
rm -rf ~/.db-tool
```

## 获取帮助

- **GitHub Issues**: [提交问题](https://github.com/fefeding/fdb2/issues)
- **文档**: 查看在线文档
- **社区**: 加入用户交流群

---

**享受使用 fdb2 数据库管理工具！如有任何问题，欢迎反馈。**
