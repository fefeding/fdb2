<template>
  <!-- 点击遮罩不关闭：避免误触丢失已填写的表结构；只能通过右上角关闭或取消按钮关闭 -->
  <div v-if="visible" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-lg" style="width: 80%; max-width: none;" @click.stop>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-pencil-square me-2"></i>
            {{ mode === 'create' ? $t('tableEditor.createNewTable') : $t('tableEditor.modifyStructure') }}
          </h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>
        
        <div class="modal-body">
          <!-- 表基本信息 -->
          <div class="table-info-section mb-4">
            <h6 class="section-title">{{ $t('tableEditor.tableInfo') }}</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">{{ $t('tableEditor.tableNameLabel') }}</label>
                  <input 
                    v-model="formData.tableName" 
                    type="text" 
                    class="form-control" 
                    :disabled="mode === 'edit'"
                    :placeholder="$t('tableEditor.tableNamePlaceholder')"
                  >
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">{{ $t('tableEditor.tableCommentLabel') }}</label>
                  <input 
                    v-model="formData.tableComment" 
                    type="text" 
                    class="form-control" 
                    :placeholder="$t('tableEditor.tableCommentPlaceholder')"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- 字段管理 -->
          <div class="columns-section">
            <div class="section-header d-flex justify-content-between align-items-center mb-3">
              <h6 class="section-title mb-0">{{ $t('tableEditor.columnManagement') }}</h6>
              <button class="btn btn-success btn-sm" @click="addColumn">
                <i class="bi bi-plus-lg"></i> {{ $t('tableEditor.addColumn') }}
              </button>
            </div>
            
            <div class="table-responsive">
              <table class="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th width="120">{{ $t('tableEditor.columnNameHeader') }}</th>
                    <th width="140">{{ $t('tableEditor.dataTypeHeader') }}</th>
                    <th width="120">{{ $t('tableEditor.lengthPrecisionHeader') }}</th>
                    <th width="80">{{ $t('tableEditor.nullableHeader') }}</th>
                    <th width="100">{{ $t('tableEditor.defaultHeader') }}</th>
                    <th width="80">{{ $t('tableEditor.primaryKeyHeader') }}</th>
                    <th width="80">{{ $t('tableEditor.autoIncHeader') }}</th>
                    <th>{{ $t('tableEditor.commentHeader') }}</th>
                    <th width="100">{{ $t('tableEditor.operationsHeader') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(column, index) in formData.columns" :key="index">
                    <td>
                      <input 
                        v-model="column.name" 
                        type="text" 
                        class="form-control form-control-sm" 
                        :placeholder="$t('tableEditor.columnNamePlaceholder')"
                      >
                    </td>
                    <td>
                      <select v-model="column.type" class="form-select form-select-sm">
                        <option value="">{{ $t('tableEditor.selectType') }}</option>
                        <optgroup v-for="(types, category) in columnTypesByCategory" :key="category" :label="getCategoryLabel(category)">
                          <option v-for="type in types" :key="type.name" :value="type.name">
                            {{ type.label }}
                          </option>
                        </optgroup>
                        <option :value="CUSTOM_TYPE_VALUE">{{ $t('tableEditor.customType') }}</option>
                      </select>
                      <input
                        v-if="column.type === CUSTOM_TYPE_VALUE"
                        v-model="column.customType"
                        type="text"
                        class="form-control form-control-sm mt-1"
                        :placeholder="$t('tableEditor.customTypePlaceholder')"
                      >
                    </td>
                    <td>
                      <div class="input-group input-group-sm" v-if="needsLength(column) || needsPrecision(column)">
                        <input 
                          v-if="needsLength(column)"
                          v-model="column.length" 
                          type="number" 
                          class="form-control form-control-sm" 
                          :placeholder="$t('tableEditor.lengthPlaceholder')"
                        >
                        <input 
                          v-if="needsPrecision(column)"
                          v-model="column.precision" 
                          type="number" 
                          class="form-control form-control-sm" 
                          :placeholder="$t('tableEditor.precisionPlaceholder')"
                        >
                        <input 
                          v-if="needsScale(column)"
                          v-model="column.scale" 
                          type="number" 
                          class="form-control form-control-sm" 
                          :placeholder="$t('tableEditor.scalePlaceholder')"
                        >
                      </div>
                      <span v-else class="text-muted">-</span>
                    </td>
                    <td>
                      <div class="form-check">
                        <input 
                          v-model="column.nullable" 
                          type="checkbox" 
                          class="form-check-input"
                        >
                      </div>
                    </td>
                    <td>
                      <input 
                        v-model="column.defaultValue" 
                        type="text" 
                        class="form-control form-control-sm" 
                        :placeholder="$t('tableEditor.defaultHeader')"
                      >
                    </td>
                    <td>
                      <div class="form-check">
                        <input 
                          v-model="column.isPrimary" 
                          type="checkbox" 
                          class="form-check-input"
                          @change="onPrimaryKeyChange(column, index)"
                        >
                      </div>
                    </td>
                    <td>
                      <div class="form-check">
                        <input 
                          v-model="column.isAutoIncrement" 
                          type="checkbox" 
                          class="form-check-input"
                          :disabled="!column.isPrimary || !supportsAutoIncrement(column)"
                        >
                      </div>
                    </td>
                    <td>
                      <input 
                        v-model="column.comment" 
                        type="text" 
                        class="form-control form-control-sm" 
                        :placeholder="$t('tableEditor.fieldComment')"
                      >
                    </td>
                    <td>
                      <button 
                        class="btn btn-outline-danger btn-sm" 
                        @click="removeColumn(index)"
                        :disabled="formData.columns.length <= 1"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- SQL预览 -->
          <div class="sql-preview-section mt-4">
            <h6 class="section-title">{{ $t('tableEditor.sqlPreview') }}</h6>
            <pre class="sql-preview">{{ generateSQL() }}</pre>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">{{ $t('common.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="submit">{{ $t('common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import { DatabaseService } from '@/service/database';
import { modal } from '@/utils/modal';
import { getColumnTypesByName, ColumnCategory } from '@/typings/database-types';
import { isNumericType, isBooleanType } from '@/utils/database-types';

// Props
const props = defineProps<{
  visible: boolean;
  connection: ConnectionEntity | null;
  database: string;
  table?: TableEntity | null;
  columns?: any[];
  mode: 'create' | 'edit';
}>();

// Emits
const emit = defineEmits<{
  close: [];
  submit: [result: any];
}>();

const databaseService = new DatabaseService();
const { t } = useI18n();

// 自定义类型的哨兵值：选中后由用户输入完整类型（如 ENUM('a','b')、DECIMAL(10,2)）
const CUSTOM_TYPE_VALUE = '__custom__';

// 当前数据库类型（统一小写）
const dbType = computed(() => (props.connection?.type || '').toLowerCase());

// 与 MySQL 语法兼容的数据库
const MYSQL_LIKE_TYPES = new Set(['mysql', 'mariadb', 'aurora-mysql', 'auroramysql']);
// 与 PostgreSQL 语法兼容的数据库（CockroachDB 走 PostgreSQL 协议）
const POSTGRES_LIKE_TYPES = new Set([
  'postgres', 'postgresql', 'cockroachdb',
  'aurora-postgres', 'aurorapostgres', 'aurora-postgresql'
]);

const isMySqlLike = () => MYSQL_LIKE_TYPES.has(dbType.value);
const isPostgresLike = () => POSTGRES_LIKE_TYPES.has(dbType.value);

// 列的最终类型字符串
function rawType(column: any): string {
  if (!column) return '';
  return column.type === CUSTOM_TYPE_VALUE ? (column.customType || '') : (column.type || '');
}

// SQL 中实际使用的类型字符串（SQLite 自增必须是 INTEGER PRIMARY KEY）
function sqlType(column: any): string {
  const type = rawType(column);
  if (dbType.value === 'sqlite' && column?.isAutoIncrement && /^INT$/i.test(type.trim())) {
    return 'INTEGER';
  }
  return type;
}

// 转义 SQL 字符串字面量中的单引号
function escapeSqlString(value: any): string {
  return String(value ?? '').replace(/'/g, "''");
}

// 获取当前数据库支持的列类型
const columnTypes = computed(() => {
  if (!props.connection) return [];
  return getColumnTypesByName(props.connection.type);
});

// 按类别分组的列类型
const columnTypesByCategory = computed(() => {
  const categories: Record<string, any[]> = {};
  columnTypes.value.forEach(type => {
    if (!categories[type.category]) {
      categories[type.category] = [];
    }
    categories[type.category].push(type);
  });
  return categories;
});

// 表单数据
const formData = ref({
  tableName: '',
  tableComment: '',
  columns: [{
    name: '',
    type: '',
    customType: '',
    length: '',
    precision: null as string | null,
    scale: null as string | null,
    nullable: false,
    defaultValue: '',
    isPrimary: false,
    isAutoIncrement: false,
    comment: ''
  }] as Array<{
    name: string;
    type: string;
    customType: string;
    length: string;
    precision: string | null;
    scale: string | null;
    nullable: boolean;
    defaultValue: string;
    isPrimary: boolean;
    isAutoIncrement: boolean;
    comment: string;
  }>
});

// 原始表结构（用于对比差异）
const originalTableData = ref({
  tableName: '',
  tableComment: '',
  columns: [] as any[]
});

// 解析类型字符串，提取基础类型名和长度/精度
// 例如: "varchar(255)" -> { baseType: "VARCHAR", length: "255" }
//       "decimal(10,2)" -> { baseType: "DECIMAL", precision: "10", scale: "2" }
//       "int(11)" -> { baseType: "INT", length: "11" }
function parseColumnType(typeStr: string): { baseType: string; length?: string; precision?: string; scale?: string } {
  const result: { baseType: string; length?: string; precision?: string; scale?: string } = {
    baseType: typeStr
  };

  if (!typeStr) return result;

  const match = typeStr.match(/^([a-zA-Z\s]+)\(([^)]+)\)$/);
  if (match) {
    result.baseType = match[1].trim().toUpperCase();
    const params = match[2].split(',').map((s: string) => s.trim());

    // 查找类型定义，判断是长度还是精度
    const typeInfo = columnTypes.value.find(t => t.name.toUpperCase() === result.baseType);
    if (typeInfo?.requiresPrecision) {
      result.precision = params[0] || undefined;
      result.scale = params[1] || undefined;
    } else {
      result.length = params[0] || '';
    }
  } else {
    // 不带括号，直接使用大写作为基础类型
    result.baseType = typeStr.trim().toUpperCase();
  }

  return result;
}

// 初始化表单数据
function initFormData() {  
  if (props.mode === 'edit' && props.table) {
    const columns = props.columns || props.table.columns || [];
    const tableData = {
      tableName: props.table.name || '',
      tableComment: props.table.comment || '',
      columns: columns.map(col => {
        // 解析类型字符串，提取基础类型名和长度/精度
        const rawColType = col.type || '';
        const parsed = parseColumnType(rawColType);
        // ENUM('a','b') 这类参数不是数字的类型整体作为自定义类型，避免参数被拆坏
        const isNonNumericParamType = /^[a-zA-Z\s]+\([^)]*'[^)]*\)$/.test(rawColType);
        return {
          name: col.name || '',
          type: isNonNumericParamType ? CUSTOM_TYPE_VALUE : parsed.baseType,
          customType: isNonNumericParamType ? rawColType : (col.customType || ''),
          length: col.length || parsed.length || '',
          precision: col.precision || parsed.precision || null,
          scale: col.scale || parsed.scale || null,
          nullable: col.nullable || false,
          defaultValue: col.defaultValue || '',
          isPrimary: col.isPrimary || false,
          isAutoIncrement: col.isAutoIncrement || false,
          comment: col.comment || ''
        } as any;
      }) || []
    };
    formData.value = { ...tableData };
    originalTableData.value = JSON.parse(JSON.stringify(tableData));
  } else {
    // 创建模式：如果传入 partial table，预填表名/注释
    const isCreateWithPrefill = props.mode === 'create' && props.table;
    formData.value = {
      tableName: isCreateWithPrefill ? (props.table!.name || '') : '',
      tableComment: isCreateWithPrefill ? (props.table!.comment || '') : '',
      columns: [{
        name: '',
        type: '',
        customType: '',
        length: '',
        precision: null,
        scale: null,
        nullable: false,
        defaultValue: '',
        isPrimary: false,
        isAutoIncrement: false,
        comment: ''
      } as any]
    };
    originalTableData.value = {
      tableName: '',
      tableComment: '',
      columns: [] as any[]
    };
  }
}

// 列定义是否发生变化（不含列名，用于判断"仅改名"）
function isColumnDefinitionChanged(newCol: any, originalCol: any): boolean {
  return (
    newCol.type !== originalCol.type ||
    newCol.customType !== originalCol.customType ||
    newCol.length !== originalCol.length ||
    newCol.precision !== originalCol.precision ||
    newCol.scale !== originalCol.scale ||
    newCol.nullable !== originalCol.nullable ||
    newCol.defaultValue !== originalCol.defaultValue ||
    newCol.isPrimary !== originalCol.isPrimary ||
    newCol.isAutoIncrement !== originalCol.isAutoIncrement ||
    newCol.comment !== originalCol.comment
  );
}

// 编辑距离（用于列名相似度判断）
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev: number[] = new Array(n + 1).fill(0);
  let curr: number[] = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const aChar = a.charAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = aChar === b.charAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        (curr[j - 1] as number) + 1,
        (prev[j] as number) + 1,
        (prev[j - 1] as number) + cost
      );
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n] as number;
}

