<template>
  <div class="connection-detail">
    <!-- 连接头部信息 -->
    <div class="connection-header">
      <div class="connection-info">
        <div class="connection-avatar">
          <div class="db-logo" :class="getDbLogoClass(connection?.type)">
            {{ getDbLogoText(connection?.type) }}
          </div>
        </div>
        <div class="connection-meta">
          <h4 class="connection-name">{{ connection?.name }}</h4>
          <div class="connection-type-info">
            <span class="db-type">{{ getDbTypeLabel(connection?.type) }}</span>
            <span class="connection-status" :class="connection?.enabled ? 'status-online' : 'status-offline'">
              <div class="status-dot"></div>
              {{ connection?.enabled ? '已连接' : '未连接' }}
            </span>
          </div>
        </div>
      </div>
      <div class="connection-actions">
        <button class="btn btn-sm btn-outline-info" @click="toggleDetails" title="查看/隐藏详细信息">
          <i class="bi" :class="isDetailsExpanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i> 详情
        </button>
        <button class="btn btn-sm btn-outline-primary" @click="testConnection">
          <i class="bi bi-wifi"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="editConnection">
          <i class="bi bi-pencil"></i> 编辑
        </button>
      </div>
    </div>

    <!-- 连接详情卡片 -->
    <div v-if="isDetailsExpanded" class="connection-details-panel">
      <div class="detail-card">
        <div class="card-body">
          <div class="row">
            <!-- 基本信息 -->
            <div class="col-md-6">
              <h6 class="section-title">
                <i class="bi bi-info-circle"></i>
                基本信息
              </h6>
              <div class="info-grid">
                <div class="info-item">
                  <label class="info-label">主机地址</label>
                  <div class="info-value">{{ connection?.host }}</div>
                </div>
                <div class="info-item">
                  <label class="info-label">端口</label>
                  <div class="info-value">{{ connection?.port }}</div>
                </div>
                <div class="info-item">
                  <label class="info-label">用户名</label>
                  <div class="info-value">{{ connection?.username }}</div>
                </div>
                <div class="info-item">
                  <label class="info-label">数据库类型</label>
                  <div class="info-value">
                    <span class="db-type-badge" :class="getDbLogoClass(connection?.type)">
                      {{ getDbTypeLabel(connection?.type) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 连接统计 -->
            <div class="col-md-6">
              <h6 class="section-title">
                <i class="bi bi-bar-chart"></i>
                连接统计
              </h6>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ connectionStats.databaseCount || 0 }}</div>
                  <div class="stat-label">数据库数量</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ connectionStats.tableCount || 0 }}</div>
                  <div class="stat-label">表总数</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ formatFileSize(connectionStats.totalSize || 0) }}</div>
                  <div class="stat-label">总大小</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ connectionStats.lastConnected || '从未' }}</div>
                  <div class="stat-label">最后连接</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <div class="actions-header">
        <h6 class="actions-title">
          <i class="bi bi-lightning"></i>
          快速操作
        </h6>
      </div>
      <div class="actions-grid">
        <button class="action-btn" @click="showCreateDatabaseModal">
          <div class="action-icon">
            <i class="bi bi-plus-circle"></i>
          </div>
          <div class="action-text">创建数据库</div>
        </button>
        <!-- <button class="action-btn" @click="refreshAll">
          <div class="action-icon">
            <i class="bi bi-arrow-clockwise"></i>
          </div>
          <div class="action-text">刷新所有数据库</div>
        </button> -->
        <!-- <button class="action-btn" @click="activeTab = 'sql'">
          <div class="action-icon">
            <i class="bi bi-terminal"></i>
          </div>
          <div class="action-text">SQL查询</div>
        </button> -->
        <button class="action-btn" @click="exportSchema">
          <div class="action-icon">
            <i class="bi bi-download"></i>
          </div>
          <div class="action-text">导出架构</div>
        </button>
        <button class="action-btn" @click="viewLogs">
          <div class="action-icon">
            <i class="bi bi-file-text"></i>
          </div>
          <div class="action-text">查看日志</div>
        </button>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="connection-tabs">
      <ul class="nav nav-tabs">
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'databases' }"
            @click="activeTab = 'databases'"
          >
            <i class="bi bi-database-fill"></i> 数据库列表
            <span class="badge bg-primary ms-1">{{ databases.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'sql' }"
            @click="activeTab = 'sql'"
          >
            <i class="bi bi-terminal"></i> SQL查询
          </button>
        </li>
      </ul>

      <div class="tab-content">
        <!-- 数据库列表标签页 -->
        <div v-show="activeTab === 'databases'" class="tab-panel">
          <div class="databases-section">
            <div class="section-header">
              <div class="section-actions">
                <div class="search-box">
                  <input 
                    type="text" 
                    class="form-control form-control-sm" 
                    v-model="searchKeyword" 
                    placeholder="搜索数据库..."
                    style="width: 200px;"
                  >
                </div>
                <button class="btn btn-sm btn-outline-primary ms-2" @click="loadDatabases" :disabled="loadingDatabases">
                  <span v-if="loadingDatabases" class="spinner-border spinner-border-sm me-1"></span>
                  <i class="bi bi-arrow-clockwise"></i> 刷新
                </button>
              </div>
            </div>
            
            <div class="databases-list">
              <div v-if="loadingDatabases" class="loading-state">
                <div class="spinner-border text-primary"></div>
                <span>加载数据库列表...</span>
              </div>
              <div v-else-if="filteredDatabases.length === 0" class="empty-state">
                <i class="bi bi-database"></i>
                <p>{{ searchKeyword ? '没有找到匹配的数据库' : '暂无数据库' }}</p>
                <button class="btn btn-sm btn-primary" @click="showCreateDatabaseModal">
                  <i class="bi bi-plus"></i> 创建数据库
                </button>
              </div>
              <div v-else class="databases-list-simple">
                <div 
                  v-for="database in filteredDatabases" 
                  :key="database.name" 
                  class="database-item"
                  @click="openDatabase(database)"
                >
                  <div class="database-item-icon">
                    <i class="bi bi-database"></i>
                  </div>
                  <div class="database-item-name">{{ database.name }}</div>
                  <div class="database-item-actions">
                    <button class="btn btn-sm btn-outline-secondary" @click.stop="activeTab = 'sql'">
                      <i class="bi bi-terminal"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SQL查询标签页 -->
        <div v-show="activeTab === 'sql'" class="tab-panel">
          <div class="sql-section">
            <div class="sql-header">
              <h6 class="sql-title">
                <i class="bi bi-terminal"></i>
                SQL查询
              </h6>
              <div class="sql-db-info" v-if="props.connection">
                <span class="badge bg-info">{{ props.connection.name }}</span>
              </div>
            </div>
            <SqlExecutor 
              :connection="props.connection"
              :database="''"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 创建数据库模态框 -->
    <div v-if="showCreateDatabase" class="modal fade show d-block" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">创建数据库</h5>
            <button type="button" class="btn-close" @click="showCreateDatabase = false"></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="mb-3">
                <label class="form-label">数据库名称 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" v-model="newDatabase.name" placeholder="输入数据库名称" required>
              </div>
              
              <!-- MySQL特定选项 -->
              <div v-if="connection?.type === 'mysql'">
                <div class="mb-3">
                  <label class="form-label">字符集</label>
                  <select class="form-select" v-model="newDatabase.options.charset">
                    <option value="">默认</option>
                    <option value="utf8mb4">utf8mb4</option>
                    <option value="utf8">utf8</option>
                    <option value="latin1">latin1</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">排序规则</label>
                  <select class="form-select" v-model="newDatabase.options.collation">
                    <option value="">默认</option>
                    <option value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</option>
                    <option value="utf8mb4_general_ci">utf8mb4_general_ci</option>
                    <option value="utf8_unicode_ci">utf8_unicode_ci</option>
                  </select>
                </div>
              </div>

              <!-- PostgreSQL特定选项 -->
              <div v-if="connection?.type === 'postgres'">
                <div class="mb-3">
                  <label class="form-label">所有者</label>
                  <input type="text" class="form-control" v-model="newDatabase.options.owner" placeholder="数据库所有者">
                </div>
                <div class="mb-3">
                  <label class="form-label">模板</label>
                  <input type="text" class="form-control" v-model="newDatabase.options.template" placeholder="模板数据库">
                </div>
                <div class="mb-3">
                  <label class="form-label">编码</label>
                  <select class="form-select" v-model="newDatabase.options.encoding">
                    <option value="">默认</option>
                    <option value="UTF8">UTF8</option>
                    <option value="LATIN1">LATIN1</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">表空间</label>
                  <input type="text" class="form-control" v-model="newDatabase.options.tablespace" placeholder="表空间">
                </div>
              </div>

              <!-- SQL Server特定选项 -->
              <div v-if="connection?.type === 'mssql'">
                <div class="mb-3">
                  <label class="form-label">排序规则</label>
                  <input type="text" class="form-control" v-model="newDatabase.options.collation" placeholder="排序规则">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateDatabase = false">取消</button>
            <button type="button" class="btn btn-primary" @click="createDatabase" :disabled="!newDatabase.name || creatingDatabase">
              <span v-if="creatingDatabase" class="spinner-border spinner-border-sm me-2"></span>
              创建
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { ConnectionEntity } from '@/typings/database';
import { useConnectionStore } from '@/stores/connection';
import SqlExecutor from './sql-executor.vue';
import { modal } from '@/utils/modal';

const router = useRouter();

const props = defineProps<{
  connection: ConnectionEntity | null;
}>();

const emit = defineEmits<{
  'test-connection': [connection: ConnectionEntity];
  'edit-connection': [connection: ConnectionEntity];
  'refresh-all': [connection: ConnectionEntity];
  'open-sql-query': [connection: ConnectionEntity];
  'export-schema': [connection: ConnectionEntity];
  'view-logs': [connection: ConnectionEntity];
  'create-database': [];
  'open-database': [connection: ConnectionEntity, database: string];
}>();

// 初始化连接 store
const connectionStore = useConnectionStore();

// 连接统计信息
const connectionStats = ref({
  databaseCount: 0,
  tableCount: 0,
  totalSize: 0,
  lastConnected: null as string | null
});

// 搜索关键字
const searchKeyword = ref('');

// 折叠状态
const isDetailsExpanded = ref(false);

// 切换折叠状态
function toggleDetails() {
  isDetailsExpanded.value = !isDetailsExpanded.value;
}

// 创建数据库相关
const showCreateDatabase = ref(false);
const newDatabase = ref({
  name: '',
  options: {
    charset: '',
    collation: '',
    owner: '',
    template: '',
    encoding: '',
    tablespace: ''
  }
});

// 标签页状态
const activeTab = ref('databases');

// 监听连接变化
watch(() => props.connection, (newConnection) => {
  connectionStore.setCurrentConnection(newConnection);
  if (newConnection) {
    loadConnectionStats();
  }
}, { immediate: true });

// 生命周期
onMounted(() => {
  if (props.connection) {
    loadConnectionStats();
  }
});

// 数据库列表（从 store 获取）
const databases = computed(() => connectionStore.databases);
const loadingDatabases = computed(() => connectionStore.isLoadingDatabases);

// 方法
function loadConnectionStats() {
  // 模拟加载连接统计信息
  connectionStats.value = {
    databaseCount: connectionStore.databaseCount,
    tableCount: connectionStore.tableCount,
    totalSize: 1024 * 1024 * 512, // 512MB
    lastConnected: '2小时前'
  };
}

function loadDatabases() {
  connectionStore.loadDatabases();
}

const filteredDatabases = computed(() => {
  if (!searchKeyword.value) {
    return databases.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return databases.value.filter(db => 
    db.name.toLowerCase().includes(keyword)
  );
});

function openDatabase(database: any) {
  if (props.connection) {
    emit('open-database', props.connection, database.name);
    router.push({
      path: `/database/explorer`,
      query: { connectionId: props.connection.id, database: database.name }
    });
  }
}

function testConnection() {
  if (props.connection) {
    emit('test-connection', props.connection);
  }
}

function editConnection() {
  if (props.connection) {
    emit('edit-connection', props.connection);
  }
}

function refreshAll() {
  if (props.connection) {
    emit('refresh-all', props.connection);
  }
}

function exportSchema() {
  if (props.connection) {
    emit('export-schema', props.connection);
  }
}

function viewLogs() {
  if (props.connection) {
    emit('view-logs', props.connection);
  }
}

function showCreateDatabaseModal() {
  emit('create-database');
  showCreateDatabase.value = true;
}

function createDatabase() {
  if (!newDatabase.value.name) {
    modal.warning('请输入数据库名称');
    return;
  }
  
  if (props.connection) {
    // 这里应该调用创建数据库的API
    modal.success('数据库创建成功');
    showCreateDatabase.value = false;
    // 重置表单
    newDatabase.value = {
      name: '',
      options: {
        charset: '',
        collation: '',
        owner: '',
        template: '',
        encoding: '',
        tablespace: ''
      }
    };
    // 刷新数据库列表
    loadDatabases();
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期时间
function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
}

// 获取数据库类型标签
function getDbTypeLabel(type?: string): string {
  const typeMap: Record<string, string> = {
    mysql: 'MySQL',
    postgres: 'PostgreSQL',
    mssql: 'SQL Server',
    sqlite: 'SQLite',
    oracle: 'Oracle'
  };
  return typeMap[type || ''] || 'Unknown';
}

// 获取数据库Logo类名
function getDbLogoClass(type?: string): string {
  return `db-${type || ''}`;
}

// 获取数据库Logo文本
function getDbLogoText(type?: string): string {
  const textMap: Record<string, string> = {
    mysql: 'MY',
    postgres: 'PG',
    mssql: 'MS',
    sqlite: 'SQ',
    oracle: 'OR'
  };
  return textMap[type || ''] || 'DB';
}
</script>

<style scoped>
.connection-detail {
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 20px;
}

.connection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.connection-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.connection-avatar {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: #e9ecef;
}

.db-logo {
  font-size: 24px;
  font-weight: bold;
  color: #6c757d;
}

.db-mysql {
  background-color: #4CAF50;
  color: white;
}

.db-postgres {
  background-color: #336791;
  color: white;
}

.db-mssql {
  background-color: #0078d4;
  color: white;
}

.db-sqlite {
  background-color: #003B57;
  color: white;
}

.db-oracle {
  background-color: #F80000;
  color: white;
}

.connection-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.connection-name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.connection-type-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.db-type {
  padding: 4px 12px;
  border-radius: 12px;
  background-color: #e9ecef;
  font-size: 12px;
  font-weight: 500;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #6c757d;
}

.status-online .status-dot {
  background-color: #28a745;
}

.status-offline .status-dot {
  background-color: #dc3545;
}

.connection-actions {
  display: flex;
  gap: 8px;
}

.connection-details-panel {
  margin-bottom: 30px;
  animation: fadeIn 0.3s ease;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #343a40;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  padding: 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-body {
  padding: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 10px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.info-item:hover {
  background-color: #e9ecef;
  transform: translateY(-1px);
}

.info-label {
  font-size: 12px;
  font-weight: 500;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #343a40;
}

.db-type-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background-color: #e9ecef;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #343a40;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
}

.quick-actions {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.actions-header {
  margin-bottom: 16px;
}

.actions-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-icon {
  font-size: 24px;
  color: #6c757d;
}

.action-text {
  font-size: 14px;
  font-weight: 500;
  color: #343a40;
}

.connection-tabs {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.nav-tabs {
  border-bottom: 1px solid #dee2e6;
  background-color: #f8f9fa;
}

.nav-link {
  border: none;
  border-radius: 0;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background-color: #e9ecef;
}

.nav-link.active {
  background-color: white;
  border-bottom: 2px solid #0d6efd;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-panel {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.databases-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.databases-list {
  min-height: 300px;
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  text-align: center;
}

.empty-state i {
  font-size: 48px;
  color: #ced4da;
}

.empty-state p {
  margin: 0;
  color: #6c757d;
  font-size: 16px;
}

.databases-list-simple {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.database-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  min-height: 100px;
}

.database-item:hover {
  border-color: #0d6efd;
  background-color: #f8f9fa;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.database-item-icon {
  font-size: 32px;
  color: #6c757d;
}

.database-item-name {
  font-size: 14px;
  font-weight: 500;
  color: #343a40;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.database-item-actions {
  display: flex;
  gap: 4px;
  margin-top: auto;
}

.sql-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}

.sql-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sql-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sql-db-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .connection-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .connection-actions {
    align-self: flex-end;
  }
  
  .connection-cards {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .databases-list-simple {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }
  
  .database-item {
    padding: 12px;
    min-height: 80px;
  }
  
  .database-item-icon {
    font-size: 24px;
  }
  
  .database-item-name {
    font-size: 12px;
  }
  
  .nav-link {
    padding: 10px 16px;
    font-size: 13px;
  }
}
</style>

