"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CockroachDBService = void 0;
const base_service_1 = require("./base.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * CockroachDB数据库服务实现
 * CockroachDB 是一个兼容 PostgreSQL 的分布式 SQL 数据库
 */
class CockroachDBService extends base_service_1.BaseDatabaseService {
    getDatabaseType() {
        return 'cockroachdb';
    }
    /**
     * 获取CockroachDB数据库列表
     */
    async getDatabases(dataSource) {
        const result = await dataSource.query(`
      SELECT 
        database_name as name
      FROM 
        information_schema.databases
      WHERE 
        database_name NOT IN ('system', 'pg_catalog', 'information_schema', 'crdb_internal')
      ORDER BY 
        database_name
    `);
        return result.map((row) => row.name);
    }
    /**
     * 获取CockroachDB表列表
     */
    async getTables(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        t.table_name as name,
        'table' as type,
        obj_description(t.oid) as comment
      FROM 
        information_schema.tables t
      WHERE 
        t.table_schema = $1
        AND t.table_type = 'BASE TABLE'
      ORDER BY 
        t.table_name
    `, [database]);
        return result.map((row) => ({
            name: row.name,
            type: row.type,
            comment: row.comment || '',
            rowCount: undefined,
            dataSize: undefined,
            indexSize: undefined
        }));
    }
    /**
     * 获取CockroachDB列信息
     */
    async getColumns(dataSource, database, table) {
        const result = await dataSource.query(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as defaultValue,
        CASE 
          WHEN column_name IN (
            SELECT column_name 
            FROM information_schema.key_column_usage 
            WHERE table_schema = $1 
              AND table_name = $2 
              AND constraint_name LIKE '%_pkey'
          ) THEN true
          ELSE false
        END as isPrimary,
        CASE 
          WHEN data_type LIKE '%serial%' OR data_type LIKE '%identity%' 
          THEN true
          ELSE false
        END as isAutoIncrement
      FROM 
        information_schema.columns
      WHERE 
        table_schema = $1
        AND table_name = $2
      ORDER BY 
        ordinal_position
    `, [database, table]);
        return result.map((row) => ({
            name: row.name,
            type: row.type,
            nullable: row.nullable === 'YES',
            defaultValue: row.defaultValue,
            isPrimary: row.isPrimary,
            isAutoIncrement: row.isAutoIncrement
        }));
    }
    /**
     * 获取CockroachDB索引信息
     */
    async getIndexes(dataSource, database, table) {
        const result = await dataSource.query(`
      SELECT 
        i.relname as name,
        CASE 
          WHEN i.indisunique THEN 'UNIQUE'
          ELSE 'INDEX'
        END as type,
        array_agg(a.attname ORDER BY k.n) as columns,
        i.indisunique as unique
      FROM 
        pg_index i
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
        CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(n, ord) ON true
      WHERE 
        n.nspname = $1
        AND t.relname = $2
      GROUP BY 
        i.relname, i.indisunique
      ORDER BY 
        i.relname
    `, [database, table]);
        return result.map((row) => ({
            name: row.name,
            type: row.type,
            columns: row.columns || [],
            unique: row.unique
        }));
    }
    /**
     * 获取CockroachDB外键信息
     */
    async getForeignKeys(dataSource, database, table) {
        const result = await dataSource.query(`
      SELECT 
        tc.constraint_name as name,
        kcu.column_name as column,
        ccu.table_name as referencedTable,
        ccu.column_name as referencedColumn,
        rc.update_rule as onUpdate,
        rc.delete_rule as onDelete
      FROM 
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints rc 
          ON rc.constraint_name = tc.constraint_name
      WHERE 
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
      ORDER BY 
        tc.constraint_name
    `, [database, table]);
        return result.map((row) => ({
            name: row.name,
            column: row.column,
            referencedTable: row.referencedTable,
            referencedColumn: row.referencedColumn,
            onDelete: row.onDelete || 'NO ACTION',
            onUpdate: row.onUpdate || 'NO ACTION'
        }));
    }
    /**
     * 获取CockroachDB数据库大小
     */
    async getDatabaseSize(dataSource, database) {
        try {
            const result = await dataSource.query(`
        SELECT 
          pg_database_size(datname) as size
        FROM 
          pg_database
        WHERE 
          datname = $1
      `, [database]);
            return result[0]?.size || 0;
        }
        catch (error) {
            return 0;
        }
    }
    /**
     * 获取CockroachDB视图列表
     */
    async getViews(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        table_name as name,
        view_definition as definition
      FROM 
        information_schema.views
      WHERE 
        table_schema = $1
      ORDER BY 
        table_name
    `, [database]);
        return result.map((row) => ({
            name: row.name,
            comment: '',
            schemaName: database,
            definition: row.definition
        }));
    }
    /**
     * 获取CockroachDB视图定义
     */
    async getViewDefinition(dataSource, database, viewName) {
        const result = await dataSource.query(`
      SELECT 
        view_definition as definition
      FROM 
        information_schema.views
      WHERE 
        table_schema = $1
        AND table_name = $2
    `, [database, viewName]);
        return result[0]?.definition || '';
    }
    /**
     * 获取CockroachDB存储过程列表
     */
    async getProcedures(dataSource, database) {
        const result = await dataSource.query(`
      SELECT 
        p.proname as name,
        pg_get_userbyid(p.proowner).usename as owner,
        pg_get_functiondef(p.oid) as definition
      FROM 
        pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE 
        n.nspname = $1
        AND p.prokind = 'f'
      ORDER BY 
        p.proname
    `, [database]);
        return result.map((row) => ({
            name: row.name,
            owner: row.owner,
            definition: row.definition
        }));
    }
    /**
     * 获取CockroachDB存储过程定义
     */
    async getProcedureDefinition(dataSource, database, procedureName) {
        const result = await dataSource.query(`
      SELECT 
        pg_get_functiondef(p.oid) as definition
      FROM 
        pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE 
        n.nspname = $1
        AND p.proname = $2
    `, [database, procedureName]);
        return result[0]?.definition || '';
    }
    /**
     * 创建CockroachDB数据库
     */
    async createDatabase(dataSource, databaseName, options) {
        await dataSource.query(`CREATE DATABASE ${this.quoteIdentifier(databaseName)}`);
    }
    /**
     * 删除CockroachDB数据库
     */
    async dropDatabase(dataSource, databaseName) {
        await dataSource.query(`DROP DATABASE IF EXISTS ${this.quoteIdentifier(databaseName)}`);
    }
    /**
     * 导出数据库架构
     */
    async exportSchema(dataSource, databaseName) {
        const tables = await this.getTables(dataSource, databaseName);
        let schemaSql = `-- CockroachDB数据库架构导出 - ${databaseName}\n`;
        schemaSql += `-- 导出时间: ${new Date().toISOString()}\n\n`;
        for (const table of tables) {
            const columns = await this.getColumns(dataSource, databaseName, table.name);
            const indexes = await this.getIndexes(dataSource, databaseName, table.name);
            const foreignKeys = await this.getForeignKeys(dataSource, databaseName, table.name);
            schemaSql += `-- 表结构: ${table.name}\n`;
            schemaSql += `CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(table.name)} (\n`;
            const columnDefinitions = columns.map(column => {
                let definition = `  ${this.quoteIdentifier(column.name)} ${column.type}`;
                if (!column.nullable)
                    definition += ' NOT NULL';
                if (column.defaultValue !== undefined) {
                    const upperDefault = column.defaultValue.toString().toUpperCase();
                    if (upperDefault === 'CURRENT_TIMESTAMP' || upperDefault === 'NOW()' || upperDefault === 'CURRENT_DATE') {
                        definition += ` DEFAULT ${upperDefault}`;
                    }
                    else {
                        definition += ` DEFAULT ${column.defaultValue === null ? 'NULL' : `'${column.defaultValue}'`}`;
                    }
                }
                if (column.isPrimary)
                    definition += ' PRIMARY KEY';
                return definition;
            });
            schemaSql += columnDefinitions.join(',\n');
            schemaSql += '\n);\n\n';
            for (const index of indexes) {
                if (index.type === 'PRIMARY' || index.name.toUpperCase() === 'PRIMARY')
                    continue;
                schemaSql += `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(table.name)} (${index.columns.map(col => this.quoteIdentifier(col)).join(', ')});\n`;
            }
            if (indexes.length > 0)
                schemaSql += '\n';
            for (const foreignKey of foreignKeys) {
                schemaSql += `ALTER TABLE ${this.quoteIdentifier(table.name)} ADD CONSTRAINT ${this.quoteIdentifier(foreignKey.name)} FOREIGN KEY (${this.quoteIdentifier(foreignKey.column)}) REFERENCES ${this.quoteIdentifier(foreignKey.referencedTable)} (${this.quoteIdentifier(foreignKey.referencedColumn)})${foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : ''}${foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : ''};\n`;
            }
            if (foreignKeys.length > 0)
                schemaSql += '\n';
        }
        return schemaSql;
    }
    /**
     * 查看CockroachDB日志
     */
    async viewLogs(dataSource, database, limit = 100) {
        try {
            const result = await dataSource.query(`
        SELECT 
          log_time,
          user_name,
          database_name,
          error_severity,
          message
        FROM 
          crdb_internal.statement_statistics
        ORDER BY 
          log_time DESC
        LIMIT $1
      `, [limit]);
            return result;
        }
        catch (error) {
            return [{ message: 'CockroachDB日志功能有限，请使用 SHOW CLUSTER SETTINGS 查看配置' }];
        }
    }
    /**
     * 备份CockroachDB数据库
     */
    async backupDatabase(dataSource, databaseName, options) {
        try {
            const backupPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'backups');
            if (!fs.existsSync(backupPath)) {
                fs.mkdirSync(backupPath, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupPath, `${databaseName}_${timestamp}.sql`);
            const schema = await this.exportSchema(dataSource, databaseName);
            fs.writeFileSync(backupFile, schema, 'utf8');
            return `备份成功：${backupFile}`;
        }
        catch (error) {
            console.error('CockroachDB备份失败:', error);
            throw new Error(`备份失败: ${error.message}`);
        }
    }
    /**
     * 恢复CockroachDB数据库
     */
    async restoreDatabase(dataSource, databaseName, filePath, options) {
        try {
            const sqlContent = fs.readFileSync(filePath, 'utf8');
            await this.executeSqlFile(dataSource, filePath);
        }
        catch (error) {
            console.error('CockroachDB恢复失败:', error);
            throw new Error(`恢复失败: ${error.message}`);
        }
    }
    /**
     * 导出表数据到 SQL 文件
     */
    async exportTableDataToSQL(dataSource, databaseName, tableName, options) {
        try {
            const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
            if (!fs.existsSync(exportPath)) {
                fs.mkdirSync(exportPath, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.sql`);
            const columns = await this.getColumns(dataSource, databaseName, tableName);
            const columnNames = columns.map(column => column.name);
            const header = `-- 表数据导出 - ${tableName}\n` +
                `-- 导出时间: ${new Date().toISOString()}\n\n`;
            fs.writeFileSync(exportFile, header, 'utf8');
            const batchSize = options?.batchSize || 10000;
            let offset = 0;
            let hasMoreData = true;
            while (hasMoreData) {
                const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
                const data = await dataSource.query(query);
                if (data.length === 0) {
                    hasMoreData = false;
                    break;
                }
                let batchSql = '';
                data.forEach((row) => {
                    const values = columnNames.map(column => {
                        const value = row[column];
                        if (value === null || value === undefined) {
                            return 'NULL';
                        }
                        else if (typeof value === 'string') {
                            return `'${value.replace(/'/g, "''")}'`;
                        }
                        else if (typeof value === 'boolean') {
                            return value ? 'true' : 'false';
                        }
                        else if (value instanceof Date) {
                            return `'${value.toISOString()}'`;
                        }
                        else if (typeof value === 'object') {
                            try {
                                const stringValue = JSON.stringify(value);
                                return `'${stringValue.replace(/'/g, "''")}'`;
                            }
                            catch {
                                return `'${String(value).replace(/'/g, "''")}'`;
                            }
                        }
                        else {
                            return String(value);
                        }
                    });
                    batchSql += `INSERT INTO ${this.quoteIdentifier(tableName)} (${columnNames.map(col => this.quoteIdentifier(col)).join(', ')}) VALUES (${values.join(', ')});\n`;
                });
                fs.appendFileSync(exportFile, batchSql, 'utf8');
                offset += batchSize;
                console.log(`CockroachDB导出表数据进度: ${tableName} - 已处理 ${offset} 行`);
            }
            return exportFile;
        }
        catch (error) {
            console.error('CockroachDB导出表数据失败:', error);
            throw new Error(`导出表数据失败: ${error.message}`);
        }
    }
    /**
     * 导出表数据到 CSV 文件
     */
    async exportTableDataToCSV(dataSource, databaseName, tableName, options) {
        try {
            const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
            if (!fs.existsSync(exportPath)) {
                fs.mkdirSync(exportPath, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.csv`);
            const columns = await this.getColumns(dataSource, databaseName, tableName);
            const columnNames = columns.map(column => column.name);
            const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
            fs.writeFileSync(exportFile, bom);
            fs.appendFileSync(exportFile, columnNames.map(name => `"${name}"`).join(',') + '\n', 'utf8');
            const batchSize = options?.batchSize || 10000;
            let offset = 0;
            let hasMoreData = true;
            while (hasMoreData) {
                const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
                const data = await dataSource.query(query);
                if (data.length === 0) {
                    hasMoreData = false;
                    break;
                }
                let batchCsv = '';
                data.forEach((row) => {
                    const values = columnNames.map(column => {
                        const value = row[column];
                        if (value === null || value === undefined) {
                            return '';
                        }
                        else if (typeof value === 'string') {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        else if (value instanceof Date) {
                            return `"${value.toISOString()}"`;
                        }
                        else if (typeof value === 'object' && value !== null) {
                            try {
                                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                            }
                            catch {
                                return `"${String(value).replace(/"/g, '""')}"`;
                            }
                        }
                        else {
                            return String(value);
                        }
                    });
                    batchCsv += values.join(',') + '\n';
                });
                fs.appendFileSync(exportFile, batchCsv, 'utf8');
                offset += batchSize;
                console.log(`CockroachDB导出表数据到CSV进度: ${tableName} - 已处理 ${offset} 行`);
            }
            return exportFile;
        }
        catch (error) {
            console.error('CockroachDB导出表数据到CSV失败:', error);
            throw new Error(`导出表数据到CSV失败: ${error.message}`);
        }
    }
    /**
     * 导出表数据到 JSON 文件
     */
    async exportTableDataToJSON(dataSource, databaseName, tableName, options) {
        try {
            const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
            if (!fs.existsSync(exportPath)) {
                fs.mkdirSync(exportPath, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.json`);
            const batchSize = options?.batchSize || 10000;
            let offset = 0;
            let hasMoreData = true;
            let allData = [];
            while (hasMoreData) {
                const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
                const data = await dataSource.query(query);
                if (data.length === 0) {
                    hasMoreData = false;
                    break;
                }
                allData = allData.concat(data);
                offset += batchSize;
                console.log(`CockroachDB导出表数据到JSON进度: ${tableName} - 已处理 ${offset} 行`);
            }
            fs.writeFileSync(exportFile, JSON.stringify(allData, null, 2), 'utf8');
            return exportFile;
        }
        catch (error) {
            console.error('CockroachDB导出表数据到JSON失败:', error);
            throw new Error(`导出表数据到JSON失败: ${error.message}`);
        }
    }
    /**
     * 导出表数据到 Excel 文件
     */
    async exportTableDataToExcel(dataSource, databaseName, tableName, options) {
        try {
            const exportPath = options?.path || path.join(__dirname, '..', '..', '..', 'data', 'exports');
            if (!fs.existsSync(exportPath)) {
                fs.mkdirSync(exportPath, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportFile = path.join(exportPath, `${tableName}_data_${timestamp}.xlsx`);
            const columns = await this.getColumns(dataSource, databaseName, tableName);
            const columnNames = columns.map(column => column.name);
            const batchSize = options?.batchSize || 10000;
            let offset = 0;
            let hasMoreData = true;
            let allData = [];
            while (hasMoreData) {
                const query = `SELECT * FROM ${this.quoteIdentifier(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;
                const data = await dataSource.query(query);
                if (data.length === 0) {
                    hasMoreData = false;
                    break;
                }
                allData = allData.concat(data);
                offset += batchSize;
                console.log(`CockroachDB导出表数据到Excel进度: ${tableName} - 已处理 ${offset} 行`);
            }
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(tableName);
            worksheet.columns = columnNames.map(name => ({
                header: name,
                key: name
            }));
            worksheet.addRows(allData);
            await workbook.xlsx.writeFile(exportFile);
            return exportFile;
        }
        catch (error) {
            console.error('CockroachDB导出表数据到Excel失败:', error);
            throw new Error(`导出表数据到Excel失败: ${error.message}`);
        }
    }
    /**
     * CockroachDB使用双引号作为标识符
     */
    quoteIdentifier(identifier) {
        return `"${identifier}"`;
    }
}
exports.CockroachDBService = CockroachDBService;
//# sourceMappingURL=cockroachdb.service.js.map