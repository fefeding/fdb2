"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDatabaseService = void 0;
/**
 * 数据库服务基础类
 * 提供所有数据库类型的通用操作
 */
class BaseDatabaseService {
    /**
     * 通用方法：获取数据库详细信息
     */
    async getDatabaseInfo(dataSource, databaseName) {
        const tables = await this.getTables(dataSource, databaseName);
        return {
            name: databaseName,
            tableCount: tables.length,
            size: await this.getDatabaseSize(dataSource, databaseName),
            tables
        };
    }
    /**
     * 通用方法：获取表详细信息
     */
    async getTableInfo(dataSource, databaseName, tableName) {
        const tables = await this.getTables(dataSource, databaseName);
        const table = tables.find(t => t.name === tableName);
        if (!table) {
            throw new Error(`表 ${tableName} 不存在`);
        }
        // 获取列信息
        table.columns = await this.getColumns(dataSource, databaseName, tableName);
        // 获取索引信息
        table.indexes = await this.getIndexes(dataSource, databaseName, tableName);
        // 获取外键信息
        table.foreignKeys = await this.getForeignKeys(dataSource, databaseName, tableName);
        return table;
    }
    /**
     * 通用方法：获取表数据
     */
    async getTableData(dataSource, databaseName, tableName, page = 1, pageSize = 100, where, orderBy) {
        // 构建查询
        let query = `SELECT * FROM ${this.quoteIdentifier(tableName)}`;
        if (where) {
            query += ` WHERE ${where}`;
        }
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }
        const offset = (page - 1) * pageSize;
        query += ` LIMIT ${pageSize} OFFSET ${offset}`;
        // 执行数据查询
        const data = await dataSource.query(query);
        // 获取总数
        let countQuery = `SELECT COUNT(*) as total FROM ${this.quoteIdentifier(tableName)}`;
        if (where) {
            countQuery += ` WHERE ${where}`;
        }
        const countResult = await dataSource.query(countQuery);
        const total = countResult[0]?.total || 0;
        return { data, total };
    }
    /**
     * 通用方法：执行SQL查询
     */
    async executeQuery(dataSource, sql) {
        const result = await dataSource.query(sql);
        return result;
    }
    /**
     * 通用方法：测试连接
     */
    async testConnection(dataSource) {
        try {
            await dataSource.query('SELECT 1');
            return true;
        }
        catch (error) {
            //this.ctx.logger.error('数据库连接测试失败:', error);
            console.error(error);
            return false;
        }
    }
    /**
     * 通用方法：给标识符加引号
     */
    quoteIdentifier(identifier) {
        return `"${identifier}"`;
    }
    /**
     * 通用方法：构建分页查询
     */
    buildPaginationQuery(baseQuery, page, pageSize) {
        const offset = (page - 1) * pageSize;
        return `${baseQuery} LIMIT ${pageSize} OFFSET ${offset}`;
    }
    /**
     * 通用方法：构建计数查询
     */
    buildCountQuery(baseQuery) {
        return `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;
    }
    /**
     * 获取视图列表 - 子类实现（如果支持）
     */
    async getViews(dataSource, database) {
        // 默认实现，子类可以重写
        throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持视图`);
    }
    /**
     * 获取视图定义 - 子类实现（如果支持）
     */
    async getViewDefinition(dataSource, database, viewName) {
        // 默认实现，子类可以重写
        throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持视图`);
    }
    /**
     * 获取存储过程列表 - 子类实现（如果支持）
     */
    async getProcedures(dataSource, database) {
        // 默认实现，子类可以重写
        throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持存储过程`);
    }
    /**
     * 获取存储过程定义 - 子类实现（如果支持）
     */
    async getProcedureDefinition(dataSource, database, procedureName) {
        // 默认实现，子类可以重写
        throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持存储过程`);
    }
    /**
     * 创建数据库 - 子类实现（如果支持）
     */
    async createDatabase(dataSource, databaseName, options) {
        // 默认实现，子类可以重写
        throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持创建数据库`);
    }
    /**
     * 删除数据库 - 子类实现（如果支持）
     */
    async dropDatabase(dataSource, databaseName) {
        // 默认实现，子类可以重写
        throw new Error(`数据库类型 ${this.getDatabaseType()} 不支持删除数据库`);
    }
}
exports.BaseDatabaseService = BaseDatabaseService;
//# sourceMappingURL=base.service.js.map