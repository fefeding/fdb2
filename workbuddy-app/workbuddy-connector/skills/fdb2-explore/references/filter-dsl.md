# Filter DSL 完整规范

> 用于 `rows list / rows get / rows count / rows update / rows delete / export rows` 的 `--filter`。
> 条件是「白名单 + 参数绑定」编译：字段名必须先命中表的真实列（否则 `COLUMN_NOT_FOUND` 并附候选列提示），值走绑定参数或按方言安全内联，不存在 SQL 拼接注入面。

## 操作符速查

| 语义 | 写法 | 示例 |
|---|---|---|
| 等于 | `=` | `--filter 'status=active'` |
| 不等于 | `!=` 或 `<>` | `--filter 'vip!=true'` |
| 大于 / 大于等于 | `>` / `>=` | `--filter 'age>18'` |
| 小于 / 小于等于 | `<` / `<=` | `--filter 'score<=100'` |
| 包含子串（模糊） | `~` | `--filter 'name~zhang'` |
| 区分大小写包含 | `~c` | `--filter 'code~cABC'` |
| 前缀 | `^` | `--filter 'phone^138'` |
| 后缀 | `$` | `--filter 'email$@qq.com'` |
| 属于集合 | `in` | `--filter 'status in active,disabled'` |
| 不属于集合 | `nin` | `--filter 'status nin deleted'` |
| 区间 | `between` | `--filter 'price between 10,99.9'` |
| 为空 | `null`（或 `isnull`） | `--filter 'deleted_at null'` |
| 非空 | `notnull` | `--filter 'email notnull'` |

字段名**不带引号**。值里要表达字面逗号时用 `\,` 转义。

## 多个条件 = AND

```bash
fdb2 rows list users --filter 'age>18' --filter 'status=active' --json
# 等价 SQL: ... WHERE (age > ?) AND (status = ?)
```

## 复杂逻辑（--filter-json）

单条 `--filter` 只表达 AND；OR / NOT / 嵌套用 `--filter-json`：

```bash
fdb2 rows list users --filter-json '{
  "or": [
    { "field": "status", "op": "in", "value": ["admin", "vip"] },
    { "and": [ { "field": "age", "op": "gte", "value": 60 }, { "field": "vip", "op": "=", "value": true } ] }
  ]
}' --json
```

节点结构：`{"and":[节点…]}`、`{"or":[节点…]}`、`{"not": 节点}`、叶子 `{"field":"列","op":"操作符","value":…}`。
`--filter` 与 `--filter-json` 同时给出时二者取 AND。

`op` 支持词形别名：`=`/`==`/`eq`、`!=`/`<>`/`neq`、`>`/`gt`、`>=`/`gte`、`<`/`lt`、`<=`/`lte`、`~`/`contains`/`like`、`~c`/`likecase`、`^`/`starts`/`starts_with`、`$`/`ends`/`ends_with`、`in`、`not_in`/`nin`、`between`、`is_null`/`null`/`isnull`、`not_null`/`notnull`。

## 类型自动归一

按列类型做值归一：int/decimal/float 列收到数字字符串转 number（`--filter 'age>18'` 的 `18` 会作为整数绑定），boolean 列把 `true/1/false/0` 归一为布尔。因此无需手动加引号。

## 排序与投影

```bash
# 排序：--sort 可重复，默认 asc
--sort created_at:desc --sort id:asc

# 投影：只取需要的列
--select id,name,email
```

`--select` 与 `--sort` 同样做列名白名单校验。

## 常见报错与恢复

| error.code | 原因与恢复 |
|---|---|
| `INVALID_FILTER` | 表达式无法解析。检查操作符拼写与字段后有无多余符号；不要给字段名加引号。 |
| `COLUMN_NOT_FOUND` | 字段不在表里。用返回的 `hint`/`details.availableColumns` 换成真实列名。 |
| `PARAM_ERROR` | `--filter-json` 不是合法 JSON，或 `--sort` 格式不是 `字段:asc|desc`。 |

## 自然语言 → DSL 对照

| 用户说 | 翻译 |
|---|---|
| 18 岁以上 | `--filter 'age>18'` |
| 最近 7 天注册 | `--filter 'created_at>=2026-08-28'`（用当天日期前推，date 列按字符串匹配） |
| 名字里含"张" | `--filter 'name~张'` |
| 手机号 138 开头 | `--filter 'phone^138'` |
| 邮箱是 qq 邮箱 | `--filter 'email$@qq.com'` |
| 状态为启用或待审 | `--filter 'status in enabled,pending'` |
| 从未删除的记录 | `--filter 'deleted_at null'` |
| 金额在 100~500 之间 | `--filter 'amount between 100,500'` |
| 会员且最近没登录的 | `--filter 'vip=true' --filter 'last_login_at null'` |
