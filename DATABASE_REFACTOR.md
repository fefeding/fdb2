# 数据库服务重构说明

## 重构内容

### 1. Controller 路由命名规范化

将所有路由从RESTful风格改为行为命名风格，提高API的可读性：

#### 修改前：
```
GET    /api/database/connections              → getConnection
GET    /api/database/connections/:id          → getConnection
POST   /api/database/connections              → addConnection
POST   /api/database/connections/:id          → updateConnection/deleteConnection
POST   /api/database/connections/test        → testConnection
```

#### 修改后：
```
GET    /api/database/getConnections          → 获取连接列表
GET    /api/database/getConnection/:id        → 获取单个连接
POST   /api/database/addConnection           → 添加连接
POST   /api/database/updateConnection/:id     → 更新连接
POST   /api/database/deleteConnection/:id     → 删除连接
POST   /api/database/testConnection           → 测试连接
```

### 2. 数据库服务抽象重构

创建了完整的数据库服务抽象层，支持多种数据库类型的实现：

#### 目录结构：
```
src/service/database/
├── base.service.ts          # 基础抽象类
├── mysql.service.ts         # MySQL实现
├── postgres.service.ts      # PostgreSQL实现
├── sqlite.service.ts        # SQLite实现
├── database.service.ts      # 服务管理器
└── index.ts               # 导出文件
```

#### 类设计：

1. **BaseDatabaseService (抽象基类)**
   - 定义所有数据库的通用接口
   - 实现公共方法（如获取表数据、执行SQL等）
   - 提供工具方法（如标识符引用、分页构建等）

2. **具体实现类**
   - `MySQLService` - MySQL数据库实现
   - `PostgreSQLService` - PostgreSQL数据库实现
   - `SQLiteService` - SQLite数据库实现

3. **DatabaseService (服务管理器)**
   - 根据数据库类型选择相应的服务实现
   - 统一的服务入口点
   - 提供数据库特性信息

#### 优势：

✅ **高扩展性** - 新增数据库类型只需继承BaseDatabaseService
✅ **代码复用** - 通用逻辑在基类中实现
✅ **类型安全** - 完整的TypeScript支持
✅ **易于维护** - 每种数据库的实现独立
✅ **统一接口** - 外部调用方式保持一致

## API 路由对照表

| 功能 | 旧路由 | 新路由 | 说明 |
|------|--------|--------|------|
| 获取连接列表 | GET /connections | GET /getConnections | 获取所有连接配置 |
| 获取单个连接 | GET /connections/:id | GET /getConnection/:id | 根据ID获取连接 |
| 添加连接 | POST /connections | POST /addConnection | 添加新连接配置 |
| 更新连接 | POST /connections/:id | POST /updateConnection/:id | 更新连接配置 |
| 删除连接 | POST /connections/:id | POST /deleteConnection/:id | 删除连接配置 |
| 测试连接 | POST /connections/test | POST /testConnection | 测试数据库连接 |
| 获取数据库列表 | GET /connections/:id/databases | GET /getDatabases/:id | 获取数据库列表 |
| 获取数据库信息 | GET /connections/:id/databases/:db | GET /getDatabaseInfo/:id/:db | 获取数据库详情 |
| 获取表列表 | GET /connections/:id/databases/:db/tables | GET /getTables/:id/:db | 获取表列表 |
| 获取表信息 | GET /connections/:id/databases/:db/tables/:table | GET /getTableInfo/:id/:db/:table | 获取表详情 |
| 获取表数据 | GET /connections/:id/databases/:db/tables/:table/data | GET /getTableData/:id/:db/:table | 获取表数据 |
| 执行查询 | POST /connections/:id/query | POST /executeQuery/:id | 执行SQL查询 |
| 关闭连接 | POST /connections/:id/close | POST /closeConnection/:id | 关闭数据库连接 |
| 导出数据 | GET /connections/:id/databases/:db/tables/:table/export | GET /exportTableData/:id/:db/:table | 导出表数据 |
| 获取数据库类型 | GET /types | GET /getSupportedDatabaseTypes | 获取支持的类型 |

## 数据库支持矩阵

| 特性 | MySQL | PostgreSQL | SQLite |
|------|-------|------------|--------|
| 数据库列表 | ✅ | ✅ | ❌ |
| 表结构查询 | ✅ | ✅ | ✅ |
| 列信息 | ✅ | ✅ | ✅ |
| 索引信息 | ✅ | ✅ | ✅ |
| 外键信息 | ✅ | ✅ | ✅ |
| 数据查询 | ✅ | ✅ | ✅ |
| SQL执行 | ✅ | ✅ | ✅ |
| 数据库大小 | ✅ | ✅ | ❌ |

## 使用示例

```typescript
// 获取服务实例
const databaseService = container.get(DatabaseService);

// 根据数据库类型自动选择相应实现
const tables = await databaseService.getTables(connectionId, databaseName);

// 执行查询
const result = await databaseService.executeQuery(connectionId, sql);
```

## 扩展新数据库类型

如需添加新的数据库类型（如SQL Server），只需：

1. 创建新的服务类继承 `BaseDatabaseService`
2. 实现所有抽象方法
3. 在 `DatabaseService` 中注册新类型
4. 更新支持列表

示例：
```typescript
@Provide()
export class SQLServerService extends BaseDatabaseService {
  getDatabaseType(): string {
    return 'mssql';
  }
  
  // 实现其他抽象方法...
}
```

这次重构大幅提升了代码的可维护性和扩展性，同时保持了API的简洁性和一致性。