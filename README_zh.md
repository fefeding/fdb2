# fdb2 - 跨平台数据库管理工具

[English](README.md) | 中文

> 🚀 一款轻量级、开源的数据库管理工具，支持 8+ 种数据库类型，提供类似 Navicat Premium 的专业体验，完全免费且本地运行！

![fdb2 界面预览](public/fdb2.png)

## 🚀 快速开始

### 📥 安装方式

#### 💻 桌面客户端 (推荐)
直接下载预构建的跨平台桌面应用，开箱即用：
- **[Windows / macOS / Linux 客户端下载](https://github.com/fefeding/fdb2/releases/tag/client)**
- 解压后双击运行，无需任何环境配置

#### 📦 命令行工具
通过 npm/yarn/pnpm 全局安装：
```bash
# npm (推荐)
npm install -g fdb2

# yarn
yarn global add fdb2

# pnpm
pnpm add -g fdb2
```

### ▶️ 启动服务

```bash
# 启动数据库管理工具
fdb2 start

# 指定端口启动
fdb2 start -p 8080

# 停止服务
fdb2 stop

# 查看服务状态
fdb2 status

# 重启服务
fdb2 restart
```

### 🌐 访问应用

启动成功后，在浏览器中打开（具体端口请查看启动日志）：
```
http://localhost:9800
```

> 💡 **提示**: 默认端口为 9800，如果被占用会自动选择其他可用端口

## 🔥 核心特性

### 🌐 多数据库支持
- **8+ 数据库类型**: MySQL、PostgreSQL、SQLite、SQL Server、Oracle、CockroachDB、MongoDB、SAP HANA
- **兼容性扩展**: MariaDB/TiDB/Aurora 兼容 MySQL，Aurora PostgreSQL 兼容 PostgreSQL
- **NoSQL 支持**: MongoDB 文档数据库

### 🎯 专业功能
- **连接管理**: 可视化配置、一键测试、本地安全存储
- **结构浏览**: 表结构、索引、外键、视图、存储过程完整展示
- **数据操作**: CRUD 操作、条件查询、分页浏览、批量导入导出
- **SQL 编辑器**: 语法高亮、自动补全、格式化、历史记录
- **性能监控**: 实时连接状态、查询性能分析、慢查询检测

### ⚡ 核心优势
- **零配置启动**: 全局安装后立即使用，无需复杂配置
- **跨平台支持**: Windows、macOS、Linux 全平台兼容
- **轻量高效**: 资源占用极低，启动速度快
- **本地存储**: 所有数据保存在本地，安全可靠
- **离线使用**: 无需联网即可管理本地和远程数据库
- **完全开源**: MIT 许可证，自由使用和贡献

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

## 📊 支持的数据库类型

| 数据库类型 | 默认端口 | 主要特性 |
|-----------|---------|----------|
| **MySQL** | 3306 | 存储过程、触发器、视图、全文搜索、分区表 |
| **PostgreSQL** | 5432 | 存储过程、触发器、视图、JSON/JSONB、窗口函数 |
| **SQLite** | - | 轻量级文件数据库、零配置、嵌入式 |
| **SQL Server** | 1433 | T-SQL、存储过程、CLR 集成、AlwaysOn |
| **Oracle** | 1521 | PL/SQL、RAC、Data Guard、高级安全 |
| **CockroachDB** | 26257 | 分布式 SQL、强一致性、自动分片 |
| **MongoDB** | 27017 | NoSQL 文档数据库、聚合管道、索引 |
| **SAP HANA** | 39013 | 内存数据库、实时分析、列存储 |

### 🔄 兼容性说明
- **MariaDB/TiDB**: 兼容 MySQL 协议，选择 MySQL 类型即可
- **Amazon Aurora MySQL**: 兼容 MySQL，选择 MySQL 类型
- **Amazon Aurora PostgreSQL**: 兼容 PostgreSQL，选择 PostgreSQL 类型
- **Better-SQLite3**: 兼容 SQLite，选择 SQLite 类型

## 常见问题

### 安装和启动

**Q: 安装后无法启动服务？**

A: 请检查以下几点：
1. 确认已正确安装：`npm install -g fdb2`
2. 检查 Node.js 版本（建议 v14 或更高）：`node --version`
3. 查看错误信息：`fdb2 start --verbose`
4. 检查端口是否被占用

**Q: 如何更换端口？**

A: 使用 `-p` 参数指定端口：
```bash
fdb2 start -p 8080
```

也可以通过环境变量设置端口：
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

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 开发环境搭建
```bash
# 克隆仓库
git clone https://github.com/fefeding/fdb2.git
cd fdb2

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

### 贡献流程
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -am 'Add some feature'`)
4. 推送到分支 (`git push origin feature/your-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) - 完全开源，自由使用。

## 🙏 致谢

感谢所有贡献者和用户的支持！特别感谢以下技术栈：
- Vue 3 + TypeScript
- Vite 构建工具
- Bootstrap 5 UI 框架
- vue-i18n 国际化
- Pinia 状态管理

---

**享受使用 fdb2 数据库管理工具！如有任何问题，欢迎在 [GitHub Issues](https://github.com/fefeding/fdb2/issues) 反馈。**