// 两个列名是否可能属于同一次重命名，返回相似度分数（0 表示不是重命名关系）
function renameNameScore(oldName: string, newName: string): number {
  const a = String(oldName || '').trim().toLowerCase();
  const b = String(newName || '').trim().toLowerCase();
  if (!a || !b || a === b) return 0;
  // 前缀关系：name -> name1、user_name -> user_name2
  if (a.startsWith(b) || b.startsWith(a)) return 3;
  // 少量编辑：拼写修正
  const maxLen = Math.max(a.length, b.length);
  if (maxLen > 0 && levenshtein(a, b) <= Math.max(1, Math.floor(maxLen / 3))) return 1;
  return 0;
}

/**
 * 重命名检测：把「新增列」与「删除列」中名称相近的配成对。
 * 否则改名会被生成为 DROP COLUMN + ADD COLUMN，导致原数据丢失。
 */
function matchRenamedColumns(addedColumns: any[], deletedColumns: any[]) {
  const pairs: Array<{ oldColumn: any; newColumn: any }> = [];
  const usedOld = new Set<any>();

  addedColumns.forEach((newCol, newIndex) => {
    let bestOld: any = null;
    let bestScore = 0;
    deletedColumns.forEach((oldCol, oldIndex) => {
      if (usedOld.has(oldCol)) return;
      const score = renameNameScore(oldCol.name, newCol.name);
      if (score === 0) return;
      // 顺序位置一致的候选优先
      const total = score + (oldIndex === newIndex ? 0.1 : 0);
      if (total > bestScore) {
        bestScore = total;
        bestOld = oldCol;
      }
    });
    if (bestOld) {
      usedOld.add(bestOld);
      pairs.push({ oldColumn: bestOld, newColumn: newCol });
    }
  });

  return pairs;
}

