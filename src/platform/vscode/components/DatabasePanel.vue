<template>
  <div class="database-panel">
    <div class="panel-header">
      <h1 class="panel-title">数据库浏览器</h1>
      <div class="panel-actions">
        <button class="btn btn-secondary" @click="handleAddConnection">添加连接</button>
        <button class="btn btn-secondary" @click="refresh">刷新</button>
      </div>
    </div>

    <div class="conn-row">
      <select v-model="selectedConnectionId" class="connection-selector" @change="onConnectionChange">
        <option value="">选择数据库连接</option>
        <option v-for="conn in connections" :key="conn.id" :value="conn.id">
          {{ conn.name }} ({{ conn.type }})
        </option>
      </select>
    </div>

    <div id="contentArea">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <div>加载中...</div>
      </div>

      <div v-else-if="!selectedConnectionId" class="empty-state">
        <div class="empty-icon">🗄️</div>
        <div class="empty-title">未选择连接</div>
        <div class="empty-text">请从上方下拉列表选择一个数据库连接</div>
      </div>

      <div v-else>
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab', { active: currentTab === tab.id }]"
            @click="currentTab = tab.id"
          >
            {{ tab.name }}
          </button>
        </div>

        <div v-show="currentTab === 'databases'" class="tab-content">
          <h3 class="section-title">数据库列表</h3>
          <div class="database-grid">
            <div v-for="db in databases" :key="db" class="database-card" @click="selectDatabase(db)">
              <div class="database-icon">🗄️</div>
              <div class="database-name">{{ db }}</div>
            </div>
            <div v-if="databases.length === 0" class="empty-text">该连接下没有可用数据库</div>
          </div>
        </div>

        <div v-show="currentTab === 'tables'" class="tab-content">
          <div class="section-subtitle">
            当前数据库：<strong>{{ currentDatabase }}</strong>
            <button class="btn btn-link" @click="currentTab = 'databases'">切换</button>
          </div>
          <h3 class="section-title">表 / 视图</h3>
          <div class="table-list">
            <div v-for="table in tables" :key="table.name" class="table-item">
              <div class="table-icon">{{ table.type === 'view' ? '👁️' : '📋' }}</div>
              <div class="table-info">
                <div class="table-name">{{ table.name }}</div>
                <div v-if="table.comment" class="table-comment">{{ table.comment }}</div>
                <div v-if="table.rows !== null && table.rows !== undefined" class="table-meta">
                  <span>{{ formatNumber(table.rows) }} 行</span>
                  <span v-if="table.engine">{{ table.engine }}</span>
                </div>
              </div>
              <span :class="['table-type', table.type]">{{ table.type === 'view' ? 'VIEW' : 'TABLE' }}</span>
              <div class="table-actions">
                <button class="action-btn" @click.stop="viewData(table)">数据</button>
                <button class="action-btn" @click.stop="viewStructure(table)">结构</button>
              </div>
            </div>
            <div v-if="tables.length === 0" class="empty-text">该数据库下没有表</div>
          </div>
        </div>

        <div v-show="currentTab === 'sqleditor'" class="tab-content">
          <div class="section-subtitle">为当前连接新建查询</div>
          <button class="btn btn-primary" @click="openQuery">打开 SQL 查询面板</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getVSCodeBridge } from '../bridge';

const vscode = getVSCodeBridge();

const connections = ref<any[]>([]);
const selectedConnectionId = ref('');
const databases = ref<string[]>([]);
const tables = ref<any[]>([]);
const loading = ref(false);
const currentTab = ref('databases');
const currentDatabase = ref('');

const tabs = [
  { id: 'databases', name: '数据库' },
  { id: 'tables', name: '表' },
  { id: 'sqleditor', name: 'SQL' }
];

