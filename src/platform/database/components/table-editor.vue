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

// Props
const props = defineProps<{
  visible: boolean;
  connection: ConnectionEntity | null;
  database: string;
  table?: TableEntity | null;
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
    nullable: false,
    defaultValue: '',
    isPrimary: false,
    isAutoIncrement: false,
    comment: ''
  }]
});

// 初始化表单数据
function initFormData() {
  if (props.mode === 'edit' && props.table) {
    formData.value = {
      tableName: props.table.name || '',
      tableComment: props.table.comment || '',
      columns: props.table.columns?.map(col => ({
        name: col.name || '',
        type: col.type || '',
        length: col.length || '',
        precision: col.precision || null,
        scale: col.scale || null,
        nullable: col.nullable || false,
        defaultValue: col.defaultValue || '',
        isPrimary: col.isPrimary || false,
        isAutoIncrement: col.isAutoIncrement || false,
        comment: col.comment || ''
      })) || []
    };
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
      }]
    };
  }
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
      
      // 处理长度和精度参数
      if (col.length && (needsLength(col) || col.type.includes('CHAR'))) {
        sql += `(${col.length})`;
      } else if (col.precision) {
        if (col.scale) {
          sql += `(${col.precision},${col.scale})`;
        } else {
          sql += `(${col.precision})`;
        }
      }
      
      // 处理NULL约束
      if (!col.nullable) sql += ' NOT NULL';
      
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
            sql += ' AUTOINCREMENT';
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
    
    if (primaryKeys.length > 0) {
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
    // 修改表SQL（简化版，实际应该对比差异）
    return `-- 表结构修改SQL（需要对比差异生成）\n-- 当前表名: ${formData.value.tableName}`;
  }
}

// 格式化默认值
function formatDefaultValue(value: any, type: string): string {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }
  
  const lowerType = type.toLowerCase();
  
  // 数值类型不加引号
  if (isNumberInput(lowerType) && !isNaN(value)) {
    return String(value);
  }
  
  // 布尔类型
  if (isBooleanInput(lowerType)) {
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
    
    const sql = generateSQL();
    
    if (!props.connection?.id) {
      await modal.warning('请先选择数据库连接');
      return;
    }
    
    const result = await databaseService.executeQuery(
      props.connection.id,
      sql,
      props.database
    );
    
    emit('submit', {
      success: result.ok,
      message: result.ok ? '操作成功' : '操作失败',
      data: result.data
    });
    
    close();
  } catch (error) {
    console.error('提交失败:', error);
    emit('submit', {
      success: false,
      message: '操作失败'
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
  return columnTypes.value.find(t => t.name === column.type);
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