// 计算表结构差异
function calculateTableDiff() {
  const diff = {
    tableName: formData.value.tableName,
    tableCommentChanged: formData.value.tableComment !== originalTableData.value.tableComment,
    tableComment: formData.value.tableComment,
    // 完整的新列顺序（供后端 SQLite 重建表时保持列顺序）
    columnOrder: formData.value.columns.map(c => c.name).filter(Boolean),
    addedColumns: [] as any[],
    modifiedColumns: [] as any[],
    deletedColumns: [] as any[],
    renamedColumns: [] as Array<{ oldColumn: any; newColumn: any }>
  };

  // 创建原始列的映射（按列名）
  const originalColumnsMap = new Map();
  originalTableData.value.columns.forEach(col => {
    originalColumnsMap.set(col.name, col);
  });

  // 检查新增和修改的列
  formData.value.columns.forEach(newCol => {
    const originalCol = originalColumnsMap.get(newCol.name);

    if (!originalCol) {
      // 新增列
      diff.addedColumns.push(newCol);
    } else if (isColumnDefinitionChanged(newCol, originalCol)) {
      // 检查列是否被修改
      diff.modifiedColumns.push({
        oldColumn: originalCol,
        newColumn: newCol
      });
    }
  });

  // 检查删除的列
  const deletedColumns = originalTableData.value.columns.filter(
    originalCol => !formData.value.columns.some(newCol => newCol.name === originalCol.name)
  );

  // 重命名检测：把改名产生的"新增 + 删除"合并为重命名，避免数据丢失
  const renamedColumns = matchRenamedColumns(diff.addedColumns, deletedColumns);
  if (renamedColumns.length > 0) {
    const renamedNewNames = new Set(renamedColumns.map(r => r.newColumn));
    const renamedOldColumns = new Set(renamedColumns.map(r => r.oldColumn));
    diff.renamedColumns = renamedColumns;
    diff.addedColumns = diff.addedColumns.filter(col => !renamedNewNames.has(col));
    diff.deletedColumns = deletedColumns.filter(col => !renamedOldColumns.has(col));

    // 改名同时改了定义（如长度/类型）的，额外记为修改，由 CHANGE COLUMN / ALTER COLUMN 处理
    renamedColumns.forEach(({ oldColumn, newColumn }) => {
      if (isColumnDefinitionChanged(newColumn, oldColumn)) {
        diff.modifiedColumns.push({ oldColumn, newColumn });
      }
    });
  } else {
    diff.deletedColumns = deletedColumns;
  }

  return diff;
}
// 添加字段
function addColumn() {
  formData.value.columns.push({
    name: '',
    type: '',
    customType: '',
    length: '',
    precision: null,
    scale: null,
    nullable: false,
    defaultValue: '',
    isPrimary: false,
    isAutoIncrement: false,
    comment: ''
  });
}