onMounted(() => {
  vscode.postMessage({ command: 'ready' });
  vscode.postMessage({ command: 'getConnections' });
  vscode.onMessage((message: any) => {
    if (message.command === 'connections') {
      connections.value = message.data || [];
    } else if (message.command === 'selectConnection') {
      const id = message.data?.id;
      if (id) {
        selectedConnectionId.value = id;
        loadDatabases(id);
      }
    } else if (message.command === 'databases') {
      databases.value = message.data || [];
      loading.value = false;
      currentTab.value = 'databases';
    } else if (message.command === 'tables') {
      tables.value = message.data || [];
      loading.value = false;
      currentTab.value = 'tables';
    } else if (message.command === 'error') {
      loading.value = false;
      alert('操作失败: ' + message.data);
    }
  });
});

function handleAddConnection() {
  vscode.postMessage({ command: 'openConnectionPanel' });
}

function refresh() {
  vscode.postMessage({ command: 'getConnections' });
}

function onConnectionChange() {
  if (selectedConnectionId.value) {
    loadDatabases(selectedConnectionId.value);
  } else {
    databases.value = [];
    tables.value = [];
  }
}

function loadDatabases(id: string) {
  loading.value = true;
  currentDatabase.value = '';
  vscode.postMessage({ command: 'getDatabases', data: { id } });
}

function selectDatabase(db: string) {
  if (!selectedConnectionId.value) return;
  currentDatabase.value = db;
  loading.value = true;
  vscode.postMessage({
    command: 'getTables',
    data: { id: selectedConnectionId.value, database: db }
  });
}

function viewData(table: any) {
  vscode.postMessage({
    command: 'openTableData',
    data: { connectionId: selectedConnectionId.value, database: currentDatabase.value, table: table.name }
  });
}

function viewStructure(table: any) {
  vscode.postMessage({
    command: 'openTableStructure',
    data: { connectionId: selectedConnectionId.value, database: currentDatabase.value, table: table.name }
  });
}

function openQuery() {
  vscode.postMessage({ command: 'openQuery', data: { id: selectedConnectionId.value } });
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}
</script>

<style scoped>
.database-panel {
  padding: 16px;
  height: 100vh;
  overflow: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.conn-row {
  margin-bottom: 16px;
}

.connection-selector {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 4px;
  font-size: 13px;
}

.btn {
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-link {
  background: none;
  border: none;
  color: var(--vscode-textLink-foreground);
  cursor: pointer;
  padding: 0 6px;
  font-size: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 18px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.section-subtitle {
  font-size: 13px;
  margin: 8px 0;
  color: var(--vscode-descriptionForeground);
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.tab {
  padding: 7px 16px;
  border: none;
  background-color: transparent;
  color: var(--vscode-foreground);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.active {
  border-bottom-color: var(--vscode-focusBorder);
  color: var(--vscode-textLink-foreground);
}

.database-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.database-card {
  padding: 14px;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: border-color 0.2s;
}

.database-card:hover {
  border-color: var(--vscode-focusBorder);
}

.database-icon {
  font-size: 24px;
}

.database-name {
  font-weight: 600;
}

.table-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.table-item:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.table-icon {
  font-size: 18px;
  width: 22px;
  text-align: center;
}

.table-info {
  flex: 1;
}

.table-name {
  font-weight: 500;
}

.table-comment {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.table-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-top: 2px;
}

.table-type {
  padding: 2px 8px;
  border-radius: 12px;
  background-color: var(--vscode-badge-background);
  font-size: 11px;
}

.table-type.view {
  background-color: var(--vscode-gitDecoration-modifiedResourceForeground);
  color: #fff;
}

.table-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.table-item:hover .table-actions {
  opacity: 1;
}

.action-btn {
  padding: 3px 8px;
  font-size: 12px;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-btn:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 70px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 14px;
  opacity: 0.3;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}

.empty-text {
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--vscode-descriptionForeground);
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid var(--vscode-progressBar-background);
  border-top-color: var(--vscode-progressBar-foreground);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
