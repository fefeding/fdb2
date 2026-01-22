<template>
  <div class="sql-executor">
    <div class="sql-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary btn-sm" @click="executeSql" :disabled="loading">
          <i class="bi bi-play-fill"></i> 执行SQL
        </button>
        <button class="btn btn-outline-secondary btn-sm" @click="formatSql">
          <i class="bi bi-braces"></i> 格式化
        </button>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-outline-primary btn-sm" @click="clearSql">
          <i class="bi bi-trash"></i> 清空
        </button>
      </div>
    </div>
    
    <div class="sql-container" ref="containerRef" :style="{ height: height + 'px' }">
      <!-- SQL编辑器 -->
      <div class="sql-editor" :style="{ height: editorHeight + 'px' }">
        <div ref="editorRef" class="codemirror-editor"></div>
      </div>
      
      <!-- 可拖动分隔栏 -->
      <div 
        class="resizer" 
        @mousedown="startResize"
        :class="{ 'resizing': isResizing }"
      ></div>
      
      <!-- SQL执行结果显示 -->
      <div class="sql-result" :style="{ height: resultHeight + 'px' }">
        <div v-if="loading || sqlResult" class="result-content">
          <div class="result-header">
            <h6 class="result-title">
              <div v-if="loading" class="sql-loading">
                <div class="spinner-border spinner-border-sm me-2"></div>
                执行中...
              </div>
              <template v-else-if="sqlResult">
                <i class="bi bi-check-circle-fill text-success" v-if="sqlResult.success"></i>
                <i class="bi bi-x-circle-fill text-danger" v-else></i>
                执行结果
              </template>
            </h6>
            <div class="result-stats" v-if="sqlResult && sqlResult.success">
              <span class="badge bg-primary">影响行数: {{ sqlResult.affectedRows }}</span>
              <span class="badge bg-success ms-2" v-if="sqlResult.insertId">插入ID: {{ sqlResult.insertId }}</span>
            </div>
          </div>
          
          <!-- 执行中的loading状态 -->
          <div v-if="loading" class="sql-loading-state">
            <div class="d-flex align-items-center justify-content-center py-4">
              <div class="spinner-border text-primary me-3"></div>
              <div>
                <div class="fw-bold">正在执行SQL...</div>
                <div class="text-muted small">请稍候，复杂查询可能需要较长时间</div>
              </div>
            </div>
          </div>
          
          <!-- 查询结果表格（数组类型） -->
          <div v-else-if="sqlResult && sqlResult.success && Array.isArray(sqlResult.data) && sqlResult.data.length > 0" class="result-table">
            <div class="result-info">
              查询到 {{ sqlResult.data.length }} 条记录
              <div class="result-actions ms-auto">
                <button class="btn btn-sm btn-outline-primary me-2" @click="exportResult('csv')">
                  <i class="bi bi-file-earmark-spreadsheet"></i> 导出CSV
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="exportResult('json')">
                  <i class="bi bi-file-earmark-code"></i> 导出JSON
                </button>
              </div>
            </div>
            <div class="table-responsive result-table-container">
              <table class="table table-sm table-striped">
                <thead class="table-dark sticky-top">
                  <tr>
                    <th v-for="column in sqlResult.columns" :key="column">
                      {{ column }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in sqlResult.data" :key="index">
                    <td v-for="column in sqlResult.columns" :key="column">
                      {{ formatCellValue(row[column]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- 查询结果对象（对象类型） -->
          <div v-else-if="sqlResult && sqlResult.success && typeof sqlResult.data === 'object' && sqlResult.data !== null && !Array.isArray(sqlResult.data)" class="result-object">
            <div class="result-info">
              执行结果
              <div class="result-actions ms-auto">
                <button class="btn btn-sm btn-outline-secondary" @click="exportResult('json')">
                  <i class="bi bi-file-earmark-code"></i> 导出JSON
                </button>
              </div>
            </div>
            <div class="object-container">
              <table class="table table-sm table-striped">
                <thead class="table-dark">
                  <tr>
                    <th>属性</th>
                    <th>值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(value, key) in sqlResult.data" :key="key">
                    <td class="font-weight-medium">{{ key }}</td>
                    <td>{{ formatCellValue(value) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- 空结果显示 -->
          <div v-else-if="sqlResult && sqlResult.success && (sqlResult.data === null || sqlResult.data === undefined || (Array.isArray(sqlResult.data) && sqlResult.data.length === 0))" class="sql-empty-result">
            <div class="alert alert-info">
              <h6 class="alert-heading">
                <i class="bi bi-info-circle-fill me-2"></i>
                执行成功
              </h6>
              <p class="mb-0">{{ sqlResult.data === null || sqlResult.data === undefined ? '无返回结果' : '查询无结果' }}</p>
            </div>
          </div>
          
          <!-- 错误结果显示 -->
          <div v-else-if="sqlResult && !sqlResult.success" class="sql-error">
            <div class="alert alert-danger">
              <h6 class="alert-heading">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                SQL执行失败
              </h6>
              <p class="mb-0">{{ sqlResult.error }}</p>
            </div>
          </div>
        </div>
        <div v-else class="result-empty">
          <i class="bi bi-database"></i>
          <p>执行SQL以查看结果</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
// 导入CodeMirror相关模块
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, placeholder } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

// 导入其他依赖
import { DatabaseService } from '@/service/database';
import { modal } from '@/utils/modal';
import { exportDataToCSV, exportDataToJSON, formatFileName } from '../utils/export';

// Props
const props = defineProps<{
  connection: any;
  database: string;
  height?: number;
}>();

const databaseService = new DatabaseService();

// 响应式数据
const sqlQuery = ref('');
const loading = ref(false);
const sqlResult = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
const editorRef = ref<HTMLElement | null>(null);
const editor = ref<EditorView | null>(null);
const isResizing = ref(false);
const height = ref(props.height || 500);
const editorHeight = ref(250);
const resultHeight = computed(() => height.value - editorHeight.value - 8);

// 方法
function startResize(event: MouseEvent) {
  isResizing.value = true;
  const startY = event.clientY;
  const startHeight = editorHeight.value;
  
  function onMouseMove(e: MouseEvent) {
    if (!isResizing.value) return;
    const deltaY = e.clientY - startY;
    const newHeight = startHeight + deltaY;
    if (newHeight > 100 && newHeight < height.value - 100) {
      editorHeight.value = newHeight;
      // 调整编辑器大小
      // CodeMirror 6 会自动处理大小变化
    }
  }
  
  function onMouseUp() {
    isResizing.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

async function executeSql() {
  if (!sqlQuery.value.trim()) {
    modal.warning('请输入SQL语句');
    return;
  }
  
  if (!props.connection) {
    modal.error('请先选择数据库连接');
    return;
  }
  
  loading.value = true;
  sqlResult.value = null;
  
  try {
    const result = await databaseService.executeQuery(
      props.connection.id,
      sqlQuery.value,
      props.database
    );
    
    // 判断执行是否成功：ret === 0 表示成功，否则表示失败
    // 即使 ret 不为 0 但有 msg，也认为是失败
    const isSuccess = result.ret === 0;
    
    sqlResult.value = {
      success: isSuccess,
      data: isSuccess ? (result.data || []) : null,
      columns: isSuccess ? (result.columns || []) : null,
      affectedRows: result.affectedRows,
      insertId: result.insertId,
      error: !isSuccess ? result.msg : null
    };
  } catch (error: any) {
    sqlResult.value = {
      success: false,
      error: error.message || '执行SQL时发生未知错误'
    };
  } finally {
    loading.value = false;
  }
}

function formatSql() {
  // 简单的SQL格式化
  let formatted = sqlQuery.value
    .replace(/\bSELECT\b/gi, '\nSELECT ')
    .replace(/\bFROM\b/gi, '\nFROM ')
    .replace(/\bWHERE\b/gi, '\nWHERE ')
    .replace(/\bJOIN\b/gi, '\nJOIN ')
    .replace(/\bAND\b/gi, '\n  AND ')
    .replace(/\bOR\b/gi, '\n  OR ')
    .replace(/\bGROUP BY\b/gi, '\nGROUP BY ')
    .replace(/\bORDER BY\b/gi, '\nORDER BY ');
  
  sqlQuery.value = formatted.trim();
  // 更新编辑器内容
  if (editor.value) {
    editor.value.dispatch({
      changes: {
        from: 0,
        to: editor.value.state.doc.length,
        insert: sqlQuery.value
      }
    });
  }
}

function clearSql() {
  sqlQuery.value = '';
  sqlResult.value = null;
  // 清空编辑器内容
  if (editor.value) {
    editor.value.dispatch({
      changes: {
        from: 0,
        to: editor.value.state.doc.length,
        insert: ''
      }
    });
  }
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  
  // 尝试检测并格式化 JSON 数据
  let strValue = String(value);
  if (typeof value === 'string') {
    const trimmedValue = strValue.trim();
    if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) || 
        (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmedValue);
        const formatted = JSON.stringify(parsed, null, 2);
        if (formatted.length > 50) {
          return formatted.substring(0, 50) + '...';
        }
        return formatted;
      } catch (e) {
        // 不是有效的 JSON，继续处理
      }
    }
  } else if (typeof value === 'object') {
    try {
      const formatted = JSON.stringify(value, null, 2);
      if (formatted.length > 50) {
        return formatted.substring(0, 50) + '...';
      }
      return formatted;
    } catch (e) {
      // 格式化失败，继续处理
    }
  }
  
  // 对于普通字符串，限制显示长度
  if (strValue.length > 50) return strValue.substring(0, 50) + '...';
  
  return strValue;
}

function exportResult(format: 'csv' | 'json') {
  if (!sqlResult.value || !sqlResult.value.success || !sqlResult.value.data.length) {
    return;
  }
  
  const filename = formatFileName('sql_result', format);
  
  switch (format) {
    case 'csv':
      exportDataToCSV(sqlResult.value.data, sqlResult.value.columns, filename);
      break;
    case 'json':
      exportDataToJSON(sqlResult.value.data, filename);
      break;
  }
}

// 初始化CodeMirror编辑器
function initEditor() {
  if (!editorRef.value) return;
  
  // 创建编辑器状态
  const state = EditorState.create({
    doc: sqlQuery.value,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      placeholder('输入SQL查询语句...'),
      sql(),
      oneDark,
      keymap.of(defaultKeymap),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          sqlQuery.value = update.state.doc.toString();
        }
      }),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '14px',
          fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace'
        },
        '.cm-content': {
          padding: '10px',
          minHeight: '100%'
        },
        '.cm-gutters': {
          backgroundColor: '#282c34',
          color: '#abb2bf',
          border: 'none'
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#282c34'
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)'
        }
      })
    ]
  });
  
  // 创建编辑器视图
  editor.value = new EditorView({
    state,
    parent: editorRef.value
  });
}