// 删除字段
function removeColumn(index: number) {
  if (formData.value.columns.length > 1) {
    formData.value.columns.splice(index, 1);
  }
}

// 主键变更处理
function onPrimaryKeyChange(column: any, index: number) {
  if (column.isPrimary) {
    // 取消其他字段的主键标记
    formData.value.columns.forEach((col, idx) => {
      if (idx !== index) {
        col.isPrimary = false;
      }
    });
  }
  // 如果取消主键，也取消自增
  if (!column.isPrimary) {
    column.isAutoIncrement = false;
  }
}

// 生成SQL语句
function generateSQL(): string {
  if (!formData.value.tableName) return '请输入表名';

  const quoteIdentifier = getQuoter();

  if (props.mode === 'create') {
    const type = dbType.value;

    // 创建表SQL：列定义
    const columnsSQL = formData.value.columns
      .filter(col => col.name && rawType(col))
      .map(col => buildColumnDefinition(col, quoteIdentifier))
      .join(',\n  ');

    if (!columnsSQL) return '请至少完善一个字段';

    // 处理主键
    const primaryKeys = formData.value.columns
      .filter(col => col.isPrimary && col.name)
      .map(col => quoteIdentifier(col.name));

    // SQLite 自增主键已在列定义中包含 PRIMARY KEY，不需要再添加
    const hasSqliteAutoIncrementPrimary = type === 'sqlite' &&
      formData.value.columns.some(col => col.isAutoIncrement && col.isPrimary && col.name);

    let sql = `CREATE TABLE ${quoteIdentifier(formData.value.tableName)} (\n  ${columnsSQL}`;

    if (primaryKeys.length > 0 && !hasSqliteAutoIncrementPrimary) {
      sql += `,\n  PRIMARY KEY (${primaryKeys.join(', ')})`;
    }

    sql += '\n)';

    // MySQL 表选项
    if (isMySqlLike()) {
      if (formData.value.tableComment) {
        sql += ` COMMENT='${escapeSqlString(formData.value.tableComment)}'`;
      }
      sql += ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    }

    // 不支持内联 COMMENT 的数据库，用独立语句补充注释
    const commentStatements: string[] = [];
    if (formData.value.tableComment && (isPostgresLike() || dbType.value === 'oracle')) {
      commentStatements.push(`COMMENT ON TABLE ${quoteIdentifier(formData.value.tableName)} IS '${escapeSqlString(formData.value.tableComment)}'`);
    }
    formData.value.columns.forEach(col => {
      if (!col.name || !col.comment) return;
      if (isPostgresLike() || dbType.value === 'oracle') {
        commentStatements.push(`COMMENT ON COLUMN ${quoteIdentifier(formData.value.tableName)}.${quoteIdentifier(col.name)} IS '${escapeSqlString(col.comment)}'`);
      }
    });
    if (commentStatements.length > 0) {
      sql += ';\n' + commentStatements.join(';\n');
    }

    return sql;
  } else {
    // 修改表：按真实差异生成（与提交给后端的 tableDiff 一致）
    const diff = calculateTableDiff();
    const tableName = diff.tableName;
    const statements: string[] = [];

    // 表注释
    if (diff.tableCommentChanged && diff.tableComment) {
      if (isMySqlLike()) {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} COMMENT='${escapeSqlString(diff.tableComment)}'`);
      } else if (isPostgresLike() || dbType.value === 'oracle') {
        statements.push(`COMMENT ON TABLE ${quoteIdentifier(tableName)} IS '${escapeSqlString(diff.tableComment)}'`);
      } else if (dbType.value === 'mssql' || dbType.value === 'sqlserver') {
        statements.push(`EXEC sp_addextendedproperty @name=N'MS_Description', @value=N'${escapeSqlString(diff.tableComment)}', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'TABLE', @level1name=N'${escapeSqlString(tableName)}'`);
      }
      // SQLite 不支持表注释
    }

    // 重命名列：必须用改名语句，不能用 DROP COLUMN + ADD COLUMN（会丢原数据）
    diff.renamedColumns.forEach(({ oldColumn, newColumn }) => {
      if (isMySqlLike()) {
        // MySQL 的 CHANGE COLUMN 可一次完成改名 + 改定义，并保留列位置与数据
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} CHANGE COLUMN ${quoteIdentifier(oldColumn.name)} ${quoteIdentifier(newColumn.name)} ${sqlType(newColumn)}${getTypeParams(newColumn)}${buildColumnAttributes(newColumn)}`);
      } else if (isPostgresLike()) {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} RENAME COLUMN ${quoteIdentifier(oldColumn.name)} TO ${quoteIdentifier(newColumn.name)}`);
      } else if (dbType.value === 'oracle') {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} RENAME COLUMN ${quoteIdentifier(oldColumn.name)} TO ${quoteIdentifier(newColumn.name)}`);
      } else if (dbType.value === 'mssql' || dbType.value === 'sqlserver') {
        statements.push(`EXEC sp_rename N'dbo.${escapeSqlString(tableName)}.${escapeSqlString(oldColumn.name)}', N'${escapeSqlString(newColumn.name)}', N'COLUMN'`);
      } else if (dbType.value === 'sqlite') {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} RENAME COLUMN ${quoteIdentifier(oldColumn.name)} TO ${quoteIdentifier(newColumn.name)}`);
      }
    });

    // 新增列
    diff.addedColumns.forEach((col: any) => {
      const def = buildColumnAttributes(col);
      if (dbType.value === 'oracle') {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ADD (${quoteIdentifier(col.name)} ${sqlType(col)}${getTypeParams(col)}${def})`);
      } else if (dbType.value === 'mssql' || dbType.value === 'sqlserver') {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ADD ${quoteIdentifier(col.name)} ${sqlType(col)}${getTypeParams(col)}${def}`);
      } else {
        // MySQL / PostgreSQL / CockroachDB / SQLite
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(col.name)} ${sqlType(col)}${getTypeParams(col)}${def}`);
      }
      const colComment = buildColumnCommentStatement(col);
      if (colComment) statements.push(colComment);
    });

    // 修改列
    diff.modifiedColumns.forEach((modification: any) => {
      const col = modification.newColumn;
      const def = buildColumnAttributes(col);
      // MySQL 的 CHANGE COLUMN 已经按新定义重建过该列，无需再 MODIFY
      if (isMySqlLike() && diff.renamedColumns.some(r => r.oldColumn === modification.oldColumn)) {
        return;
      }
      if (isMySqlLike()) {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} MODIFY COLUMN ${quoteIdentifier(col.name)} ${sqlType(col)}${getTypeParams(col)}${def}`);
      } else if (isPostgresLike()) {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN ${quoteIdentifier(col.name)} TYPE ${sqlType(col)}${getTypeParams(col)}`);
        statements.push(col.nullable
          ? `ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN ${quoteIdentifier(col.name)} DROP NOT NULL`
          : `ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN ${quoteIdentifier(col.name)} SET NOT NULL`);
        if (col.defaultValue) {
          statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN ${quoteIdentifier(col.name)} SET DEFAULT ${formatDefaultValue(col.defaultValue, sqlType(col))}`);
        } else {
          statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN ${quoteIdentifier(col.name)} DROP DEFAULT`);
        }
      } else if (dbType.value === 'mssql' || dbType.value === 'sqlserver') {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN ${quoteIdentifier(col.name)} ${sqlType(col)}${getTypeParams(col)} ${col.nullable ? 'NULL' : 'NOT NULL'}`);
        if (col.defaultValue) {
          statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ADD CONSTRAINT DF_${tableName}_${col.name} DEFAULT ${formatDefaultValue(col.defaultValue, sqlType(col))} FOR ${quoteIdentifier(col.name)}`);
        } else {
          statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} DROP CONSTRAINT DF_${tableName}_${col.name}`);
        }
      } else if (dbType.value === 'oracle') {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} MODIFY (${quoteIdentifier(col.name)} ${sqlType(col)}${getTypeParams(col)}${def})`);
      } else if (dbType.value === 'sqlite') {
        statements.push(`-- SQLite 不支持直接修改列 "${col.name}"，需要重建表`);
      }
      const colComment = buildColumnCommentStatement(col);
      if (colComment) statements.push(colComment);
    });

    // 删除列
    diff.deletedColumns.forEach((col: any) => {
      if (dbType.value === 'sqlite') {
        statements.push(`-- SQLite 不支持直接删除列 "${col.name}"，需要重建表`);
      } else {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} DROP COLUMN ${quoteIdentifier(col.name)}`);
      }
    });

    // 主键变更（仅在实际发生变化时生成）
    const oldPk = originalTableData.value.columns.filter(c => c.isPrimary).map(c => quoteIdentifier(c.name));
    const newPk = formData.value.columns.filter(c => c.isPrimary && c.name).map(c => quoteIdentifier(c.name));
    const pkChanged = oldPk.join(',') !== newPk.join(',');
    if (pkChanged) {
      if (isMySqlLike()) {
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} DROP PRIMARY KEY`);
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ADD PRIMARY KEY (${newPk.join(', ')})`);
      } else if (isPostgresLike() || dbType.value === 'oracle' || dbType.value === 'mssql' || dbType.value === 'sqlserver') {
        statements.push(`-- 需要先手动删除旧主键约束，再执行：`);
        statements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ADD CONSTRAINT ${quoteIdentifier(`${tableName}_pkey`)} PRIMARY KEY (${newPk.join(', ')})`);
      } else if (dbType.value === 'sqlite') {
        statements.push(`-- SQLite 修改主键需要重建表`);
      }
    }

    if (statements.length === 0) return '没有检测到任何修改';
    return statements.join(';\n') + ';';
  }
}

