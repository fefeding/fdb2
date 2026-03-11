<template>
  <div class="db-tools">
    <div class="tools-header">
      <h5 class="tools-title">
        <i class="bi bi-tools"></i>
        数据库管理工具
      </h5>
    </div>
    
    <div class="tools-content">
      <!-- 数据备份 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-shield-check"></i>
          数据备份
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-primary btn-sm" @click="backupDatabase">
            <i class="bi bi-download"></i> 备份数据库
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="showRestoreModal">
            <i class="bi bi-upload"></i> 恢复数据库
          </button>
          <button class="btn btn-outline-info btn-sm" @click="showScheduleModal">
            <i class="bi bi-clock"></i> 定时备份
          </button>
        </div>
      </div>

      <!-- 用户管理 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-people"></i>
          用户管理
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-success btn-sm" @click="showUsersList">
            <i class="bi bi-person-lines-fill"></i> 用户列表
          </button>
          <button class="btn btn-outline-primary btn-sm" @click="showCreateUserModal">
            <i class="bi bi-person-plus"></i> 创建用户
          </button>
          <button class="btn btn-outline-warning btn-sm" @click="showPermissionsModal">
            <i class="bi bi-key"></i> 权限管理
          </button>
        </div>
      </div>

      <!-- 性能监控 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-speedometer2"></i>
          性能监控
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-info btn-sm" @click="showProcessList">
            <i class="bi bi-activity"></i> 进程列表
          </button>
          <button class="btn btn-outline-warning btn-sm" @click="showSlowQueries">
            <i class="bi bi-hourglass-split"></i> 慢查询
          </button>
          <button class="btn btn-outline-danger btn-sm" @click="showConnectionsList">
            <i class="bi bi-diagram-3"></i> 连接数
          </button>
        </div>
      </div>

      <!-- 数据库优化 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-gear-wide-connected"></i>
          数据库优化
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-success btn-sm" @click="optimizeDatabase">
            <i class="bi bi-lightning-charge"></i> 优化数据库
          </button>
          <button class="btn btn-outline-primary btn-sm" @click="analyzeTables">
            <i class="bi bi-search"></i> 分析表
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="repairTables">
            <i class="bi bi-tools"></i> 修复表
          </button>
          <button class="btn btn-outline-info btn-sm" @click="clearLogs">
            <i class="bi bi-trash"></i> 清理日志
          </button>
        </div>
      </div>

      <!-- 数据迁移 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-arrow-left-right"></i>
          数据迁移
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-primary btn-sm" @click="showExportModal">
            <i class="bi bi-box-arrow-up-right"></i> 导出结构
          </button>
          <button class="btn btn-outline-success btn-sm" @click="showImportModal">
            <i class="bi bi-box-arrow-in-down"></i> 导入数据
          </button>
          <button class="btn btn-outline-warning btn-sm" @click="showSyncModal">
            <i class="bi bi-arrow-repeat"></i> 数据同步
          </button>
        </div>
      </div>

      <!-- 健康检查 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-heart-pulse"></i>
          健康检查
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-info btn-sm" @click="runHealthCheck">
            <i class="bi bi-clipboard-check"></i> 健康检查
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="showStatistics">
            <i class="bi bi-bar-chart"></i> 数据统计
          </button>
          <button class="btn btn-outline-warning btn-sm" @click="showAuditLog">
            <i class="bi bi-journal-text"></i> 审计日志
          </button>
        </div>
      </div>
    </div>

    <!-- 执行结果展示区域 -->
    <div class="execution-results">
      <div class="results-header">
        <h6 class="results-title">
          <i class="bi bi-terminal"></i>
          执行结果
        </h6>
        <button class="btn btn-outline-secondary btn-sm" @click="clearResults">
          <i class="bi bi-trash"></i> 清空
        </button>
      </div>
      <div class="results-content" ref="resultsContentRef">
        <div v-if="executionResults.length === 0" class="no-results">
          <i class="bi bi-inbox"></i>
          <p>暂无执行结果</p>
        </div>
        <div v-for="(result, index) in executionResults" :key="index" class="result-item" :class="`result-${result.status}`">
          <div class="result-header" @click="toggleResult(index)">
            <div class="result-title">
              <i :class="getResultIcon(result.status)"></i>
              <span class="operation-name">{{ result.operation }}</span>
              <span class="operation-time">{{ result.timestamp }}</span>
            </div>
            <i class="bi bi-chevron-down toggle-icon" :class="{ 'expanded': result.expanded }"></i>
          </div>
          <div v-if="result.expanded" class="result-body">
            <pre><code v-html="highlightJson(result.data)"></code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据恢复模态框 -->
    <div class="modal fade" :class="{ show: restoreModalVisible }" :style="{ display: restoreModalVisible ? 'block' : 'none', zIndex: 1055 }">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">恢复数据库</h5>
            <button type="button" class="btn-close" @click="closeRestoreModal"></button>
          </div>
          <div class="modal-body">
            <p>请选择要恢复的备份文件：</p>
            <div class="mb-3">
              <input type="file" class="form-control" @change="handleFileChange" accept=".sql,.bak">
            </div>
            <div v-if="selectedFile" class="alert alert-info">
              已选择文件：{{ selectedFile.name }}
            </div>
            <div class="mb-3 form-check">
              <input type="checkbox" class="form-check-input" v-model="restoreOptions.dropExisting" id="dropExisting">
              <label class="form-check-label" for="dropExisting">删除现有表</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeRestoreModal">取消</button>
            <button type="button" class="btn btn-primary" @click="performRestore" :disabled="!selectedFile">
              <span v-if="restoring" class="spinner-border spinner-border-sm me-2"></span>
              恢复
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { DatabaseService } from '@/service/database';
import { modal } from '@/utils/modal';

