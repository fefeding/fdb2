<template>
  <div class="database-panel">
    <div class="panel-header">
      <h1 class="panel-title">数据库管理</h1>
      <div class="panel-actions">
        <button @click="handleAddConnection" class="btn btn-secondary">添加连接</button>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <select v-model="selectedConnectionId" class="connection-selector" @change="handleConnectionChange">
        <option value="">选择数据库连接</option>
        <option v-for="conn in connections" :key="conn.id" :value="conn.id">
          {{ conn.name }} ({{ conn.host }}:{{ conn.port }})
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
        <div class="empty-text">请从下拉列表中选择一个数据库连接</div>
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

        <div v-show="currentTab === 'overview'" class="tab-content active">
          <h3 class="section-title">数据库概览</h3>
          <div class="database-grid">
            <div
              v-for="db in databases"
              :key="db.name"
              class="database-card"
              @click="selectDatabase(db)"
            >
              <div class="database-header">
                <div class="database-icon">🗄️</div>
                <div class="database-name">{{ db.name }}</div>
              </div>
              <div class="database-info">
                <span class="database-stat">📊 {{ db.tables }} 表</span>
                <span class="database-stat">💾 {{ db.size }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-show="currentTab === 'databases'" class="tab-content">
          <h3 class="section-title">数据库列表</h3>
          <div class="database-grid">
            <div
              v-for="db in databases"
              :key="db.name"
              class="database-card"
              @click="selectDatabase(db)"
            >
              <div class="database-header">
                <div class="database-icon">🗄️</div>
                <div class="database-name">{{ db.name }}</div>
              </div>
              <div class="database-info">
                <span class="database-stat">📊 {{ db.tables }} 表</span>
                <span class="database-stat">💾 {{ db.size }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-show="currentTab === 'tables'" class="tab-content">
          <h3 class="section-title">表列表</h3>
          <div class="table-list">
            <div
              v-for="table in tables"
              :key="table.name"
              class="table-item"
            >
              <div class="table-icon">{{ table.type === 'table' ? '📋' : '👁️' }}</div>
              <div class="table-info">
                <div class="table-name">{{ table.name }}</div>
                <div v-if="table.comment" class="table-comment">{{ table.comment }}</div>
                <div v-if="table.rows !== null" class="table-meta">
                  <span>{{ table.rows.toLocaleString() }} 行</span>
                  <span>{{ table.engine || '' }}</span>
                  <span>{{ table.size || '' }}</span>
                </div>
              </div>
              <span :class="['table-type', table.type]">{{ table.type === 'table' ? 'TABLE' : 'VIEW' }}</span>
              <div class="table-actions">
                <button class="action-btn" @click.stop="handleViewData(table)">数据</button>
                <button class="action-btn" @click.stop="handleViewStructure(table)">结构</button>
              </div>
            </div>
          </div>
        </div>
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
const databases = ref<any[]>([]);
const tables = ref<any[]>([]);
const loading = ref(false);
const currentTab = ref('overview');

const selectedConnection = computed(() => {
  return connections.value.find(c => c.id === selectedConnectionId.value);
});

const tabs = [
  { id: 'overview', name: '概览' },
  { id: 'databases', name: '数据库' },
  { id: 'tables', name: '表' }
];

onMounted(() => {
  // 请求连接列表
  vscode.postMessage({ command: 'getConnections' });

  // 监听来自扩展的消息
  vscode.onMessage((message: any) => {
    if (message.command === 'connections') {
      connections.value = message.data;
    } else if (message.command === 'selectConnection') {
      selectConnection(message.data);
    } else if (message.command === 'databases') {
      databases.value = message.data;
      loading.value = false;
    } else if (message.command === 'tables') {
      tables.value = message.data;
      loading.value = false;
    } else if (message.command === 'error') {
      handleError(message.data);
    }
  });
});

function handleAddConnection() {
  vscode.postMessage({ command: 'addConnection' });
}

function handleConnectionChange() {
  if (selectedConnectionId.value) {
    const connection = connections.value.find(c => c.id === selectedConnectionId.value);
    selectConnection(connection);
  } else {
    databases.value = [];
    tables.value = [];
  }
}

function selectConnection(connection: any) {
  if (!connection) return;

  selectedConnectionId.value = connection.id;
  loading.value = true;

  // 请求数据库列表
  vscode.postMessage({
    command: 'getDatabases',
    data: { connectionId: connection.id }
  });
}

function selectDatabase(database: any) {
  loading.value = true;
  currentTab.value = 'tables';

  // 请求表列表
  vscode.postMessage({
    command: 'getTables',
    data: {
      connectionId: selectedConnectionId.value,
      databaseName: database.name
    }
  });
}

function handleViewData(table: any) {
  vscode.postMessage({
    command: 'openTableData',
    data: {
      connectionId: selectedConnectionId.value,
      tableName: table.name
    }
  });
}

function handleViewStructure(table: any) {
  vscode.postMessage({
    command: 'openTableStructure',
    data: {
      connectionId: selectedConnectionId.value,
      tableName: table.name
    }
  });
}

function handleError(error: string) {
  loading.value = false;
  console.error('Error:', error);
  alert(`操作失败: ${error}`);
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
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--vscode-foreground);
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.connection-selector {
  width: 300px;
  padding: 6px 10px;
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 4px;
  font-size: 13px;
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

.database-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.database-card {
  padding: 16px;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.database-card:hover {
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.database-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.database-icon {
  font-size: 28px;
  color: var(--vscode-textLink-foreground);
}

.database-name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.database-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.database-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vscode-panel-border);
  color: var(--vscode-foreground);
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.tab {
  padding: 8px 16px;
  border: none;
  background-color: transparent;
  color: var(--vscode-foreground);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.tab.active {
  border-bottom-color: var(--vscode-focusBorder);
  color: var(--vscode-textLink-foreground);
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
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
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.table-item:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.table-icon {
  font-size: 20px;
  color: var(--vscode-textLink-foreground);
  width: 24px;
  text-align: center;
}

.table-info {
  flex: 1;
}

.table-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--vscode-foreground);
}

.table-comment {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.table-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-top: 4px;
}

.table-type {
  padding: 2px 8px;
  border-radius: 12px;
  background-color: var(--vscode-badge-background);
  font-weight: 500;
  font-size: 12px;
}

.table-type.table {
  background-color: var(--vscode-badge-background);
}

.table-type.view {
  background-color: var(--vscode-gitDecorationModifiedResourceForeground);
  color: white;
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
  padding: 4px 8px;
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
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--vscode-foreground);
}

.empty-text {
  font-size: 14px;
  color: var(--vscode-descriptionForeground);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vscode-progressBar-background);
  border-top-color: var(--vscode-progressBar-foreground);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