// 构建列定义中的属性部分（NULL / 默认值 / 自增 / MySQL 注释）
function buildColumnAttributes(col: any): string {
  const type = sqlType(col);
  let sql = '';

  const isSqliteAutoIncrementPrimary = dbType.value === 'sqlite' && col.isAutoIncrement && col.isPrimary;
  if (!col.nullable && !isSqliteAutoIncrementPrimary) {
    sql += ' NOT NULL';
  }

  if (col.defaultValue) {
    sql += ` DEFAULT ${formatDefaultValue(col.defaultValue, type)}`;
  }

  if (col.isAutoIncrement) {
    if (isMySqlLike()) {
      sql += ' AUTO_INCREMENT';
    } else if (isPostgresLike()) {
      // SERIAL / BIGSERIAL 已自带自增
      if (!type.toLowerCase().includes('serial')) {
        sql += ' GENERATED ALWAYS AS IDENTITY';
      }
    } else if (dbType.value === 'sqlite') {
      sql += col.isPrimary ? ' PRIMARY KEY AUTOINCREMENT' : ' AUTOINCREMENT';
    } else if (dbType.value === 'oracle') {
      if (type.toLowerCase().includes('number')) {
        sql += ' GENERATED BY DEFAULT AS IDENTITY';
      }
    } else if (dbType.value === 'mssql' || dbType.value === 'sqlserver') {
      sql += ' IDENTITY(1,1)';
    }
  }

  // MySQL 支持内联列注释
  if (col.comment && isMySqlLike()) {
    sql += ` COMMENT '${escapeSqlString(col.comment)}'`;
  }

  return sql;
}