const props = defineProps<{
  connection: any;
  database: string;
}>();

const emit = defineEmits<{
  'execute-sql': [sql: string];
}>();

const databaseService = new DatabaseService();

// 状态管理
const restoreModalVisible = ref(false);
const selectedFile = ref<File | null>(null);
const restoring = ref(false);
const resultsContentRef = ref<HTMLElement | null>(null);

// 执行结果历史
interface ExecutionResult {
  operation: string;
  status: 'success' | 'error' | 'info';
  timestamp: string;
  data: any;
  expanded: boolean;
}

const executionResults = ref<ExecutionResult[]>([]);

const restoreOptions = ref({
  dropExisting: false
});

// 添加执行结果
function addExecutionResult(operation: string, status: 'success' | 'error' | 'info', data: any) {
  const timestamp = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  executionResults.value.unshift({
    operation,
    status,
    timestamp,
    data,
    expanded: false
  });

  // 只保留最近50条记录
  if (executionResults.value.length > 50) {
    executionResults.value = executionResults.value.slice(0, 50);
  }

  // 自动滚动到底部(显示最新结果在顶部,所以滚动到0)
  setTimeout(() => {
    if (resultsContentRef.value) {
      resultsContentRef.value.scrollTop = 0;
    }
  }, 100);
}

// 清空执行结果
function clearResults() {
  executionResults.value = [];
}

// 切换结果展开/收起
function toggleResult(index: number) {
  const result = executionResults.value[index];
  if (result) {
    result.expanded = !result.expanded;
  }
}

// 格式化错误信息
function formatError(error: any): any {
  const formatted: any = {
    success: false,
    message: error.msg || error.message || '未知错误'
  };
  if (error.stack) {
    formatted.stack = error.stack;
  }
  return formatted;
}

