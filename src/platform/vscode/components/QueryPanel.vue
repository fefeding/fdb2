<template>
  <div class="query-panel">
    <div class="query-toolbar">
      <select v-model="selectedConnectionId" class="query-selector" @change="handleConnectionChange">
        <option value="">选择数据库连接</option>
        <option v-for="conn in connections" :key="conn.id" :value="conn.id">
          {{ conn.name }} ({{ conn.host }}:{{ conn.port }})
        </option>
      </select>
      <button @click="executeQuery" class="btn btn-primary">
        执行 (Ctrl+Enter)
      </button>
      <button @click="clearQuery" class="btn btn-secondary">
        清空
      </button>
    </div>

    <div class="query-editor">
      <textarea
        ref="queryTextarea"
        v-model="queryText"
        class="query-textarea"
        placeholder="在此输入 SQL 查询语句...&#10;&#10;例如: SELECT * FROM users LIMIT 100"
        @keydown="handleKeydown"
      ></textarea>
    </div>

    <div class="query-results">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>执行中...</span>
      </div>
      <div v-else-if="queryResults" class="results">
        <div class="results-header">
          <div class="results-title">查询结果</div>
          <div class="results-meta">
            {{ queryResults.rowCount }} 行 · {{ queryResults.executionTime }}ms
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th v-for="col in queryResults.columns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in queryResults.rows" :key="index">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                {{ formatCell(cell) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-text">执行查询后，结果将显示在这里</div>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <span class="status-icon">🔗</span>
        <span>{{ selectedConnection?.name || '未选择连接' }}</span>
      </div>
      <div class="status-item">
        <span id="statusTime">{{ queryResults ? `执行时间: ${queryResults.executionTime}ms` : '' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { getVSCodeBridge } from '../bridge';

const vscode = getVSCodeBridge();

const connections = ref<any[]>([]);
const selectedConnectionId = ref('');
const queryText = ref('');
const queryResults = ref<any>(null);
const loading = ref(false);
const queryTextarea = ref<HTMLTextAreaElement | null>(null);

const selectedConnection = computed(() => {
  return connections.value.find(c => c.id === selectedConnectionId.value);
});

onMounted(() => {
  // 请求连接列表
  vscode.postMessage({ command: 'getConnections' });

  // 监听来自扩展的消息
  vscode.onMessage((message: any) => {
    if (message.command === 'connections') {
      connections.value = message.data;
    } else if (message.command === 'queryResult') {
      displayQueryResult(message.data);
    } else if (message.command === 'error') {
      handleError(message.data);
    }
  });
});

function handleConnectionChange() {
  // 连接变化时的处理
}

function handleKeydown(e: KeyboardEvent) {
  // Ctrl+Enter 或 Cmd+Enter 执行查询
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    executeQuery();
  }

  // Tab 键插入2个空格
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = queryTextarea.value;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      queryText.value = queryText.value.substring(0, start) + '  ' + queryText.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    }
  }
}

function executeQuery() {
  if (!selectedConnectionId.value) {
    alert('请先选择数据库连接');
    return;
  }

  if (!queryText.value.trim()) {
    alert('请输入 SQL 查询语句');
    return;
  }

  loading.value = true;

  vscode.postMessage({
    command: 'executeQuery',
    data: {
      connectionId: selectedConnectionId.value,
      sql: queryText.value
    }
  });
}

function clearQuery() {
  queryText.value = '';
  queryResults.value = null;
}

function displayQueryResult(data: any) {
  queryResults.value = data;
  loading.value = false;
}

function handleError(error: string) {
  loading.value = false;
  alert(`查询错误: ${error}`);
}

function formatCell(cell: any) {
  if (cell === null || cell === undefined) {
    return 'NULL';
  }
  if (typeof cell === 'boolean') {
    return cell ? '✓' : '✗';
  }
  if (typeof cell === 'object') {
    return JSON.stringify(cell);
  }
  return String(cell);
}
</script>

<style scoped>
.query-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.query-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--vscode-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.query-selector {
  min-width: 200px;
  padding: 6px 10px;
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 4px;
}

.btn {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.btn-secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-secondary:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.query-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--vscode-panel-border);
  min-height: 200px;
}

.query-textarea {
  flex: 1;
  padding: 16px;
  font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', monospace);
  font-size: 14px;
  line-height: 1.6;
  border: none;
  resize: none;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.query-textarea:focus {
  outline: none;
}

.query-results {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 12px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--vscode-progressBar-background);
  border-top-color: var(--vscode-progressBar-foreground);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: var(--vscode-editorGroupHeader-tabsBackground);
  border-radius: 4px;
}

.results-title {
  font-size: 14px;
  font-weight: 600;
}

.results-meta {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.data-table th {
  background-color: var(--vscode-editorGroupHeader-tabsBackground);
  font-weight: 600;
  position: sticky;
  top: 0;
}

.data-table tbody tr:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: var(--vscode-descriptionForeground);
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--vscode-statusBar-background);
  color: var(--vscode-statusBar-foreground);
  font-size: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  color: var(--vscode-textLink-foreground);
}
</style>
