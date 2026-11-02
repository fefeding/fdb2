<template>
  <div class="table-data-panel">
    <div class="toolbar">
      <div class="toolbar-title">
        数据：<strong>{{ table }}</strong>
        <span class="muted">（{{ database }}）</span>
      </div>
      <div class="tabs">
        <button :class="['tab', { active: tab === 'data' }]" @click="tab = 'data'">数据</button>
        <button :class="['tab', { active: tab === 'structure' }]" @click="tab = 'structure'">结构</button>
      </div>
      <div class="toolbar-actions">
        <template v-if="tab === 'data'">
          <input
            v-model="where"
            class="where-input"
            :placeholder="wherePlaceholder"
            @keyup.enter="loadData(1)"
          />
          <button class="btn btn-secondary" @click="loadData(1)">筛选</button>
          <button class="btn btn-secondary" @click="refresh">刷新</button>
          <button class="btn btn-secondary" @click="prevPage" :disabled="page <= 1">上一页</button>
          <span class="page-info">第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 行）</span>
          <button class="btn btn-secondary" @click="nextPage" :disabled="page >= totalPages">下一页</button>
        </template>
        <template v-else>
          <button class="btn btn-secondary" @click="loadStructure">刷新</button>
        </template>
      </div>
    </div>

    <div class="content">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <div>加载中...</div>
      </div>

      <template v-else-if="tab === 'data'">
        <div v-if="loadError" class="error">{{ loadError }}</div>
        <!-- 文档型（MongoDB）：按 JSON 文档渲染，保留嵌套结构 -->
        <div v-else-if="isDocDb" class="doc-list">
          <div v-if="documents.length === 0" class="empty">暂无文档</div>
          <div v-for="(doc, idx) in documents" :key="doc._id || idx" class="doc-card">
            <div class="doc-head">
              <span class="doc-id">_id: {{ doc._id }}</span>
              <template v-if="editingDocId === doc._id">
                <button class="btn btn-sm btn-secondary" @click="formatDoc">格式化</button>
                <button class="btn btn-sm btn-primary" @click="saveDoc(doc)">保存</button>
                <button class="btn btn-sm btn-secondary" @click="cancelEdit">取消</button>
              </template>
              <template v-else>
                <button class="btn btn-sm btn-secondary" @click="editDoc(doc)">编辑</button>
                <button class="btn btn-sm btn-danger" @click="deleteDoc(doc)">删除</button>
              </template>
            </div>
            <!-- webview 内 prompt 不可用，改为内联 JSON 编辑 -->
            <textarea
              v-if="editingDocId === doc._id"
              class="doc-editor"
              rows="12"
              v-model="editingDocJson"
            ></textarea>
            <pre v-else class="doc-json">{{ JSON.stringify(doc, null, 2) }}</pre>
            <div v-if="docError" class="error">{{ docError }}</div>
          </div>
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
      </template>

      <template v-else>
        <div v-if="structError" class="error">{{ structError }}</div>
        <template v-else>
          <h3 class="section-title">列 (Columns)</h3>
          <div class="table-wrap" v-if="columns2.length">
            <table class="data-table">
              <thead>
                <tr>
                  <th>列名</th><th>类型</th><th>可空</th><th>键</th><th>默认值</th><th>注释</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="col in columns2" :key="col.name">
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
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getVSCodeBridge } from '../bridge';
import { isDocumentDb } from '@/typings/database-types';
import { toast } from '@/utils/toast';

const vscode = getVSCodeBridge();

const connectionId = ref('');
const database = ref('');
const table = ref('');
// 连接类型：由宿主随 init 下发，用于判断是否文档模式（MongoDB）
const dbType = ref('');
const isDocDb = computed(() => isDocumentDb(dbType.value));
// 占位提示按数据模型区分：文档型用 JSON 过滤条件，关系型用 SQL WHERE
const wherePlaceholder = computed(() =>
  isDocDb.value ? 'JSON 过滤条件，例如 {"status":"active"}' : 'WHERE 条件，例如 age > 18'
);

const tab = ref<'data' | 'structure'>('data');

// 数据
const columns = ref<string[]>([]);
const rows = ref<any[]>([]);
// 文档型（MongoDB）原始文档
const documents = ref<any[]>([]);
// 内联 JSON 编辑态
const editingDocId = ref('');
const editingDocJson = ref('');
const docError = ref('');
const total = ref(0);
const page = ref(1);
const pageSize = ref(100);
const where = ref('');
const loading = ref(false);

// 结构
const columns2 = ref<any[]>([]);
const indexes = ref<any[]>([]);
const foreignKeys = ref<any[]>([]);
const structError = ref('');
// 数据加载错误（与结构错误分开，避免吞错）
const loadError = ref('');

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

