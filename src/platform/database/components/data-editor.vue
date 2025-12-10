<template>
  <div class="modal fade" :class="{ show: visible }" :style="{ display: visible ? 'block' : 'none' }">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-pencil-square" v-if="isEdit"></i>
            <i class="bi bi-plus-circle" v-else></i>
            {{ isEdit ? '编辑数据' : '新增数据' }}
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div class="row g-3">
              <div 
                v-for="column in columns" 
                :key="column.name" 
                class="col-md-6"
              >
                <label class="form-label">
                  {{ column.name }}
                  <span v-if="column.isPrimary" class="text-danger">*</span>
                  <small class="text-muted ms-2">{{ column.type }}</small>
                </label>
                
                <!-- 主键且自增时禁用编辑 -->
                <input 
                  v-if="column.isPrimary && column.isAutoIncrement && isEdit"
                  type="text" 
                  class="form-control" 
                  :value="formData[column.name]"
                  disabled
                  readonly
                >
                <!-- 普通输入框 -->
                <input 
                  v-else-if="isTextInput(column.type)"
                  type="text" 
                  class="form-control" 
                  v-model="formData[column.name]"
                  :placeholder="'请输入' + column.name"
                  :required="!column.nullable"
                >
                <!-- 数字输入框 -->
                <input 
                  v-else-if="isNumberInput(column.type)"
                  type="number" 
                  class="form-control" 
                  v-model="formData[column.name]"
                  :placeholder="'请输入' + column.name"
                  :required="!column.nullable"
                  :step="isDecimalInput(column.type) ? '0.01' : '1'"
                >
                <!-- 日期时间选择器 -->
                <input 
                  v-else-if="isDateInput(column.type)"
                  type="datetime-local" 
                  class="form-control" 
                  v-model="formData[column.name]"
                  :required="!column.nullable"
                >
                <!-- 文本域 -->
                <textarea 
                  v-else-if="isTextArea(column.type)"
                  class="form-control" 
                  v-model="formData[column.name]"
                  :placeholder="'请输入' + column.name"
                  :required="!column.nullable"
                  rows="3"
                ></textarea>
                <!-- 下拉选择（枚举） -->
                <select 
                  v-else-if="isEnumInput(column.type)"
                  class="form-select" 
                  v-model="formData[column.name]"
                  :required="!column.nullable"
                >
                  <option value="">请选择...</option>
                  <option v-for="option in getEnumOptions(column.type)" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
                <!-- 布尔值 -->
                <select 
                  v-else-if="isBooleanInput(column.type)"
                  class="form-select" 
                  v-model="formData[column.name]"
                >
                  <option :value="true">是/True</option>
                  <option :value="false">否/False</option>
                </select>
                <!-- 默认输入框 -->
                <input 
                  v-else
                  type="text" 
                  class="form-control" 
                  v-model="formData[column.name]"
                  :placeholder="'请输入' + column.name"
                  :required="!column.nullable"
                >
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            取消
          </button>
          <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ isEdit ? '更新' : '插入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="visible" class="modal-backdrop fade show" @click="closeModal"></div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { DatabaseService } from '@/service/database';
import { modal } from '@/utils/modal';
import { isNumericType, isBooleanType, isDateTimeType, isTextType } from '@/utils/database-types';

const databaseService = new DatabaseService();

const props = defineProps<{
  visible: boolean;
  isEdit: boolean;
  data?: any;
  columns: any[];
  connection?: any;
  database?: string;
  tableName?: string;
}>();

const emit = defineEmits<{
  'close': [];
  'submit': [data: any];
}>();

// 表单数据
const formData = ref<any>({});
const loading = ref(false);

// 监听显示状态变化
watch(() => props.visible, (visible) => {
  if (visible) {
    initializeFormData();
  }
});

// 初始化表单数据
function initializeFormData() {
  formData.value = {};
  
  props.columns.forEach(column => {
    if (props.isEdit && props.data) {
      // 编辑模式：使用现有数据
      if(isDateInput(column.type)) {
        formData.value[column.name] = props.data[column.name] ? new Date(props.data[column.name]).toISOString().replace('.000Z', '') : null;
      }
      else formData.value[column.name] = props.data[column.name];
    } else {
      // 新增模式：设置默认值
      if (column.isPrimary && column.isAutoIncrement) {
        formData.value[column.name] = null; // 自增主键不需要设置
      } else if (column.defaultValue !== null && column.defaultValue !== undefined) {
        formData.value[column.name] = column.defaultValue;
      } else if (column.nullable) {
        formData.value[column.name] = null;
      } else if (isBooleanInput(column.type)) {
        formData.value[column.name] = false;
      } else {
        formData.value[column.name] = '';
      }
    }
  });
}

// 判断输入类型
function isTextInput(type: string): boolean {
  return !isNumericType(type) && !isBooleanType(type) && !isDateTimeType(type) && !isEnumInput(type);
}

function isNumberInput(type: string): boolean {
  return isNumericType(type);
}

function isDecimalInput(type: string): boolean {
  return isNumericType(type) && (type.toLowerCase().includes('decimal') || type.toLowerCase().includes('numeric'));
}

function isDateInput(type: string): boolean {
  return isDateTimeType(type);
}

function isTextArea(type: string): boolean {
  return isTextType(type);
}

function isEnumInput(type: string): boolean {
  return type.toLowerCase().startsWith('enum');
}

function isBooleanInput(type: string): boolean {
  return isBooleanType(type);
}

// 获取枚举选项
function getEnumOptions(type: string): string[] {
  const match = type?.match(/enum\((.*)\)/i);
  if (match && match[1]) {
    return match[1].split(',').map((option: string) => {
      return option.trim().replace(/'/g, '');
    });
  }
  return [];
}

// 关闭模态框
function closeModal() {
  emit('close');
}

// 提交表单
async function handleSubmit() {
  try {
    loading.value = true;    
    let response;
    if (props.isEdit && props.data) {
      // 更新数据
      const whereClause = getPrimaryKeyWhere();
      response = await databaseService.updateData(
        props.connection?.id || '',
        props.database || '',
        props.tableName || '',
        formData.value,
        whereClause
      );
    } else {
      // 插入新数据
      response = await databaseService.insertData(
        props.connection?.id || '',
        props.database || '',
        props.tableName || '',
        formData.value
      );
    }
    
    if (response.ret === 0) {
      modal.success(props.isEdit ? '数据更新成功' : '数据插入成功');
      emit('submit', response.data);
      closeModal();
    } else {
      modal.error(response.msg, {
        code: response.ret,
        operation: props.isEdit ? 'UPDATE' : 'INSERT',
        table: props.tableName,
        requestData: formData.value
      });
    }
  } catch (error) {
    console.error('提交数据失败:', error);
    modal.error(error.msg || error.message || error, {
      operation: props.isEdit ? 'UPDATE' : 'INSERT',
      table: props.tableName,
      stack: error.stack
    });
  } finally {
    loading.value = false;
  }
}

// 获取主键条件
function getPrimaryKeyWhere() {
  const primaryKeys = props.columns.filter(col => col.isPrimary);
  const whereClause: any = {};
  
  primaryKeys.forEach(key => {
    whereClause[key.name] = props.data[key.name];
  });
  
  return whereClause;
}
</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-dialog {
  max-width: 800px;
}

.form-label {
  font-weight: 500;
  color: #374151;
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

.text-danger {
  color: #ef4444;
}

.text-muted {
  color: #6b7280;
  font-size: 0.875rem;
}
</style>