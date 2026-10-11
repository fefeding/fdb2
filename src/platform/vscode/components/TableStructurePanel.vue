<template>
  <div class="structure-panel">
    <div class="toolbar">
      <div class="toolbar-title">
        结构：<strong>{{ table }}</strong>
        <span class="muted">（{{ database }}）</span>
      </div>
      <button class="btn btn-secondary" @click="load">刷新</button>
    </div>

    <div class="content" v-if="!loading">
      <div v-if="error" class="error">{{ error }}</div>

      <template v-else>
        <h3 class="section-title">列 (Columns)</h3>
        <div class="table-wrap" v-if="columns.length">
          <table class="data-table">
            <thead>
              <tr>
                <th>列名</th>
                <th>类型</th>
                <th>可空</th>
                <th>键</th>
                <th>默认值</th>
                <th>注释</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="col in columns" :key="col.name">
                <td>{{ col.name }}</td>
                <td>{{ col.type }}</td>
                <td>{{ col.nullable === false || col.notNull ? 'NO' : 'YES' }}</td>
                <td>{{ col.isPrimary ? 'PK' : col.isUnique ? 'UNIQUE' : '' }}</td>
                <td>{{ formatValue(col.defaultValue) }}</td>
                <td>{{ col.comment || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty">无列信息</div>

        <h3 class="section-title">索引 (Indexes)</h3>
        <div class="table-wrap" v-if="indexes.length">
          <table class="data-table">
            <thead>
              <tr><th>索引名</th><th>类型</th><th>列</th><th>唯一</th></tr>
            </thead>
            <tbody>
              <tr v-for="idx in indexes" :key="idx.name">
                <td>{{ idx.name }}</td>
                <td>{{ idx.type }}</td>
                <td>{{ (idx.columns || []).join(', ') }}</td>
                <td>{{ idx.unique ? 'YES' : 'NO' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty">无索引信息</div>

        <h3 class="section-title">外键 (Foreign Keys)</h3>
        <div class="table-wrap" v-if="foreignKeys.length">
          <table class="data-table">
            <thead>
              <tr><th>列</th><th>引用表</th><th>引用列</th></tr>
            </thead>
            <tbody>
              <tr v-for="(fk, i) in foreignKeys" :key="i">
                <td>{{ fk.column }}</td>
                <td>{{ fk.referencedTable }}</td>
                <td>{{ fk.referencedColumn }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty">无外键信息</div>
      </template>
    </div>

    <div v-else class="loading">
      <div class="spinner"></div>
      <div>加载中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getVSCodeBridge } from '../bridge';

const vscode = getVSCodeBridge();

const connectionId = ref('');
const database = ref('');
const table = ref('');

const columns = ref<any[]>([]);
const indexes = ref<any[]>([]);
const foreignKeys = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

onMounted(() => {
  vscode.postMessage({ command: 'ready' });
  vscode.onMessage((message: any) => {
    if (message.command === 'init') {
      connectionId.value = message.data.connectionId;
      database.value = message.data.database;
      table.value = message.data.table;
      load();
    } else if (message.command === 'tableInfo') {
      const info = message.data || {};
      columns.value = info.columns || [];
      indexes.value = info.indexes || [];
      foreignKeys.value = info.foreignKeys || [];
      loading.value = false;
      error.value = '';
    } else if (message.command === 'error') {
      loading.value = false;
      error.value = '加载失败: ' + message.data;
    }
  });
});

function load() {
  if (!connectionId.value) return;
  loading.value = true;
  error.value = '';
  vscode.postMessage({
    command: 'getTableInfo',
    data: {
      id: connectionId.value,
      database: database.value,
      table: table.value
    }
  });
}

function formatValue(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}
</script>

<style scoped>
.structure-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: var(--dbt-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--dbt-panel-border);
}

.toolbar-title {
  font-size: 14px;
}

.muted {
  color: var(--dbt-descriptionForeground);
  font-weight: 400;
}

.btn {
  padding: 5px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background-color: var(--dbt-button-secondaryBackground);
  color: var(--dbt-button-secondaryForeground);
}

.content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 18px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--dbt-panel-border);
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

.empty {
  padding: 8px 0;
  color: var(--dbt-descriptionForeground);
  font-size: 12px;
}

.error {
  color: var(--dbt-errorForeground);
  padding: 12px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px;
  color: var(--dbt-descriptionForeground);
}

.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid var(--dbt-progressBar-background);
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
</style>
