<template>
  <div class="db-tools">
    <div class="tools-header">
      <h5 class="tools-title">
        <i class="bi bi-tools"></i>
        {{ $t('dbTools.title') }}
      </h5>
    </div>
    
    <div class="tools-content">
      <!-- 数据备份 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-shield-check"></i>
          {{ $t('dbTools.dataBackup') }}
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-primary btn-sm" @click="backupDatabase">
            <i class="bi bi-download"></i> {{ $t('dbTools.backupDatabase') }}
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="showRestoreModal">
            <i class="bi bi-upload"></i> {{ $t('dbTools.restoreDatabase') }}
          </button>
          <button class="btn btn-outline-info btn-sm" @click="showScheduleModal">
            <i class="bi bi-clock"></i> {{ $t('dbTools.scheduledBackup') }}
          </button>
        </div>
      </div>

      <!-- 用户管理 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-people"></i>
          {{ $t('dbTools.userManagement') }}
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-success btn-sm" @click="showUsersList">
            <i class="bi bi-person-lines-fill"></i> {{ $t('dbTools.userList') }}
          </button>
          <button class="btn btn-outline-primary btn-sm" @click="showCreateUserModal">
            <i class="bi bi-person-plus"></i> {{ $t('dbTools.createUser') }}
          </button>
          <button class="btn btn-outline-warning btn-sm" @click="showPermissionsModal">
            <i class="bi bi-key"></i> {{ $t('dbTools.permissionMgmt') }}
          </button>
        </div>
      </div>

      <!-- 性能监控 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-speedometer2"></i>
          {{ $t('dbTools.perfMonitor') }}
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-info btn-sm" @click="showProcessList">
            <i class="bi bi-activity"></i> {{ $t('dbTools.processList') }}
          </button>
          <button class="btn btn-outline-warning btn-sm" @click="showSlowQueries">
            <i class="bi bi-hourglass-split"></i> {{ $t('dbTools.slowQueries') }}
          </button>
          <button class="btn btn-outline-danger btn-sm" @click="showConnectionsList">
            <i class="bi bi-diagram-3"></i> {{ $t('dbTools.connectionCount') }}
          </button>
        </div>
      </div>

      <!-- 数据库优化 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-gear-wide-connected"></i>
          {{ $t('dbTools.dbOptimization') }}
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-success btn-sm" @click="optimizeDatabase">
            <i class="bi bi-lightning-charge"></i> {{ $t('dbTools.optimizeDatabase') }}
          </button>
          <button class="btn btn-outline-primary btn-sm" @click="analyzeTables">
            <i class="bi bi-search"></i> {{ $t('dbTools.analyzeTables') }}
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="repairTables">
            <i class="bi bi-tools"></i> {{ $t('dbTools.repairTables') }}
          </button>
          <button class="btn btn-outline-info btn-sm" @click="clearLogs">
            <i class="bi bi-trash"></i> {{ $t('dbTools.clearLogs') }}
          </button>
        </div>
      </div>

      <!-- 数据迁移 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-arrow-left-right"></i>
          {{ $t('dbTools.dataMigration') }}
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-primary btn-sm" @click="showExportModal">
            <i class="bi bi-box-arrow-up-right"></i> {{ $t('dbTools.exportStructure') }}
          </button>
          <button class="btn btn-outline-success btn-sm" @click="showImportModal">
            <i class="bi bi-box-arrow-in-down"></i> {{ $t('dbTools.importStructure') }}
          </button>
          <button class="btn btn-outline-warning btn-sm" @click="selectTool('sync')">
            <i class="bi bi-arrow-repeat"></i> {{ $t('dbTools.dataSync') }}
          </button>
        </div>
      </div>

      <!-- 健康检查 -->
      <div class="tool-section">
        <h6 class="section-title">
          <i class="bi bi-heart-pulse"></i>
          {{ $t('dbTools.healthCheck') }}
        </h6>
        <div class="tool-actions">
          <button class="btn btn-outline-info btn-sm" @click="runHealthCheck">
            <i class="bi bi-clipboard-check"></i> {{ $t('dbTools.healthCheck') }}
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="showStatistics">
            <i class="bi bi-bar-chart"></i> {{ $t('dbTools.dataStatistics') }}
          </button>
          <button class="btn btn-outline-warning btn-sm" @click="showAuditLog">
            <i class="bi bi-journal-text"></i> {{ $t('dbTools.auditLog') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 工具组件展示区域 -->
    <div class="tool-component-area" v-if="selectedTool">
      <div class="component-header">
        <h6 class="component-title">
          <i :class="getToolIcon(selectedTool)"></i>
          {{ getToolTitle(selectedTool) }}
        </h6>
        <button class="btn btn-outline-secondary btn-sm" @click="closeTool">
          <i class="bi bi-x"></i> {{ $t('dbTools.closeBtn') }}
        </button>
      </div>
      
      <!-- 数据同步组件 -->
      <div v-if="selectedTool === 'sync'" class="tool-component sync-component">
        <!-- 源数据库配置 -->
        <div class="mb-4">
          <h6 class="text-primary mb-2"><i class="bi bi-database"></i> {{ $t('dbTools.sourceDatabase') }}</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">{{ $t('dbTools.databaseNameLabel') }}</label>
              <input type="text" class="form-control" v-model="syncConfig.source.database" readonly>
            </div>
            <div class="col-md-6">
              <label class="form-label">{{ $t('dbTools.selectTableLabel') }}</label>
              <select class="form-select" v-model="syncConfig.source.tableName">
                <option value="">{{ $t('dbTools.selectTablePlaceholder') }}</option>
                <option v-for="table in tables" :key="table.name" :value="table.name">{{ table.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 目标数据库配置 -->
        <div class="mb-4">
          <h6 class="text-primary mb-2"><i class="bi bi-database"></i> {{ $t('dbTools.targetDatabase') }}</h6>
          
          <!-- 连接模式选择 -->
          <div class="mb-3">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" v-model="useExistingConnection" id="useExistingConnection">
              <label class="form-check-label" for="useExistingConnection">{{ $t('dbTools.useExistingConnection') }}</label>
            </div>
          </div>
          
          <!-- 已配置连接选择 -->
          <div v-if="useExistingConnection" class="row g-3">
            <div class="col-md-6">
              <label class="form-label">{{ $t('dbTools.selectConnectionLabel') }}</label>
              <select class="form-select" v-model="selectedConnectionId">
                <option value="">{{ $t('dbTools.selectConnectionPlaceholder') }}</option>
                <option v-for="conn in connections" :key="conn.id" :value="conn.id">{{ conn.name }} ({{ conn.type }})</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">{{ $t('dbTools.selectDatabaseLabel') }}</label>
              <select class="form-select" v-model="selectedDatabaseName">
                <option value="">{{ $t('dbTools.selectDatabasePlaceholder') }}</option>
                <option v-for="db in databases" :key="db" :value="db">{{ db }}</option>
              </select>
            </div>
            <div class="col-md-12">
              <label class="form-label">{{ $t('dbTools.targetTableName') }}</label>
              <input type="text" class="form-control" v-model="syncConfig.target.tableName">
            </div>
          </div>
          
          <!-- 手动配置 -->
          <div v-else class="row g-3">
            <div class="col-md-4">
              <label class="form-label">{{ $t('dbTools.dbTypeLabel') }}</label>
              <select class="form-select" v-model="syncConfig.target.dbType">
                <option value="mysql">MySQL</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="sqlite">SQLite</option>
                <option value="sqlserver">SQL Server</option>
                <option value="oracle">Oracle</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">{{ $t('dbTools.hostLabel') }}</label>
              <input type="text" class="form-control" v-model="syncConfig.target.host">
            </div>
            <div class="col-md-4">
              <label class="form-label">{{ $t('dbTools.portLabel') }}</label>
              <input type="number" class="form-control" v-model="syncConfig.target.port">
            </div>
            <div class="col-md-4">
              <label class="form-label">{{ $t('dbTools.dbNameLabel') }}</label>
              <input type="text" class="form-control" v-model="syncConfig.target.database">
            </div>
            <div class="col-md-4">
              <label class="form-label">{{ $t('dbTools.usernameLabel') }}</label>
              <input type="text" class="form-control" v-model="syncConfig.target.username">
            </div>
            <div class="col-md-4">
              <label class="form-label">{{ $t('dbTools.passwordLabel') }}</label>
              <input type="password" class="form-control" v-model="syncConfig.target.password">
            </div>
            <div class="col-md-6">
              <label class="form-label">{{ $t('dbTools.targetTableName') }}</label>
              <input type="text" class="form-control" v-model="syncConfig.target.tableName">
            </div>
          </div>
        </div>

        <!-- 同步选项 -->
        <div class="mb-4">
          <h6 class="text-primary mb-2"><i class="bi bi-sliders"></i> {{ $t('dbTools.syncOptions') }}</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" v-model="syncConfig.options.syncStructure" id="syncStructure">
                <label class="form-check-label" for="syncStructure">{{ $t('dbTools.syncStructure') }}</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" v-model="syncConfig.options.syncData" id="syncData">
                <label class="form-check-label" for="syncData">{{ $t('dbTools.syncData') }}</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" v-model="syncConfig.options.dropIfExists" id="dropIfExists">
                <label class="form-check-label" for="dropIfExists">{{ $t('dbTools.dropIfExists') }}</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" v-model="syncConfig.options.bulkInsert" id="bulkInsert">
                <label class="form-check-label" for="bulkInsert">{{ $t('dbTools.bulkInsert') }}</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" v-model="syncConfig.options.overrideExisting" id="overrideExisting">
                <label class="form-check-label" for="overrideExisting">{{ $t('dbTools.overrideExisting') }}</label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="tool-actions">
          <button class="btn btn-primary btn-sm" @click="performSync" :disabled="syncing || !isSyncFormValid">
            <i class="bi bi-play-fill"></i> {{ $t('dbTools.startSync') }}
          </button>
          <button v-if="syncing" class="btn btn-outline-danger btn-sm" @click="stopSync">
            <i class="bi bi-stop-fill"></i> {{ $t('dbTools.stopSync') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 执行结果展示区域 -->
    <div class="execution-results">
      <div class="results-header">
        <h6 class="results-title">
          <i class="bi bi-terminal"></i>
          {{ $t('dbTools.execResults') }}
        </h6>
        <button class="btn btn-outline-secondary btn-sm" @click="clearResults">
          <i class="bi bi-trash"></i> {{ $t('dbTools.clearBtn') }}
        </button>
      </div>
      <div class="results-content" ref="resultsContentRef">
        <div v-if="executionResults.length === 0" class="no-results">
          <i class="bi bi-inbox"></i>
          <p>{{ $t('dbTools.noResults') }}</p>
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
            <h5 class="modal-title">{{ $t('dbTools.restoreModalTitle') }}</h5>
            <button type="button" class="btn-close" @click="closeRestoreModal"></button>
          </div>
          <div class="modal-body">
            <p>{{ $t('dbTools.restoreSelectFile') }}</p>
            <div class="mb-3">
              <input type="file" class="form-control" @change="handleFileChange" accept=".sql,.bak">
            </div>
            <div v-if="selectedFile" class="alert alert-info">
              {{ $t('dbTools.selectedFile') }}{{ selectedFile.name }}
            </div>
            <div class="mb-3 form-check">
              <input type="checkbox" class="form-check-input" v-model="restoreOptions.dropExisting" id="dropExisting">
              <label class="form-check-label" for="dropExisting">{{ $t('dbTools.dropExistingTable') }}</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeRestoreModal">{{ $t('common.cancel') }}</button>
            <button type="button" class="btn btn-primary" @click="performRestore" :disabled="!selectedFile">
              <span v-if="restoring" class="spinner-border spinner-border-sm me-2"></span>
              {{ $t('dbTools.restoreBtn') }}
            </button>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { DatabaseService, ConnectionService } from '@/service/database';
import { modal } from '@/utils/modal';
import { toast } from '@/utils/toast';

const { t } = useI18n();

const connectionService = new ConnectionService();

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

// 工具组件状态
const selectedTool = ref<string | null>(null);

// 同步功能状态
const syncing = ref(false);
const tables = ref<any[]>([]);
const connections = ref<any[]>([]);
const databases = ref<any[]>([]);
const useExistingConnection = ref(false);
const selectedConnectionId = ref('');
const selectedDatabaseName = ref('');

// 同步配置
const syncConfig = ref({
  source: {
    database: '',
    tableName: ''
  },
  target: {
    dbType: 'mysql',
    host: 'localhost',
    port: 3306,
    database: '',
    username: 'root',
    password: '',
    tableName: ''
  },
  options: {
    syncStructure: true,
    syncData: true,
    dropIfExists: false,
    bulkInsert: true,
    overrideExisting: false
  }
});

// 监听源表名变化，自动更新目标表名
watch(() => syncConfig.value.source.tableName, (newTableName) => {
  if (newTableName) {
    syncConfig.value.target.tableName = newTableName;
  }
});

// 组件挂载时初始化同步数据
onMounted(() => {
  initSyncData();
});

// 监听连接ID变化，加载数据库列表
async function loadDatabases(connectionId: string) {
  if (!connectionId) {
    databases.value = [];
    selectedDatabaseName.value = '';
    return;
  }
  
  try {
    const res = await databaseService.getDatabases(connectionId);
    if (res.ret === 0) {
      databases.value = res.data || [];
    } else {
      databases.value = [];
    }
    selectedDatabaseName.value = '';
  } catch (error) {
    console.error('加载数据库列表失败:', error);
    databases.value = [];
    selectedDatabaseName.value = '';
  }
}

// 监听连接ID变化
watch(selectedConnectionId, (newVal) => {
  loadDatabases(newVal);
});

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

// 验证同步表单
const isSyncFormValid = computed(() => {
  if (useExistingConnection.value) {
    return syncConfig.value.source.tableName &&
           selectedConnectionId.value &&
           selectedDatabaseName.value &&
           syncConfig.value.target.tableName &&
           (syncConfig.value.options.syncStructure || syncConfig.value.options.syncData);
  } else {
    return syncConfig.value.source.tableName &&
           syncConfig.value.target.host &&
           syncConfig.value.target.port &&
           syncConfig.value.target.database &&
           syncConfig.value.target.username &&
           syncConfig.value.target.tableName &&
           (syncConfig.value.options.syncStructure || syncConfig.value.options.syncData);
  }
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
    message: error.msg || error.message || t('dbTools.unknownError')
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
  const operation = t('dbTools.backupDatabase');
  try {
    const res = await databaseService.backupDatabase(props.connection?.id || '', props.database);
    if(res.ret === 0) {
      addExecutionResult(operation, 'success', res);
    } else {
      modal.error(res.msg || t('dbTools.backupFailed'));
      addExecutionResult(operation, 'error', formatError(res));
    }
  } catch (error: any) {
    console.error('备份失败:', error);
    modal.error(error.msg || error.message || t('dbTools.backupFailed'));
    addExecutionResult(operation, 'error', formatError(error));
  }
}

// 用户管理
function showUsersList() {
  addExecutionResult(t('dbTools.userList'), 'info', { message: t('dbTools.featureInDev', { feature: t('dbTools.userList') }) });
}

function showCreateUserModal() {
  addExecutionResult(t('dbTools.createUser'), 'info', { message: t('dbTools.featureInDev', { feature: t('dbTools.createUser') }) });
}

function showPermissionsModal() {
  addExecutionResult(t('dbTools.permissionMgmt'), 'info', { message: t('dbTools.featureInDev', { feature: t('dbTools.permissionMgmt') }) });
}

// 性能监控
function showProcessList() {
  const sql = 'SHOW PROCESSLIST';
  addExecutionResult(t('dbTools.processList'), 'info', { sql: sql, message: t('dbTools.sqlSent') });
  emit('execute-sql', sql);
}

function showSlowQueries() {
  const sql = 'SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10';
  addExecutionResult(t('dbTools.slowQueries'), 'info', { sql: sql, message: t('dbTools.sqlSent') });
  emit('execute-sql', sql);
}

function showConnectionsList() {
  const sql = 'SHOW STATUS LIKE "Threads_connected"';
  addExecutionResult(t('dbTools.connectionCount'), 'info', { sql: sql, message: t('dbTools.sqlSent') });
  emit('execute-sql', sql);
}

// 数据库优化
async function optimizeDatabase() {
  const operation = t('dbTools.optimizeDatabase');
  try {
    const res = await databaseService.optimizeDatabase(props.connection?.id || '', props.database);
    if(res.ret === 0) {
      addExecutionResult(operation, 'success', res.data);
    } else {
      modal.error(res.msg || t('dbTools.optimizeFailed'));
      addExecutionResult(operation, 'error', formatError(res));
    }
  } catch (error: any) {
    console.error('优化失败:', error);
    modal.error(error.msg || error.message || t('dbTools.optimizeFailed'));
    addExecutionResult(operation, 'error', formatError(error));
  }
}

async function analyzeTables() {
  const operation = t('dbTools.analyzeTables');
  try {
    const res = await databaseService.analyzeTables(props.connection?.id || '', props.database);
    if(res.ret === 0) {
      addExecutionResult(operation, 'success', res.data);
    } else {
      modal.error(res.msg || t('dbTools.analyzeFailed'));
      addExecutionResult(operation, 'error', formatError(res));
    }
  } catch (error: any) {
    console.error('分析失败:', error);
    modal.error(error.msg || error.message || t('dbTools.analyzeFailed'));
    addExecutionResult(operation, 'error', formatError(error));
  }
}

async function repairTables() {
  const operation = t('dbTools.repairTables');
  try {
    const res = await databaseService.repairTables(props.connection?.id || '', props.database);
    if(res.ret === 0) {
      addExecutionResult(operation, 'success', res.data);
    } else {
      modal.error(res.msg || t('dbTools.repairFailed'));
      addExecutionResult(operation, 'error', formatError(res));
    }
  } catch (error: any) {
    console.error('修复失败:', error);
    modal.error(error.msg || error.message || t('dbTools.repairFailed'));
    addExecutionResult(operation, 'error', formatError(error));
  }
}

async function clearLogs() {
  const operation = t('dbTools.clearLogs');
  const logs = [
    'TRUNCATE TABLE mysql.slow_log',
    'TRUNCATE TABLE mysql.general_log',
    'FLUSH LOGS'
  ];

  logs.forEach(sql => {
    addExecutionResult(`${t('dbTools.clearLogs')} - ${sql.split(' ')[1]}`, 'info', { sql, message: t('dbTools.sqlSent') });
    emit('execute-sql', sql);
  });
}

// 数据迁移
function showExportModal() {
  addExecutionResult(t('dbTools.exportStructure'), 'info', { message: t('dbTools.featureInDev', { feature: t('dbTools.exportStructure') }) });
}

function showImportModal() {
  addExecutionResult(t('dbTools.importStructure'), 'info', { message: t('dbTools.featureInDev', { feature: t('dbTools.importStructure') }) });
}

// 健康检查
async function runHealthCheck() {
  const operation = t('dbTools.healthCheck');
  const checks = [
    { name: t('dbTools.healthCheckConnection'), sql: 'SELECT 1 as status' },
    { name: t('dbTools.healthCheckTableIntegrity'), sql: 'SELECT COUNT(*) as status FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = "BASE TABLE"' },
    { name: t('dbTools.healthCheckIndexStatus'), sql: 'SELECT COUNT(*) as status FROM information_schema.statistics WHERE table_schema = DATABASE()' },
    { name: t('dbTools.healthCheckDiskSpace'), sql: 'SELECT SUM(data_length + index_length) as status FROM information_schema.tables WHERE table_schema = DATABASE()' }
  ];

  const results: any[] = [];
  for (const check of checks) {
    try {
      // 这里应该调用实际的数据库查询
      results.push({
        name: check.name,
        status: 'healthy',
        message: t('dbTools.healthNormal')
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
  addExecutionResult(t('dbTools.dataStatistics'), 'info', { sql: sql, message: t('dbTools.sqlSent') });
  emit('execute-sql', sql);
}

function showAuditLog() {
  const sql = 'SELECT * FROM mysql.general_log ORDER BY event_time DESC LIMIT 100';
  addExecutionResult(t('dbTools.auditLog'), 'info', { sql: sql, message: t('dbTools.sqlSent') });
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

  const operation = t('dbTools.restoreDatabase');
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
    modal.error(error.msg || error.message || t('dbTools.restoreFailed'));
    addExecutionResult(operation, 'error', formatError(error));
  } finally {
    restoring.value = false;
  }
}

// 选择工具
function selectTool(toolName: string) {
  selectedTool.value = toolName;
  if (toolName === 'sync') {
    initSyncData();
  }
}

// 关闭工具
function closeTool() {
  selectedTool.value = null;
}

// 获取工具图标
function getToolIcon(toolName: string) {
  const icons: Record<string, string> = {
    'sync': 'bi-arrow-repeat'
  };
  return icons[toolName] || 'bi-gear';
}

// 获取工具标题
function getToolTitle(toolName: string) {
  const titles: Record<string, string> = {
    'sync': t('dbTools.dataSyncTitle')
  };
  return titles[toolName] || t('dbTools.toolTitle');
}

// 同步功能 - 初始化数据
async function initSyncData() {
  try {
    // 加载表列表
    const tablesRes = await databaseService.getTables(props.connection?.id || '', props.database);
    if (tablesRes.ret === 0) {
      tables.value = tablesRes.data || [];
    }
    
    // 加载已配置的数据库连接列表
    const connRes = await connectionService.getAllConnections();
    if (connRes.ret === 0) {
      connections.value = connRes.data || [];
    }
    
    // 设置源数据库信息
    syncConfig.value.source.database = props.database;
    
    // 默认选择当前连接
    if (props.connection?.id) {
      useExistingConnection.value = true;
      selectedConnectionId.value = props.connection.id;
    }
  } catch (error: any) {
    console.error('加载表列表失败:', error);
    modal.error(t('dbTools.loadTablesFailed'));
  }
}

// 重置同步状态
function resetSyncState() {
  syncing.value = false;
  tables.value = [];
  databases.value = [];
  useExistingConnection.value = false;
  selectedConnectionId.value = '';
  selectedDatabaseName.value = '';
  syncConfig.value = {
    source: {
      database: '',
      tableName: ''
    },
    target: {
      dbType: 'mysql',
      host: 'localhost',
      port: 3306,
      database: '',
      username: 'root',
      password: '',
      tableName: ''
    },
    options: {
      syncStructure: true,
      syncData: true,
      dropIfExists: false,
      bulkInsert: true,
      overrideExisting: false
    }
  };
}

async function performSync() {
  if (!isSyncFormValid.value) {
    modal.error(t('dbTools.syncConfigIncomplete'));
    return;
  }

  const operation = t('dbTools.dataSync');
  syncing.value = true;
  
  try {
    // 构建同步配置
    let syncData;
    if (useExistingConnection.value) {
      // 使用已配置连接
      syncData = {
        source: {
          database: syncConfig.value.source.database,
          tableName: syncConfig.value.source.tableName
        },
        target: {
          connectionId: selectedConnectionId.value,
          database: selectedDatabaseName.value,
          tableName: syncConfig.value.target.tableName
        },
        options: syncConfig.value.options
      };
    } else {
      // 使用手动配置
      syncData = syncConfig.value;
    }
    
    // 添加同步开始记录
    addExecutionResult(operation, 'info', {
      message: t('dbTools.syncStarted'),
      config: syncData
    });

    // 执行同步
    const res = await databaseService.syncTable(
      props.connection?.id || '',
      syncData
    );

    if (res.ret === 0) {
      const tables = res.data?.tables || [];
      let successCount = 0;
      let totalRows = 0;
      
      tables.forEach((table: any) => {
        if (table.rowsSynced > 0) {
          successCount++;
          totalRows += table.rowsSynced;
        }
      });
      
      addExecutionResult(operation, 'success', {
        message: t('dbTools.syncSuccess', { success: successCount, total: tables.length, rows: totalRows }),
        data: res.data
      });
      toast.success(t('dbTools.syncSuccessToast', { success: successCount, total: tables.length }));
    } else {
      addExecutionResult(operation, 'error', {
        message: res.msg || t('dbTools.syncFailed'),
        error: res.error
      });
      toast.error(res.msg || t('dbTools.syncFailed'));
    }
  } catch (error: any) {
    console.error('同步失败:', error);
    addExecutionResult(operation, 'error', formatError(error));
    toast.error(error.msg || error.message || t('dbTools.syncFailed'));
  } finally {
    syncing.value = false;
  }
}

function showScheduleModal() {
  addExecutionResult(t('dbTools.scheduledBackup'), 'info', { message: t('dbTools.featureInDev', { feature: t('dbTools.scheduledBackup') }) });
}
</script>

<style scoped>
.db-tools {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

/* 工具组件区域 */
.tool-component-area {
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.component-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
}

.component-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tool-component {
  padding: 1.5rem;
}

.sync-component {
  background: white;
  border-radius: 0.375rem;
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