// 构建 CREATE TABLE 的列定义
function buildColumnDefinition(col: any, quoteIdentifier: (name: string) => string): string {
  return `${quoteIdentifier(col.name)} ${sqlType(col)}${getTypeParams(col)}${buildColumnAttributes(col)}`;
}

// 构建列注释语句（内联 COMMENT 不可用的数据库）
function buildColumnCommentStatement(col: any): string {
  if (!col.comment) return '';
  const quoteIdentifier = getQuoter();
  if (isPostgresLike() || dbType.value === 'oracle') {
    return `COMMENT ON COLUMN ${quoteIdentifier(formData.value.tableName)}.${quoteIdentifier(col.name)} IS '${escapeSqlString(col.comment)}'`;
  }
  if (dbType.value === 'mssql' || dbType.value === 'sqlserver') {
    return `EXEC sp_addextendedproperty @name=N'MS_Description', @value=N'${escapeSqlString(col.comment)}', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'TABLE', @level1name=N'${escapeSqlString(formData.value.tableName)}', @level2type=N'COLUMN', @level2name=N'${escapeSqlString(col.name)}'`;
  }
  return '';
}

// 获取标识符引用函数
function getQuoter(): (name: string) => string {
  return (name: string) => {
    if (!props.connection) return `"${name}"`;
    switch (dbType.value) {
      case 'mysql':
      case 'mariadb':
      case 'aurora-mysql':
      case 'auroramysql':
      case 'clickhouse':
      case 'click-house':
        return `\`${name}\``;
      case 'postgres':
      case 'postgresql':
      case 'cockroachdb':
      case 'aurora-postgres':
      case 'aurorapostgres':
      case 'aurora-postgresql':
      case 'sqlite':
        return `"${name}"`;
      case 'oracle': return `"${name.toUpperCase()}"`;
      case 'mssql':
      case 'sqlserver':
        return `[${name}]`;
      default: return `"${name}"`;
    }
  };
}