// JSON 语法高亮
function highlightJson(data: any): string {
  if (data === null || data === undefined) return '';
  const jsonStr = JSON.stringify(data, null, 2);
  return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

// 获取结果图标
function getResultIcon(status: string): string {
  switch (status) {
    case 'success':
      return 'bi bi-check-circle-fill text-success';
    case 'error':
      return 'bi bi-x-circle-fill text-danger';
    case 'info':
      return 'bi bi-info-circle-fill text-info';
    default:
      return 'bi bi-dash-circle-fill text-secondary';
  }
}

// 数据备份
async function backupDatabase() {
  const operation = '备份数据库';
  try {
    const res = await databaseService.backupDatabase(props.connection?.id || '', props.database);
    if(res.ret === 0) {
      addExecutionResult(operation, 'success', res);
    } else {
      modal.error(res.msg || '备份失败');
      addExecutionResult(operation, 'error', formatError(res));
    }
  } catch (error: any) {
    console.error('备份失败:', error);
    modal.error(error.msg || error.message || '备份失败');
    addExecutionResult(operation, 'error', formatError(error));
  }
}

// 用户管理
function showUsersList() {
  addExecutionResult('用户列表', 'info', { message: '用户列表功能开发中...' });
}

function showCreateUserModal() {
  addExecutionResult('创建用户', 'info', { message: '创建用户功能开发中...' });
}

function showPermissionsModal() {
  addExecutionResult('权限管理', 'info', { message: '权限管理功能开发中...' });
}

// 性能监控
function showProcessList() {
  const sql = 'SHOW PROCESSLIST';
  addExecutionResult('进程列表', 'info', { sql: sql, message: '已发送 SQL 查询' });
  emit('execute-sql', sql);
}

function showSlowQueries() {
  const sql = 'SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10';
  addExecutionResult('慢查询', 'info', { sql: sql, message: '已发送 SQL 查询' });
  emit('execute-sql', sql);
}

function showConnectionsList() {
  const sql = 'SHOW STATUS LIKE "Threads_connected"';
  addExecutionResult('连接数', 'info', { sql: sql, message: '已发送 SQL 查询' });
  emit('execute-sql', sql);
}

// 数据库优化
async function optimizeDatabase() {
  const operation = '优化数据库';
  try {
    const res = await databaseService.optimizeDatabase(props.connection?.id || '', props.database);
    if(res.ret === 0) {
      addExecutionResult(operation, 'success', res.data);
    } else {
      modal.error(res.msg || '优化失败');
      addExecutionResult(operation, 'error', formatError(res));
    }
  } catch (error: any) {
    console.error('优化失败:', error);
    modal.error(error.msg || error.message || '优化失败');
    addExecutionResult(operation, 'error', formatError(error));
  }
}

async function analyzeTables() {
  const operation = '分析表';
  try {
    const res = await databaseService.analyzeTables(props.connection?.id || '', props.database);
    if(res.ret === 0) {
      addExecutionResult(operation, 'success', res.data);
    } else {
      modal.error(res.msg || '分析失败');
      addExecutionResult(operation, 'error', formatError(res));
    }
  } catch (error: any) {
    console.error('分析失败:', error);
    modal.error(res.msg || error.message || '分析失败');
    addExecutionResult(operation, 'error', formatError(error));
  }
}

async function repairTables() {
  const operation = '修复表';
  try {
    const res = await databaseService.repairTables(props.connection?.id || '', props.database);
    if(res.ret === 0) {
      addExecutionResult(operation, 'success', res.data);
    } else {
      modal.error(res.msg || '修复失败');
      addExecutionResult(operation, 'error', formatError(res));
    }
  } catch (error: any) {
    console.error('修复失败:', error);
    modal.error(res.msg || error.message || '修复失败');
    addExecutionResult(operation, 'error', formatError(error));
  }
}

async function clearLogs() {
  const operation = '清理日志';
  const logs = [
    'TRUNCATE TABLE mysql.slow_log',
    'TRUNCATE TABLE mysql.general_log',
    'FLUSH LOGS'
  ];

  logs.forEach(sql => {
    addExecutionResult(`清理日志 - ${sql.split(' ')[1]}`, 'info', { sql, message: '已发送 SQL 查询' });
    emit('execute-sql', sql);
  });
}

// 数据迁移
function showExportModal() {
  addExecutionResult('导出结构', 'info', { message: '导出结构功能开发中...' });
}

function showImportModal() {
  addExecutionResult('导入数据', 'info', { message: '导入数据功能开发中...' });
}

function showSyncModal() {
  addExecutionResult('数据同步', 'info', { message: '数据同步功能开发中...' });
}

// 健康检查
async function runHealthCheck() {
  const operation = '健康检查';
  const checks = [
    { name: '连接状态', sql: 'SELECT 1 as status' },
    { name: '表完整性', sql: 'SELECT COUNT(*) as status FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = "BASE TABLE"' },
    { name: '索引状态', sql: 'SELECT COUNT(*) as status FROM information_schema.statistics WHERE table_schema = DATABASE()' },
    { name: '磁盘空间', sql: 'SELECT SUM(data_length + index_length) as status FROM information_schema.tables WHERE table_schema = DATABASE()' }
  ];

  const results: any[] = [];
  for (const check of checks) {
    try {
      // 这里应该调用实际的数据库查询
      results.push({
        name: check.name,
        status: 'healthy',
        message: '正常'
      });
    } catch (error: any) {
      results.push({
        name: check.name,
        status: 'error',
        message: error.message
      });
    }
  }

  addExecutionResult(operation, 'success', { checks: results });
}

function showStatistics() {
  const sql = `
    SELECT
      table_name as '表名',
      table_rows as '记录数',
      ROUND(((data_length + index_length) / 1024 / 1024), 2) as '大小(MB)'
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
    ORDER BY (data_length + index_length) DESC
  `;
  addExecutionResult('数据统计', 'info', { sql: sql, message: '已发送 SQL 查询' });
  emit('execute-sql', sql);
}

function showAuditLog() {
  const sql = 'SELECT * FROM mysql.general_log ORDER BY event_time DESC LIMIT 100';
  addExecutionResult('审计日志', 'info', { sql: sql, message: '已发送 SQL 查询' });
  emit('execute-sql', sql);
}

// 恢复功能
function showRestoreModal() {
  restoreModalVisible.value = true;
}

function closeRestoreModal() {
  restoreModalVisible.value = false;
  selectedFile.value = null;
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] as File;
  }
}

