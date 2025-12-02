<template>
  <div class="container-fluid py-4">
    <!-- 连接选择器 -->
    <div class="row mb-4">
      <div class="col-md-6">
        <label class="form-label">选择数据库连接</label>
        <select class="form-select" v-model="selectedConnectionId">
          <option value="">请选择连接</option>
          <option v-for="conn in connections" :key="conn.id" :value="conn.id">
            {{ conn.name }} ({{ getDbTypeLabel(conn.type) }})
          </option>
        </select>
      </div>
      <div class="col-md-6 d-flex align-items-end">
        <button class="btn btn-primary me-2" @click="executeQuery" :disabled="!canExecute">
          <i class="bi bi-play-fill"></i> 执行查询
        </button>
        <button class="btn btn-outline-secondary me-2" @click="formatSQL">
          <i class="bi bi-code-slash"></i> 格式化
        </button>
        <button class="btn btn-outline-secondary" @click="clearEditor">
          <i class="bi bi-trash"></i> 清空
        </button>
      </div>
    </div>

    <!-- SQL编辑器 -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">SQL查询编辑器</h5>
          </div>
          <div class="card-body p-0">
            <div class="sql-editor">
              <textarea
                ref="sqlEditor"
                v-model="sqlQuery"
                class="form-control border-0"
                rows="12"
                placeholder="在此输入SQL查询语句..."
                @keydown="handleKeyDown"
              ></textarea>
              <div class="editor-status">
                <span class="text-muted">行: {{ currentLine }}, 列: {{ currentColumn }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 查询结果 -->
    <div v-if="queryResult" class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="bi bi-table"></i> 查询结果
              <span class="badge bg-success ms-2" v-if="queryResult.success">成功</span>
              <span class="badge bg-danger ms-2" v-else>失败</span>
            </h5>
            <div v-if="queryResult.success && queryResult.data">
              <button class="btn btn-sm btn-outline-primary" @click="exportData('json')">
                <i class="bi bi-download"></i> 导出JSON
              </button>
            </div>
          </div>
          
          <!-- 成功结果 -->
          <div v-if="queryResult.success" class="card-body">
            <div v-if="queryResult.data && Array.isArray(queryResult.data) && queryResult.data.length > 0">
              <div class="alert alert-info">
                查询成功，共 {{ queryResult.data.length }} 条记录
              </div>
              <div class="table-responsive">
                <table class="table table-striped table-hover">
                  <thead class="table-dark sticky-top">
                    <tr>
                      <th>#</th>
                      <th v-for="column in Object.keys(queryResult.data[0])" :key="column">
                        {{ column }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in queryResult.data" :key="index">
                      <td class="text-muted">{{ index + 1 }}</td>
                      <td v-for="column in Object.keys(row)" :key="column">
                        <code v-if="row[column] === null" class="text-muted">NULL</code>
                        <span v-else>{{ row[column] }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div v-else-if="queryResult.affectedRows !== undefined" class="alert alert-success">
              语句执行成功，影响 {{ queryResult.affectedRows }} 行
            </div>
            
            <div v-else class="alert alert-warning">
              查询执行成功，但无返回数据
            </div>
          </div>
          
          <!-- 错误结果 -->
          <div v-else class="card-body">
            <div class="alert alert-danger">
              <h6>查询执行失败</h6>
              <pre>{{ queryResult.error }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { ConnectionService, DatabaseService } from '@/service/database';
import type { ConnectionEntity } from '@/typings/database';

const connectionService = new ConnectionService();
const databaseService = new DatabaseService();

// 响应式数据
const connections = ref<ConnectionEntity[]>([]);
const selectedConnectionId = ref('');
const sqlQuery = ref('');
const queryResult = ref<any>(null);
const currentLine = ref(1);
const currentColumn = ref(1);
const sqlEditor = ref<HTMLTextAreaElement>();

// 计算属性
const canExecute = computed(() => {
  return selectedConnectionId.value && sqlQuery.value.trim() !== '';
});

// 生命周期
onMounted(async () => {
  await loadConnections();
  
  // 监听编辑器输入
  if (sqlEditor.value) {
    sqlEditor.value.addEventListener('input', updateCursorPosition);
    sqlEditor.value.addEventListener('click', updateCursorPosition);
    sqlEditor.value.addEventListener('keyup', updateCursorPosition);
  }
});

// 加载连接列表
async function loadConnections() {
  try {
    const response = await connectionService.getAllConnections();
    connections.value = response.data || [];
  } catch (error) {
    console.error('加载连接列表失败:', error);
  }
}

// 执行查询
async function executeQuery() {
  if (!canExecute.value) return;

  try {
    const response = await databaseService.executeQuery(selectedConnectionId.value, sqlQuery.value);
    queryResult.value = response;
  } catch (error) {
    queryResult.value = {
      success: false,
      error: error.message
    };
  }
}

// 格式化SQL
function formatSQL() {
  let formatted = sqlQuery.value
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',\n  ')
    .replace(/\s+(FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT|LEFT JOIN|INNER JOIN|OUTER JOIN)\s+/gi, '\n$1 ')
    .replace(/\s+(AND|OR)\s+/gi, '\n  $1 ')
    .trim();

  sqlQuery.value = formatted;
  updateCursorPosition();
}

// 清空编辑器
function clearEditor() {
  if (confirm('确定要清空SQL编辑器吗？')) {
    sqlQuery.value = '';
    queryResult.value = null;
    updateCursorPosition();
  }
}

// 导出数据
function exportData(format: string) {
  if (!queryResult.value?.data) return;

  const data = queryResult.value.data;
  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    filename = 'query-result.json';
    mimeType = 'application/json';
  } else {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 更新光标位置
function updateCursorPosition() {
  if (!sqlEditor.value) return;

  const text = sqlEditor.value.value;
  const selectionStart = sqlEditor.value.selectionStart;
  
  const lines = text.substring(0, selectionStart).split('\n');
  currentLine.value = lines.length;
  currentColumn.value = lines[lines.length - 1].length + 1;
}

// 键盘事件处理
function handleKeyDown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    executeQuery();
  }
}

// 获取数据库类型标签
function getDbTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    mysql: 'MySQL',
    postgres: 'PostgreSQL',
    sqlite: 'SQLite',
    mssql: 'SQL Server',
    oracle: 'Oracle'
  };
  return labelMap[type] || type;
}
</script>

<style scoped>
.sql-editor {
  position: relative;
}

.sql-editor textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 300px;
}

.editor-status {
  position: absolute;
  bottom: 10px;
  right: 15px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 8px;
  border-radius: 4px;
  pointer-events: none;
}

.table th {
  position: sticky;
  top: 0;
  z-index: 10;
}

.table-responsive {
  max-height: 500px;
  overflow-y: auto;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>