// 各数据库常见的函数/关键字形式默认值（原样输出，不加引号）
const DEFAULT_KEYWORDS = new Set([
  'current_timestamp', 'now()', 'current_date', 'current_time',
  'localtimestamp', 'localtime', 'current_user',
  'sysdate', 'systimestamp', 'getdate()', 'getutcdate()',
  'sysdatetime()', 'sysdatetimeoffset()', 'sysutcdatetime()',
  'newid()', 'newsequentialid()', 'gen_random_uuid()', 'uuid_generate_v4()'
]);

// 格式化默认值
function formatDefaultValue(value: any, type: string): string {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }

  const raw = String(value).trim();
  const lower = raw.toLowerCase();

  // 函数/关键字形式的默认值原样输出（不加引号）
  if (lower === 'null') return 'NULL';
  if (DEFAULT_KEYWORDS.has(lower)) return raw;
  // 形如 now() / getdate() / newid() 的零参函数调用
  if (/^[a-z_][a-z0-9_]*\s*\(\s*\)$/.test(lower)) return raw;
  // current_timestamp(6) 这类带精度参数的时间函数
  if (/^current_timestamp\s*\(\s*\d+\s*\)$/.test(lower)) return raw;

  const lowerType = type.toLowerCase();

  // 数值类型不加引号
  if (isNumericType(lowerType) && !isNaN(Number(raw))) {
    return raw;
  }

  // 布尔类型
  if (isBooleanType(lowerType)) {
    return value ? 'TRUE' : 'FALSE';
  }
  
  // 字符串类型加引号
  return `'${String(value).replace(/'/g, "''")}'`;
}

// 提交表单
async function submit() {
  try {
    if (!formData.value.tableName) {
      await modal.warning('请输入表名');
      return;
    }
    
    if (formData.value.columns.some(col => !col.name || !rawType(col))) {
      await modal.warning('请完善所有字段信息');
      return;
    }
    
    if (!props.connection?.id) {
      await modal.warning('请先选择数据库连接');
      return;
    }

    let result;
    
    if (props.mode === 'create') {
      // 创建表：使用 SQL 语句
      const sql = generateSQL();
      result = await databaseService.executeQuery(
        props.connection.id,
        sql,
        props.database
      );
    } else {
      // 修改表：使用差异化对比
      const tableDiff = calculateTableDiff();
      
      // 检查是否有实际修改
      if (tableDiff.addedColumns.length === 0 && 
          tableDiff.modifiedColumns.length === 0 && 
          tableDiff.deletedColumns.length === 0 && 
          tableDiff.renamedColumns.length === 0 && 
          !tableDiff.tableCommentChanged) {
        await modal.info('没有检测到任何修改');
        return;
      }

      // 调用修改表接口（需要后端实现）
      result = await databaseService.alterTable(
        props.connection.id,
        props.database,
        tableDiff
      );
    }
    
    emit('submit', {
      success: result.ret === 0,
      message: result.ret === 0 ? '操作成功' : '操作失败',
      data: result.data,
      mode: props.mode
    });
    
    close();
  } catch (error) {
    console.error('提交失败:', error);
    emit('submit', {
      success: false,
      message: '操作失败',
      mode: props.mode
    });
  }
}

// 关闭弹窗
function close() {
  emit('close');
}

