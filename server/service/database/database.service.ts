import { ConnectionService } from '../connection.service';
import { BaseDatabaseService } from './base.service';
import type { DataSource } from 'typeorm';
import {
  DatabaseEntity,
  TableEntity
} from '../../model/database.entity';
import { getDialectInfo } from '../../core/dialect';
import { canonicalizeTableEntity, canonicalizeTableSpec } from '../../core/schema/canonical';
import { diffTable } from '../../core/schema/diff';
import { ddlCapabilities, emitAlterDdl, emitCreateDdl, tableNameEquals } from '../../core/schema/ddl-emitter';
import type { DdlCapability, DdlPreview, TableSpec } from '../../model/ddl-spec';
import { MySQLService } from './mysql.service';
import { PostgreSQLService } from './postgres.service';
import { SQLiteService } from './sqlite.service';
import { OracleService } from './oracle.service';
import { SQLServerService } from './mssql.service';
import { CockroachDBService } from './cockroachdb.service';
import { MongoDBService } from './mongodb.service';
import { SAPHANADatabaseService } from './sap.service';
import { ClickHouseService } from './clickhouse.service';

/**
 * 数据库服务管理类
 * 负责根据数据库类型选择相应的服务实现
 */
export class DatabaseService {

  public connectionService: ConnectionService;
  private mysqlService: MySQLService;
  private postgreSQLService: PostgreSQLService;
  private sqliteService: SQLiteService;
  private oracleService: OracleService;
  private sqlServerService: SQLServerService;
  private cockroachDBService: CockroachDBService;
  private mongoDBService: MongoDBService;
  private sapHANADatabaseService: SAPHANADatabaseService;
  private clickHouseService: ClickHouseService;

  constructor() {
    this.connectionService = new ConnectionService();
    
      this.mysqlService = new MySQLService();
      this.postgreSQLService = new PostgreSQLService();
      this.sqliteService = new SQLiteService();
      this.oracleService = new OracleService();
      this.sqlServerService = new SQLServerService();
      this.cockroachDBService = new CockroachDBService();
      this.mongoDBService = new MongoDBService();
      this.sapHANADatabaseService = new SAPHANADatabaseService();
      this.clickHouseService = new ClickHouseService();
  }

  /**
   * 获取数据库服务实例
   */
  public getDatabaseService(type: string): BaseDatabaseService {    
    
    switch (type.toLowerCase()) {
      case 'mysql':
      case 'aurora-mysql':
      case 'auroramysql':
        return this.mysqlService;
      case 'postgres':
      case 'postgresql':
      case 'aurora-postgres':
      case 'aurorapostgres':
      case 'aurora-postgresql':
        return this.postgreSQLService;
      case 'sqlite':
      case 'better-sqlite3':
      case 'bettersqlite3':
        return this.sqliteService;
      case 'oracle':
        return this.oracleService;
      case 'mssql':
      case 'sqlserver':
        return this.sqlServerService;
      case 'cockroachdb':
      case 'cockroach':
        return this.cockroachDBService;
      case 'mongodb':
      case 'mongo':
        return this.mongoDBService;
      case 'sap':
      case 'sap-hana':
      case 'saphana':
        return this.sapHANADatabaseService;
      case 'clickhouse':
      case 'click-house':
        return this.clickHouseService;
      default:
        throw new Error(`不支持的数据库类型: ${type}`);
    }
  }

  /**
   * 获取数据库列表
   */
  async getDatabases(connectionId: string): Promise<string[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getDatabases(dataSource);
  }

