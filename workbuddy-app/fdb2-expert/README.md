# FDB2 数据库助手（WorkBuddy 专家）

用自然语言管理个人数据库的专家，预加载 4 个 FDB2 技能：

- `fdb2-connections`：连接管理（list/add/test/use/update/remove）
- `fdb2-explore`：只读浏览（库/表/列/索引、行查询、导出）
- `fdb2-write`：行级数据写入（insert/update/delete/import，双阶段确认）
- `fdb2-admin`：库表与运维（DDL、导入导出、备份恢复、SQL 脚本）

## 目录结构

```
fdb2-expert/
├── .codebuddy-plugin/
│   └── plugin.json        # 专家核心配置
├── avatars/
│   └── expert.png         # 头像（512×512）
├── agents/
│   └── fdb2-db-expert.md  # Agent 定义与系统提示词
└── README.md
```

## 依赖

专家运行依赖本地 `fdb2` CLI（由 `workbuddy-connector` 声明）。首次使用需 `fdb2 auth` 完成连接配置。
