<template>
  <div class="modal fade" :class="{ show: visible }" :style="{ display: visible ? 'block' : 'none' }">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-pencil-square" v-if="tableName"></i>
            <i class="bi bi-plus-circle" v-else></i>
            {{ tableName ? '编辑表结构 - ' + tableName : '创建新表' }}
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        
        <div class="modal-body">
          <!-- 表基本信息 -->
          <div class="card mb-3">
            <div class="card-header">
              <h6 class="card-title mb-0">表信息</h6>
            </div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">表名</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    v-model="tableInfo.name"
                    placeholder="输入表名"
                    required
                  >
                </div>
                <div class="col-md-6">
                  <label class="form-label">字符集</label>
                  <select class="form-select" v-model="tableInfo.charset">
                    <option value="utf8mb4">utf8mb4</option>
                    <option value="utf8">utf8</option>
                    <option value="latin1">latin1</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">排序规则</label>
                  <select class="form-select" v-model="tableInfo.collation">
                    <option value="utf8mb4_general_ci">utf8mb4_general_ci</option>
                    <option value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</option>
                    <option value="utf8_general_ci">utf8_general_ci</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">存储引擎</label>
                  <select class="form-select" v-model="tableInfo.engine">
                    <option value="InnoDB">InnoDB</option>
                    <option value="MyISAM">MyISAM</option>
                    <option value="MEMORY">MEMORY</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">表注释</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    v-model="tableInfo.comment"
                    placeholder="输入表注释"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- 字段列表 -->
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h6 class="card-title mb-0">字段管理</h6>
              <button class="btn btn-sm btn-success" @click="addColumn">
                <i class="bi bi-plus-lg"></i> 添加字段
              </button>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-sm table-bordered">
                  <thead class="table-dark">
                    <tr>
                      <th>字段名</th>
                      <th>数据类型</th>
                      <th>长度/精度</th>
                      <th>允许空值</th>
                      <th>默认值</th>
                      <th>主键</th>
                      <th>自增</th>
                      <th>注释</th>
                      <th width="100">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(column, index) in columns" :key="index">
                      <td>
                        <input 
                          type="text" 
                          class="form-control form-control-sm" 
                          v-model="column.name"
                          placeholder="字段名"
                          required
                        >
                      </td>
                      <td>
                        <select class="form-select form-select-sm" v-model="column.type" @change="onTypeChange(column)">
                          <optgroup label="数值类型">
                            <option value="int">INT</option>
                            <option value="bigint">BIGINT</option>
                            <option value="decimal">DECIMAL</option>
                            <option value="float">FLOAT</option>
                            <option value="double">DOUBLE</option>
                          </optgroup>
                          <optgroup label="字符串类型">
                            <option value="varchar">VARCHAR</option>
                            <option value="char">CHAR</option>
                            <option value="text">TEXT</option>
                            <option value="longtext">LONGTEXT</option>
                          </optgroup>
                          <optgroup label="日期时间类型">
                            <option value="date">DATE</option>
                            <option value="datetime">DATETIME</option>
                            <option value="timestamp">TIMESTAMP</option>
                          </optgroup>
                          <optgroup label="其他类型">
                            <option value="boolean">BOOLEAN</option>
                            <option value="json">JSON</option>
                          </optgroup>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          class="form-control form-control-sm" 
                          v-model="column.length"
                          placeholder="长度或精度"
                          :disabled="!needsLength(column.type)"
                        >
                      </td>
                      <td>
                        <select class="form-select form-select-sm" v-model="column.nullable">
                          <option :value="true">是</option>
                          <option :value="false">否</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          class="form-control form-control-sm" 
                          v-model="column.defaultValue"
                          placeholder="默认值"
                        >
                      </td>
                      <td>
                        <div class="form-check form-check-inline">
                          <input 
                            type="checkbox" 
                            class="form-check-input" 
                            v-model="column.isPrimary"
                            @change="onPrimaryChange"
                          >
                        </div>
                      </td>
                      <td>
                        <div class="form-check form-check-inline">
                          <input 
                            type="checkbox" 
                            class="form-check-input" 
                            v-model="column.isAutoIncrement"
                            :disabled="!isIntType(column.type) || !column.isPrimary"
                          >
                        </div>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          class="form-control form-control-sm" 
                          v-model="column.comment"
                          placeholder="字段注释"
                        >
                      </td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary btn-sm" @click="moveColumnUp(index)" :disabled="index === 0">
                            <i class="bi bi-arrow-up"></i>
                          </button>
                          <button class="btn btn-outline-primary btn-sm" @click="moveColumnDown(index)" :disabled="index === columns.length - 1">
                            <i class="bi bi-arrow-down"></i>
                          </button>
                          <button class="btn btn-outline-danger btn-sm" @click="removeColumn(index)">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            取消
          </button>
          <button type="button" class="btn btn-primary" @click="generateSQL" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            生成SQL
          </button>
          <button type="button" class="btn btn-success" @click="saveTable" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            保存表结构
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="visible" class="modal-backdrop fade show" @click="closeModal"></div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  tableName?: string;
  connection?: any;
  database?: string;
}>();

