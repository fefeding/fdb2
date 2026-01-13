<template>
  <div class="sql-query-editor">
    <div class="query-header">
      <div class="query-title">
        <i class="bi bi-terminal"></i>
        <span>SQL查询编辑器</span>
      </div>
      <div class="query-controls">
        <select v-model="selectedConnection" class="connection-select">
          <option value="">选择数据库连接</option>
          <option v-for="connection in connections" :key="connection.id" :value="connection.id">
            {{ connection.name }}
          </option>
        </select>
        <button class="btn-run" @click="executeQuery" :disabled="!querySql || !selectedConnection">
          <i class="bi bi-play-fill"></i>
          <span>执行</span>
        </button>
        <button class="btn-format" @click="formatSql" :disabled="!querySql">
          <i class="bi bi-code-slash"></i>
          <span>格式化</span>
        </button>
        <button class="btn-clear" @click="clearQuery">
          <i class="bi bi-trash"></i>
          <span>清空</span>
        </button>
        <button class="btn-save" @click="saveQuery" :disabled="!querySql">
          <i class="bi bi-save"></i>
          <span>保存</span>
        </button>
      </div>
    </div>

    <div class="query-editor-wrapper">
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <button 
            v-for="snippet in sqlSnippets" 
            :key="snippet.name"
            class="snippet-btn"
            @click="insertSnippet(snippet)"
            :title="snippet.description"
          >
            <i :class="snippet.icon"></i>
            <span>{{ snippet.name }}</span>
          </button>
        </div>
        <div class="toolbar-right">
          <span class="line-info">行: {{ currentLine }}, 列: {{ currentColumn }}</span>
          <span class="sql-mode">{{ getSqlModeLabel() }}</span>
        </div>
      </div>
      
      <div class="editor-container">
        <textarea
          ref="sqlEditor"
          v-model="querySql"
          class="sql-editor"
          placeholder="在此输入SQL查询语句..."
          @input="handleInput"
          @keydown="handleKeydown"
          @scroll="syncScroll"
          spellcheck="false"
        ></textarea>
        <div class="line-numbers" ref="lineNumbers" @scroll="syncScroll">
          <div 
            v-for="line in lineCount" 
            :key="line"
            class="line-number"
            :class="{ 'current-line': line === currentLine }"
          >
            {{ line }}
          </div>
        </div>
      </div>
    </div>

    <div class="query-results" v-if="queryResults.length > 0 || queryError">
      <div class="results-header">
        <div class="results-info">
          <i class="bi bi-table"></i>
          <span>查询结果</span>
          <span class="results-count" v-if="queryResults.length > 0">
            ({{ queryResults.length }} 行)
          </span>
        </div>
        <div class="results-actions">
          <button class="btn-export" @click="exportResults" v-if="queryResults.length > 0">
            <i class="bi bi-download"></i>
            <span>导出</span>
          </button>
          <button class="btn-clear-results" @click="clearResults">
            <i class="bi bi-x-lg"></i>
            <span>清除</span>
          </button>
        </div>
      </div>

      <div class="results-content">
        <div class="error-message" v-if="queryError">
          <i class="bi bi-exclamation-triangle"></i>
          <div>
            <strong>查询错误:</strong>
            <p>{{ queryError }}</p>
          </div>
        </div>
        
        <div class="results-table-wrapper" v-else>
          <table class="results-table">
            <thead>
              <tr>
                <th v-for="column in columns" :key="column" @click="sortByColumn(column)">
                  {{ column }}
                  <i class="bi bi-arrow-down-up" v-if="sortColumn === column"></i>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in sortedResults" :key="index">
                <td v-for="column in columns" :key="column" :title="row[column]">
                  {{ formatCellValue(row[column]) }}
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="pagination" v-if="totalPages > 1">
            <button @click="prevPage" :disabled="currentPage === 1">
              <i class="bi bi-chevron-left"></i>
            </button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <button @click="nextPage" :disabled="currentPage === totalPages">
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 保存查询对话框 -->
    <div class="modal-overlay" v-if="showSaveDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h3>保存SQL查询</h3>
          <button class="modal-close" @click="closeSaveDialog">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>查询名称</label>
            <input v-model="queryName" type="text" placeholder="输入查询名称" class="form-input">
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="queryDescription" placeholder="输入查询描述" class="form-textarea" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeSaveDialog">取消</button>
          <button class="btn-confirm" @click="confirmSave" :disabled="!queryName">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { ConnectionService } from '@/service/database';
import type { ConnectionEntity } from '@/typings/database';

const connectionService = new ConnectionService();

// 响应式数据
const querySql = ref('');
const selectedConnection = ref('');
const connections = ref<ConnectionEntity[]>([]);
const queryResults = ref<any[]>([]);
const queryError = ref('');
const currentLine = ref(1);
const currentColumn = ref(1);
const showSaveDialog = ref(false);
const queryName = ref('');
const queryDescription = ref('');

// 分页相关
const currentPage = ref(1);
const pageSize = ref(50);

