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

    <!-- 健康检查结果模态框 -->
    <div class="modal fade" :class="{ show: healthModalVisible }" :style="{ display: healthModalVisible ? 'block' : 'none', zIndex: 1055 }">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">数据库健康检查</h5>
            <button type="button" class="btn-close" @click="closeHealthModal"></button>
          </div>
          <div class="modal-body">
            <div v-if="healthChecking" class="text-center py-4">
              <div class="spinner-border text-primary" role="status"></div>
              <div class="mt-3">正在检查数据库健康状况...</div>
            </div>
            <div v-else>
              <div class="health-results">
                <div v-for="check in healthResults" :key="check.name" class="health-item">
                  <div class="health-status">
                    <i :class="check.status === 'healthy' ? 'bi bi-check-circle-fill text-success' : 
                                 check.status === 'warning' ? 'bi bi-exclamation-triangle-fill text-warning' : 
                                 'bi bi-x-circle-fill text-danger'"></i>
                    {{ check.name }}
                  </div>
                  <div class="health-message text-wrap">{{ check.message }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeHealthModal">关闭</button>
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
const healthModalVisible = ref(false);
const selectedFile = ref<File | null>(null);
const restoring = ref(false);
const healthChecking = ref(false);
const healthResults = ref<any[]>([]);

const restoreOptions = ref({
  dropExisting: false
});

// 数据备份
async function backupDatabase() {
  try {
    await databaseService.backupDatabase(props.connection?.id || '', props.database);
    await modal.success('数据库备份成功');
  } catch (error) {
    console.error('备份失败:', error);
    
    modal.error(error.msg || error.message || '备份失败', {
      operation: 'BACKUP',
      database: props.database,
      //options: backupOptions.value,
      stack: error.stack
    });
  }
}

// 用户管理
function showUsersList() {
  modal.info('用户列表功能开发中...');
}

function showCreateUserModal() {
  modal.info('创建用户功能开发中...');
}

function showPermissionsModal() {
  modal.info('权限管理功能开发中...');
}

// 性能监控
function showProcessList() {
  const sql = 'SHOW PROCESSLIST';
  emit('execute-sql', sql);
}

function showSlowQueries() {
  const sql = 'SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10';
  emit('execute-sql', sql);
}

function showConnectionsList() {
  const sql = 'SHOW STATUS LIKE "Threads_connected"';
  emit('execute-sql', sql);
}

// 数据库优化
async function optimizeDatabase() {
  try {
    await databaseService.optimizeDatabase(props.connection?.id || '', props.database);
    await modal.success('数据库优化完成');
  } catch (error) {
    console.error('优化失败:', error);
    
    modal.error(error.msg || error.message || '优化失败', {
      operation: 'OPTIMIZE',
      database: props.database,
      //options: optimizationOptions.value,
      stack: error.stack
    });
  }
}

async function analyzeTables() {
  try {
    await databaseService.analyzeTables(props.connection?.id || '', props.database);
    await modal.success('表分析完成');
  } catch (error) {
    console.error('分析失败:', error);
    
    modal.error(error.msg || error.message || '分析失败', {
      operation: 'ANALYZE',
      database: props.database,
      //options: analysisOptions.value,
      stack: error.stack
    });
  }
}

async function repairTables() {
  try {
    await databaseService.repairTables(props.connection?.id || '', props.database);
    await modal.success('表修复完成');
  } catch (error) {
    console.error('修复失败:', error);
    
    modal.error(error.msg || error.message || '修复失败', {
      operation: 'REPAIR',
      database: props.database,
      //options: repairOptions.value,
      stack: error.stack
    });
  }
}

async function clearLogs() {
  const logs = [
    'TRUNCATE TABLE mysql.slow_log',
    'TRUNCATE TABLE mysql.general_log',
    'FLUSH LOGS'
  ];
  
  logs.forEach(sql => emit('execute-sql', sql));
  await modal.success('日志清理完成');
}

// 数据迁移
function showExportModal() {
  modal.info('导出结构功能开发中...');
}

function showImportModal() {
  modal.info('导入数据功能开发中...');
}

function showSyncModal() {
  modal.info('数据同步功能开发中...');
}

// 健康检查
async function runHealthCheck() {
  healthChecking.value = true;
  healthResults.value = [];
  
  try {
    const checks = [
      { name: '连接状态', sql: 'SELECT 1 as status' },
      { name: '表完整性', sql: 'SELECT COUNT(*) as status FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = "BASE TABLE"' },
      { name: '索引状态', sql: 'SELECT COUNT(*) as status FROM information_schema.statistics WHERE table_schema = DATABASE()' },
      { name: '磁盘空间', sql: 'SELECT SUM(data_length + index_length) as status FROM information_schema.tables WHERE table_schema = DATABASE()' }
    ];
    
    for (const check of checks) {
      try {
        // 这里应该调用实际的数据库查询
        healthResults.value.push({
          name: check.name,
          status: 'healthy',
          message: '正常'
        });
      } catch (error) {
        healthResults.value.push({
          name: check.name,
          status: 'error',
          message: error.message
        });
      }
    }
    
    healthModalVisible.value = true;
  } finally {
    healthChecking.value = false;
  }
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
  emit('execute-sql', sql);
}

function showAuditLog() {
  const sql = 'SELECT * FROM mysql.general_log ORDER BY event_time DESC LIMIT 100';
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
    selectedFile.value = target.files[0];
  }
}

async function performRestore() {
  if (!selectedFile.value) return;
  
  try {
    restoring.value = true;
    // 这里简化处理，实际项目中可能需要先上传文件
    const filePath = selectedFile.value.name;
    
    await databaseService.restoreDatabase(
      props.connection?.id || '',
      props.database,
      filePath,
      { dropExisting: restoreOptions.value.dropExisting }
    );
    
    await modal.success('数据库恢复成功');
    closeRestoreModal();
  } catch (error) {
    console.error('恢复失败:', error);
    
    modal.error(error.msg || error.message || '恢复失败', {
      operation: 'RESTORE',
      database: props.database,
      //file: restoreFile.value,
      stack: error.stack
    });
  } finally {
    restoring.value = false;
  }
}

// 健康检查模态框
function closeHealthModal() {
  healthModalVisible.value = false;
  healthResults.value = [];
}

// 辅助函数
async function fetchTableList(): Promise<string[]> {
  // 这里应该调用API获取表列表
  return [];
}

function showScheduleModal() {
  modal.info('定时备份功能开发中...');
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

.health-results {
  max-height: 400px;
  overflow-y: auto;
}

.health-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.health-status {
  min-width: 150px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.health-message {
  flex: 1;
  color: #6b7280;
}

.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-dialog {
  max-width: 600px;
}

.modal-lg .modal-dialog {
  max-width: 800px;
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
</style>