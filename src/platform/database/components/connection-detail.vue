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
        <button class="btn btn-sm btn-outline-primary" @click="testConnection">
          <i class="bi bi-wifi"></i> 测试连接
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="editConnection">
          <i class="bi bi-pencil"></i> 编辑
        </button>
      </div>
    </div>

    <!-- 连接详情卡片 -->
    <div class="connection-cards">
      <!-- 基本信息 -->
      <div class="detail-card">
        <div class="card-header">
          <h6 class="card-title">
            <i class="bi bi-info-circle"></i>
            基本信息
          </h6>
        </div>
        <div class="card-body">
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
      </div>

      <!-- 连接统计 -->
      <div class="detail-card">
        <div class="card-header">
          <h6 class="card-title">
            <i class="bi bi-bar-chart"></i>
            连接统计
          </h6>
        </div>
        <div class="card-body">
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

      <!-- 高级配置 -->
      <div class="detail-card">
        <div class="card-header">
          <h6 class="card-title">
            <i class="bi bi-gear"></i>
            高级配置
          </h6>
        </div>
        <div class="card-body">
          <div class="info-grid">
            <div class="info-item" v-if="connection?.options?.charset">
              <label class="info-label">字符集</label>
              <div class="info-value">{{ connection.options.charset }}</div>
            </div>
            <div class="info-item" v-if="connection?.options?.timeout">
              <label class="info-label">连接超时</label>
              <div class="info-value">{{ connection.options.timeout }}ms</div>
            </div>
            <div class="info-item" v-if="connection?.options?.ssl">
              <label class="info-label">SSL连接</label>
              <div class="info-value">
                <span class="badge" :class="connection.options.ssl ? 'bg-success' : 'bg-secondary'">
                  {{ connection.options.ssl ? '启用' : '禁用' }}
                </span>
              </div>
            </div>
            <div class="info-item" v-if="connection?.options?.poolSize">
              <label class="info-label">连接池大小</label>
              <div class="info-value">{{ connection.options.poolSize }}</div>
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
        <button class="action-btn" @click="refreshAll">
          <div class="action-icon">
            <i class="bi bi-arrow-clockwise"></i>
          </div>
          <div class="action-text">刷新所有数据库</div>
        </button>
        <button class="action-btn" @click="openSqlQuery">
          <div class="action-icon">
            <i class="bi bi-terminal"></i>
          </div>
          <div class="action-text">SQL查询</div>
        </button>
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
import { ref, computed, onMounted } from 'vue';
import type { ConnectionEntity } from '@/typings/database';
import { DatabaseService } from '@/service/database';
import { modal } from '@/utils/modal';

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
}>();

// 连接统计信息
const connectionStats = ref({
  databaseCount: 0,
  tableCount: 0,
  totalSize: 0,
  lastConnected: null as string | null
});

// 创建数据库相关
const showCreateDatabase = ref(false);
const creatingDatabase = ref(false);
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

const databaseService = new DatabaseService();


// 生命周期
onMounted(() => {
  loadConnectionStats();
});

// 方法
function loadConnectionStats() {
  // 模拟加载连接统计信息
  connectionStats.value = {
    databaseCount: 8,
    tableCount: 156,
    totalSize: 1024 * 1024 * 512, // 512MB
    lastConnected: '2小时前'
  };
}

function getDbLogoClass(type?: string): string {
  const classMap: Record<string, string> = {
    mysql: 'db-mysql',
    postgres: 'db-postgres',
    sqlite: 'db-sqlite',
    mssql: 'db-mssql',
    oracle: 'db-oracle'
  };
  return classMap[type || ''] || 'db-default';
}

function getDbLogoText(type?: string): string {
  const textMap: Record<string, string> = {
    mysql: 'M',
    postgres: 'P',
    sqlite: 'S',
    mssql: 'MS',
    oracle: 'O'
  };
  return textMap[type || ''] || 'DB';
}

function getDbTypeLabel(type?: string): string {
  const labelMap: Record<string, string> = {
    mysql: 'MySQL',
    postgres: 'PostgreSQL',
    sqlite: 'SQLite',
    mssql: 'SQL Server',
    oracle: 'Oracle'
  };
  return labelMap[type || ''] || type || '';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}


// 操作方法
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

function openSqlQuery() {
  if (props.connection) {
    emit('open-sql-query', props.connection);
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
  showCreateDatabase.value = true;
}

async function createDatabase() {
  if (!props.connection || !newDatabase.value.name.trim()) {
    modal.error('请输入数据库名称');
    return;
  }

  try {
    creatingDatabase.value = true;
    
    // 过滤掉空的选项
    const options = Object.fromEntries(
      Object.entries(newDatabase.value.options).filter(([_, value]) => value !== '')
    );
    
    await databaseService.createDatabase(props.connection.id, newDatabase.value.name, options);
    
    modal.success('数据库创建成功');
    showCreateDatabase.value = false;
    
    // 触发刷新
    emit('create-database');
    emit('refresh-all', props.connection);
  } catch (error: any) {
    console.error('创建数据库失败:', error);
    modal.error(error.message || '创建数据库失败');
  } finally {
    creatingDatabase.value = false;
  }
}
</script>

<style scoped>
.connection-detail {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

/* 连接头部 */
.connection-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.connection-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.connection-avatar {
  flex-shrink: 0;
}

.db-logo {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.connection-meta h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.connection-type-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.db-type {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-online {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-offline {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}

.connection-actions {
  display: flex;
  gap: 0.5rem;
}

/* 详情卡片 */
.connection-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.detail-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-body {
  padding: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 600;
}

.db-type-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.bg-success {
  background: #10b981;
}

.bg-secondary {
  background: #6b7280;
}

/* 快速操作 */
.quick-actions {
  margin-bottom: 2rem;
}

.actions-header {
  margin-bottom: 1rem;
}

.actions-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.action-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.action-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  text-align: center;
}


/* 数据库类型颜色 */
.db-mysql { background: linear-gradient(135deg, #00758f 0%, #005a70 100%); }
.db-postgres { background: linear-gradient(135deg, #336791 0%, #2a5278 100%); }
.db-sqlite { background: linear-gradient(135deg, #003b57 0%, #002d42 100%); }
.db-mssql { background: linear-gradient(135deg, #cc2927 0%, #a62220 100%); }
.db-oracle { background: linear-gradient(135deg, #f80000 0%, #d40000 100%); }
.db-default { background: linear-gradient(135deg, #64748b 0%, #475569 100%); }

/* 动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .connection-cards {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .connection-detail {
    padding: 1rem;
  }
  
  .connection-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .connection-info {
    flex-direction: column;
    text-align: center;
  }
  
  .connection-actions {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>