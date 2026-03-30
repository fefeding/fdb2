<template>
  <div class="modal fade" :class="{ show: visible }" :style="{ display: visible ? 'block' : 'none' }">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header" style="padding: 15px;">
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
                :data-type="column.type"
                class="col-md-6"
              >
                <label class="form-label">
                  {{ column.name }}
                  <span v-if="column.isPrimary" class="text-danger">*</span>
                  <small class="text-muted ms-2">{{ column.type }}</small>
                </label>
                
                <!-- 主键且自增时禁用编辑或隐藏 -->
                <input 
                  v-if="column.isPrimary && column.isAutoIncrement"
                  type="text" 
                  data-type="primary"
                  class="form-control" 
                  :value="isEdit ? formData[column.name] : '自动生成'"
                  disabled
                  readonly
                >
                <!-- 数字输入框 -->
                <input 
                  v-else-if="isNumberInput(column.type)"
                  type="number" 
                  data-type="number"
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
                  data-type="date"
                  v-model="formData[column.name]"
                  :required="!column.nullable"
                >
                <!-- 文本域 -->
                <textarea 
                  v-else-if="isTextArea(column.type)"
                  class="form-control" 
                  data-type="textarea"
                  v-model="formData[column.name]"
                  :placeholder="'请输入' + column.name"
                  :required="!column.nullable"
                  rows="3"
                ></textarea>
                <!-- 下拉选择（枚举） -->
                <select 
                  v-else-if="isEnumInput(column.type)"
                  class="form-select" 
                  data-type="select"
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
                  data-type="boolean"
                  v-model="formData[column.name]"
                >
                  <option :value="true">是/True</option>
                  <option :value="false">否/False</option>
                </select>
                <!-- JSON类型 -->
                <div v-else-if="isJsonInput(column.type, 'input') || isArrayInput(column.type)" class="json-editor">
                  <div class="json-editor-container" :ref="(el) => setJsonEditorRef(el, column.name)" style="border: 1px solid #dee2e6; border-radius: 0.375rem; overflow: hidden; height: 200px;">
                  </div>
                  <div class="d-flex justify-content-between mt-1">
                    <small :class="jsonError[column.name] ? 'text-danger' : 'text-success'">
                      {{ jsonError[column.name] || 'JSON格式正确' }}
                    </small>
                    <button 
                      type="button" 
                      class="btn btn-sm btn-outline-primary" 
                      @click="formatJson(column.name)"
                    >
                      格式化
                    </button>
                  </div>
                </div>
                <!-- 默认输入框 -->
                <input 
                  v-else
                  type="text" 
                  data-type="normal"
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
</template>

<script lang="ts" setup>
import { ref, watch, computed, nextTick, onBeforeUnmount } from 'vue';
import { DatabaseService } from '@/service/database';
import { modal } from '@/utils/modal';
import { isNumericType, isBooleanType, isDateTimeType, isTextType, isJsonType, isArrayType } from '@/utils/database-types';

// CodeMirror imports
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, placeholder } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';

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

// JSON 文本数据
const jsonText = ref<any>({});
// JSON 验证错误
const jsonError = ref<any>({});

// CodeMirror 实例和 DOM 引用
const jsonEditorRefs = ref<Record<string, HTMLElement | null>>({});
const jsonEditorInstances = ref<Record<string, EditorView>>({});

// 动态设置 ref
function setJsonEditorRef(el: any, columnName: string) {
  if (el) {
    jsonEditorRefs.value[columnName] = el as HTMLElement;
  }
}

// 监听显示状态变化
watch(() => props.visible, async (visible) => {
  if (visible) {
    initializeFormData();
    await nextTick();
    initJsonEditors();
  } else {
    destroyJsonEditors();
  }
});

// 初始化 JSON 编辑器
function initJsonEditors() {
  props.columns.forEach(column => {
    if (isJsonInput(column.type, 'input') || isArrayInput(column.type)) {
      const container = jsonEditorRefs.value[column.name];
      if (!container || jsonEditorInstances.value[column.name]) return;

      const state = EditorState.create({
        doc: jsonText.value[column.name] || '',
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          placeholder(`请输入 ${column.name} 的JSON数据`),
          json(),
          syntaxHighlighting(defaultHighlightStyle),
          keymap.of(defaultKeymap),
          EditorView.lineWrapping,
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              const newValue = update.state.doc.toString();
              jsonText.value[column.name] = newValue;
              validateJson(column.name);
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '14px',
              fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
              backgroundColor: '#f8f9fa'
            },
            '.cm-content': {
              padding: '10px',
              minHeight: '100%',
              backgroundColor: '#ffffff'
            },
            '.cm-gutters': {
              backgroundColor: '#f8f9fa',
              color: '#6c757d',
              borderRight: '1px solid #dee2e6'
            },
            '.cm-activeLineGutter': {
              backgroundColor: '#e9ecef'
            },
            '.cm-activeLine': {
              backgroundColor: '#e9ecef'
            }
          })
        ]
      });

      const view = new EditorView({
        state,
        parent: container
      });

      jsonEditorInstances.value[column.name] = view;
    }
  });
}

// 销毁 JSON 编辑器
function destroyJsonEditors() {
  Object.values(jsonEditorInstances.value).forEach(view => {
    view.destroy();
  });
  jsonEditorInstances.value = {};
}