const emit = defineEmits<{
  'close': [];
  'execute-sql': [sql: string];
}>();

// 表信息
const tableInfo = ref({
  name: '',
  charset: 'utf8mb4',
  collation: 'utf8mb4_general_ci',
  engine: 'InnoDB',
  comment: ''
});

// 字段列表
const columns = ref<any[]>([]);
const loading = ref(false);

// 监听显示状态变化
watch(() => props.visible, (visible) => {
  if (visible) {
    initializeData();
  }
});

// 初始化数据
async function initializeData() {
  if (props.tableName) {
    tableInfo.value.name = props.tableName;
    // 加载现有表结构
    await loadTableStructure();
  } else {
    // 新建表，添加默认字段
    columns.value = [];
  }
}

// 加载表结构
async function loadTableStructure() {
  try {
    const response = await fetch(`/api/database/getTableInfo/${props.connection?.id}/${props.database}/${props.tableName}`);
    const tableData = await response.json();
    
    if (tableData && tableData.columns) {
      columns.value = tableData.columns.map((col: any) => ({
        name: col.name,
        type: col.type.toLowerCase(),
        length: extractLengthFromType(col.type),
        nullable: col.nullable,
        defaultValue: col.defaultValue || '',
        isPrimary: col.isPrimary,
        isAutoIncrement: col.isAutoIncrement,
        comment: col.comment || ''
      }));
      
      // 设置表信息
      if (tableData.engine) {
        tableInfo.value.engine = tableData.engine;
      }
      if (tableData.charset) {
        tableInfo.value.charset = tableData.charset;
      }
      if (tableData.collation) {
        tableInfo.value.collation = tableData.collation;
      }
      if (tableData.comment) {
        tableInfo.value.comment = tableData.comment;
      }
    }
  } catch (error) {
    console.error('加载表结构失败:', error);
    // 如果加载失败，初始化为空数组
    columns.value = [];
  }
}

// 从类型中提取长度
function extractLengthFromType(type: string): string {
  const match = type.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
}

// 添加字段
function addColumn() {
  columns.value.push({
    name: '',
    type: 'varchar',
    length: '255',
    nullable: true,
    defaultValue: '',
    isPrimary: false,
    isAutoIncrement: false,
    comment: ''
  });
}

// 删除字段
function removeColumn(index: number) {
  if (confirm('确定要删除这个字段吗？')) {
    columns.value.splice(index, 1);
  }
}

// 移动字段位置
function moveColumnUp(index: number) {
  if (index > 0) {
    [columns.value[index], columns.value[index - 1]] = [columns.value[index - 1], columns.value[index]];
  }
}

function moveColumnDown(index: number) {
  if (index < columns.value.length - 1) {
    [columns.value[index], columns.value[index + 1]] = [columns.value[index + 1], columns.value[index]];
  }
}

// 类型变化处理
function onTypeChange(column: any) {
  if (!needsLength(column.type)) {
    column.length = '';
  }
}

// 主键变化处理
function onPrimaryChange() {
  // 确保只有一个主键
  const primaryCount = columns.value.filter(col => col.isPrimary).length;
  if (primaryCount > 1) {
    columns.value.forEach((col, index) => {
      if (col.isPrimary && index !== columns.value.length - 1) {
        col.isAutoIncrement = false;
      }
    });
  }
}