// 生命周期
onMounted(() => {
  // 初始化高度
  if (containerRef.value) {
    height.value = containerRef.value.clientHeight || 500;
    editorHeight.value = height.value / 2;
  }
  
  // 初始化编辑器
  initEditor();
});

// 监听编辑器高度变化
watch(editorHeight, () => {
  // 调整编辑器大小
  // CodeMirror 6 会自动处理大小变化，但我们可以通过触发更新来确保
  if (editor.value) {
    // 触发编辑器视图更新
    editor.value.dispatch({
      effects: []
    });
  }
});
</script>

<style scoped>
.sql-executor {
  width: 100%;
  margin-bottom: 20px;
}

.sql-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
}

.sql-container {
  position: relative;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
}

.sql-editor {
  position: relative;
  overflow: auto;
}

.codemirror-editor {
  height: 100%;
  width: 100%;
}

.resizer {
  height: 8px;
  background-color: #e9ecef;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resizer:hover {
  background-color: #dee2e6;
}

.resizer::before {
  content: '';
  width: 40px;
  height: 2px;
  background-color: #adb5bd;
  border-radius: 1px;
}

.resizer.resizing {
  background-color: #dee2e6;
}

.resizer.resizing::before {
  background-color: #6c757d;
}

.sql-result {
  position: relative;
  overflow: auto;
  border-top: 1px solid #dee2e6;
}

.result-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.result-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sql-loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-stats {
  display: flex;
  gap: 8px;
}

.result-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.result-table-container {
  flex: 1;
  overflow: auto;
}

/* 对象结果样式 */
.result-object {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.object-container {
  flex: 1;
  overflow: auto;
}

.object-container table {
  width: 100%;
}

.object-container th:first-child {
  width: 20%;
  min-width: 100px;
}

.object-container td:first-child {
  font-weight: 500;
  background-color: #f8f9fa;
}

.sql-loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  flex: 1;
}

.sql-empty-result,
.sql-error {
  padding: 12px;
  flex: 1;
}

.result-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
  gap: 10px;
}

.result-empty i {
  font-size: 48px;
  opacity: 0.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sql-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .toolbar-left,
  .toolbar-right {
    justify-content: center;
  }
}
</style>