// 排序相关
const sortColumn = ref('');
const sortDirection = ref<'asc' | 'desc'>('asc');

// SQL代码片段
const sqlSnippets = ref([
  { name: 'SELECT', icon: 'bi-cursor-text', description: 'SELECT语句模板', template: 'SELECT * FROM table_name WHERE condition;' },
  { name: 'INSERT', icon: 'bi-plus-square', description: 'INSERT语句模板', template: 'INSERT INTO table_name (column1, column2) VALUES (value1, value2);' },
  { name: 'UPDATE', icon: 'bi-pencil-square', description: 'UPDATE语句模板', template: 'UPDATE table_name SET column1 = value1 WHERE condition;' },
  { name: 'DELETE', icon: 'bi-trash', description: 'DELETE语句模板', template: 'DELETE FROM table_name WHERE condition;' },
  { name: 'JOIN', icon: 'bi-link-45deg', description: 'JOIN语句模板', template: 'SELECT a.*, b.* FROM table_a a JOIN table_b b ON a.id = b.id;' },
  { name: 'FUNCTION', icon: 'bi-gear', description: '函数模板', template: 'SELECT COUNT(*), AVG(column), MAX(column), MIN(column) FROM table_name;' }
]);

// 计算属性
const lineCount = computed(() => {
  return querySql.value.split('\n').length;
});

const columns = computed(() => {
  if (queryResults.value.length === 0) return [];
  return Object.keys(queryResults.value[0]);
});

const sortedResults = computed(() => {
  if (!sortColumn.value) return queryResults.value;
  
  return [...queryResults.value].sort((a, b) => {
    const aVal = a[sortColumn.value];
    const bVal = b[sortColumn.value];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

const totalPages = computed(() => {
  return Math.ceil(sortedResults.value.length / pageSize.value);
});

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return sortedResults.value.slice(start, end);
});

// 引用
const sqlEditor = ref<HTMLTextAreaElement>();
const lineNumbers = ref<HTMLDivElement>();

// 方法
async function loadConnections() {
  try {
    const response = await connectionService.getAllConnections();
    connections.value = response || [];
  } catch (error) {
    console.error('加载连接列表失败:', error);
  }
}

function handleInput() {
  updateCursorInfo();
  updateLineNumbers();
}

function handleKeydown(event: KeyboardEvent) {
  // Tab键插入缩进
  if (event.key === 'Tab') {
    event.preventDefault();
    const textarea = sqlEditor.value;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = querySql.value;
    
    // 插入2个空格作为缩进
    const newText = text.substring(0, start) + '  ' + text.substring(end);
    querySql.value = newText;
    
    // 设置光标位置
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      updateCursorInfo();
    });
  }
  
  // Ctrl+Enter 执行查询
  if (event.ctrlKey && event.key === 'Enter') {
    executeQuery();
  }
}

function updateCursorInfo() {
  const textarea = sqlEditor.value;
  if (!textarea) return;
  
  const text = textarea.value;
  const position = textarea.selectionStart;
  
  const textBeforeCursor = text.substring(0, position);
  const lines = textBeforeCursor.split('\n');
  
  currentLine.value = lines.length;
  currentColumn.value = lines[lines.length - 1].length + 1;
}

function updateLineNumbers() {
  // 行号由模板自动更新
}

function syncScroll() {
  if (sqlEditor.value && lineNumbers.value) {
    lineNumbers.value.scrollTop = sqlEditor.value.scrollTop;
  }
}

function insertSnippet(snippet: any) {
  const textarea = sqlEditor.value;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = querySql.value;
  
  const newText = text.substring(0, start) + snippet.template + text.substring(end);
  querySql.value = newText;
  
  nextTick(() => {
    textarea.focus();
    updateCursorInfo();
  });
}

async function executeQuery() {
  if (!querySql.value.trim() || !selectedConnection.value) {
    return;
  }
  
  queryError.value = '';
  queryResults.value = [];
  
  try {
    // 这里需要调用实际的查询API
    // const response = await databaseService.executeQuery(selectedConnection.value, querySql.value);
    
    // 模拟查询结果
    const mockResults = [
      { id: 1, name: '测试数据1', email: 'test1@example.com', created_at: '2024-01-01' },
      { id: 2, name: '测试数据2', email: 'test2@example.com', created_at: '2024-01-02' },
      { id: 3, name: '测试数据3', email: 'test3@example.com', created_at: '2024-01-03' }
    ];
    
    queryResults.value = mockResults;
    currentPage.value = 1;
    
  } catch (error: any) {
    queryError.value = error.message || '查询执行失败';
  }
}

function formatSql() {
  // 简单的SQL格式化
  let formatted = querySql.value
    .replace(/\s+/g, ' ')
    .replace(/,/g, ',\n    ')
    .replace(/\bFROM\b/gi, '\nFROM')
    .replace(/\bWHERE\b/gi, '\nWHERE')
    .replace(/\bORDER BY\b/gi, '\nORDER BY')
    .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
    .replace(/\bHAVING\b/gi, '\nHAVING')
    .replace(/\bLIMIT\b/gi, '\nLIMIT')
    .trim();
  
  querySql.value = formatted;
}

