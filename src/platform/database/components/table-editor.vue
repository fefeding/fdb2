<template>
  <div v-if="visible" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" @click="close">
    <div class="modal-dialog modal-lg" style="width: 80%; max-width: node;" @click.stop>
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
                    <th width="120">数据类型</th>
                    <th width="80">长度</th>
                    <th width="80">可空</th>
                    <th width="80">默认值</th>
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
                        <option value="INT">INT</option>
                        <option value="VARCHAR">VARCHAR</option>
                        <option value="TEXT">TEXT</option>
                        <option value="DATETIME">DATETIME</option>
                        <option value="DECIMAL">DECIMAL</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        v-model="column.length" 
                        type="number" 
                        class="form-control form-control-sm" 
                        placeholder="长度"
                      >
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
                          :disabled="!column.isPrimary"
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
    // 创建表SQL
    const columnsSQL = formData.value.columns.map(col => {
      if (!col.name || !col.type) return '';
      
      let sql = `\`${col.name}\` ${col.type}`;
      if (col.length) sql += `(${col.length})`;
      if (!col.nullable) sql += ' NOT NULL';
      if (col.defaultValue) sql += ` DEFAULT '${col.defaultValue}'`;
      if (col.isAutoIncrement) sql += ' AUTO_INCREMENT';
      if (col.comment) sql += ` COMMENT '${col.comment}'`;
      
      return sql;
    }).filter(sql => sql).join(',\n  ');
    
    const primaryKeys = formData.value.columns
      .filter(col => col.isPrimary)
      .map(col => `\`${col.name}\``).join(', ');
    
    let sql = `CREATE TABLE \`${formData.value.tableName}\` (\n  ${columnsSQL}`;
    
    if (primaryKeys) {
      sql += `,\n  PRIMARY KEY (${primaryKeys})`;
    }
    
    sql += '\n)';
    
    if (formData.value.tableComment) {
      sql += ` COMMENT='${formData.value.tableComment}'`;
    }
    
    return sql;
  } else {
    // 修改表SQL（简化版，实际应该对比差异）
    return `-- 表结构修改SQL（需要对比差异生成）\n-- 当前表名: ${formData.value.tableName}`;
  }
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
</style>