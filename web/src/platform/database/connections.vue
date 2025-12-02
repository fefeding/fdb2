<template>
  <div class="connections-page">
    <!-- 页面头部 - 现代设计 -->
    <div class="page-header-modern">
      <div class="container-fluid">
        <div class="row align-items-center">
          <div class="col-md-6">
            <div class="header-content">
              <div class="header-icon">
                <i class="bi bi-plugin"></i>
              </div>
              <div class="header-text">
                <h1 class="header-title">数据库连接管理</h1>
                <p class="header-subtitle">配置和管理您的数据库连接</p>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="header-actions">
              <button class="btn-modern btn-primary-modern" @click="showAddModal">
                <i class="bi bi-plus-lg"></i>
                <span>新增连接</span>
                <div class="btn-glow"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="container-fluid mb-6">
      <div class="stats-grid">
        <div class="stat-card-modern">
          <div class="stat-icon stat-blue">
            <i class="bi bi-database"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ connections.length }}</div>
            <div class="stat-label">总连接数</div>
          </div>
        </div>
        <div class="stat-card-modern">
          <div class="stat-icon stat-green">
            <i class="bi bi-check-circle"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ enabledConnections }}</div>
            <div class="stat-label">已启用</div>
          </div>
        </div>
        <div class="stat-card-modern">
          <div class="stat-icon stat-purple">
            <i class="bi bi-diagram-3"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ dbTypesCount }}</div>
            <div class="stat-label">数据库类型</div>
          </div>
        </div>
        <div class="stat-card-modern">
          <div class="stat-icon stat-orange">
            <i class="bi bi-activity"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ onlineConnections }}</div>
            <div class="stat-label">在线状态</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 连接列表 - 现代卡片设计 -->
    <div class="container-fluid">
      <div class="connections-grid" v-if="connections.length > 0">
        <div class="connection-card-modern" v-for="connection in connections" :key="connection.id">
          <div class="card-header-modern">
            <div class="connection-info">
              <div class="connection-avatar" :class="getDbTypeClass(connection.type)">
                <i :class="getDbTypeIcon(connection.type)"></i>
              </div>
              <div class="connection-details">
                <h3 class="connection-name">{{ connection.name }}</h3>
                <p class="connection-type">{{ getDbTypeLabel(connection.type) }}</p>
              </div>
            </div>
            <div class="connection-status">
              <div class="status-indicator" :class="connection.enabled ? 'status-online' : 'status-offline'">
                <div class="status-dot"></div>
                <span class="status-text">{{ connection.enabled ? '启用' : '禁用' }}</span>
              </div>
            </div>
          </div>
          
          <div class="card-body-modern">
            <div class="connection-meta">
              <div class="meta-item">
                <div class="meta-icon">
                  <i class="bi bi-hdd-network"></i>
                </div>
                <div class="meta-content">
                  <span class="meta-label">主机</span>
                  <span class="meta-value">{{ connection.host }}</span>
                </div>
              </div>
              <div class="meta-item">
                <div class="meta-icon">
                  <i class="bi bi-door-open"></i>
                </div>
                <div class="meta-content">
                  <span class="meta-label">端口</span>
                  <span class="meta-value">{{ connection.port }}</span>
                </div>
              </div>
              <div class="meta-item" v-if="connection.database">
                <div class="meta-icon">
                  <i class="bi bi-database"></i>
                </div>
                <div class="meta-content">
                  <span class="meta-label">数据库</span>
                  <span class="meta-value">{{ connection.database }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-footer-modern">
            <div class="action-buttons">
              <button class="btn-action btn-test" @click="testConnection(connection)">
                <i class="bi bi-arrow-repeat"></i>
                <span>测试</span>
              </button>
              <button class="btn-action btn-view" @click="viewDatabases(connection)">
                <i class="bi bi-folder2-open"></i>
                <span>查看</span>
              </button>
              <button class="btn-action btn-edit" @click="editConnection(connection)">
                <i class="bi bi-pencil-square"></i>
                <span>编辑</span>
              </button>
              <button class="btn-action btn-delete" @click="deleteConnection(connection)">
                <i class="bi bi-trash3"></i>
                <span>删除</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div class="empty-state-modern" v-else>
        <div class="empty-icon">
          <i class="bi bi-inbox"></i>
        </div>
        <h3 class="empty-title">暂无数据库连接</h3>
        <p class="empty-description">开始添加您的第一个数据库连接配置</p>
        <button class="btn-modern btn-primary-modern" @click="showAddModal">
          <i class="bi bi-plus-lg"></i>
          <span>添加连接</span>
        </button>
      </div>
    </div>

    <!-- 现代化添加/编辑连接模态框 -->
    <div class="modal fade" ref="connectionModal" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content-modern">
          <div class="modal-header-modern">
            <div class="modal-title-wrapper">
              <div class="modal-icon">
                <i :class="editingConnection ? 'bi bi-pencil-square' : 'bi bi-plus-lg'"></i>
              </div>
              <div class="modal-title-text">
                <h2 class="modal-title">
                  {{ editingConnection ? '编辑数据库连接' : '新增数据库连接' }}
                </h2>
                <p class="modal-subtitle">配置数据库连接参数</p>
              </div>
            </div>
            <button type="button" class="btn-close-modern" data-bs-dismiss="modal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body-modern">
            <form @submit.prevent="saveConnection" class="connection-form-modern">
              <!-- 基本信息 -->
              <div class="form-section">
                <div class="section-header">
                  <div class="section-icon">
                    <i class="bi bi-info-circle"></i>
                  </div>
                  <h3 class="section-title">基本信息</h3>
                </div>
                <div class="section-content">
                  <div class="form-grid">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        <i class="bi bi-tag me-2"></i>连接名称 <span class="required">*</span>
                      </label>
                      <input type="text" class="form-control-modern" v-model="connectionForm.name" 
                             placeholder="为连接起一个易记的名称" required>
                    </div>
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        <i class="bi bi-diagram-3 me-2"></i>数据库类型 <span class="required">*</span>
                      </label>
                      <select class="form-select-modern" v-model="connectionForm.type" @change="onTypeChange" required>
                        <option value="">请选择数据库类型</option>
                        <option v-for="dbType in databaseTypes" :key="dbType.value" :value="dbType.value">
                          {{ dbType.label }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 连接配置 -->
              <div class="form-section" v-if="connectionForm.type !== 'sqlite'">
                <div class="section-header">
                  <div class="section-icon">
                    <i class="bi bi-hdd-network"></i>
                  </div>
                  <h3 class="section-title">连接配置</h3>
                </div>
                <div class="section-content">
                  <div class="form-grid">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        <i class="bi bi-router me-2"></i>主机地址 <span class="required">*</span>
                      </label>
                      <input type="text" class="form-control-modern" v-model="connectionForm.host" 
                             placeholder="localhost 或 IP 地址" required>
                    </div>
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        <i class="bi bi-door-open me-2"></i>端口 <span class="required">*</span>
                      </label>
                      <input type="number" class="form-control-modern" v-model="connectionForm.port" required>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SQLite 特殊配置 -->
              <div class="form-section" v-if="connectionForm.type === 'sqlite'">
                <div class="section-header">
                  <div class="section-icon">
                    <i class="bi bi-file-earmark-text"></i>
                  </div>
                  <h3 class="section-title">文件路径</h3>
                </div>
                <div class="section-content">
                  <div class="form-group-modern">
                    <label class="form-label-modern">
                      <i class="bi bi-folder2-open me-2"></i>数据库文件路径 <span class="required">*</span>
                    </label>
                    <input type="text" class="form-control-modern" v-model="connectionForm.database" 
                           placeholder="/path/to/database.db" required>
                  </div>
                </div>
              </div>

              <!-- 认证信息 -->
              <div class="form-section" v-if="connectionForm.type !== 'sqlite'">
                <div class="section-header">
                  <div class="section-icon">
                    <i class="bi bi-shield-lock"></i>
                  </div>
                  <h3 class="section-title">认证信息</h3>
                </div>
                <div class="section-content">
                  <div class="form-grid">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        <i class="bi bi-database me-2"></i>数据库名称
                      </label>
                      <input type="text" class="form-control-modern" v-model="connectionForm.database"
                             placeholder="数据库名称">
                    </div>
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        <i class="bi bi-person me-2"></i>用户名
                      </label>
                      <input type="text" class="form-control-modern" v-model="connectionForm.username"
                             placeholder="数据库用户名">
                    </div>
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        <i class="bi bi-key me-2"></i>密码
                      </label>
                      <input type="password" class="form-control-modern" v-model="connectionForm.password"
                             placeholder="数据库密码">
                    </div>
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        <i class="bi bi-toggle-on me-2"></i>连接状态
                      </label>
                      <div class="form-check-modern">
                        <input class="form-check-input-modern" type="checkbox" v-model="connectionForm.enabled" id="enabled">
                        <label class="form-check-label-modern" for="enabled">
                          <span class="check-text">启用此连接</span>
                          <span class="check-description">创建后将自动启用连接</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer-modern">
            <button type="button" class="btn-modern btn-secondary-modern" data-bs-dismiss="modal">
              <i class="bi bi-x-lg me-2"></i>取消
            </button>
            <button type="button" class="btn-modern btn-primary-modern" @click="saveConnection">
              <i class="bi bi-check-lg me-2"></i>{{ editingConnection ? '更新连接' : '保存连接' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Modal } from 'bootstrap';
import { ConnectionService } from '@/service/database';
import type { ConnectionEntity } from '@/typings/database';

const router = useRouter();
const connectionService = new ConnectionService();

// 响应式数据
const connections = ref<ConnectionEntity[]>([]);
const databaseTypes = ref<any[]>([]);
const connectionModal = ref<HTMLDivElement>();
let modalInstance: Modal | null = null;

// 计算属性
const enabledConnections = computed(() => connections.value.filter(c => c.enabled).length);
const dbTypesCount = computed(() => {
  const types = new Set(connections.value.map(c => c.type));
  return types.size;
});
const onlineConnections = computed(() => {
  // 这里应该是实际测试连接状态，暂时假设所有启用的连接都在线
  return enabledConnections.value;
});

// 表单数据
const editingConnection = ref<ConnectionEntity | null>(null);
const connectionForm = ref<ConnectionEntity>({
  id: '',
  name: '',
  type: '',
  host: 'localhost',
  port: 3306,
  database: '',
  username: '',
  password: '',
  options: {},
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 生命周期
onMounted(async () => {
  modalInstance = new Modal(connectionModal.value!);
  await loadConnections();
  await loadDatabaseTypes();
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

// 加载数据库类型
async function loadDatabaseTypes() {
  try {
    const response = await connectionService.getDatabaseTypes();
    databaseTypes.value = response.data || [];
  } catch (error) {
    console.error('加载数据库类型失败:', error);
  }
}

// 显示添加模态框
function showAddModal() {
  editingConnection.value = null;
  connectionForm.value = {
    id: '',
    name: '',
    type: '',
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: '',
    options: {},
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  modalInstance?.show();
}

// 编辑连接
function editConnection(connection: ConnectionEntity) {
  editingConnection.value = connection;
  connectionForm.value = { ...connection };
  modalInstance?.show();
}

// 数据库类型变更
function onTypeChange() {
  const selectedType = databaseTypes.value.find(t => t.value === connectionForm.value.type);
  if (selectedType?.defaultPort) {
    connectionForm.value.port = selectedType.defaultPort;
  }
}

// 保存连接
async function saveConnection() {
  try {
    if (editingConnection.value) {
      await connectionService.updateConnection(editingConnection.value.id!, connectionForm.value);
    } else {
      await connectionService.addConnection(connectionForm.value);
    }
    
    modalInstance?.hide();
    await loadConnections();
  } catch (error) {
    console.error('保存连接失败:', error);
    alert(error.message || '保存失败');
  }
}

// 测试连接
async function testConnection(connection: ConnectionEntity) {
  try {
    const response = await connectionService.testConnection(connection);
    if (response.data?.connected) {
      alert('连接测试成功！');
    } else {
      alert('连接测试失败！');
    }
  } catch (error) {
    console.error('测试连接失败:', error);
    alert('连接测试失败: ' + (error.message || '未知错误'));
  }
}

// 查看数据库
function viewDatabases(connection: ConnectionEntity) {
  router.push(`/database/schemas?connectionId=${connection.id}`);
}

// 删除连接
async function deleteConnection(connection: ConnectionEntity) {
  if (!confirm(`确定要删除连接 "${connection.name}" 吗？`)) {
    return;
  }

  try {
    await connectionService.deleteConnection(connection.id!);
    await loadConnections();
  } catch (error) {
    console.error('删除连接失败:', error);
    alert(error.message || '删除失败');
  }
}

// 获取数据库类型图标
function getDbTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    mysql: 'bi-database',
    postgres: 'bi-database',
    sqlite: 'bi-database',
    mssql: 'bi-database',
    oracle: 'bi-database'
  };
  return iconMap[type] || 'bi-database';
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

// 获取数据库类型样式类
function getDbTypeClass(type: string): string {
  const classMap: Record<string, string> = {
    mysql: 'db-mysql',
    postgres: 'db-postgres',
    sqlite: 'db-sqlite',
    mssql: 'db-mssql',
    oracle: 'db-oracle'
  };
  return classMap[type] || 'db-default';
}
</script>

<style scoped>
/* 页面布局 */
.connections-page {
  min-height: calc(100vh - 200px);
  background: transparent;
}

/* 页面头部 */
.page-header-modern {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  padding: 2rem 0;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
}

.page-header-modern::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23667eea' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
  opacity: 0.3;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.75rem;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}

.header-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
  letter-spacing: -0.025em;
}

.header-subtitle {
  color: #64748b;
  font-size: 1rem;
  margin-bottom: 0;
}

.header-actions {
  display: flex;
  justify-content: end;
  align-items: center;
}

/* 现代按钮样式 */
.btn-modern {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  text-decoration: none;
}

.btn-primary-modern {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary-modern {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-secondary-modern:hover {
  background: #e2e8f0;
  color: #475569;
}

.btn-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn-modern:active .btn-glow {
  width: 300px;
  height: 300px;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card-modern {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(226, 232, 240, 0.5);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card-modern::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(135deg, transparent, rgba(102, 126, 234, 0.2));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card-modern:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06);
}

.stat-card-modern:hover::before {
  opacity: 1;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.stat-green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.stat-purple { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
.stat-orange { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

/* 连接卡片网格 */
.connections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

/* 现代连接卡片 */
.connection-card-modern {
  background: white;
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.5);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
}

.connection-card-modern:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.08);
}

/* 卡片头部 */
.card-header-modern {
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.connection-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.connection-avatar {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* 数据库类型颜色 */
.db-mysql { background: linear-gradient(135deg, #00758f 0%, #005a70 100%); }
.db-postgres { background: linear-gradient(135deg, #336791 0%, #2a5278 100%); }
.db-sqlite { background: linear-gradient(135deg, #003b57 0%, #002d42 100%); }
.db-mssql { background: linear-gradient(135deg, #cc2927 0%, #a62220 100%); }
.db-oracle { background: linear-gradient(135deg, #f80000 0%, #d40000 100%); }
.db-default { background: linear-gradient(135deg, #64748b 0%, #475569 100%); }

.connection-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.connection-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0;
  line-height: 1.2;
}

.connection-type {
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 0;
  font-weight: 500;
}

/* 状态指示器 */
.connection-status {
  flex-shrink: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.status-online {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  border-color: #34d399;
}

.status-offline {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
  border-color: #94a3b8;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}

/* 卡片主体 */
.card-body-modern {
  padding: 1.5rem;
}

.connection-meta {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.meta-item:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  transform: translateX(4px);
}

.meta-icon {
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  font-size: 0.875rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.meta-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-grow: 1;
}

.meta-label {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 0.9rem;
  color: #1e293b;
  font-weight: 600;
}

/* 卡片底部 */
.card-footer-modern {
  padding: 1.5rem;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.btn-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  border: none;
  background: none;
  color: #64748b;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.btn-action:hover {
  background: white;
  transform: translateY(-2px);
}

.btn-action i {
  font-size: 1rem;
}

.btn-test:hover { color: #3b82f6; background: #eff6ff; }
.btn-view:hover { color: #10b981; background: #f0fdf4; }
.btn-edit:hover { color: #f59e0b; background: #fffbeb; }
.btn-delete:hover { color: #ef4444; background: #fef2f2; }

/* 空状态 */
.empty-state-modern {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 20px;
  border: 2px dashed #e2e8f0;
}

.empty-icon {
  font-size: 4rem;
  color: #cbd5e1;
  margin-bottom: 1.5rem;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.75rem;
}

.empty-description {
  color: #94a3b8;
  font-size: 1rem;
  margin-bottom: 2rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* 现代模态框样式 */
.modal-content-modern {
  background: white;
  border: none;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header-modern {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.modal-subtitle {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 0;
}

.btn-close-modern {
  width: 40px;
  height: 40px;
  border: none;
  background: #f1f5f9;
  border-radius: 10px;
  color: #64748b;
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-modern:hover {
  background: #e2e8f0;
  color: #ef4444;
  transform: rotate(90deg);
}

.modal-body-modern {
  padding: 2rem;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-footer-modern {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* 现代表单样式 */
.connection-form-modern {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: white;
}

.section-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.section-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.125rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0;
}

.section-content {
  padding: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.form-group-modern {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label-modern {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.required {
  color: #ef4444;
  font-weight: 700;
}

.form-control-modern,
.form-select-modern {
  padding: 0.875rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  background: white;
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-check-modern {
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.form-check-input-modern {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  accent-color: #667eea;
}

.form-check-label-modern {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.check-text {
  font-weight: 600;
  color: #374151;
}

.check-description {
  font-size: 0.8rem;
  color: #6b7280;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .connections-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }
  
  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header-modern {
    padding: 1.5rem 0;
  }
  
  .header-content {
    gap: 1rem;
  }
  
  .header-icon {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
  
  .header-title {
    font-size: 1.5rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .connections-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-dialog-modal-xl {
    margin: 1rem;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-header-modern .row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    justify-content: start;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
  }
  
  .modal-header-modern,
  .modal-body-modern,
  .modal-footer-modern {
    padding: 1rem;
  }
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>