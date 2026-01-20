"use strict";
/**
 * 数据库信息实体
 * 用于存储数据库的基本信息和结构
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForeignKeyEntity = exports.IndexEntity = exports.ColumnEntity = exports.TableEntity = exports.DatabaseEntity = void 0;
class DatabaseEntity {
    /**
     * 数据库名称
     */
    name;
    /**
     * 数据库字符集
     */
    charset;
    /**
     * 数据库排序规则
     */
    collation;
    /**
     * 表数量
     */
    tableCount;
    /**
     * 数据库大小 (字节)
     */
    size;
    /**
     * 创建时间
     */
    createdAt;
    /**
     * 表信息列表
     */
    tables;
}
exports.DatabaseEntity = DatabaseEntity;
/**
 * 数据库表实体
 */
class TableEntity {
    /**
     * 表名
     */
    name;
    /**
     * 表类型
     */
    type;
    /**
     * 引擎 (MySQL)
     */
    engine;
    /**
     * 行数
     */
    rowCount;
    /**
     * 数据大小 (字节)
     */
    dataSize;
    /**
     * 索引大小 (字节)
     */
    indexSize;
    /**
     * 字符集
     */
    charset;
    /**
     * 排序规则
     */
    collation;
    /**
     * 创建时间
     */
    createdAt;
    /**
     * 更新时间
     */
    updatedAt;
    /**
     * 注释
     */
    comment;
    /**
     * 列信息
     */
    columns;
    /**
     * 索引信息
     */
    indexes;
    /**
     * 外键信息
     */
    foreignKeys;
}
exports.TableEntity = TableEntity;
/**
 * 数据库列实体
 */
class ColumnEntity {
    /**
     * 列名
     */
    name;
    /**
     * 数据类型
     */
    type;
    /**
     * 是否允许NULL
     */
    nullable;
    /**
     * 默认值
     */
    defaultValue;
    /**
     * 是否主键
     */
    isPrimary;
    /**
     * 是否自增
     */
    isAutoIncrement;
    /**
     * 字符长度
     */
    length;
    /**
     * 小数位数
     */
    precision;
    /**
     * 小数点后位数
     */
    scale;
    /**
     * 字符集
     */
    charset;
    /**
     * 排序规则
     */
    collation;
    /**
     * 注释
     */
    comment;
}
exports.ColumnEntity = ColumnEntity;
/**
 * 数据库索引实体
 */
class IndexEntity {
    /**
     * 索引名
     */
    name;
    /**
     * 索引类型 (PRIMARY, UNIQUE, INDEX, FULLTEXT)
     */
    type;
    /**
     * 索引列
     */
    columns;
    /**
     * 是否唯一
     */
    unique;
    /**
     * 注释
     */
    comment;
}
exports.IndexEntity = IndexEntity;
/**
 * 外键实体
 */
class ForeignKeyEntity {
    /**
     * 约束名
     */
    name;
    /**
     * 本地表列
     */
    column;
    /**
     * 目标表
     */
    referencedTable;
    /**
     * 目标表列
     */
    referencedColumn;
    /**
     * 删除规则 (CASCADE, SET NULL, RESTRICT, NO ACTION)
     */
    onDelete;
    /**
     * 更新规则 (CASCADE, SET NULL, RESTRICT, NO ACTION)
     */
    onUpdate;
}
exports.ForeignKeyEntity = ForeignKeyEntity;
//# sourceMappingURL=database.entity.js.map