// 判断类型是否需要长度
function needsLength(type: string): boolean {
  const typesNeedingLength = ['varchar', 'char', 'decimal', 'float', 'double'];
  return typesNeedingLength.some(t => type.startsWith(t));
}

// 判断是否为整数类型
function isIntType(type: string): boolean {
  return ['int', 'bigint', 'tinyint', 'smallint', 'mediumint'].includes(type.toLowerCase());
}

// 生成SQL
function generateSQL() {
  if (!tableInfo.value.name || columns.value.length === 0) {
    alert('请输入表名和至少一个字段');
    return;
  }

  let sql = `CREATE TABLE \`${tableInfo.value.name}\` (\n`;
  
  columns.value.forEach((column, index) => {
    const columnDef = [];
    columnDef.push(`  \`${column.name}\``);
    columnDef.push(getColumnTypeDefinition(column));
    
    if (!column.nullable) {
      columnDef.push('NOT NULL');
    }
    
    if (column.defaultValue !== null && column.defaultValue !== '') {
      columnDef.push(`DEFAULT ${formatDefaultValue(column.defaultValue, column.type)}`);
    }
    
    if (column.isAutoIncrement) {
      columnDef.push('AUTO_INCREMENT');
    }
    
    if (column.isPrimary) {
      columnDef.push('PRIMARY KEY');
    }
    
    if (column.comment) {
      columnDef.push(`COMMENT '${column.comment}'`);
    }
    
    sql += columnDef.join(' ');
    
    if (index < columns.value.length - 1) {
      sql += ',\n';
    }
  });
  
  sql += `\n) ENGINE=${tableInfo.value.engine} DEFAULT CHARSET=${tableInfo.value.charset} COLLATE=${tableInfo.value.collation}`;
  
  if (tableInfo.value.comment) {
    sql += ` COMMENT='${tableInfo.value.comment}'`;
  }
  
  sql += ';';
  
  emit('execute-sql', sql);
}

// 获取字段类型定义
function getColumnTypeDefinition(column: any): string {
  let type = column.type.toUpperCase();
  
  if (needsLength(column.type) && column.length) {
    type += `(${column.length})`;
  }
  
  return type;
}

// 格式化默认值
function formatDefaultValue(value: string, type: string): string {
  if (value === '' || value === null || value === undefined) {
    return 'NULL';
  }
  
  if (isIntType(type) || ['float', 'double', 'decimal'].includes(type)) {
    return value;
  }
  
  // 字符串类型需要加引号
  return `'${value.replace(/'/g, "''")}'`;
}

// 保存表结构
async function saveTable() {
  try {
    loading.value = true;
    
    if (!props.tableName) {
      // 新建表
      const response = await fetch(`/api/database/saveTableStructure/${props.connection?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database: props.database,
          table: tableInfo.value,
          columns: columns.value
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('表创建成功');
        closeModal();
      } else {
        alert('表创建失败');
      }
    } else {
      // 修改表结构
      const response = await fetch(`/api/database/alterTable/${props.connection?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database: props.database,
          tableName: props.tableName,
          columns: columns.value
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('表结构修改成功');
        closeModal();
      } else {
        alert('表结构修改失败');
      }
    }
  } catch (error) {
    console.error('保存表结构失败:', error);
    alert('操作失败');
  } finally {
    loading.value = false;
  }
}

// 关闭模态框
function closeModal() {
  emit('close');
}
</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-dialog {
  max-width: 1200px;
}

.card-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.table-responsive {
  max-height: 400px;
  overflow-y: auto;
}

.form-control, .form-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.form-control:focus, .form-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  color: #1e293b;
  font-weight: 600;
}

.modal-footer {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.table th {
  font-weight: 600;
  background: #f8fafc;
}

.table td {
  vertical-align: middle;
  padding: 0.5rem;
}

.btn-group .btn {
  border-radius: 0;
}

.btn-group .btn:first-child {
  border-radius: 4px 0 0 4px;
}

.btn-group .btn:last-child {
  border-radius: 0 4px 4px 0;
}
</style>