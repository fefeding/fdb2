<template>
  <div class="query-panel">
    <div class="query-toolbar">
      <select v-model="selectedConnectionId" class="query-selector" @change="onConnectionChange">
        <option value="">选择数据库连接</option>
        <option v-for="conn in connections" :key="conn.id" :value="conn.id">
          {{ conn.name }} ({{ conn.type }})
        </option>
      </select>
      <button class="btn btn-primary" @click="executeQuery">执行 (Ctrl+Enter)</button>
      <button class="btn btn-secondary" @click="clearQuery">清空</button>
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
      <div v-else-if="results" class="results">
        <div class="results-header">
          <div class="results-title">查询结果</div>
          <div class="results-meta">{{ results.rowCount }} 行 · {{ results.executionTime }}ms</div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="col in results.columns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in results.rows" :key="index">
                <td v-for="(cell, ci) in row" :key="ci">{{ formatCell(cell) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-text">执行查询后，结果将显示在这里</div>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <span>{{ selectedConnection?.name || '未选择连接' }}</span>
      </div>
      <div class="status-item" v-if="results?.message">{{ results.message }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getVSCodeBridge } from '../bridge';

const vscode = getVSCodeBridge();

const connections = ref<any[]>([]);
const selectedConnectionId = ref('');
const queryText = ref('');
const results = ref<any>(null);
const loading = ref(false);
const queryTextarea = ref<HTMLTextAreaElement | null>(null);

const selectedConnection = computed(() => connections.value.find((c) => c.id === selectedConnectionId.value));

onMounted(() => {
  vscode.postMessage({ command: 'ready' });
  vscode.postMessage({ command: 'getConnections' });
  vscode.onMessage((message: any) => {
    if (message.command === 'connections') {
      connections.value = message.data || [];
    } else if (message.command === 'selectConnection') {
      selectedConnectionId.value = message.data?.id || '';
    } else if (message.command === 'queryResult') {
      results.value = message.data;
      loading.value = false;
    } else if (message.command === 'error') {
      loading.value = false;
      alert('查询错误: ' + message.data);
    }
  });
});

function onConnectionChange() {
  /* 仅更新选中态 */
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    executeQuery();
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const ta = queryTextarea.value;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      queryText.value = queryText.value.substring(0, start) + '  ' + queryText.value.substring(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
    }
  }
}

function executeQuery() {
  if (!selectedConnectionId.value) {
    alert('请先选择数据库连接');
    return;
  }
  if (!queryText.value.trim()) {
    alert('请输入 SQL 语句');
    return;
  }
  loading.value = true;
  vscode.postMessage({
    command: 'executeQuery',
    // 后端路由只认 id（宿主也会做 connectionId -> id 归一化，这里保持契约一致）
    data: { id: selectedConnectionId.value, sql: queryText.value }
  });
}

function clearQuery() {
  queryText.value = '';
  results.value = null;
}

function formatCell(cell: any) {
  if (cell === null || cell === undefined) return 'NULL';
  if (typeof cell === 'boolean') return cell ? 'true' : 'false';
  if (typeof cell === 'object') return JSON.stringify(cell);
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
  padding: 10px 12px;
  background-color: var(--dbt-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--dbt-panel-border);
}

.query-selector {
  min-width: 220px;
  padding: 5px 8px;
  border: 1px solid var(--dbt-input-border);
  background-color: var(--dbt-input-background);
  color: var(--dbt-input-foreground);
  border-radius: 4px;
}

.btn {
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary {
  background-color: var(--dbt-button-background);
  color: var(--dbt-button-foreground);
}

.btn-primary:hover {
  background-color: var(--dbt-button-hoverBackground);
}

.btn-secondary {
  background-color: var(--dbt-button-secondaryBackground);
  color: var(--dbt-button-secondaryForeground);
}

.btn-secondary:hover {
  background-color: var(--dbt-button-secondaryHoverBackground);
}

.query-editor {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--dbt-panel-border);
  min-height: 120px;
}

.query-textarea {
  flex: 1;
  padding: 12px;
  font-family: var(--dbt-editor-font-family, 'Consolas', 'Monaco', monospace);
  font-size: 13px;
  line-height: 1.6;
  border: none;
  resize: none;
  background-color: var(--dbt-editor-background);
  color: var(--dbt-editor-foreground);
}

.query-textarea:focus {
  outline: none;
}

.query-results {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--dbt-descriptionForeground);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--dbt-progressBar-background);
  border-top-color: var(--dbt-progressBar-foreground);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-bottom: 8px;
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
  margin-bottom: 10px;
  padding: 6px 10px;
  background-color: var(--dbt-editorGroupHeader-tabsBackground);
  border-radius: 4px;
}

.results-title {
  font-weight: 600;
}

.results-meta {
  font-size: 12px;
  color: var(--dbt-descriptionForeground);
}

.table-wrap {
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table th,
.data-table td {
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid var(--dbt-panel-border);
  white-space: nowrap;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table th {
  background-color: var(--dbt-editorGroupHeader-tabsBackground);
  font-weight: 600;
  position: sticky;
  top: 0;
}

.data-table tbody tr:hover {
  background-color: var(--dbt-list-hoverBackground);
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background-color: var(--dbt-statusBar-background);
  color: var(--dbt-statusBar-foreground);
  font-size: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
