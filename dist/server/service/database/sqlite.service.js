"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteService = void 0;
const base_service_1 = require("./base.service");
/**
 * SQLite数据库服务实现
 */
class SQLiteService extends base_service_1.BaseDatabaseService {
    getDatabaseType() {
        return 'sqlite';
    }
    /**
     * 获取SQLite数据库列表
     */
    async getDatabases(dataSource) {
        // SQLite只有一个主数据库
        return ['main'];
    }
    /**
     * 获取SQLite表列表
     */
    async getTables(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        tbl_name as name,
        'table' as type,
        sql as definition
      FROM sqlite_master 
      WHERE type = 'table' AND tbl_name NOT LIKE 'sqlite_%'
    `);
        return result.map((row) => ({
            name: row.name,
            type: row.type,
            rowCount: 0, // SQLite需要额外查询
            dataSize: 0,
            indexSize: 0
        }));
    }
    /**
     * 获取SQLite列信息
     */
    async getColumns(dataSource, database, table) {
        const result = await dataSource.query(`PRAGMA table_info(${table})`);
        return result.map((row) => ({
            name: row.name,
            type: row.type,
            nullable: row.notnull === 0,
            defaultValue: row.dflt_value,
            isPrimary: row.pk === 1,
            isAutoIncrement: false
        }));
    }
    /**
     * 获取SQLite索引信息
     */
    async getIndexes(dataSource, database, table) {
        const result = await dataSource.query(`PRAGMA index_list(${table})`);
        return result.map((row) => ({
            name: row.name,
            type: row.unique ? 'UNIQUE' : 'INDEX',
            columns: [], // 需要额外查询
            unique: row.unique === 1
        }));
    }
    /**
     * 获取SQLite外键信息
     */
    async getForeignKeys(dataSource, database, table) {
        const result = await dataSource.query(`PRAGMA foreign_key_list(${table})`);
        return result.map((row) => ({
            name: `fk_${table}_${row.table}`,
            column: row.from,
            referencedTable: row.table,
            referencedColumn: row.to,
            onDelete: row.on_delete || 'NO ACTION',
            onUpdate: row.on_update || 'NO ACTION'
        }));
    }
    /**
     * 获取SQLite数据库大小
     */
    async getDatabaseSize(dataSource, database) {
        // SQLite数据库大小需要通过文件系统获取，这里返回0
        return 0;
    }
    /**
     * 获取SQLite视图列表
     */
    async getViews(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        name,
        sql as definition
      FROM sqlite_master 
      WHERE type = 'view' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
        return result.map((row) => ({
            name: row.name,
            comment: '',
            schemaName: 'main',
            definition: row.definition
        }));
    }
    /**
     * 获取SQLite视图定义
     */
    async getViewDefinition(dataSource, database, viewName) {
        const result = await dataSource.query(`
      SELECT sql as definition
      FROM sqlite_master 
      WHERE type = 'view' AND name = $1
    `, [viewName]);
        return result[0]?.definition || '';
    }
    /**
     * SQLite不支持存储过程
     */
    async getProcedures(dataSource, database) {
        // SQLite不支持存储过程，返回空数组
        return [];
    }
    /**
     * SQLite不支持存储过程
     */
    async getProcedureDefinition(dataSource, database, procedureName) {
        throw new Error('SQLite不支持存储过程');
    }
    /**
     * 创建SQLite数据库
     * 注意：SQLite的"数据库"实际上是文件，所以这个方法只是创建一个空文件
     */
    async createDatabase(dataSource, databaseName, options) {
        // SQLite中数据库是文件，通常在连接时指定文件路径
        // 这里只是创建一个空文件，实际使用时需要连接到这个文件
        throw new Error('SQLite数据库创建需要指定文件路径，请在连接配置中设置数据库文件路径');
    }
    /**
     * 删除SQLite数据库
     */
    async dropDatabase(dataSource, databaseName) {
        // SQLite中删除数据库需要删除文件
        throw new Error('SQLite数据库删除需要手动删除数据库文件');
    }
}
exports.SQLiteService = SQLiteService;
//# sourceMappingURL=sqlite.service.js.map