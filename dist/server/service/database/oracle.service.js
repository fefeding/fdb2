"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleService = void 0;
const base_service_1 = require("./base.service");
/**
 * Oracle数据库服务实现
 */
class OracleService extends base_service_1.BaseDatabaseService {
    getDatabaseType() {
        return 'oracle';
    }
    /**
     * 获取Oracle数据库列表（用户schema）
     */
    async getDatabases(dataSource) {
        const result = await dataSource.query(`
      SELECT username as name 
      FROM all_users 
      WHERE username NOT IN ('SYS', 'SYSTEM', 'XDB', 'OUTLN')
      ORDER BY username
    `);
        return result.map((row) => row.name);
    }
    /**
     * 获取Oracle表列表
     */
    async getTables(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        table_name as name,
        'TABLE' as type
      FROM all_tables 
      WHERE owner = ? 
        AND table_name NOT LIKE 'BIN$%'
        AND temporary = 'N'
      ORDER BY table_name
    `, [database.toUpperCase()]);
        // 获取表的统计信息
        const tablesWithStats = [];
        for (const table of result) {
            const stats = await this.getTableStats(dataSource, database, table.name);
            tablesWithStats.push({
                name: table.name,
                type: table.type,
                rowCount: stats.rowCount,
                dataSize: stats.dataSize,
                indexSize: stats.indexSize
            });
        }
        return tablesWithStats;
    }
    /**
     * 获取Oracle列信息
     */
    async getColumns(dataSource, database, table) {
        // 使用兼容的SQL查询，移除可能不兼容的字段
        const result = await dataSource.query(`
      SELECT 
        column_name as name,
        data_type as type,
        data_length as length,
        nullable as nullable,
        data_default as defaultValue
      FROM all_tab_columns 
      WHERE owner = ? 
        AND table_name = ?
      ORDER BY column_id
    `, [
            database.toUpperCase(),
            table.toUpperCase()
        ]);
        // 获取主键信息
        const primaryKeys = await this.getPrimaryKeys(dataSource, database, table);
        // 从data_type中解析精度信息
        return result.map((row) => {
            const dataType = row.type || '';
            let precision = undefined;
            let scale = undefined;
            // 解析DECIMAL(M,D)或NUMBER(M,D)类型的精度
            const decimalMatch = dataType.match(/(DECIMAL|NUMBER)\s*\(\s*(\d+)\s*(,\s*(\d+)\s*)?\s*\)/i);
            if (decimalMatch) {
                precision = parseInt(decimalMatch[2]);
                if (decimalMatch[3]) {
                    scale = parseInt(decimalMatch[3].replace(/\D/g, ''));
                }
            }
            return {
                name: row.name,
                type: row.type + (row.length ? `(${row.length})` : ''),
                nullable: row.nullable === 'Y',
                defaultValue: row.defaultValue,
                isPrimary: primaryKeys.includes(row.name),
                isAutoIncrement: false, // Oracle不使用自增，使用序列
                length: row.length,
                precision: precision,
                scale: scale
            };
        });
    }
    /**
     * 获取Oracle索引信息
     */
    async getIndexes(dataSource, database, table) {
        const result = await dataSource.query(`
      SELECT DISTINCT 
        i.index_name as name,
        DECODE(i.uniqueness, 'UNIQUE', 'UNIQUE INDEX', 'INDEX') as type,
        ic.column_name as column
      FROM all_indexes i
      JOIN all_ind_columns ic ON i.index_name = ic.index_name
      WHERE i.table_owner = ? 
        AND i.table_name = ?
        AND i.index_name NOT IN (SELECT constraint_name 
                               FROM all_constraints 
                               WHERE constraint_type = 'P' 
                               AND table_owner = ?)
      ORDER BY i.index_name, ic.column_position
    `, [
            database.toUpperCase(),
            table.toUpperCase(),
            database.toUpperCase()
        ]);
        // 按索引名分组
        const indexMap = new Map();
        result.forEach((row) => {
            if (!indexMap.has(row.name)) {
                indexMap.set(row.name, {
                    name: row.name,
                    type: row.type,
                    columns: [],
                    unique: row.type.includes('UNIQUE')
                });
            }
            indexMap.get(row.name).columns.push(row.column);
        });
        return Array.from(indexMap.values());
    }
    /**
     * 获取Oracle外键信息
     */
    async getForeignKeys(dataSource, database, table) {
        const result = await dataSource.query(`
      SELECT 
        c.constraint_name as name,
        cc.column_name as column,
        r.table_name as referencedTable,
        rc.column_name as referencedColumn,
        c.delete_rule as onDelete
      FROM all_constraints c
      JOIN all_cons_columns cc ON c.constraint_name = cc.constraint_name
      JOIN all_constraints r ON c.r_constraint_name = r.constraint_name
      JOIN all_cons_columns rc ON r.constraint_name = rc.constraint_name AND cc.position = rc.position
      WHERE c.constraint_type = 'R'
        AND c.owner = ? 
        AND c.table_name = ?
    `, [
            database.toUpperCase(),
            table.toUpperCase()
        ]);
        return result.map((row) => ({
            name: row.name,
            column: row.column,
            referencedTable: row.referencedTable,
            referencedColumn: row.referencedColumn,
            onDelete: row.onDelete || 'NO ACTION',
            onUpdate: 'NO ACTION' // Oracle不支持ON UPDATE
        }));
    }
    /**
     * 获取Oracle数据库大小（用户schema大小）
     */
    async getDatabaseSize(dataSource, database) {
        const result = await dataSource.query(`
      SELECT SUM(bytes) as size
      FROM user_segments
    `);
        return result[0]?.size || 0;
    }
    /**
     * 获取表统计信息
     */
    async getTableStats(dataSource, database, table) {
        try {
            const result = await dataSource.query(`
        SELECT 
          num_rows as rowCount,
          (SELECT SUM(bytes) FROM user_segments WHERE segment_name = ?) as dataSize
        FROM all_tables
        WHERE owner = ? AND table_name = ?
      `, [
                table.toUpperCase(),
                database.toUpperCase(),
                table.toUpperCase()
            ]);
            return {
                rowCount: result[0]?.rowCount || 0,
                dataSize: result[0]?.dataSize || 0,
                indexSize: 0 // Oracle索引大小计算较复杂，这里简化处理
            };
        }
        catch (error) {
            // 如果没有统计信息，返回默认值
            return {
                rowCount: 0,
                dataSize: 0,
                indexSize: 0
            };
        }
    }
    /**
     * 获取主键信息
     */
    async getPrimaryKeys(dataSource, database, table) {
        const result = await dataSource.query(`
      SELECT column_name
      FROM all_cons_columns cc
      JOIN all_constraints c ON cc.constraint_name = c.constraint_name
      WHERE c.constraint_type = 'P'
        AND c.owner = ? 
        AND c.table_name = ?
      ORDER BY cc.position
    `, [
            database.toUpperCase(),
            table.toUpperCase()
        ]);
        return result.map((row) => row.column_name);
    }
    /**
     * Oracle的标识符引用方式
     */
    quoteIdentifier(identifier) {
        return `"${identifier.toUpperCase()}"`;
    }
    /**
     * 获取Oracle视图列表
     */
    async getViews(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        view_name as name,
        '' as comment
      FROM all_views 
      WHERE owner = ?
      ORDER BY view_name
    `, [database.toUpperCase()]);
        return result.map((row) => ({
            name: row.name,
            comment: row.comment || '',
            schemaName: database
        }));
    }
    /**
     * 获取Oracle视图定义
     */
    async getViewDefinition(dataSource, database, viewName) {
        const result = await dataSource.query(`
      SELECT text as definition
      FROM all_views 
      WHERE owner = ? 
        AND view_name = ?
    `, [database.toUpperCase(), viewName.toUpperCase()]);
        return result[0]?.definition || '';
    }
    /**
     * 获取Oracle存储过程列表
     */
    async getProcedures(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        object_name as name,
        '' as comment,
        'PROCEDURE' as type,
        '' as returnType,
        'PL/SQL' as language
      FROM all_objects 
      WHERE owner = ? 
        AND object_type IN ('PROCEDURE', 'FUNCTION')
        AND status = 'VALID'
      ORDER BY object_name
    `, [database.toUpperCase()]);
        return result.map((row) => ({
            name: row.name,
            comment: row.comment || '',
            type: row.type,
            returnType: row.returnType || '',
            language: row.language || 'PL/SQL'
        }));
    }
    /**
     * 获取Oracle存储过程定义
     */
    async getProcedureDefinition(dataSource, database, procedureName) {
        const result = await dataSource.query(`
      SELECT text as definition
      FROM all_source 
      WHERE owner = ? 
        AND name = ?
      ORDER BY line
    `, [database.toUpperCase(), procedureName.toUpperCase()]);
        return result.map((row) => row.definition).join('\n') || '';
    }
    /**
     * 创建Oracle数据库
     */
    async createDatabase(dataSource, databaseName, options) {
        // Oracle数据库创建比较复杂，通常需要DBA权限
        // 这里提供基本的创建语法
        let sql = `CREATE DATABASE ${this.quoteIdentifier(databaseName)}`;
        if (options) {
            const clauses = [];
            if (options.user) {
                clauses.push(`USER ${options.user}`);
            }
            if (options.password) {
                clauses.push(`IDENTIFIED BY ${options.password}`);
            }
            if (options.defaultTablespace) {
                clauses.push(`DEFAULT TABLESPACE ${options.defaultTablespace}`);
            }
            if (options.tempTablespace) {
                clauses.push(`TEMPORARY TABLESPACE ${options.tempTablespace}`);
            }
            if (options.datafile) {
                clauses.push(`DATAFILE '${options.datafile}'`);
            }
            if (options.size) {
                clauses.push(`SIZE ${options.size}`);
            }
            if (options.autoExtend) {
                clauses.push(`AUTOEXTEND ON`);
            }
            if (clauses.length > 0) {
                sql += ' ' + clauses.join(' ');
            }
        }
        await dataSource.query(sql);
    }
    /**
     * 删除Oracle数据库
     */
    async dropDatabase(dataSource, databaseName) {
        const sql = `DROP DATABASE ${this.quoteIdentifier(databaseName)}`;
        await dataSource.query(sql);
    }
}
exports.OracleService = OracleService;
//# sourceMappingURL=oracle.service.js.map