# MySQL标识符引用修复说明

## 问题描述

在获取表数据时出现SQL语法错误：

```
QueryFailedError: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '"t_account" LIMIT 100 OFFSET 0' at line 1
```

错误查询：`SELECT * FROM "t_account" LIMIT 100 OFFSET 0`

## 问题原因

不同数据库系统对标识符（表名、列名等）的引用方式不同：

| 数据库 | 标识符引用方式 | 示例 |
|--------|----------------|------|
| MySQL | 反引号 `` ` `` | `t_account` |
| PostgreSQL | 双引号 `"` | `"t_account"` |
| SQL Server | 方括号 `[]` | `[t_account]` |
| Oracle | 双引号 `"`（大写） | `"T_ACCOUNT"` |

当前的`quoteIdentifier`方法使用了双引号，这对MySQL来说是错误的。

## 解决方案

### 修复前的问题代码

```typescript
// 基类方法 - 使用双引号（适用于PostgreSQL）
protected quoteIdentifier(identifier: string): string {
  return `"${identifier}"`;
}
```

### 修复后的代码

**MySQL服务**：
```typescript
// MySQL使用反引号标识符
protected quoteIdentifier(identifier: string): string {
  return `\`${identifier}\``;
}
```

**PostgreSQL服务**：
```typescript
// PostgreSQL使用双引号标识符
protected quoteIdentifier(identifier: string): string {
  return `"${identifier}"`;
}
```

**SQL Server服务**：
```typescript
// SQL Server使用方括号标识符
protected quoteIdentifier(identifier: string): string {
  return `[${identifier}]`;
}
```

**Oracle服务**：
```typescript
// Oracle使用大写双引号标识符
protected quoteIdentifier(identifier: string): string {
  return `"${identifier.toUpperCase()}"`;
}
```

## 修复的影响

### 修复前生成的SQL（错误）
```sql
SELECT * FROM "t_account" LIMIT 100 OFFSET 0  -- MySQL无法识别双引号
```

### 修复后生成的SQL（正确）
```sql
SELECT * FROM `t_account` LIMIT 100 OFFSET 0  -- MySQL正确语法
```

## 修改的文件

1. **mysql.service.ts** - 添加了MySQL专用的quoteIdentifier方法
2. **postgres.service.ts** - 添加了PostgreSQL专用的quoteIdentifier方法
3. **base.service.ts** - 保留默认实现（双引号，适用于PostgreSQL）

## 验证方法

修复完成后，测试以下操作：

- ✅ 获取MySQL表的分页数据
- ✅ 执行带WHERE条件的MySQL查询
- ✅ 执行带ORDER BY的MySQL查询
- ✅ 验证PostgreSQL、SQL Server、Oracle的查询仍然正常

## 最佳实践

1. **数据库特定实现**：每个数据库服务应该重写`quoteIdentifier`方法
2. **保持一致性**：确保生成的SQL符合对应数据库的语法规范
3. **测试覆盖**：为每个数据库类型验证SQL生成正确性

## 注意事项

1. **MySQL**：表名和列名默认是大小写不敏感的，但保留原始大小写
2. **PostgreSQL**：标识符默认是大小写敏感的，除非创建时加了双引号
3. **SQL Server**：默认不区分大小写，但保留声明时的大小写
4. **Oracle**：默认将标识符转换为大写，使用双引号保持原始大小写