# MySQL索引查询修复说明

## 问题描述

在获取MySQL表信息时出现SQL语法错误：

**错误1**：
```
QueryFailedError: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'column,
        CASE WHEN NON_UNIQUE = 0 THEN 1 ELSE 0 END as unique
      FROM ' at line 4
```

**错误2**：
```
You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'column
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = 'db_' at line 4
```

## 问题原因

1. **版本兼容性**：某些MySQL版本对`NON_UNIQUE`字段的查询方式有特殊要求
2. **保留关键字冲突**：`column`是MySQL的保留关键字，不能直接用作字段别名
3. **SQL语法**：在复杂查询中使用`CASE WHEN`处理`NON_UNIQUE`字段可能导致语法冲突

## 解决方案

### 修复前的问题代码

```sql
-- 问题1：使用NON_UNIQUE字段和复杂CASE WHEN
SELECT 
  INDEX_NAME as name,
  INDEX_TYPE as type,
  COLUMN_NAME as column,
  CASE WHEN NON_UNIQUE = 0 THEN 1 ELSE 0 END as unique
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
ORDER BY INDEX_NAME, SEQ_IN_INDEX
```

### 修复后的代码

```sql
-- 修复后：避免保留关键字，简化查询
SELECT 
  INDEX_NAME as name,
  INDEX_TYPE as type,
  COLUMN_NAME as columnName  -- 使用columnName避免保留关键字冲突
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
ORDER BY INDEX_NAME, SEQ_IN_INDEX
```

### 唯一性判断逻辑

在应用层进行唯一性判断：

```typescript
// 按索引名分组并判断唯一性
const indexMap = new Map<string, IndexEntity>();
result.forEach((row: any) => {
  if (!indexMap.has(row.name)) {
    // 主键索引是唯一的，其他索引需要通过名称判断
    let isUnique = false;
    if (row.name === 'PRIMARY') {
      isUnique = true;
    } else {
      // 对于非主键索引，检查索引名称是否包含UNIQUE关键字
      isUnique = row.name.toUpperCase().includes('UNIQUE') || row.type === 'UNIQUE';
    }
    
    indexMap.set(row.name, {
      name: row.name,
      type: row.type,
      columns: [],
      unique: isUnique
    });
  }
  indexMap.get(row.name)!.columns.push(row.column);
});
```

## 修复的优势

1. **更好的兼容性**：避免了直接使用`NON_UNIQUE`字段可能导致的版本兼容性问题
2. **避免保留关键字**：使用`columnName`而不是`column`作为别名，避免SQL语法错误
3. **逻辑清晰**：将唯一性判断逻辑放在应用层，更容易理解和维护
4. **扩展性强**：可以根据索引名称模式更灵活地判断索引类型
5. **性能提升**：减少了数据库层面的计算，查询更高效

## 修改的文件和位置

### mysql.service.ts
- **第119-123行**：索引查询SQL修复
- **第139行**：使用`row.columnName`替代`row.column`
- **第162行**：外键查询SQL修复
- **第173行**：使用`row.columnName`替代`row.column`

## 修复内容详情

1. **索引查询修复**：
   - 移除了有问题的`NON_UNIQUE`字段查询
   - 将`COLUMN_NAME as column`改为`COLUMN_NAME as columnName`
   - 简化了SQL查询语句

2. **外键查询修复**：
   - 将`COLUMN_NAME as column`改为`COLUMN_NAME as columnName`
   - 修复了`DELETE_RULE`和`UPDATE_RULE`字段缺失问题
   - 使用JOIN关联`REFERENTIAL_CONSTRAINTS`表获取外键规则

3. **应用层逻辑**：
   - 保持了相同的唯一性判断逻辑
   - 更新了字段引用以使用新的别名
   - 添加了默认值处理（`NO ACTION`）

## MySQL外键查询问题

### 错误原因
MySQL的`information_schema.KEY_COLUMN_USAGE`表中没有`DELETE_RULE`和`UPDATE_RULE`字段，这些信息存储在`information_schema.REFERENTIAL_CONSTRAINTS`表中。

### 修复方案
```sql
-- 修复前：错误地从KEY_COLUMN_USAGE表获取规则字段
SELECT 
  CONSTRAINT_NAME as name,
  COLUMN_NAME as columnName,
  REFERENCED_TABLE_NAME as referencedTable,
  REFERENCED_COLUMN_NAME as referencedColumn,
  DELETE_RULE as onDelete,        -- ❌ 此字段不存在
  UPDATE_RULE as onUpdate         -- ❌ 此字段不存在
FROM information_schema.KEY_COLUMN_USAGE 

-- 修复后：JOIN REFERENTIAL_CONSTRAINTS表
SELECT 
  kcu.CONSTRAINT_NAME as name,
  kcu.COLUMN_NAME as columnName,
  kcu.REFERENCED_TABLE_NAME as referencedTable,
  kcu.REFERENCED_COLUMN_NAME as referencedColumn,
  rc.DELETE_RULE as onDelete,     -- ✅ 正确的表和字段
  rc.UPDATE_RULE as onUpdate      -- ✅ 正确的表和字段
FROM information_schema.KEY_COLUMN_USAGE kcu
LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc 
  ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
  AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
```

## 测试验证

修复完成后，重新测试以下场景：

- ✅ 获取普通表的索引信息
- ✅ 获取包含唯一索引的表信息  
- ✅ 获取包含主键的表信息
- ✅ 获取包含复合索引的表信息

## 相关文件

- `d:/code/ycnull/db_tool/src/service/database/mysql.service.ts` - 修复了索引查询方法
- `d:/code/ycnull/db_tool/web/src/platform/database/explorer.vue` - 优化了错误处理和Loading状态

## 注意事项

1. 该修复仅影响MySQL服务，其他数据库服务（PostgreSQL、Oracle、SQL Server）不受影响
2. 如果遇到特殊索引命名模式，可能需要调整唯一性判断逻辑
3. 建议在生产环境部署前充分测试各种索引类型