onMounted(() => {
  vscode.postMessage({ command: 'ready' });
  vscode.onMessage((message: any) => {
    if (message.command === 'init') {
      connectionId.value = message.data.connectionId;
      database.value = message.data.database;
      table.value = message.data.table;
      dbType.value = message.data.type || '';
      loadData(1);
      loadStructure();
    } else if (message.command === 'documents') {
      const d = message.data;
      documents.value = d.documents || [];
      total.value = d.total || 0;
      page.value = d.page || 1;
      pageSize.value = d.pageSize || 100;
      loadError.value = '';
      loading.value = false;
    } else if (message.command === 'tableData') {
      const d = message.data;
      columns.value = d.columns || [];
      rows.value = d.rows || [];
      total.value = d.total || 0;
      page.value = d.page || 1;
      pageSize.value = d.pageSize || 100;
      loadError.value = '';
      loading.value = false;
    } else if (message.command === 'tableInfo') {
      const info = message.data || {};
      columns2.value = info.columns || [];
      indexes.value = info.indexes || [];
      foreignKeys.value = info.foreignKeys || [];
    } else if (message.command === 'error') {
      loading.value = false;
      const msg = '加载失败: ' + message.data;
      structError.value = msg;
      loadError.value = msg;
    } else if (message.command === 'documentSaved') {
      // 文档新增/更新/删除的宿主回执：用 toast 反馈，避免再弹 modal 与确认框叠加
      const res = message.data || {};
      if (res.ret === 0) {
        toast.success(res.msg || '操作成功');
        loadData(page.value);
      } else {
        toast.error(res.msg || '操作失败');
      }
    }
  });
});

function loadData(p: number) {
  if (!connectionId.value) return;
  loading.value = true;
  loadError.value = '';
  vscode.postMessage({
    command: 'getTableData',
    data: {
      id: connectionId.value,
      database: database.value,
      table: table.value,
      page: p,
      pageSize: pageSize.value,
      where: where.value || undefined,
      // 文档型：要求宿主返回原始文档而不是 columns/rows 扁平结构
      ...(isDocDb.value ? { document: true } : {})
    }
  });
}

// ---- 文档型（MongoDB）编辑/删除：按 _id 定位 ----
function editDoc(doc: any) {
  editingDocId.value = String(doc._id);
  editingDocJson.value = JSON.stringify(doc, null, 2);
  docError.value = '';
}

function cancelEdit() {
  editingDocId.value = '';
  editingDocJson.value = '';
  docError.value = '';
}

function formatDoc() {
  try {
    editingDocJson.value = JSON.stringify(JSON.parse(editingDocJson.value), null, 2);
    docError.value = '';
  } catch (e: any) {
    docError.value = 'JSON 格式错误：' + (e?.message || e);
  }
}

function saveDoc(doc: any) {
  let parsed: any;
  try {
    parsed = JSON.parse(editingDocJson.value);
  } catch (e: any) {
    docError.value = 'JSON 格式错误：' + (e?.message || e);
    return;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    docError.value = '请提供一个 JSON 对象';
    return;
  }
  docError.value = '';
  vscode.postMessage({
    command: 'updateDocument',
    data: {
      id: connectionId.value,
      database: database.value,
      table: table.value,
      docId: String(doc._id),
      data: parsed
    }
  });
  cancelEdit();
  // 成功/失败由宿主回传的 documentSaved 消息处理（toast 反馈 + 列表刷新）
}

function deleteDoc(doc: any) {
  if (!window.confirm('确认删除该文档？')) return;
  vscode.postMessage({
    command: 'deleteDocument',
    data: {
      id: connectionId.value,
      database: database.value,
      table: table.value,
      docId: String(doc._id)
    }
  });
  // 成功/失败由宿主回传的 documentSaved 消息处理（toast 反馈 + 列表刷新）
}

function loadStructure() {
  if (!connectionId.value) return;
  vscode.postMessage({
    command: 'getTableInfo',
    data: {
      id: connectionId.value,
      database: database.value,
      table: table.value
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

function formatValue(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
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

.tabs {
  display: flex;
  gap: 4px;
}

.tab {
  padding: 4px 14px;
  border: 1px solid var(--dbt-panel-border);
  border-radius: 4px;
  background: transparent;
  color: var(--dbt-foreground);
  font-size: 12px;
  cursor: pointer;
}

.tab.active {
  background-color: var(--dbt-button-background);
  color: var(--dbt-button-foreground);
  border-color: var(--dbt-button-background);
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
  border: 1px solid var(--dbt-input-border);
  background-color: var(--dbt-input-background);
  color: var(--dbt-input-foreground);
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
  background-color: var(--dbt-button-secondaryBackground);
  color: var(--dbt-button-secondaryForeground);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: var(--dbt-descriptionForeground);
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

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 18px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--dbt-panel-border);
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px;
  color: var(--dbt-descriptionForeground);
}

.error {
  color: var(--dbt-errorForeground);
  padding: 12px;
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

/* 文档型（MongoDB）：JSON 文档卡片 */
.doc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.doc-card {
  border: 1px solid var(--dbt-panel-border, rgba(128, 128, 128, 0.35));
  border-radius: 4px;
  padding: 8px 10px;
}
.doc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.doc-id {
  font-family: var(--dbt-editor-font-family, monospace);
  font-size: 12px;
  opacity: 0.8;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.doc-json,
.doc-editor {
  margin: 0;
  font-family: var(--dbt-editor-font-family, monospace);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
.doc-editor {
  width: 100%;
  box-sizing: border-box;
  background: var(--dbt-input-background, inherit);
  color: var(--dbt-input-foreground, inherit);
  border: 1px solid var(--dbt-panel-border, rgba(128, 128, 128, 0.35));
  border-radius: 3px;
  padding: 6px 8px;
}
</style>
