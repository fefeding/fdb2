# Changelog

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
