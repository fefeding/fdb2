<template>
  <div class="table-data-panel">
    <div class="toolbar">
      <div class="toolbar-title">
        数据：<strong>{{ table }}</strong>
        <span class="muted">（{{ database }}）</span>
      </div>
      <div class="toolbar-actions">
        <input v-model="where" class="where-input" placeholder="WHERE 条件，例如 age > 18" @keyup.enter="loadData(1)" />
        <button class="btn btn-secondary" @click="loadData(1)">筛选</button>
        <button class="btn btn-secondary" @click="refresh">刷新</button>
        <button class="btn btn-secondary" @click="prevPage" :disabled="page <= 1">上一页</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 行）</span>
        <button class="btn btn-secondary" @click="nextPage" :disabled="page >= totalPages">下一页</button>
      </div>
    </div>

    <div class="content">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <div>加载中...</div>
      </div>
      <div v-else-if="columns.length === 0" class="empty">暂无数据</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="col in columns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in rows" :key="idx">
              <td v-for="(cell, ci) in row" :key="ci">{{ formatCell(cell) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getVSCodeBridge } from '../bridge';

const vscode = getVSCodeBridge();

const connectionId = ref('');
const database = ref('');
const table = ref('');

const columns = ref<string[]>([]);
const rows = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(100);
const where = ref('');
const loading = ref(false);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

onMounted(() => {
  vscode.postMessage({ command: 'ready' });
  vscode.onMessage((message: any) => {
    if (message.command === 'init') {
      connectionId.value = message.data.connectionId;
      database.value = message.data.database;
      table.value = message.data.table;
      loadData(1);
    } else if (message.command === 'tableData') {
      const d = message.data;
      columns.value = d.columns || [];
      rows.value = d.rows || [];
      total.value = d.total || 0;
      page.value = d.page || 1;
      pageSize.value = d.pageSize || 100;
      loading.value = false;
    } else if (message.command === 'error') {
      loading.value = false;
      alert('加载失败: ' + message.data);
    }
  });
});

function loadData(p: number) {
  if (!connectionId.value) return;
  loading.value = true;
  vscode.postMessage({
    command: 'getTableData',
    data: {
      id: connectionId.value,
      database: database.value,
      table: table.value,
      page: p,
      pageSize: pageSize.value,
      where: where.value || undefined
    }
  });
}

function refresh() {
  loadData(page.value);
}

function prevPage() {
  if (page.value > 1) loadData(page.value - 1);
}

function nextPage() {
  if (page.value < totalPages.value) loadData(page.value + 1);
}

function formatCell(cell: any) {
  if (cell === null || cell === undefined) return 'NULL';
  if (typeof cell === 'boolean') return cell ? 'true' : 'false';
  if (typeof cell === 'object') return JSON.stringify(cell);
  return String(cell);
}
</script>

<style scoped>
.table-data-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background-color: var(--vscode-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.toolbar-title {
  font-size: 14px;
}

.muted {
  color: var(--vscode-descriptionForeground);
  font-weight: 400;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.where-input {
  flex: 1;
  min-width: 180px;
  padding: 5px 8px;
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 4px;
}

.btn {
  padding: 5px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.btn-secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.content {
  flex: 1;
  overflow: auto;
  padding: 12px;
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
  border-bottom: 1px solid var(--vscode-panel-border);
  white-space: nowrap;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
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

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px;
  color: var(--vscode-descriptionForeground);
}

.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid var(--vscode-progressBar-background);
  border-top-color: var(--vscode-progressBar-foreground);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
