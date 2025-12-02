# Oracle和SQL Server支持说明

## 更新内容

### 1. 前端Service路由同步更新

已将前端`web/src/service/database.ts`中的所有API路由同步更新为行为命名风格：

#### 路由对照表：
| 功能 | 旧路由 | 新路由 |
|------|--------|--------|
| 获取连接列表 | `/api/database/connections` | `/api/database/getConnections` |
| 获取单个连接 | `/api/database/connections/:id` | `/api/database/getConnection/:id` |
| 添加连接 | `/api/database/connections` | `/api/database/addConnection` |
| 更新连接 | `/api/database/connections/:id` | `/api/database/updateConnection/:id` |
| 删除连接 | `/api/database/connections/:id` | `/api/database/deleteConnection/:id` |
| 测试连接 | `/api/database/connections/test` | `/api/database/testConnection` |
| 获取数据库类型 | `/api/database/types` | `/api/database/getSupportedDatabaseTypes` |
| 获取数据库列表 | `/api/database/connections/:id/databases` | `/api/database/getDatabases/:id` |
| 获取数据库信息 | `/api/database/connections/:id/databases/:db` | `/api/database/getDatabaseInfo/:id/:db` |
| 获取表列表 | `/api/database/connections/:id/databases/:db/tables` | `/api/database/getTables/:id/:db` |
| 获取表信息 | `/api/database/connections/:id/databases/:db/tables/:table` | `/api/database/getTableInfo/:id/:db/:table` |
| 获取表数据 | `/api/database/connections/:id/databases/:db/tables/:table/data` | `/api/database/getTableData/:id/:db/:table` |
| 执行查询 | `/api/database/connections/:id/query` | `/api/database/executeQuery/:id` |
| 关闭连接 | `/api/database/connections/:id/close` | `/api/database/closeConnection/:id` |
| 导出数据 | `/api/database/connections/:id/databases/:db/tables/:table/export` | `/api/database/exportTableData/:id/:db/:table` |

### 2. Oracle数据库支持

#### 新增文件：`src/service/database/oracle.service.ts`

**支持功能：**
- ✅ 数据库列表（用户schemas）
- ✅ 表结构查询
- ✅ 列信息（包括主键、数据类型、精度等）
- ✅ 索引信息（区分主键索引）
- ✅ 外键信息
- ✅ 数据查询和SQL执行
- ✅ 连接测试

**特性：**
- 使用`all_users`, `all_tables`等系统视图
- 支持Oracle标识符大写规范
- 支持Oracle特有数据类型（如NUMBER with precision/scale）
- 获取表统计信息（行数、大小）

#### 连接配置：
```typescript
{
  type: 'oracle',
  host: 'localhost',
  port: 1521,
  database: 'ORCL',  // SID
  username: 'user',
  password: 'password'
}
```

### 3. SQL Server数据库支持

#### 新增文件：`src/service/database/mssql.service.ts`

**支持功能：**
- ✅ 数据库列表（排除系统数据库）
- ✅ 表结构查询
- ✅ 列信息（包括自增主键标识）
- ✅ 索引信息（区分主键和普通索引）
- ✅ 外键信息
- ✅ 数据查询和SQL执行
- ✅ 连接测试

**特性：**
- 使用`sys.databases`, `sys.tables`等系统表
- 支持SQL Server标识符方括号引用
- 支持IDENTITY自增列检测
- 获取表统计信息（行数、数据大小）

#### 连接配置：
```typescript
{
  type: 'mssql',
  host: 'localhost',
  port: 1433,
  database: 'DatabaseName',
  username: 'sa',
  password: 'password'
}
```

### 4. 依赖更新

新增数据库驱动包：
```json
{
  "oracledb": "^6.3.0",
  "sqlserver": "^1.4.0"
}
```

### 5. 数据库特性矩阵

| 特性 | MySQL | PostgreSQL | SQLite | Oracle | SQL Server |
|------|-------|------------|--------|--------|-----------|
| 数据库列表 | ✅ | ✅ | ❌ | ✅ | ✅ |
| 表结构查询 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 列信息 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 索引信息 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 外键信息 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 数据查询 | ✅ | ✅ | ✅ | ✅ | ✅ |
| SQL执行 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 数据库大小 | ✅ | ✅ | ❌ | ✅ | ✅ |
| 自增主键 | ✅ | ✅ | ✅ | ❌* | ✅ |
| 存储过程 | ✅ | ✅ | ❌ | ✅ | ✅ |
| 触发器 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 视图 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 全文搜索 | ✅ | ✅ | ✅ | ✅ | ✅ |
| JSON支持 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 数组类型 | ❌ | ✅ | ❌ | ❌ | ❌ |
| 枚举类型 | ❌ | ✅ | ❌ | ❌ | ❌ |
| 序列支持 | ❌ | ❌ | ❌ | ✅ | ❌ |
| 同义词 | ❌ | ❌ | ❌ | ✅ | ❌ |

*注：Oracle使用序列(SQUENCE)代替自增主键

### 6. 支持的数据库类型更新

现在支持的数据库类型包括：
- MySQL
- PostgreSQL  
- SQLite
- Oracle
- SQL Server

每个数据库类型都包含：
- 默认端口配置
- 数据库特性支持矩阵
- 专门的连接配置处理

### 7. API使用示例

```typescript
// 获取所有支持的数据库类型
const dbTypes = await databaseService.getSupportedDatabaseTypes();

// 测试Oracle连接
const oracleConnection = {
  type: 'oracle',
  host: 'localhost',
  port: 1521,
  database: 'ORCL',
  username: 'scott',
  password: 'tiger'
};
const testResult = await connectionService.testConnection(oracleConnection);

// 获取Oracle数据库列表
const databases = await databaseService.getDatabases(connectionId);

// 获取SQL Server表列表
const tables = await databaseService.getTables(connectionId, 'MyDatabase');
```

这次更新使数据库管理工具具备了企业级数据库支持能力，覆盖了主流的关系型数据库系统。