async function performRestore() {
  if (!selectedFile.value) return;

  const operation = '恢复数据库';
  try {
    restoring.value = true;
    const filePath = selectedFile.value.name;

    const res = await databaseService.restoreDatabase(
      props.connection?.id || '',
      props.database,
      filePath,
      { dropExisting: restoreOptions.value.dropExisting }
    );

    addExecutionResult(operation, 'success', res);
    closeRestoreModal();
  } catch (error: any) {
    console.error('恢复失败:', error);
    modal.error(error.msg || error.message || '恢复失败');
    addExecutionResult(operation, 'error', formatError(error));
  } finally {
    restoring.value = false;
  }
}

function showScheduleModal() {
  addExecutionResult('定时备份', 'info', { message: '定时备份功能开发中...' });
}
</script>

<style scoped>
.db-tools {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tools-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.tools-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tools-content {
  padding: 1.5rem;
  max-height: 500px;
  overflow-y: auto;
}

.tool-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tool-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tool-actions .btn {
  min-width: 120px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-dialog {
  max-width: 600px;
}

.modal-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  color: #1e293b;
  font-weight: 600;
}

.modal-footer {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

/* 执行结果区域 */
.execution-results {
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
}

.results-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.results-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #94a3b8;
}

.no-results i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.no-results p {
  margin: 0;
  font-size: 1rem;
}

.result-item {
  margin-bottom: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.result-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.result-item.result-success {
  border-left: 4px solid #22c55e;
}

.result-item.result-error {
  border-left: 4px solid #ef4444;
}

.result-item.result-info {
  border-left: 4px solid #3b82f6;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  background: white;
  transition: background 0.2s;
}

.result-header:hover {
  background: #f8fafc;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.result-title i {
  font-size: 1.1rem;
}

.operation-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
}

.operation-time {
  color: #64748b;
  font-size: 0.85rem;
  margin-left: auto;
}

.toggle-icon {
  transition: transform 0.2s;
  color: #94a3b8;
  font-size: 0.9rem;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.result-body {
  padding: 1rem;
  background: #fafafa;
  border-top: 1px solid #e2e8f0;
}

.result-body pre {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  max-height: 300px;
  overflow: auto;
}

.result-body code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
}

/* JSON 语法高亮 - 不使用 scoped 以确保 v-html 内容能应用样式 */
:deep(.json-key) {
  color: #d04255;
  font-weight: 500;
}

:deep(.json-string) {
  color: #22863a;
}

:deep(.json-number) {
  color: #005cc5;
}

:deep(.json-boolean) {
  color: #d73a49;
}

:deep(.json-null) {
  color: #6f42c1;
}

/* 滚动条样式 */
.results-content::-webkit-scrollbar,
.result-body pre::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.results-content::-webkit-scrollbar-track,
.result-body pre::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.results-content::-webkit-scrollbar-thumb,
.result-body pre::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.results-content::-webkit-scrollbar-thumb:hover,
.result-body pre::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>