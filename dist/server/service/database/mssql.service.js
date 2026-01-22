"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLServerService = void 0;
const base_service_1 = require("./base.service");
/**
 * SQL Server数据库服务实现
 */
class SQLServerService extends base_service_1.BaseDatabaseService {
    getDatabaseType() {
        return 'mssql';
    }
    /**
     * 获取SQL Server数据库列表
     */
    async getDatabases(dataSource) {
        const result = await dataSource.query(`
      SELECT name 
      FROM sys.databases 
      WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
        AND state = 0
      ORDER BY name
    `);
        return result.map((row) => row.name);
    }
    /**
     * 获取SQL Server表列表
     */
    async getTables(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        t.name,
        'BASE TABLE' as type,
        p.rows as rowCount,
        SUM(a.total_pages) * 8 * 1024 as dataSize
      FROM ${this.quoteIdentifier(database)}.sys.tables t
      INNER JOIN ${this.quoteIdentifier(database)}.sys.partitions p ON t.object_id = p.object_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.allocation_units a ON p.partition_id = a.container_id
      WHERE t.is_ms_shipped = 0
        AND p.index_id IN (0, 1)
      GROUP BY t.name, p.rows
      ORDER BY t.name
    `);
        return result.map((row) => ({
            name: row.name,
            type: row.type,
            rowCount: row.rowCount || 0,
            dataSize: row.dataSize || 0,
            indexSize: 0 // SQL Server索引大小计算较复杂，这里简化处理
        }));
    }
    /**
     * 获取SQL Server列信息
     */
    async getColumns(dataSource, database, table) {
        // 使用兼容的SQL查询，避免使用可能不兼容的函数
        const result = await dataSource.query(`
      SELECT 
        c.name,
        t.name as type,
        c.max_length as length,
        c.precision,
        c.scale,
        c.is_nullable as nullable,
        c.default_object_id,
        COLUMNPROPERTY(c.object_id, c.name, 'IsIdentity') as isIdentity
      FROM ${this.quoteIdentifier(database)}.sys.columns c
      INNER JOIN ${this.quoteIdentifier(database)}.sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID(?)
      ORDER BY c.column_id
    `, [`${database}.${table}`]);
        // 获取主键信息
        const primaryKeys = await this.getPrimaryKeys(dataSource, database, table);
        return result.map((row) => ({
            name: row.name,
            type: row.type,
            nullable: row.nullable,
            defaultValue: row.default_object_id ? 'DEFAULT' : null,
            isPrimary: primaryKeys.includes(row.name),
            isAutoIncrement: row.isIdentity === 1,
            length: row.length,
            precision: row.precision,
            scale: row.scale
        }));
    }
    /**
     * 获取SQL Server索引信息
     */
    async getIndexes(dataSource, database, table) {
        const result = await dataSource.query(`
      SELECT 
        i.name,
        i.type_desc as type,
        c.name as column,
        i.is_unique as isUnique
      FROM ${this.quoteIdentifier(database)}.sys.indexes i
      INNER JOIN ${this.quoteIdentifier(database)}.sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE i.object_id = OBJECT_ID(?)
        AND i.is_primary_key = 0
      ORDER BY i.name, ic.key_ordinal
    `, [`${database}.${table}`]);
        // 按索引名分组
        const indexMap = new Map();
        result.forEach((row) => {
            if (!indexMap.has(row.name)) {
                indexMap.set(row.name, {
                    name: row.name,
                    type: row.type,
                    columns: [],
                    unique: row.isUnique
                });
            }
            indexMap.get(row.name).columns.push(row.column);
        });
        return Array.from(indexMap.values());
    }
    /**
     * 获取SQL Server外键信息
     */
    async getForeignKeys(dataSource, database, table) {
        const result = await dataSource.query(`
      SELECT 
        fk.name as name,
        c.name as column,
        rt.name as referencedTable,
        rc.name as referencedColumn,
        fk.delete_action_desc as onDelete,
        fk.update_action_desc as onUpdate
      FROM ${this.quoteIdentifier(database)}.sys.foreign_keys fk
      INNER JOIN ${this.quoteIdentifier(database)}.sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.tables rt ON fkc.referenced_object_id = rt.object_id
      WHERE fkc.parent_object_id = OBJECT_ID(?)
    `, [`${database}.${table}`]);
        return result.map((row) => ({
            name: row.name,
            column: row.column,
            referencedTable: row.referencedTable,
            referencedColumn: row.referencedColumn,
            onDelete: row.onDelete,
            onUpdate: row.onUpdate
        }));
    }
    /**
     * 获取SQL Server数据库大小
     */
    async getDatabaseSize(dataSource, database) {
        const result = await dataSource.query(`
      SELECT SUM(size * 8 * 1024) as size
      FROM sys.master_files
      WHERE database_id = DB_ID(?)
    `, [database]);
        return result[0]?.size || 0;
    }
    /**
     * 获取主键信息
     */
    async getPrimaryKeys(dataSource, database, table) {
        const result = await dataSource.query(`
      SELECT c.name
      FROM ${this.quoteIdentifier(database)}.sys.key_constraints k
      INNER JOIN ${this.quoteIdentifier(database)}.sys.index_columns ic ON k.parent_object_id = ic.object_id AND k.unique_index_id = ic.index_id
      INNER JOIN ${this.quoteIdentifier(database)}.sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE k.type = 'PK'
        AND k.parent_object_id = OBJECT_ID(?)
      ORDER BY ic.key_ordinal
    `, [`${database}.${table}`]);
        return result.map((row) => row.name);
    }
    /**
     * SQL Server的标识符引用方式
     */
    quoteIdentifier(identifier) {
        return `[${identifier}]`;
    }
    /**
     * 获取SQL Server视图列表
     */
    async getViews(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        TABLE_NAME as name,
        '' as comment,
        TABLE_SCHEMA as schemaName
      FROM ${this.quoteIdentifier(database)}.INFORMATION_SCHEMA.VIEWS
      ORDER BY TABLE_NAME
    `);
        return result.map((row) => ({
            name: row.name,
            comment: row.comment || '',
            schemaName: row.schemaname
        }));
    }
    /**
     * 获取SQL Server视图定义
     */
    async getViewDefinition(dataSource, database, viewName) {
        const result = await dataSource.query(`
      SELECT VIEW_DEFINITION as definition
      FROM ${this.quoteIdentifier(database)}.INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_NAME = ?
    `, [viewName]);
        return result[0]?.definition || '';
    }
    /**
     * 获取SQL Server存储过程列表
     */
    async getProcedures(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        ROUTINE_NAME as name,
        '' as comment,
        ROUTINE_TYPE as type,
        '' as returnType,
        'SQL' as language
      FROM ${this.quoteIdentifier(database)}.INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
      ORDER BY ROUTINE_NAME
    `);
        return result.map((row) => ({
            name: row.name,
            comment: row.comment || '',
            type: row.type,
            returnType: row.returnType || '',
            language: row.language || 'SQL'
        }));
    }
    /**
     * 获取SQL Server存储过程定义
     */
    async getProcedureDefinition(dataSource, database, procedureName) {
        const result = await dataSource.query(`
      SELECT ROUTINE_DEFINITION as definition
      FROM ${this.quoteIdentifier(database)}.INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_NAME = ?
    `, [procedureName]);
        return result[0]?.definition || '';
    }
    /**
     * 创建SQL Server数据库
     */
    async createDatabase(dataSource, databaseName, options) {
        let sql = `CREATE DATABASE ${this.quoteIdentifier(databaseName)}`;
        if (options) {
            const clauses = [];
            if (options.collation) {
                clauses.push(`COLLATE ${options.collation}`);
            }
            if (options.containment) {
                clauses.push(`CONTAINMENT = ${options.containment}`);
            }
            if (options.compatibilityLevel) {
                clauses.push(`COMPATIBILITY_LEVEL = ${options.compatibilityLevel}`);
            }
            // 添加数据文件配置
            if (options.dataFiles) {
                const fileClauses = options.dataFiles.map((file) => {
                    let fileClause = `(NAME = '${file.name}', FILENAME = '${file.filename}'`;
                    if (file.size)
                        fileClause += `, SIZE = ${file.size}`;
                    if (file.maxSize)
                        fileClause += `, MAXSIZE = ${file.maxSize}`;
                    if (file.growth)
                        fileClause += `, FILEGROWTH = ${file.growth}`;
                    fileClause += ')';
                    return fileClause;
                });
                clauses.push(`ON ${fileClauses.join(', ')}`);
            }
            // 添加日志文件配置
            if (options.logFiles) {
                const logClauses = options.logFiles.map((log) => {
                    let logClause = `(NAME = '${log.name}', FILENAME = '${log.filename}'`;
                    if (log.size)
                        logClause += `, SIZE = ${log.size}`;
                    if (log.maxSize)
                        logClause += `, MAXSIZE = ${log.maxSize}`;
                    if (log.growth)
                        logClause += `, FILEGROWTH = ${log.growth}`;
                    logClause += ')';
                    return logClause;
                });
                clauses.push(`LOG ON ${logClauses.join(', ')}`);
            }
            if (clauses.length > 0) {
                sql += ' ' + clauses.join(' ');
            }
        }
        await dataSource.query(sql);
    }
    /**
     * 删除SQL Server数据库
     */
    async dropDatabase(dataSource, databaseName) {
        const sql = `DROP DATABASE ${this.quoteIdentifier(databaseName)}`;
        await dataSource.query(sql);
    }
    /**
     * 导出数据库架构
     */
    async exportSchema(dataSource, databaseName) {
        // 获取所有表
        const tables = await this.getTables(dataSource, databaseName);
        let schemaSql = `-- 数据库架构导出 - ${databaseName}\n`;
        schemaSql += `-- 导出时间: ${new Date().toISOString()}\n\n`;
        // 为每个表生成CREATE TABLE语句
        for (const table of tables) {
            // 获取表结构
            const columns = await this.getColumns(dataSource, databaseName, table.name);
            const indexes = await this.getIndexes(dataSource, databaseName, table.name);
            const foreignKeys = await this.getForeignKeys(dataSource, databaseName, table.name);
            // 生成CREATE TABLE语句
            schemaSql += `-- 表结构: ${table.name}\n`;
            schemaSql += `CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(table.name)} (\n`;
            // 添加列定义
            const columnDefinitions = columns.map(column => {
                let definition = `  ${this.quoteIdentifier(column.name)} ${column.type}`;
                if (column.notNull)
                    definition += ' NOT NULL';
                if (column.defaultValue !== undefined) {
                    definition += ` DEFAULT ${column.defaultValue === null ? 'NULL' : `'${column.defaultValue}'`}`;
                }
                if (column.autoIncrement)
                    definition += ' IDENTITY(1,1)';
                return definition;
            });
            // 添加主键
            const primaryKeyColumns = columns.filter(column => column.isPrimary);
            if (primaryKeyColumns.length > 0) {
                const primaryKeyNames = primaryKeyColumns.map(column => this.quoteIdentifier(column.name)).join(', ');
                columnDefinitions.push(`  PRIMARY KEY (${primaryKeyNames})`);
            }
            schemaSql += columnDefinitions.join(',\n');
            schemaSql += '\n);\n\n';
            // 添加索引
            for (const index of indexes) {
                if (index.isPrimary)
                    continue; // 主键已经在表定义中添加
                schemaSql += `-- 索引: ${index.name} on ${table.name}\n`;
                schemaSql += `CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(table.name)} (${index.columns.map(col => this.quoteIdentifier(col)).join(', ')});\n`;
            }
            if (indexes.length > 0)
                schemaSql += '\n';
            // 添加外键
            for (const foreignKey of foreignKeys) {
                schemaSql += `-- 外键: ${foreignKey.name} on ${table.name}\n`;
                schemaSql += `ALTER TABLE ${this.quoteIdentifier(table.name)} ADD CONSTRAINT ${this.quoteIdentifier(foreignKey.name)} FOREIGN KEY (${foreignKey.columns.map(col => this.quoteIdentifier(col)).join(', ')}) REFERENCES ${this.quoteIdentifier(foreignKey.referencedTable)} (${foreignKey.referencedColumns.map(col => this.quoteIdentifier(col)).join(', ')})${foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : ''}${foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : ''};\n`;
            }
            if (foreignKeys.length > 0)
                schemaSql += '\n';
        }
        return schemaSql;
    }
    /**
     * 查看数据库日志
     */
    async viewLogs(dataSource, database, limit = 100) {
        // SQL Server查看日志
        try {
            // 尝试查看SQL Server错误日志
            const logs = await dataSource.query(`EXEC xp_readerrorlog 0, 1, NULL, NULL, NULL, NULL, 'DESC'`);
            return logs.slice(0, limit);
        }
        catch (error) {
            try {
                // 尝试查看SQL Server事务日志
                const logs = await dataSource.query(`SELECT TOP ${limit} * FROM fn_dblog(NULL, NULL)`);
                return logs;
            }
            catch (e) {
                return [{ message: '无法获取SQL Server日志，请确保具有适当的权限' }];
            }
        }
    }
}
exports.SQLServerService = SQLServerService;
//# sourceMappingURL=mssql.service.js.map