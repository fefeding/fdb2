# Changelog

## 1.2.27

- **扩展内引导评分（冲量）**：
  - 新增命令 `Database Tool: Rate fdb2`，一键打开 Marketplace 评分页
  - 第 3 次激活后温和弹窗询问评分（`globalState` 记录状态，仅问一次，可「不再询问」），不收集任何数据
- **市场页截图增强**：README 新增 Screenshots 区块，复用桌面端同款 web UI 截图（连接浏览器、SQL 编辑器、可排序数据网格），并加入「评分/反馈」引导区块
- 注：本次为纯元数据 + 宿主命令改动，不涉及 webview 资源加载方式

## 1.2.26

- **市场 SEO / 可发现性优化**（纯元数据，无功能改动）：
  - `displayName` 改为 `Database Client (fdb2) - SQL Editor for MySQL, PostgreSQL, SQLite, MongoDB`，描述前置高意图关键词
  - `keywords` 由 11 个扩充至 28 个（含 `sql client`/`database explorer`/`db client`/`table editor`、各数据库名、`dbeaver alternative`/`navicat alternative` 及中文 `数据库`/`数据库客户端`）
  - `package.json` 新增 `galleryBanner`、`homepage`、`bugs` 展示字段
  - `README.md` 重写开篇为关键词密集的导引，新增「9+ 数据库支持表」、长尾 FAQ 与中文说明，并把开发/构建/发布说明收拢至末尾 *For contributors*
  - 根 `README.md` 同步插件名并加入 Marketplace 直达链接

## 1.2.25

- **数据库树按类型着色徽章**：连接节点不再统一使用 `database` 主题图标，改为内联 SVG 徽章（M/P/CR/O/MS/MG/CH/S/H），配色与各数据库品牌一致；数据库节点图标改为圆柱体
- **多数据库方言支持与端到端修复**：
  - Oracle：修复 `getDatabases` 返回 null、占位符、分页、保留字别名、自增列、列名大小写等问题
  - CockroachDB：修正 schema 过滤、`getIndexes` 语法、pg 数组解析
  - ClickHouse：补齐无事务连接降级，端到端验证通过
  - MSSQL/SQLite：导出 Schema 容错，MSSQL 注释幂等
  - SAP HANA：缺驱动时给出明确安装提示，标记为实验性
- **MongoDB**：首次插入后刷新结构，避免空集合看不到列头
- 新增端到端验证脚本 `scripts/verify-db-support.cjs` 及对应单测