// 初始化表单数据
function initializeFormData() {
  formData.value = {};
  jsonText.value = {};
  jsonError.value = {};
  
  props.columns.forEach(column => {
    if (props.isEdit && props.data) {
      // 编辑模式：使用现有数据
      if(isDateInput(column.type)) {
        formData.value[column.name] = props.data[column.name] ? new Date(props.data[column.name]).toISOString().slice(0, 16) : null;
      }
      else if (isJsonInput(column.type) || isArrayInput(column.type)) {
        let value = props.data[column.name];
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = props.data[column.name];
          }
        }
        formData.value[column.name] = value;
        jsonText.value[column.name] = JSON.stringify(value, null, 2);
      }
      else formData.value[column.name] = props.data[column.name];
    } else {
      // 新增模式：设置默认值
      if (column.isPrimary && column.isAutoIncrement) {
        formData.value[column.name] = null;
      } else if (column.defaultValue !== null && column.defaultValue !== undefined) {
        if (isDateInput(column.type) && typeof column.defaultValue === 'string') {
          const upperDefault = column.defaultValue.toUpperCase();
          if (upperDefault === 'CURRENT_TIMESTAMP' || upperDefault.startsWith('CURRENT_TIMESTAMP(')) {
            formData.value[column.name] = null;
          } else {
            formData.value[column.name] = column.defaultValue;
          }
        } else {
          formData.value[column.name] = column.defaultValue;
        }
      } else if (column.nullable) {
        formData.value[column.name] = null;
      } else if (isBooleanInput(column.type)) {
        formData.value[column.name] = false;
      } else if (isJsonInput(column.type) || isArrayInput(column.type)) {
        formData.value[column.name] = {};
        jsonText.value[column.name] = '{}';
      } else {
        formData.value[column.name] = '';
      }
    }
  });
}

// 组件卸载时清理
onBeforeUnmount(() => {
  destroyJsonEditors();
});

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

function isJsonInput(type: string, inputtype?: string): boolean {
  if(inputtype) {
    console.log(inputtype, type);
  }
  return isJsonType(type);
}

function isArrayInput(type: string): boolean {
  return isArrayType(type);
}

// JSON 验证
function validateJson(columnName: string) {
  try {
    const value = jsonText.value[columnName];
    if (value && value.trim()) {
      const parsed = JSON.parse(value);
      formData.value[columnName] = parsed;
      jsonError.value[columnName] = '';
    } else {
      formData.value[columnName] = null;
      jsonError.value[columnName] = '';
    }
  } catch (error) {
    jsonError.value[columnName] = 'JSON格式错误: ' + (error as Error).message;
  }
}

// JSON 格式化
function formatJson(columnName: string) {
  try {
    const value = jsonText.value[columnName];
    if (value && value.trim()) {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      
      jsonText.value[columnName] = formatted;
      formData.value[columnName] = parsed;
      jsonError.value[columnName] = '';

      // 更新 CodeMirror 视图
      const view = jsonEditorInstances.value[columnName];
      if (view) {
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: formatted
          }
        });
      }
    }
  } catch (error) {
    jsonError.value[columnName] = 'JSON格式错误: ' + (error as Error).message;
  }
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
  loading.value = false;
  emit('close');
}

// 提交表单
async function handleSubmit() {
  try {
    // 验证所有 JSON 字段
    let hasInvalidJson = false;
    props.columns.forEach(column => {
      if (isJsonInput(column.type) || isArrayInput(column.type)) {
        validateJson(column.name);
        if (jsonError.value[column.name]) {
          hasInvalidJson = true;
        }
      }
    });
    
    if (hasInvalidJson) {
      modal.error('请修复 JSON 格式错误后再提交');
      return;
    }
    
    loading.value = true;    
    let response;
    
    // 准备提交的数据，过滤掉自增字段和默认值字段
    const submitData: any = {};
    Object.keys(formData.value).forEach(key => {
      const column = props.columns.find(col => col.name === key);
      // 如果列存在且不是自增字段，则包含在提交数据中
      if (!column || !column.isAutoIncrement) {
        const value = formData.value[key];

        // 如果列有默认值且当前值为 null（表示使用默认值），跳过该字段让数据库自动处理
        if (column?.defaultValue !== undefined && column?.defaultValue !== null && value === null) {
          // 但如果是编辑模式且原有数据就是 null，则应该传递 null
          if (!(props.isEdit && props.data && props.data[key] === null)) {
            return;
          }
        }

        // 检查是否是数据库默认时间函数
        if (typeof value === 'string') {
          const upperValue = value.toUpperCase();
          if (upperValue === 'CURRENT_TIMESTAMP' || upperValue.startsWith('CURRENT_TIMESTAMP(')) {
            return;
          }
        }
        // 如果值等于默认值，也跳过该字段
        if (column?.defaultValue !== undefined && column?.defaultValue !== null && value === column.defaultValue) {
          return;
        }
        submitData[key] = value;
      }
    });
    
    if (props.isEdit && props.data) {
      // 更新数据
      const whereClause = getPrimaryKeyWhere();
      response = await databaseService.updateData(
        props.connection?.id || '',
        props.database || '',
        props.tableName || '',
        submitData,
        whereClause
      );
    } else {
      // 插入新数据
      response = await databaseService.insertData(
        props.connection?.id || '',
        props.database || '',
        props.tableName || '',
        submitData
      );
    }
    
    if (response.ret === 0) {
      modal.success(props.isEdit ? '数据更新成功' : '数据插入成功');
      closeModal();
      nextTick(() => {
        emit('submit', response);
      });
    } else {
      loading.value = false;
      modal.error(response.msg, {
        code: response.ret,
        operation: props.isEdit ? 'UPDATE' : 'INSERT',
        table: props.tableName,
        requestData: formData.value
      });
    }
  } catch (error) {
    console.error('提交数据失败:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    modal.error(errorMsg, {
      operation: props.isEdit ? 'UPDATE' : 'INSERT',
      table: props.tableName,
      stack: error instanceof Error ? error.stack : undefined
    });
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

.json-editor .text-muted {
  font-size: 0.75rem;
}

.json-editor :deep(.cm-editor) {
  height: 100%;
}
</style>