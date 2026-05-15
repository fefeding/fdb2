<template>
  <div v-if="visible" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" @click="close">
    <div class="modal-dialog modal-lg" style="width: 80%; max-width: none;" @click.stop>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-pencil-square me-2"></i>
            {{ mode === 'create' ? '创建新表' : '修改表结构' }}
          </h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>
        
        <div class="modal-body">
          <!-- 表基本信息 -->
          <div class="table-info-section mb-4">
            <h6 class="section-title">表信息</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">表名</label>
                  <input 
                    v-model="formData.tableName" 
                    type="text" 
                    class="form-control" 
                    :disabled="mode === 'edit'"
                    placeholder="请输入表名"
                  >
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">表注释</label>
                  <input 
                    v-model="formData.tableComment" 
                    type="text" 
                    class="form-control" 
                    placeholder="请输入表注释"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- 字段管理 -->
          <div class="columns-section">
            <div class="section-header d-flex justify-content-between align-items-center mb-3">
              <h6 class="section-title mb-0">字段管理</h6>
              <button class="btn btn-success btn-sm" @click="addColumn">
                <i class="bi bi-plus-lg"></i> 添加字段
              </button>
            </div>
            
            <div class="table-responsive">
              <table class="table table-sm table-bordered">
                <thead class="table-light">
                  <tr>
                    <th width="120">字段名</th>
                    <th width="140">数据类型</th>
                    <th width="120">长度/精度</th>
                    <th width="80">可空</th>
                    <th width="100">默认值</th>
                    <th width="80">主键</th>
                    <th width="80">自增</th>
                    <th>注释</th>
                    <th width="100">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(column, index) in formData.columns" :key="index">
                    <td>
                      <input 
                        v-model="column.name" 
                        type="text" 
                        class="form-control form-control-sm" 
                        placeholder="字段名"
                      >
                    </td>
                    <td>
                      <select v-model="column.type" class="form-select form-select-sm">
                        <option value="">选择类型</option>
                        <optgroup v-for="(types, category) in columnTypesByCategory" :key="category" :label="getCategoryLabel(category)">
                          <option v-for="type in types" :key="type.name" :value="type.name">
                            {{ type.label }}
                          </option>
                        </optgroup>
                      </select>
                    </td>
                    <td>
                      <div class="input-group input-group-sm" v-if="needsLength(column) || needsPrecision(column)">
                        <input 
                          v-if="needsLength(column)"
                          v-model="column.length" 
                          type="number" 
                          class="form-control form-control-sm" 
                          placeholder="长度"
                        >
                        <input 
                          v-if="needsPrecision(column)"
                          v-model="column.precision" 
                          type="number" 
                          class="form-control form-control-sm" 
                          placeholder="精度"
                        >
                        <input 
                          v-if="needsScale(column)"
                          v-model="column.scale" 
                          type="number" 
                          class="form-control form-control-sm" 
                          placeholder="小数"
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
                        placeholder="默认值"
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
                        placeholder="字段注释"
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
            <h6 class="section-title">SQL预览</h6>
            <pre class="sql-preview bg-light p-3 rounded">{{ generateSQL() }}</pre>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">取消</button>
          <button type="button" class="btn btn-primary" @click="submit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
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
        const parsed = parseColumnType(col.type || '');
        return {
          name: col.name || '',
          type: parsed.baseType,
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
    formData.value = {
      tableName: '',
      tableComment: '',
      columns: [{
        name: '',
        type: '',
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

// 计算表结构差异
function calculateTableDiff() {
  const diff = {
    tableName: formData.value.tableName,
    tableCommentChanged: formData.value.tableComment !== originalTableData.value.tableComment,
    tableComment: formData.value.tableComment,
    addedColumns: [] as any[],
    modifiedColumns: [] as any[],
    deletedColumns: [] as any[]
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
    } else {
      // 检查列是否被修改
      const isModified = 
        newCol.type !== originalCol.type ||
        newCol.length !== originalCol.length ||
        newCol.precision !== originalCol.precision ||
        newCol.scale !== originalCol.scale ||
        newCol.nullable !== originalCol.nullable ||
        newCol.defaultValue !== originalCol.defaultValue ||
        newCol.isPrimary !== originalCol.isPrimary ||
        newCol.isAutoIncrement !== originalCol.isAutoIncrement ||
        newCol.comment !== originalCol.comment;

      if (isModified) {
        diff.modifiedColumns.push({
          oldColumn: originalCol,
          newColumn: newCol
        });
      }
    }
  });

  // 检查删除的列
  originalTableData.value.columns.forEach(originalCol => {
    const existsInNew = formData.value.columns.some(newCol => newCol.name === originalCol.name);
    if (!existsInNew) {
      diff.deletedColumns.push(originalCol);
    }
  });

  return diff;
}
// 添加字段
function addColumn() {
  formData.value.columns.push({
    name: '',
    type: '',
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
  
  if (props.mode === 'create') {
    // 获取当前数据库的标识符引用方式
    const quoteIdentifier = (name: string) => {
      if (!props.connection) return `"${name}"`;
      switch (props.connection.type.toLowerCase()) {
        case 'mysql': return `\`${name}\``;
        case 'postgres': return `"${name}"`;
        case 'sqlite': return `"${name}"`;
        case 'oracle': return `"${name.toUpperCase()}"`;
        case 'mssql': return `[${name}]`;
        default: return `"${name}"`;
      }
    };

    // 创建表SQL
    const columnsSQL = formData.value.columns.map(col => {
      if (!col.name || !col.type) return '';
      
      let sql = `${quoteIdentifier(col.name)} ${col.type}`;
      
      // 处理长度和精度参数（仅当类型中不包含括号时）
      if (!col.type.includes('(') && col.length && (needsLength(col) || col.type.includes('CHAR'))) {
        sql += `(${col.length})`;
      } else if (!col.type.includes('(') && col.precision) {
        if (col.scale) {
          sql += `(${col.precision},${col.scale})`;
        } else {
          sql += `(${col.precision})`;
        }
      }
      
      // SQLite 特殊处理：自增主键必须在列定义中包含 PRIMARY KEY
      const isSqliteAutoIncrementPrimary = 
        props.connection?.type.toLowerCase() === 'sqlite' && 
        col.isAutoIncrement && 
        col.isPrimary;
      
      // 处理NULL约束（SQLite 自增主键不需要 NOT NULL）
      if (!col.nullable && !isSqliteAutoIncrementPrimary) {
        sql += ' NOT NULL';
      }
      
      // 处理默认值
      if (col.defaultValue) {
        sql += ` DEFAULT ${formatDefaultValue(col.defaultValue, col.type)}`;
      }
      
      // 处理自增（数据库特定语法）
      if (col.isAutoIncrement) {
        switch (props.connection?.type.toLowerCase()) {
          case 'mysql':
            sql += ' AUTO_INCREMENT';
            break;
          case 'postgres':
            // PostgreSQL 使用 SERIAL 类型或 GENERATED AS IDENTITY
            if (col.type.toLowerCase().includes('serial') || col.type.toLowerCase().includes('bigserial')) {
              // 已包含自增
            } else {
              sql += ' GENERATED ALWAYS AS IDENTITY';
            }
            break;
          case 'sqlite':
            // SQLite 中 AUTOINCREMENT 只能用于 INTEGER 类型
            // 如果类型是 INT，需要改为 INTEGER
            if (col.type.toUpperCase() === 'INT') {
              sql = sql.replace(/\bINT\b/, 'INTEGER');
            }
            // SQLite 自增主键必须在列定义中包含 PRIMARY KEY
            if (col.isPrimary) {
              sql += ' PRIMARY KEY AUTOINCREMENT';
            } else {
              sql += ' AUTOINCREMENT';
            }
            break;
          case 'oracle':
            // Oracle 使用序列和触发器，这里简化处理
            break;
          case 'mssql':
            sql += ' IDENTITY(1,1)';
            break;
        }
      }
      
      // 处理注释（数据库特定语法）
      if (col.comment) {
        switch (props.connection?.type.toLowerCase()) {
          case 'mysql':
            sql += ` COMMENT '${col.comment}'`;
            break;
          case 'postgres':
            // PostgreSQL 注释需要单独的 COMMENT 语句
            break;
          case 'sqlite':
            // SQLite 不支持列注释
            break;
          case 'oracle':
            sql += ` COMMENT '${col.comment}'`;
            break;
          case 'mssql':
            // SQL Server 使用扩展属性
            break;
        }
      }
      
      return sql;
    }).filter(sql => sql).join(',\n  ');
    
    // 处理主键
    const primaryKeys = formData.value.columns
      .filter(col => col.isPrimary)
      .map(col => quoteIdentifier(col.name));
    
    let sql = `CREATE TABLE ${quoteIdentifier(formData.value.tableName)} (\n  ${columnsSQL}`;
    
    // SQLite 自增主键已经在列定义中包含 PRIMARY KEY，不需要再添加
    const hasSqliteAutoIncrementPrimary = props.connection?.type.toLowerCase() === 'sqlite' && 
      formData.value.columns.some(col => col.isAutoIncrement && col.isPrimary);
    
    if (primaryKeys.length > 0 && !hasSqliteAutoIncrementPrimary) {
      sql += `,\n  PRIMARY KEY (${primaryKeys.join(', ')})`;
    }
    
    sql += '\n)';
    
    // 处理表注释和引擎（数据库特定）
    switch (props.connection?.type.toLowerCase()) {
      case 'mysql':
        if (formData.value.tableComment) {
          sql += ` COMMENT='${formData.value.tableComment}'`;
        }
        sql += ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
        break;
      case 'postgres':
        // PostgreSQL 表注释需要单独的 COMMENT 语句
        break;
      case 'oracle':
        if (formData.value.tableComment) {
          sql += ` COMMENT '${formData.value.tableComment}'`;
        }
        break;
      case 'mssql':
        // SQL Server 使用扩展属性
        break;
    }
    
    // 生成额外的注释语句（如果需要）
    if (props.connection?.type.toLowerCase() === 'postgres') {
      const commentStatements = [];
      if (formData.value.tableComment) {
        commentStatements.push(`COMMENT ON TABLE ${quoteIdentifier(formData.value.tableName)} IS '${formData.value.tableComment}'`);
      }
      formData.value.columns.forEach(col => {
        if (col.comment) {
          commentStatements.push(`COMMENT ON COLUMN ${quoteIdentifier(formData.value.tableName)}.${quoteIdentifier(col.name)} IS '${col.comment}'`);
        }
      });
      if (commentStatements.length > 0) {
        sql += ';\n' + commentStatements.join(';\n');
      }
    }
    
    return sql;
  } else {
    // 修改表SQL
    const quoteIdentifier = (name: string) => {
      if (!props.connection) return `"${name}"`;
      switch (props.connection.type.toLowerCase()) {
        case 'mysql': return `\`${name}\``;
        case 'postgres': return `"${name}"`;
        case 'sqlite': return `"${name}"`;
        case 'oracle': return `"${name.toUpperCase()}"`;
        case 'mssql': return `[${name}]`;
        default: return `"${name}"`;
      }
    };

    const sqlStatements: string[] = [];
    const tableName = formData.value.tableName;

    // 修改表注释
    if (formData.value.tableComment) {
      switch (props.connection?.type.toLowerCase()) {
        case 'mysql':
          sqlStatements.push(`ALTER TABLE ${quoteIdentifier(tableName)} COMMENT='${formData.value.tableComment}'`);
          break;
        case 'postgres':
          sqlStatements.push(`COMMENT ON TABLE ${quoteIdentifier(tableName)} IS '${formData.value.tableComment}'`);
          break;
        case 'oracle':
          sqlStatements.push(`COMMENT ON TABLE ${quoteIdentifier(tableName)} IS '${formData.value.tableComment}'`);
          break;
        case 'mssql':
          sqlStatements.push(`EXEC sp_addextendedproperty 'MS_Description', '${formData.value.tableComment}', 'SCHEMA', 'dbo', 'TABLE', '${tableName}'`);
          break;
      }
    }

    // 生成列修改语句
    formData.value.columns.forEach(col => {
      if (!col.name || !col.type) return;

      let columnSQL = `${quoteIdentifier(col.name)} ${col.type}`;
      
      // 处理长度和精度参数（仅当类型中不包含括号时）
      if (!col.type.includes('(') && col.length && (needsLength(col) || col.type.includes('CHAR'))) {
        columnSQL += `(${col.length})`;
      } else if (!col.type.includes('(') && col.precision) {
        if (col.scale) {
          columnSQL += `(${col.precision},${col.scale})`;
        } else {
          columnSQL += `(${col.precision})`;
        }
      }

      // 处理NULL约束
      if (!col.nullable) {
        columnSQL += ' NOT NULL';
      } else {
        columnSQL += ' NULL';
      }

      // 处理默认值
      if (col.defaultValue) {
        columnSQL += ` DEFAULT ${formatDefaultValue(col.defaultValue, col.type)}`;
      }

      // 处理注释
      let commentStatement = '';
      if (col.comment) {
        switch (props.connection?.type.toLowerCase()) {
          case 'mysql':
            columnSQL += ` COMMENT '${col.comment}'`;
            break;
          case 'postgres':
            commentStatement = `COMMENT ON COLUMN ${quoteIdentifier(tableName)}.${quoteIdentifier(col.name)} IS '${col.comment}'`;
            break;
          case 'oracle':
            columnSQL += ` COMMENT '${col.comment}'`;
            break;
          case 'mssql':
            commentStatement = `EXEC sp_addextendedproperty 'MS_Description', '${col.comment}', 'SCHEMA', 'dbo', 'TABLE', '${tableName}', 'COLUMN', '${col.name}'`;
            break;
        }
      }

      // 根据数据库类型生成 ALTER COLUMN 或 MODIFY COLUMN 语句
      switch (props.connection?.type.toLowerCase()) {
        case 'mysql':
          sqlStatements.push(`ALTER TABLE ${quoteIdentifier(tableName)} MODIFY COLUMN ${columnSQL}`);
          break;
        case 'postgres':
        case 'mssql':
          sqlStatements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN ${columnSQL}`);
          break;
        case 'oracle':
          sqlStatements.push(`ALTER TABLE ${quoteIdentifier(tableName)} MODIFY ${columnSQL}`);
          break;
        case 'sqlite':
          // SQLite 不支持直接修改列，需要重建表
          sqlStatements.push(`-- SQLite 不支持直接修改列，需要重建表`);
          break;
      }

      // 添加注释语句
      if (commentStatement) {
        sqlStatements.push(commentStatement);
      }
    });

    // 处理主键
    const primaryKeys = formData.value.columns
      .filter(col => col.isPrimary)
      .map(col => quoteIdentifier(col.name));
    
    if (primaryKeys.length > 0) {
      // 先删除旧主键（如果存在）
      sqlStatements.push(`ALTER TABLE ${quoteIdentifier(tableName)} DROP PRIMARY KEY`);
      // 添加新主键
      sqlStatements.push(`ALTER TABLE ${quoteIdentifier(tableName)} ADD PRIMARY KEY (${primaryKeys.join(', ')})`);
    }

    return sqlStatements.join(';\n') + ';';
  }
}

// 格式化默认值
function formatDefaultValue(value: any, type: string): string {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }
  
  const lowerValue = String(value).toLowerCase();
  
  // 处理特殊关键字（不加引号）
  const specialKeywords = ['current_timestamp', 'now()', 'current_date', 'current_time', 'localtimestamp', 'localtime'];
  if (specialKeywords.includes(lowerValue)) {
    return value;
  }
  
  const lowerType = type.toLowerCase();
  
  // 数值类型不加引号
  if (isNumericType(lowerType) && !isNaN(value)) {
    return String(value);
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
    
    if (formData.value.columns.some(col => !col.name || !col.type)) {
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
    [ColumnCategory.NUMERIC]: '数值类型',
    [ColumnCategory.STRING]: '字符串类型',
    [ColumnCategory.TEXT]: '文本类型',
    [ColumnCategory.DATE_TIME]: '日期时间类型',
    [ColumnCategory.BOOLEAN]: '布尔类型',
    [ColumnCategory.BINARY]: '二进制类型',
    [ColumnCategory.JSON]: 'JSON类型',
    [ColumnCategory.ARRAY]: '数组类型',
    [ColumnCategory.SPATIAL]: '空间类型',
    [ColumnCategory.OTHER]: '其他类型'
  };
  return labels[category] || category;
}

// 获取选中的类型信息
function getSelectedType(column: any) {
  if (!column.type) return null;
  
  // 提取类型名称（去掉括号和长度信息）
  const typeName = column.type.match(/^[a-zA-Z]+/)?.[0] || column.type;
  
  // 大小写不敏感匹配
  return columnTypes.value.find(t => t.name.toLowerCase() === typeName.toLowerCase());
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
  color: #495057;
  font-weight: 600;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.sql-preview {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
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
  color: #6c757d !important;
}
</style>