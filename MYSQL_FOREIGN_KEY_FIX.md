# MySQL外键查询修复说明

## 问题描述

在获取MySQL外键信息时出现字段不存在的错误：

```
QueryFailedError: Unknown column 'DELETE_RULE' in 'field list'
```

错误发生在查询`information_schema.KEY_COLUMN_USAGE`表时尝试获取`DELETE_RULE`和`UPDATE_RULE`字段。

## 问题原因

MySQL的`information_schema.KEY_COLUMN_USAGE`表中只包含外键的基本信息，不包含外键的约束规则（如DELETE_RULE和UPDATE_RULE）。这些规则信息存储在`information_schema.REFERENTIAL_CONSTRAINTS`表中。

### MySQL相关表结构
- **`information_schema.KEY_COLUMN_USAGE`**：外键基本信息（约束名、列名、引用表等）
- **`information_schema.REFERENTIAL_CONSTRAINTS`**：外键约束规则（删除规则、更新规则等）

## 解决方案

### 修复前的问题代码

```sql
SELECT 
  CONSTRAINT_NAME as name,
  COLUMN_NAME as columnName,
  REFERENCED_TABLE_NAME as referencedTable,
  REFERENCED_COLUMN_NAME as referencedColumn,
  DELETE_RULE as onDelete,        -- ❌ 此字段不存在
  UPDATE_RULE as onUpdate         -- ❌ 此字段不存在
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
  AND REFERENCED_TABLE_NAME IS NOT NULL
```

### 修复后的代码

```sql
SELECT 
  kcu.CONSTRAINT_NAME as name,
  kcu.COLUMN_NAME as columnName,
  kcu.REFERENCED_TABLE_NAME as referencedTable,
  kcu.REFERENCED_COLUMN_NAME as referencedColumn,
  rc.DELETE_RULE as onDelete,     -- ✅ 从正确的表获取
  rc.UPDATE_RULE as onUpdate      -- ✅ 从正确的表获取
FROM information_schema.KEY_COLUMN_USAGE kcu
LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc 
  ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
  AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
WHERE kcu.TABLE_SCHEMA = ? 
  AND kcu.TABLE_NAME = ?
  AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
```

### 应用层处理

```typescript
return result.map((row: any) => ({
  name: row.name,
  column: row.columnName,
  referencedTable: row.referencedTable,
  referencedColumn: row.referencedColumn,
  onDelete: row.onDelete || 'NO ACTION',    // 添加默认值
  onUpdate: row.onUpdate || 'NO ACTION'     // 添加默认值
}));
```

## 修复的优势

1. **数据完整性**：正确获取外键的完整信息，包括约束规则
2. **兼容性**：使用标准的information_schema表，兼容MySQL 5.7+
3. **容错性**：添加默认值处理，避免空值导致的错误
4. **性能优化**：使用LEFT JOIN避免丢失基本外键信息

## 修复的具体改进

1. **JOIN查询**：通过LEFT JOIN关联两个相关表
2. **别名使用**：使用表别名（kcu, rc）提高查询可读性
3. **连接条件**：使用CONSTRAINT_NAME和CONSTRAINT_SCHEMA作为连接条件
4. **默认值**：为DELETE_RULE和UPDATE_RULE提供默认值

## 测试验证

修复完成后，验证以下场景：

- ✅ 获取包含外键的表信息
- ✅ 获取外键的删除和更新规则
- ✅ 处理没有明确规则的外键（使用默认NO ACTION）
- ✅ 处理没有外键的表（不报错）

## 相关文件

- `d:/code/ycnull/db_tool/src/service/database/mysql.service.ts` - 修复了外键查询方法
- `d:/code/ycnull/db_tool/MYSQL_INDEX_FIX.md` - 综合修复说明

## 注意事项

1. 使用LEFT JOIN确保即使没有约束规则的外键也能返回基本信息
2. 某些外键可能没有明确的规则，使用默认的'NO ACTION'
3. 连接条件需要同时包含约束名和模式名以确保准确性