// 监听props变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initFormData();
  }
});

// 获取类别标签
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    [ColumnCategory.NUMERIC]: t('tableEditor.catNumeric'),
    [ColumnCategory.STRING]: t('tableEditor.catString'),
    [ColumnCategory.TEXT]: t('tableEditor.catText'),
    [ColumnCategory.DATE_TIME]: t('tableEditor.catDateTime'),
    [ColumnCategory.BOOLEAN]: t('tableEditor.catBoolean'),
    [ColumnCategory.BINARY]: t('tableEditor.catBinary'),
    [ColumnCategory.JSON]: t('tableEditor.catJson'),
    [ColumnCategory.ARRAY]: t('tableEditor.catArray'),
    [ColumnCategory.SPATIAL]: t('tableEditor.catSpatial'),
    [ColumnCategory.OTHER]: t('tableEditor.catOther')
  };
  return labels[category] || category;
}

// 获取选中的类型信息
function getSelectedType(column: any) {
  const raw = rawType(column);
  if (!raw) return null;

  // 类型本身已带括号（如 ENUM('a','b')、DECIMAL(10,2)），无需再填长度/精度
  if (raw.includes('(')) return null;

  const lower = raw.trim().toLowerCase();

  // 先按完整类型名精确匹配（如 CHARACTER VARYING、DOUBLE PRECISION）
  let typeInfo = columnTypes.value.find(t => t.name.toLowerCase() === lower);

  // 再退回复数类型名匹配（处理 "INT " 这类多余空格）
  if (!typeInfo) {
    const typeName = lower.match(/^[a-zA-Z]+/)?.[0] || lower;
    typeInfo = columnTypes.value.find(t => t.name.toLowerCase() === typeName);
  }

  return typeInfo || null;
}

// 检查类型是否需要长度参数
function needsLength(column: any): boolean {
  const typeInfo = getSelectedType(column);
  return typeInfo?.requiresLength || false;
}

// 检查类型是否需要精度参数
function needsPrecision(column: any): boolean {
  const typeInfo = getSelectedType(column);
  return typeInfo?.requiresPrecision || false;
}

// 检查类型是否需要小数位数参数
function needsScale(column: any): boolean {
  const typeInfo = getSelectedType(column);
  return typeInfo?.requiresScale || false;
}

// 生成类型的长度/精度参数字符串，例如 "(255)" / "(10,2)"。
// 当列未填写长度/精度但该类型必需时，回退到类型定义的默认值，避免生成非法 SQL（如 MySQL 的 VARCHAR）。
function getTypeParams(column: any): string {
  const raw = rawType(column);
  if (!raw || raw.includes('(')) return ''; // 类型本身已带括号
  const typeInfo = getSelectedType(column);

  // 精度/小数位（如 DECIMAL / FLOAT / DOUBLE / NUMBER）
  if (typeInfo?.requiresPrecision) {
    const precision = column.precision || typeInfo.defaultPrecision;
    const scale = column.scale || typeInfo.defaultScale;
    if (precision == null) return '';
    return scale != null ? `(${precision},${scale})` : `(${precision})`;
  }

  // 长度（如 VARCHAR / CHAR / INT / BINARY 等）
  if (typeInfo?.requiresLength) {
    const length = column.length || typeInfo.defaultLength;
    if (length != null) {
      return `(${length})`;
    }
  }

  return '';
}

// 检查类型是否支持自增
function supportsAutoIncrement(column: any): boolean {
  const typeInfo = getSelectedType(column);
  return typeInfo?.supportsAutoIncrement || false;
}

// 初始化
onMounted(() => {
  if (props.visible) {
    initFormData();
  }
});
</script>

<style scoped>
.section-title {
  color: var(--db-text-body);
  font-weight: 600;
  border-bottom: 2px solid var(--db-border-soft);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.sql-preview {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  padding: 0.75rem;
  border-radius: var(--db-radius-sm);
  /* 深色代码块：与全局 pre / SQL 编辑器一致，跟随主题令牌，不使用 Bootstrap bg-light */
  background-color: var(--db-code-bg);
  color: var(--db-code-fg);
  border: 1px solid var(--db-border);
  white-space: pre-wrap;
  word-break: break-all;
}

.table th {
  font-size: 0.875rem;
  font-weight: 600;
}
.table td {
  padding: 0!important;
}
.table .form-control, .table .form-select {
  border: none;
  border-radius: 0;
  box-shadow: none;
}
.form-control-sm, .form-select-sm {
  font-size: 0.875rem;
}

.modal-content {
  max-height: 90vh;
  overflow-y: auto;
}

.modal-body {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.input-group-sm .form-control {
  border-radius: 0;
}

.input-group-sm .form-control:first-child {
  border-top-left-radius: 0.25rem;
  border-bottom-left-radius: 0.25rem;
}

.input-group-sm .form-control:last-child {
  border-top-right-radius: 0.25rem;
  border-bottom-right-radius: 0.25rem;
}

.text-muted {
  color: var(--db-text-muted) !important;
}
</style>