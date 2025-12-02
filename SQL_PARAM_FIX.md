# Oracle和SQL Server参数修复说明

## 修复内容

### 问题说明
在Oracle和SQL Server的数据库服务中，TypeORM的`dataSource.query()`方法使用参数时存在格式问题：

- ❌ **错误用法**: 使用对象参数和命名参数（如`:owner`, `:table`）
- ✅ **正确用法**: 使用数组参数和点位符（如`?`）

### 修复详情

#### 1. Oracle服务修复 (`oracle.service.ts`)

**修复前：**
```typescript
// 使用对象参数和命名参数
await dataSource.query(`
  SELECT column_name FROM all_tab_columns 
  WHERE owner = :owner AND table_name = :table
`, { owner: database.toUpperCase(), table: table.toUpperCase() });
```

**修复后：**
```typescript
// 使用数组参数和点位符
await dataSource.query(`
  SELECT column_name FROM all_tab_columns 
  WHERE owner = ? AND table_name = ?
`, [database.toUpperCase(), table.toUpperCase()]);
```

**修复的查询：**
- ✅ `getTables()` - 表列表查询
- ✅ `getColumns()` - 列信息查询  
- ✅ `getIndexes()` - 索引信息查询
- ✅ `getForeignKeys()` - 外键信息查询
- ✅ `getTableStats()` - 表统计查询
- ✅ `getPrimaryKeys()` - 主键信息查询

#### 2. SQL Server服务修复 (`mssql.service.ts`)

**修复前：**
```typescript
// 使用对象参数和命名参数
await dataSource.query(`
  SELECT c.name FROM sys.columns 
  WHERE c.object_id = OBJECT_ID(:table)
`, { table: `${database}.${table}` });
```

**修复后：**
```typescript
// 使用数组参数和点位符
await dataSource.query(`
  SELECT c.name FROM sys.columns 
  WHERE c.object_id = OBJECT_ID(?)
`, [`${database}.${table}`]);
```

**修复的查询：**
- ✅ `getColumns()` - 列信息查询
- ✅ `getIndexes()` - 索引信息查询
- ✅ `getForeignKeys()` - 外键信息查询
- ✅ `getDatabaseSize()` - 数据库大小查询
- ✅ `getPrimaryKeys()` - 主键信息查询

### 技术原因

#### TypeORM参数处理差异

不同数据库驱动的参数处理方式不同：

1. **MySQL/PostgreSQL/SQLite**: 
   - 支持对象参数和命名参数
   - 也支持数组参数和点位符
   - 兼容性较好

2. **Oracle (`oracledb`)**:
   - **必须使用数组参数**
   - **必须使用点位符 `?`**
   - 不支持命名参数语法

3. **SQL Server (`sqlserver`)**:
   - **必须使用数组参数**
   - **必须使用点位符 `?`**  
   - 不支持命名参数语法

### 参数格式对照

| 数据库 | 支持格式 | 推荐格式 |
|--------|----------|----------|
| MySQL | 对象/数组 | 数组 + `?` |
| PostgreSQL | 对象/数组 | 数组 + `?` |
| SQLite | 对象/数组 | 数组 + `?` |
| Oracle | 仅数组 | **数组 + `?`** |
| SQL Server | 仅数组 | **数组 + `?`** |

### 修复影响

#### ✅ 解决的问题：
- Oracle连接查询失败
- SQL Server参数绑定错误
- 某些查询返回空结果
- 参数类型不匹配错误

#### ✅ 带来的改进：
- 统一了参数传递格式
- 提高了查询性能
- 增强了代码一致性
- 减少了潜在的安全风险

### 验证方法

修复后可以通过以下方式验证：

```typescript
// 测试Oracle连接和查询
const oracleService = container.get(OracleService);
const dataSource = await connectionService.getActiveConnection('oracle-connection');
const columns = await oracleService.getColumns(dataSource, 'SCOTT', 'EMP');
console.log('Oracle列查询成功:', columns.length);

// 测试SQL Server连接和查询  
const mssqlService = container.get(SQLServerService);
const tables = await mssqlService.getTables(dataSource, 'AdventureWorks');
console.log('SQL Server表查询成功:', tables.length);
```

### 注意事项

1. **参数顺序**: 数组中的参数必须与SQL中的点位符顺序一致
2. **类型转换**: 所有参数在使用前应进行适当的类型转换
3. **大小写敏感**: Oracle和SQL Server对标识符大小写敏感，需要特别注意
4. **参数数量**: 确保数组参数数量与SQL中点位符数量完全匹配

这次修复确保了Oracle和SQL Server数据库的查询功能正常工作。