function clearQuery() {
  querySql.value = '';
  queryError.value = '';
  queryResults.value = [];
  currentPage.value = 1;
}

function clearResults() {
  queryResults.value = [];
  queryError.value = '';
}

function sortByColumn(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
}

function exportResults() {
  if (queryResults.value.length === 0) return;
  
  // 生成表头映射
  const headers: Record<string, string> = {};
  columns.value.forEach(col => {
    headers[col] = col;
  });

  // 使用导出工具
  import('../utils/export').then(({ exportDataToCSV }) => {
    exportDataToCSV(queryResults.value, headers, `query_results_${new Date().getTime()}.csv`);
  });
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  // 尝试检测并格式化 JSON 数据
  let strValue = String(value);
  if (typeof value === 'string') {
    // 检查是否可能是 JSON 字符串
    const trimmedValue = strValue.trim();
    if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) || 
        (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmedValue);
        // 格式化 JSON 并限制长度
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
    // 对于对象或数组类型，直接格式化
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

function getSqlModeLabel(): string {
  const sql = querySql.value.toUpperCase().trim();
  if (sql.startsWith('SELECT')) return 'SELECT';
  if (sql.startsWith('INSERT')) return 'INSERT';
  if (sql.startsWith('UPDATE')) return 'UPDATE';
  if (sql.startsWith('DELETE')) return 'DELETE';
  if (sql.startsWith('CREATE')) return 'CREATE';
  if (sql.startsWith('DROP')) return 'DROP';
  if (sql.startsWith('ALTER')) return 'ALTER';
  return 'SQL';
}

function saveQuery() {
  showSaveDialog.value = true;
}

function closeSaveDialog() {
  showSaveDialog.value = false;
  queryName.value = '';
  queryDescription.value = '';
}

function confirmSave() {
  // 保存查询逻辑
  console.log('保存查询:', {
    name: queryName.value,
    description: queryDescription.value,
    sql: querySql.value,
    connectionId: selectedConnection.value
  });
  
  closeSaveDialog();
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

// 生命周期
onMounted(() => {
  loadConnections();
});

// 监听查询文本变化
watch(querySql, () => {
  nextTick(() => {
    updateCursorInfo();
  });
});
</script>

<style scoped>
.sql-query-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.query-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
}

.query-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #1e293b;
  font-size: 1.1rem;
}

.query-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  min-width: 200px;
  font-size: 0.875rem;
}

.query-controls button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.query-controls button:hover:not(:disabled) {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.query-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-run {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  color: white !important;
  border: none !important;
}

.btn-run:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}

.btn-format {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  color: white !important;
  border: none !important;
}

.btn-save {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
  color: white !important;
  border: none !important;
}

.query-editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.toolbar-left {
  display: flex;
  gap: 0.25rem;
}

.snippet-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.snippet-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.toolbar-right {
  display: flex;
  gap: 1rem;
  align-items: center;
  color: #6b7280;
}

.sql-mode {
  background: #667eea;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.editor-container {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.sql-editor {
  flex: 1;
  padding: 1rem;
  padding-left: 4rem;
  border: none;
  outline: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  background: #fafafa;
  color: #1e293b;
  tab-size: 2;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.line-numbers {
  position: absolute;
  left: 0;
  top: 0;
  width: 3rem;
  padding: 1rem 0.5rem;
  background: #f1f5f9;
  border-right: 1px solid #e2e8f0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  text-align: right;
  color: #64748b;
  overflow: hidden;
  pointer-events: none;
}

.line-number {
  height: 21px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.current-line {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  font-weight: 600;
}

.query-results {
  background: white;
  border-top: 1px solid #e2e8f0;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.results-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #1e293b;
}

.results-count {
  color: #64748b;
  font-weight: 400;
}

.results-actions {
  display: flex;
  gap: 0.5rem;
}

.results-actions button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.results-actions button:hover {
  background: #f3f4f6;
}

.btn-export {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  color: white !important;
  border: none !important;
}

.results-content {
  flex: 1;
  overflow: hidden;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  color: #991b1b;
}

.error-message i {
  color: #ef4444;
  font-size: 1.25rem;
  margin-top: 0.125rem;
}

.error-message p {
  margin: 0.5rem 0 0 0;
  font-family: monospace;
  background: #fee2e2;
  padding: 0.5rem;
  border-radius: 4px;
}

.results-table-wrapper {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.results-table th {
  background: #f8fafc;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.results-table th:hover {
  background: #f1f5f9;
}

.results-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.results-table tr:hover {
  background: #fafbfc;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.pagination button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
}

.modal-close:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-confirm {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a67d8 0%, #667eea 100%);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .query-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .query-controls {
    flex-wrap: wrap;
  }
  
  .connection-select {
    width: 100%;
  }
  
  .editor-toolbar {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
  
  .toolbar-left {
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }
  
  .sql-editor {
    font-size: 12px;
  }
  
  .results-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .results-table-wrapper {
    overflow-x: auto;
  }
}
</style>