  /**
   * 获取数据库详细信息
   */
  async getDatabaseInfo(connectionId: string, databaseName: string): Promise<DatabaseEntity> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getDatabaseInfo(dataSource, databaseName);
  }

  /**
   * 获取数据库表列表
   */
  async getTables(connectionId: string, databaseName: string): Promise<TableEntity[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getTables(dataSource, databaseName);
  }

  /**
   * 获取表详细信息
   */
  async getTableInfo(connectionId: string, databaseName: string, tableName: string): Promise<TableEntity> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getTableInfo(dataSource, databaseName, tableName);
  }

  /**
   * 获取表数据
   */
  async getTableData(
    connectionId: string, 
    databaseName: string, 
    tableName: string,
    page: number = 1,
    pageSize: number = 100,
    where?: string,
    orderBy?: string
  ): Promise<{ data: any[], total: number }> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getTableData(dataSource, databaseName, tableName, page, pageSize, where, orderBy);
  }

  /**
   * 执行SQL查询
   */
  async executeQuery(connectionId: string, sql: string, databaseName?: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.executeQuery(dataSource, sql);
  }

  // ---- 表列表缓存 ----
  // 预览在用户每次输入后（防抖）都会触发，全量 getTables 对大库是重操作；
  // 但执行前必须拿到最新列表，否则重名检测会失效 → 预览走缓存、执行强制刷新。
  private tableListCache = new Map<string, { tables: any[]; ts: number }>();
  private static readonly TABLE_LIST_TTL_MS = 30_000;

  private tableListKey(connectionId: string, databaseName: string): string {
    return `${connectionId}::${databaseName}`;
  }

  /** 取表列表（force = 跳过缓存全量拉取） */
  private async getTableList(
    connectionId: string,
    databaseName: string,
    force: boolean
  ): Promise<any[]> {
    const key = this.tableListKey(connectionId, databaseName);
    const hit = this.tableListCache.get(key);
    if (!force && hit && Date.now() - hit.ts < DatabaseService.TABLE_LIST_TTL_MS) {
      return hit.tables;
    }
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const dbService = this.getDatabaseService(dataSource.options.type as string);
    const tables = await dbService.getTables(dataSource, databaseName);
    const list = Array.isArray(tables) ? tables : [];
    this.tableListCache.set(key, { tables: list, ts: Date.now() });
    return list;
  }

  /** 失效缓存（建表/改表成功后表列表已变化） */
  private invalidateTableList(connectionId: string, databaseName: string): void {
    this.tableListCache.delete(this.tableListKey(connectionId, databaseName));
  }

  /** 手动刷新表列表（全量拉取，忽略缓存） */
  async refreshTableCache(
    connectionId: string,
    databaseName: string
  ): Promise<{ count: number }> {
    const tables = await this.getTableList(connectionId, databaseName, true);
    return { count: tables.length };
  }

  /**
   * 目标态 TableSpec 的静态校验（建表/改表共用）
   */
  private validateTableSpec(spec: TableSpec): string {
    if (!spec || typeof spec.name !== 'string' || !spec.name.trim()) {
      throw new Error('目标表名不能为空');
    }
    if (!Array.isArray(spec.columns) || spec.columns.length === 0) {
      throw new Error('目标结构至少需要一列');
    }
    const names = new Set(spec.columns.map((c) => c.name));
    if (names.size !== spec.columns.length) {
      throw new Error('目标结构存在重名列');
    }
    for (const pk of spec.primaryKey || []) {
      if (!names.has(pk)) throw new Error(`主键列 "${pk}" 不在目标结构中`);
    }
    return spec.name.trim();
  }

  /**
   * 建表计划（preview/execute 的单一出口）：目标态 TableSpec -> 建表 DDL。
   * 与改表共用 emitCreateDdl——SQLite 重建临时表、方言 syncTable 建表、
   * 前端建表全部走同一渲染出口，CREATE TABLE 不再有第二份方言实现。
   */
  private async buildCreatePlan(
    connectionId: string,
    databaseName: string,
    spec: TableSpec,
    forceRefresh = false
  ) {
    const tableName = this.validateTableSpec(spec);
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const type = dataSource.options.type as string;
    const kind = getDialectInfo(type).kind;
    const dbService = this.getDatabaseService(type);
    const caps = ddlCapabilities(kind);

    // 方言不支持建表：作为计划内错误返回（而非抛出）——capabilities 仍要带回前端用于禁用 UI
    if (!caps.createTable) {
      return { dataSource, kind, caps, dbService, statements: [] as string[], error: `该数据库类型（${kind}）不支持通过 SQL 建表` };
    }

    // 重名检测：目标态与实时结构冲突（等价 409 语义）。
    // 预览走缓存避免每次输入都全量拉表；执行前必须 force 刷新，否则缓存会让重名检测失效。
    const tables = await this.getTableList(connectionId, databaseName, forceRefresh);
    if (tables.some((t) => tableNameEquals(kind, String(t?.name ?? ''), tableName))) {
      return { dataSource, kind, caps, dbService, statements: [] as string[], error: `表 "${tableName}" 已存在` };
    }

    const desired = canonicalizeTableSpec(spec);
    const statements = emitCreateDdl(kind, desired, { mssqlDatabase: databaseName });
    return { dataSource, kind, caps, dbService, statements, error: '' };
  }

  /**
   * 预览建表：纯计算不执行。与执行同一出口生成语句，所见即所得。
   *
   * 返回约定：只返回业务数据，失败一律 throw——由统一响应层包装成 { ret: 非0, msg: 错误信息 }，
   * 不再自带 ret/message（否则会出现外层 ret 恒为 0、错误被当成成功的双层结构）。
   */
  async previewCreateTable(
    connectionId: string,
    databaseName: string,
    spec: TableSpec
  ): Promise<DdlPreview & { capabilities: DdlCapability }> {
    const plan = await this.buildCreatePlan(connectionId, databaseName, spec);
    if (plan.error) throw new Error(plan.error);
    const previewText = plan.statements.length > 0 ? plan.statements.join(';\n') + ';' : '';
    return {
      statements: plan.statements,
      preview: previewText,
      changeSet: null,
      capabilities: plan.caps
    };
  }

  /**
   * 执行建表：与预览同一出口生成语句后执行（事务包裹）。
   */
  async executeCreateTable(
    connectionId: string,
    databaseName: string,
    spec: TableSpec
  ): Promise<{ statements: string[] }> {
    // 执行前强制刷新表列表：重名检测必须基于最新结构，不能用预览的缓存
    const plan = await this.buildCreatePlan(connectionId, databaseName, spec, true);
    if (plan.error) throw new Error(plan.error);
    if (plan.statements.length === 0) throw new Error('未能生成建表语句');
    try {
      await plan.dbService.executeBatchQuery(plan.dataSource, plan.statements, { useTransaction: true });
    } catch (error) {
      console.error('执行建表失败:', error);
      throw new Error(`创建表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    this.invalidateTableList(connectionId, databaseName); // 表列表已变化
    return { statements: plan.statements };
  }

  /**
   * 表结构变更计划（preview/execute 的单一出口）。
   *
   * 前端只传目标态 TableSpec；原始态由后端重读实时结构获得——
   * diff 永远基于服务端最新结构，前端缓存过期不再可能生成错误语句。
   */
  private async buildAlterPlan(
    connectionId: string,
    databaseName: string,
    tableName: string,
    spec: TableSpec
  ) {
    this.validateTableSpec(spec);

    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const type = dataSource.options.type as string;
    const kind = getDialectInfo(type).kind;
    const dbService = this.getDatabaseService(type);
    const caps = ddlCapabilities(kind);

    // 实时结构 = 原始态（canonicalizeTableEntity 直接消化 ColumnEntity[]）
    const columns = await dbService.getColumns(dataSource, databaseName, tableName);
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error(`表 "${tableName}" 不存在或无法读取列信息`);
    }
    // 表列表仅用于取表注释（原始态以 getColumns 为准），走缓存即可
    const tables = await this.getTableList(connectionId, databaseName, false);
    const tableEntity = tables.find((t) => tableNameEquals(kind, String(t?.name ?? ''), tableName));

    const original = canonicalizeTableEntity({
      name: tableName,
      comment: (tableEntity?.comment as string) ?? '',
      columns
    });
    const desired = canonicalizeTableSpec(spec);
    const changeSet = diffTable(original, desired);

    // 方言能力之外的变更：作为计划内错误返回，不生成注定失败的语句
    //（如 SQL Server 的主键约束名是自动生成的，DROP CONSTRAINT 无从构造）
    let error = '';
    if (changeSet.primaryKey && !caps.alterPrimaryKey) {
      error = `该数据库类型（${kind}）不支持修改主键`;
    }

    // SQL Server：删除现有主键必须知道真实的约束名（PK__<table>__<hash>），回查系统表获取。
    // 仅在「已有主键需要 DROP」时才必需；纯新增主键的约束名由我们自己指定。
    let mssqlPkConstraintName: string | undefined;
    if (!error && kind === 'mssql' && changeSet.primaryKey && changeSet.primaryKey.from.length > 0) {
      const svc = dbService as any;
      if (typeof svc.getPrimaryKeyConstraintName === 'function') {
        mssqlPkConstraintName = (await svc.getPrimaryKeyConstraintName(dataSource, databaseName, tableName)) || undefined;
      }
      if (!mssqlPkConstraintName) {
        error = '无法定位该表的主键约束名，无法修改主键';
      }
    }

    const statements = error
      ? []
      : emitAlterDdl(kind, original, desired, mssqlPkConstraintName ? { mssqlPkConstraintName } : undefined);
    return {
      dataSource,
      kind,
      caps,
      dbService,
      statements,
      changeSet,
      error,
      // 诊断用：实时表列名 vs 目标列名（"没有检测到任何修改"时让前端直接展示，
      // 用户即可确认"新增的字段其实已存在于实时表"；若 target 有而 live 没有则暴露引擎 bug）
      liveColumns: original.columns.map((c) => c.name),
      targetColumns: desired.columns.map((c) => c.name)
    };
  }

  /**
   * 预览表结构变更：纯计算不执行。preview 与 execute 共用 buildAlterPlan，
   * 所见即所得。
   */
  async previewAlterTable(
    connectionId: string,
    databaseName: string,
    tableName: string,
    spec: TableSpec
  ): Promise<DdlPreview & { capabilities: DdlCapability }> {
    const plan = await this.buildAlterPlan(connectionId, databaseName, tableName, spec);
    if (plan.error) throw new Error(plan.error);
    const previewText = plan.statements.length > 0 ? plan.statements.join(';\n') + ';' : '';
    return {
      statements: plan.statements,
      preview: previewText,
      changeSet: plan.changeSet,
      capabilities: plan.caps
    };
  }

  /**
   * 执行表结构变更：与预览同一出口生成语句后执行（事务包裹，失败整体回滚）。
   */
  async executeAlterTable(
    connectionId: string,
    databaseName: string,
    tableName: string,
    spec: TableSpec
  ): Promise<{ statements: string[] }> {
    const plan = await this.buildAlterPlan(connectionId, databaseName, tableName, spec);
    if (plan.error) throw new Error(plan.error);
    // 无变更是正常情况（如"改了又改回"），由调用方按 statements 为空给出提示，不当作错误
    if (plan.statements.length === 0) return { statements: [] };
    if (plan.caps.alterStrategy === 'unsupported') {
      throw new Error(`该数据库类型（${plan.kind}）不支持在线修改表结构`);
    }
    try {
      await plan.dbService.executeBatchQuery(plan.dataSource, plan.statements, { useTransaction: true });
    } catch (error) {
      console.error('执行表结构变更失败:', error);
      throw new Error(`修改表结构失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    this.invalidateTableList(connectionId, databaseName); // 表结构/表名可能已变化
    return { statements: plan.statements };
  }

  /**
   * 同步表结构和数据到其他数据库
   */
  async syncTable(connectionId: string, syncConfig: any): Promise<any> {
    // 手动配置目标库时创建的是一次性连接（不进缓存），必须在本方法结束时显式销毁，
    // 否则每跑一次同步就泄漏一个连接池，长期使用会耗尽服务端 max_connections
    let tempTargetDataSource: DataSource | undefined;
    try {
      const { source, target, options } = syncConfig;
      
      // 获取源数据库连接
      const sourceDataSource = await this.connectionService.getActiveConnection(connectionId, source.database);
      const sourceService = this.getDatabaseService(sourceDataSource.options.type as string);

      // 创建目标数据库连接
      let targetDataSource;
      let targetService;
      let targetDatabaseName;
      
      if (target.connectionId) {
        // 使用已配置的连接
        const dbName = target.database || source.database;
        targetDataSource = await this.connectionService.getActiveConnection(target.connectionId, dbName);
        targetService = this.getDatabaseService(targetDataSource.options.type as string);
        targetDatabaseName = dbName;
      } else {
        // 使用手动配置的连接
        targetDataSource = await this.connectionService.createTemporaryConnection({
          type: target.dbType,
          host: target.host,
          port: target.port,
          username: target.username,
          password: target.password,
          database: target.database
        });
        tempTargetDataSource = targetDataSource;
        targetService = this.getDatabaseService(target.dbType);
        targetDatabaseName = target.database;
      }

      const syncResults = [];

      // 处理单个表
      const sourceTableName = source.tableName;
      const tableSyncResult = {
        tableName: sourceTableName,
        structureSynced: false,
        dataSynced: false,
        rowsSynced: 0,
        messages: []
      };

      try {
        // 获取源表结构
        const tableStructure = await sourceService.getTableStructure(sourceDataSource, source.database, sourceTableName);
        const columns = tableStructure.columns;
        
        // 同步表结构
        if (options.syncStructure) {
          console.log(`开始同步表结构: ${sourceTableName} -> ${target.tableName}`);
          tableSyncResult.messages.push(`开始同步表结构: ${sourceTableName} -> ${target.tableName}`);
          
          // 检查目标表是否存在
          const targetTables = await targetService.getTables(targetDataSource, targetDatabaseName);
          const tableExists = targetTables.some(t => t.name === target.tableName);

          if (tableExists) {
            if (options.dropIfExists) {
              tableSyncResult.messages.push(`目标表已存在，删除表: ${target.tableName}`);
              await targetService.dropTable(targetDataSource, targetDatabaseName, target.tableName);
            } else {
              tableSyncResult.messages.push(`目标表已存在，跳过表结构同步`);
            }
          }

          if (!tableExists || options.dropIfExists) {
            tableSyncResult.messages.push(`创建目标表: ${target.tableName}`);
            await targetService.createTable(targetDataSource, targetDatabaseName, {
              name: target.tableName,
              columns: columns,
              comment: tableStructure.comment
            });
            tableSyncResult.structureSynced = true;
          }
        }

        // 同步表数据
        if (options.syncData) {
          tableSyncResult.messages.push(`开始同步表数据: ${sourceTableName} -> ${target.tableName}`);
          
          // 获取源表数据（分批获取，避免内存问题）
          const batchSize = 1000;
          let offset = 0;
          let totalRows = 0;

          while (true) {
            const sourceData = await sourceService.query(sourceDataSource, {
              sql: `SELECT * FROM ${sourceService.quoteIdentifier(sourceTableName)} LIMIT ? OFFSET ?`,
              params: [batchSize, offset]
            });

            if (sourceData.length === 0) {
              break;
            }

            // 插入数据到目标表
            if (options.bulkInsert) {
              await targetService.bulkInsert(targetDataSource, targetDatabaseName, target.tableName, sourceData, options.overrideExisting);
            } else {
              for (const row of sourceData) {
                await targetService.insertData(targetDataSource, targetDatabaseName, target.tableName, row, options.overrideExisting);
              }
            }

            totalRows += sourceData.length;
            tableSyncResult.messages.push(`已同步 ${totalRows} 行数据`);
            offset += batchSize;
          }

          tableSyncResult.dataSynced = true;
          tableSyncResult.rowsSynced = totalRows;
          tableSyncResult.messages.push(`数据同步完成，共同步 ${totalRows} 行`);
        }

        syncResults.push(tableSyncResult);
      } catch (error: any) {
        console.error(`同步表 ${sourceTableName} 失败:`, error);
        tableSyncResult.messages.push(`同步失败: ${error instanceof Error ? error.message : String(error)}`);
        syncResults.push(tableSyncResult);
        throw error;
      }
      finally {
        console.log(tableSyncResult.messages);
      }
      return { tables: syncResults };
    } catch (error: any) {
      console.error('同步表失败:', error);
     throw error;
    } finally {
      if (tempTargetDataSource) {
        try {
          await tempTargetDataSource.destroy();
        } catch (error) {
          console.error('销毁同步目标临时连接失败:', error);
        }
      }
    }
  }

  /**
   * 获取视图列表
   */
  async getViews(connectionId: string, databaseName: string): Promise<any[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getViews(dataSource, databaseName);
  }

  /**
   * 获取视图定义
   */
  async getViewDefinition(connectionId: string, databaseName: string, viewName: string): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getViewDefinition(dataSource, databaseName, viewName);
  }

  /**
   * 获取存储过程列表
   */
  async getProcedures(connectionId: string, databaseName: string): Promise<any[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getProcedures(dataSource, databaseName);
  }

  /**
   * 获取存储过程定义
   */
  async getProcedureDefinition(connectionId: string, databaseName: string, procedureName: string): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.getProcedureDefinition(dataSource, databaseName, procedureName);
  }

  /**
   * 测试数据库连接
   */
  async testConnection(connectionId: string): Promise<boolean> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.testConnection(dataSource);
  }

  /**
   * 获取支持的数据库类型
   */
  getSupportedDatabaseTypes() {
    return [
      {
        value: 'mysql',
        label: 'MySQL',
        icon: 'bi-database',
        defaultPort: 3306,
        description: 'MySQL数据库',
        features: {
          supportSchemas: false,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true
        }
      },
      {
        value: 'postgres',
        label: 'PostgreSQL',
        icon: 'bi-database',
        defaultPort: 5432,
        description: 'PostgreSQL数据库',
        features: {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportEnum: true
        }
      },
      {
        value: 'sqlite',
        label: 'SQLite',
        icon: 'bi-database',
        defaultPort: null,
        description: 'SQLite数据库文件',
        features: {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: false,
          supportArrays: false
        }
      },
      {
        value: 'oracle',
        label: 'Oracle',
        icon: 'bi-database',
        defaultPort: 1521,
        description: 'Oracle数据库',
        features: {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: false,
          supportArrays: false,
          supportSequences: true,
          supportSynonyms: true
        }
      },
      {
        value: 'mssql',
        label: 'SQL Server',
        icon: 'bi-database',
        defaultPort: 1433,
        description: 'Microsoft SQL Server',
        features: {
          supportSchemas: false,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: false,
          supportStoredProcedures: true
        }
      },
      {
        value: 'cockroachdb',
        label: 'CockroachDB',
        icon: 'bi-database',
        defaultPort: 26257,
        description: 'CockroachDB分布式SQL数据库',
        features: {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportEnum: true,
          supportDistributed: true
        }
      },
      {
        value: 'mongodb',
        label: 'MongoDB',
        icon: 'bi-database',
        defaultPort: 27017,
        description: 'MongoDB文档数据库',
        features: {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: false,
          supportViews: false,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportDocuments: true,
          supportNoSQL: true
        }
      },
      {
        value: 'sap',
        label: 'SAP HANA',
        icon: 'bi-database',
        defaultPort: 39013,
        description: 'SAP HANA内存数据库',
        features: {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: false,
          supportInMemory: true,
          supportHighPerformance: true
        }
      },
      {
        value: 'clickhouse',
        label: 'ClickHouse',
        icon: 'bi-database',
        defaultPort: 8123,
        description: 'ClickHouse列式OLAP数据库',
        features: {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: false,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportDistributed: true,
          supportHighPerformance: true
        }
      }
    ];
  }

  /**
   * 创建数据库
   */
  async createDatabase(connectionId: string, databaseName: string, options?: any): Promise<void> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.createDatabase(dataSource, databaseName, options);
  }

  /**
   * 删除数据库
   */
  async dropDatabase(connectionId: string, databaseName: string): Promise<void> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.dropDatabase(dataSource, databaseName);
  }

  /**
   * 导出数据库架构
   */
  async exportSchema(connectionId: string, databaseName: string): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportSchema(dataSource, databaseName);
  }

  /**
   * 查看数据库日志
   */
  async viewLogs(connectionId: string, databaseName?: string, limit: number = 100): Promise<any[]> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.viewLogs(dataSource, databaseName, limit);
  }

  /**
   * 备份数据库
   */
  async backupDatabase(connectionId: string, databaseName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.backupDatabase(dataSource, databaseName, options);
  }

  /**
   * 恢复数据库
   */
  async restoreDatabase(connectionId: string, databaseName: string, filePath: string, options?: any): Promise<void> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.restoreDatabase(dataSource, databaseName, filePath, options);
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(connectionId: string, databaseName: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    
    const tables = await databaseService.getTables(dataSource, databaseName);
    const tableCount = tables.length;
    const size = await databaseService.getDatabaseSize(dataSource, databaseName);
    
    return {
      tableCount,
      size,
      tables: tables.map(table => ({
        name: table.name,
        rowCount: table.rowCount || 0,
        size: table.dataSize || 0
      }))
    };
  }

  /**
   * 优化数据库
   */
  async optimizeDatabase(connectionId: string, databaseName: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    
    const tables = await databaseService.getTables(dataSource, databaseName);
    const results = [];
    
    for (const table of tables) {
      try {
        const result = await dataSource.query(`OPTIMIZE TABLE \`${table.name}\``);
        results.push({ table: table.name, success: true, result });
      } catch (error) {
        results.push({ table: table.name, success: false, error: error.message });
      }
    }
    
    return { results };
  }

  /**
   * 分析表
   */
  async analyzeTables(connectionId: string, databaseName: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    
    const tables = await databaseService.getTables(dataSource, databaseName);
    const results = [];
    
    for (const table of tables) {
      try {
        const result = await dataSource.query(`ANALYZE TABLE \`${table.name}\``);
        results.push({ table: table.name, success: true, result });
      } catch (error) {
        results.push({ table: table.name, success: false, error: error.message });
      }
    }
    
    return { results };
  }

  /**
   * 修复表
   */
  async repairTables(connectionId: string, databaseName: string): Promise<any> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    
    const tables = await databaseService.getTables(dataSource, databaseName);
    const results = [];
    
    for (const table of tables) {
      try {
        const result = await dataSource.query(`REPAIR TABLE \`${table.name}\``);
        results.push({ table: table.name, success: true, result });
      } catch (error) {
        results.push({ table: table.name, success: false, error: error.message });
      }
    }
    
    return { results };
  }

  /**
   * 导出表数据到 SQL 文件
   */
  async exportTableDataToSQL(connectionId: string, databaseName: string, tableName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportTableDataToSQL(dataSource, databaseName, tableName, options);
  }

  /**
   * 导出表数据到 CSV 文件
   */
  async exportTableDataToCSV(connectionId: string, databaseName: string, tableName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportTableDataToCSV(dataSource, databaseName, tableName, options);
  }

  /**
   * 导出表数据到 JSON 文件
   */
  async exportTableDataToJSON(connectionId: string, databaseName: string, tableName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportTableDataToJSON(dataSource, databaseName, tableName, options);
  }

  /**
   * 导出表数据到 Excel 文件
   */
  async exportTableDataToExcel(connectionId: string, databaseName: string, tableName: string, options?: any): Promise<string> {
    const dataSource = await this.connectionService.getActiveConnection(connectionId, databaseName);
    const databaseService = this.getDatabaseService(dataSource.options.type as string);
    return databaseService.exportTableDataToExcel(dataSource, databaseName, tableName, options);
  }

  /**
   * 获取数据库类型特定的配置
   */
  getDatabaseTypeSpecificConfig(type: string) {
    const service = this.getDatabaseService(type);
    return {
      type: service.getDatabaseType(),
      features: this.getDatabaseFeatures(type)
    };
  }

  /**
   * 获取数据库特性
   */
  private getDatabaseFeatures(type: string) {
    switch (type.toLowerCase()) {
      case 'mysql':
        return {
          supportSchemas: false,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true
        };
      case 'postgres':
      case 'postgresql':
        return {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportEnum: true
        };
      case 'sqlite':
        return {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: false,
          supportArrays: false
        };
      case 'oracle':
        return {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: false,
          supportArrays: false,
          supportSequences: true,
          supportSynonyms: true
        };
      case 'mssql':
      case 'sqlserver':
        return {
          supportSchemas: false,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: false,
          supportStoredProcedures: true
        };
      case 'cockroachdb':
      case 'cockroach':
        return {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportEnum: true,
          supportDistributed: true
        };
      case 'mongodb':
      case 'mongo':
        return {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: false,
          supportViews: false,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportDocuments: true,
          supportNoSQL: true
        };
      case 'sap':
      case 'sap-hana':
      case 'saphana':
        return {
          supportSchemas: true,
          supportProcedures: true,
          supportTriggers: true,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: false,
          supportInMemory: true,
          supportHighPerformance: true
        };
      case 'clickhouse':
      case 'click-house':
        return {
          supportSchemas: false,
          supportProcedures: false,
          supportTriggers: false,
          supportViews: true,
          supportFullTextSearch: true,
          supportJson: true,
          supportArrays: true,
          supportDistributed: true,
          supportHighPerformance: true
        };
      default:
        return {};
    }
  }
}