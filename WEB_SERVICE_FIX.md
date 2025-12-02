# Web端Service修复说明

## 修复内容

### 问题说明
db_tool项目的web端`service/database.ts`中使用了错误的请求写法：
- ❌ **错误用法**: 继承`BaseAjax`类并使用`this.get()`, `this.post()`
- ✅ **正确用法**: 使用`@/service/base.ts`中的`request()`函数

### 修复详情

#### 1. 移除BaseAjax继承

**修复前：**
```typescript
import { BaseAjax } from '@/adapter/ajax';
export class ConnectionService extends BaseAjax {
  async getAllConnections() {
    return this.get('/api/database/getConnections');
  }
}
```

**修复后：**
```typescript
import { request } from '@/service/base';
export class ConnectionService {
  async getAllConnections() {
    return request('/api/database/getConnections');
  }
}
```

#### 2. 正确使用request函数

**request函数的工作原理：**
- 默认使用POST方法
- 当需要GET请求时，会在option中指定`method: 'get'`
- 参数自动处理：GET请求转为params，POST请求作为body

**修复的请求方式：**

1. **GET请求（查询类）：**
```typescript
// 正确的GET请求
async getConnectionById(id: string) {
  return request(`/api/database/getConnection/${id}`); // GET方法
}

// 错误的方式
async getDatabases(id: string) {
  return request(`/api/database/getDatabases/${id}`, { page: 1 }); // 会被当作POST
}
```

2. **POST请求（操作类）：**
```typescript
// 正确的POST请求
async addConnection(connection: ConnectionEntity) {
  return request('/api/database/addConnection', connection); // POST方法，数据在body中
}
```

3. **带查询参数的GET请求：**
```typescript
async getTableData(id, db, table, params) {
  return request(`/api/database/getTableData/${id}/${db}/${table}`, params); // 转为GET + params
}
```

### 3. 修复的方法列表

#### ConnectionService类：
- ✅ `getAllConnections()` - GET请求
- ✅ `getConnectionById()` - GET请求
- ✅ `addConnection()` - POST请求
- ✅ `updateConnection()` - POST请求
- ✅ `deleteConnection()` - POST请求
- ✅ `testConnection()` - POST请求
- ✅ `getDatabaseTypes()` - GET请求

#### DatabaseService类：
- ✅ `getDatabases()` - GET请求
- ✅ `getDatabaseInfo()` - GET请求
- ✅ `getTables()` - GET请求
- ✅ `getTableInfo()` - GET请求
- ✅ `getTableData()` - GET请求（带查询参数）
- ✅ `executeQuery()` - POST请求
- ✅ `closeConnection()` - POST请求
- ✅ `exportTableData()` - GET请求（带查询参数）

### 4. request函数参数格式

| 请求类型 | 参数传递方式 | 示例 |
|----------|--------------|-------|
| GET无参数 | `request(url)` | `request('/api/data')` |
| GET带参数 | `request(url, params)` | `request('/api/data', {page: 1})` |
| POST有数据 | `request(url, data)` | `request('/api/data', {name: 'test'})` |
| 自定义配置 | `request(url, data, options)` | `request('/api/data', {}, {method: 'get'})` |

### 5. 完整的Service示例

```typescript
import { request } from '@/service/base';
import type { ConnectionEntity } from '@/typings/database';

export class DatabaseService {
  // 简单GET请求
  async getDatabases(connectionId: string) {
    return request(`/api/database/getDatabases/${connectionId}`);
  }

  // 带参数的GET请求
  async getTableData(connectionId: string, databaseName: string, tableName: string, page = 1) {
    const params = { page, pageSize: 20 };
    return request(`/api/database/getTableData/${connectionId}/${databaseName}/${tableName}`, params);
  }

  // POST请求
  async executeQuery(connectionId: string, sql: string) {
    return request(`/api/database/executeQuery/${connectionId}`, { sql });
  }

  // 带配置的请求
  async customRequest(url: string, data: any) {
    return request(url, data, {
      method: 'GET', // 强制使用GET
      timeout: 60000
    });
  }
}
```

### 6. 注意事项

#### ✅ 正确做法：
- 对于查询类API使用GET请求：`request(url)`或`request(url, params)`
- 对于操作类API使用POST请求：`request(url, data)`
- 带查询参数的GET请求：`request(url, queryParams)`

#### ❌ 错误做法：
- 不要继承BaseAjax类（在db_tool项目中不存在）
- 不要使用`this.get()`, `this.post()`（BaseAjax的方法）
- 不要手动构造axios请求（应使用统一的request函数）

### 7. 兼容性说明

这次修复确保了：
- ✅ 与脚手架的请求方式完全一致
- ✅ 自动包含认证token
- ✅ 自动处理请求拦截和错误处理
- ✅ 支持请求去重和取消功能
- ✅ 统一的错误消息处理

现在web端的API调用与后端路由完全匹配，可以正常进行数据库管理操作。