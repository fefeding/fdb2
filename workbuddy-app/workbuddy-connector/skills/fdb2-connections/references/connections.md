# 连接参数速查

## 支持的数据库类型
| type | 默认端口 | host 示例 | database 填法 |
|---|---|---|---|
| mysql | 3306 | 127.0.0.1 | 库名，如 `app` |
| postgres | 5432 | 127.0.0.1 | 库名，如 `app` |
| sqlite | - | 无需 host | `.db` 文件绝对路径 |
| oracle | 1521 | 127.0.0.1 | 服务名/SID |
| mssql | 1433 | 127.0.0.1 | 库名 |
| cockroachdb | 26257 | 127.0.0.1 | 库名 |
| mongodb | 27017 | 127.0.0.1 | 库名（实验性） |
| sap | 39013 | 127.0.0.1 | 租户库名 |

## 参考命令
```bash
fdb2 conn add --name local-mysql --type mysql --host 127.0.0.1 \
  --port 3306 --database app --username root --password-stdin
fdb2 conn test local-mysql --json
fdb2 conn use local-mysql
```

## 默认连接与只读配置
```bash
fdb2 config show --json          # 查看数据目录、默认连接、只读开关
fdb2 config set readonly true    # 打开全局只读（写操作需 --write）
fdb2 config set maxRows 2000     # 查询行数上限
```
