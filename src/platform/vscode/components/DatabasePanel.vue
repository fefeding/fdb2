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
          <h3 class="section-title">表 ({{ tables.length }})</h3>
          <div class="table-list">
            <div v-for="table in tables" :key="table.name" class="table-item">
              <div class="table-icon">📋</div>
              <div class="table-info">
                <div class="table-name">{{ table.name }}</div>
                <div v-if="table.comment" class="table-comment">{{ table.comment }}</div>
                <div v-if="table.rowCount !== undefined && table.rowCount !== null" class="table-meta">
                  <span>{{ formatNumber(table.rowCount) }} 行</span>
                  <span v-if="table.dataSize">{{ formatSize(table.dataSize) }}</span>
                  <span v-if="table.engine">{{ table.engine }}</span>
                </div>
              </div>
              <div class="table-actions">
                <button class="action-btn" @click.stop="viewData(table)">数据</button>
                <button class="action-btn" @click.stop="viewStructure(table)">结构</button>
              </div>
            </div>
            <div v-if="tables.length === 0" class="empty-text">该数据库下没有表</div>
          </div>
        </div>

        <div v-show="currentTab === 'views'" class="tab-content">
          <div class="section-subtitle">
            当前数据库：<strong>{{ currentDatabase }}</strong>
            <button class="btn btn-link" @click="currentTab = 'databases'">切换</button>
          </div>
          <h3 class="section-title">视图 ({{ views.length }})</h3>
          <div class="table-list">
            <div v-for="view in views" :key="view.name" class="table-item">
              <div class="table-icon">👁️</div>
              <div class="table-info">
                <div class="table-name">{{ view.name }}</div>
                <div v-if="view.comment" class="table-comment">{{ view.comment }}</div>
              </div>
              <div class="table-actions">
                <button class="action-btn" @click.stop="viewData(view)">数据</button>
              </div>
            </div>
            <div v-if="views.length === 0" class="empty-text">该数据库下没有视图</div>
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
import { ref, computed, onMounted } from 'vue';
import { getVSCodeBridge } from '../bridge';
import { pickTables } from '@/platform/database/utils/table';

const vscode = getVSCodeBridge();

const connections = ref<any[]>([]);
const selectedConnectionId = ref('');
const databases = ref<string[]>([]);
// getTables 返回的是「表 + 视图」的混合列表，这里按 TableEntity.type 拆开，
// 与工作台的数据库详情页保持一致：表只放表，视图单独一个标签页。
const rawTables = ref<any[]>([]);
const views = ref<any[]>([]);
const loading = ref(false);
const currentTab = ref('databases');
const currentDatabase = ref('');

const tables = computed(() => pickTables(rawTables.value));

const tabs = [
  { id: 'databases', name: '数据库' },
  { id: 'tables', name: '表' },
  { id: 'views', name: '视图' },
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
      rawTables.value = message.data || [];
      loading.value = false;
      currentTab.value = 'tables';
      loadViews();
    } else if (message.command === 'views') {
      views.value = message.data || [];
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
    rawTables.value = [];
    views.value = [];
  }
}

function loadDatabases(id: string) {
  loading.value = true;
  currentDatabase.value = '';
  rawTables.value = [];
  views.value = [];
  vscode.postMessage({ command: 'getDatabases', data: { id } });
}

function selectDatabase(db: string) {
  if (!selectedConnectionId.value) return;
  currentDatabase.value = db;
  loading.value = true;
  rawTables.value = [];
  views.value = [];
  vscode.postMessage({
    command: 'getTables',
    data: { id: selectedConnectionId.value, database: db }
  });
}

/** 视图走独立接口：方言的 getTables 对视图的支持并不一致，混在一起容易漏 */
function loadViews() {
  if (!selectedConnectionId.value || !currentDatabase.value) return;
  vscode.postMessage({
    command: 'getViews',
    data: { id: selectedConnectionId.value, database: currentDatabase.value }
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
  return Number(n || 0).toLocaleString();
}

function formatSize(bytes: number): string {
  const b = Number(bytes || 0);
  if (b <= 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(k)));
  return `${(b / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
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
  border-bottom: 1px solid var(--dbt-panel-border);
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
  border: 1px solid var(--dbt-input-border);
  background-color: var(--dbt-input-background);
  color: var(--dbt-input-foreground);
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
  background-color: var(--dbt-button-background);
  color: var(--dbt-button-foreground);
}

.btn-secondary {
  background-color: var(--dbt-button-secondaryBackground);
  color: var(--dbt-button-secondaryForeground);
}

.btn-link {
  background: none;
  border: none;
  color: var(--dbt-textLink-foreground);
  cursor: pointer;
  padding: 0 6px;
  font-size: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 18px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--dbt-panel-border);
}

.section-subtitle {
  font-size: 13px;
  margin: 8px 0;
  color: var(--dbt-descriptionForeground);
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--dbt-panel-border);
}

.tab {
  padding: 7px 16px;
  border: none;
  background-color: transparent;
  color: var(--dbt-foreground);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.active {
  border-bottom-color: var(--dbt-focusBorder);
  color: var(--dbt-textLink-foreground);
}

.database-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.database-card {
  padding: 14px;
  background-color: var(--dbt-editor-background);
  border: 1px solid var(--dbt-panel-border);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: border-color 0.2s;
}

.database-card:hover {
  border-color: var(--dbt-focusBorder);
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
  background-color: var(--dbt-list-hoverBackground);
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
  color: var(--dbt-descriptionForeground);
}

.table-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--dbt-descriptionForeground);
  margin-top: 2px;
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
  background-color: var(--dbt-button-secondaryBackground);
  color: var(--dbt-button-secondaryForeground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-btn:hover {
  background-color: var(--dbt-button-secondaryHoverBackground);
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
  color: var(--dbt-descriptionForeground);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--dbt-descriptionForeground);
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid var(--dbt-progressBar-background);
  border-top-color: var(--dbt-progressBar-foreground);
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
