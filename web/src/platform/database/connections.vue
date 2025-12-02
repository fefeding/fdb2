<template>
  <div class="container-fluid py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4><i class="bi bi-database-add"></i> 数据库连接管理</h4>
      <button class="btn btn-primary" @click="showAddModal">
        <i class="bi bi-plus-lg"></i> 新增连接
      </button>
    </div>

    <!-- 连接列表 -->
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>类型</th>
                    <th>主机</th>
                    <th>端口</th>
                    <th>数据库</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="connection in connections" :key="connection.id">
                    <td>
                      <strong>{{ connection.name }}</strong>
                      <br>
                      <small class="text-muted">{{ connection.type }}</small>
                    </td>
                    <td>
                      <span class="badge bg-info">
                        <i :class="getDbTypeIcon(connection.type)"></i>
                        {{ getDbTypeLabel(connection.type) }}
                      </span>
                    </td>
                    <td>{{ connection.host }}</td>
                    <td>{{ connection.port }}</td>
                    <td>{{ connection.database }}</td>
                    <td>
                      <span :class="connection.enabled ? 'text-success' : 'text-secondary'">
                        <i :class="connection.enabled ? 'bi bi-circle-fill' : 'bi bi-circle'"></i>
                        {{ connection.enabled ? '启用' : '禁用' }}
                      </span>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" @click="testConnection(connection)">
                          <i class="bi bi-check-lg"></i> 测试
                        </button>
                        <button class="btn btn-outline-info" @click="viewDatabases(connection)">
                          <i class="bi bi-folder"></i> 查看
                        </button>
                        <button class="btn btn-outline-secondary" @click="editConnection(connection)">
                          <i class="bi bi-pencil"></i> 编辑
                        </button>
                        <button class="btn btn-outline-danger" @click="deleteConnection(connection)">
                          <i class="bi bi-trash"></i> 删除
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="connections.length === 0">
                    <td colspan="7" class="text-center text-muted py-4">
                      暂无数据库连接配置
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑连接模态框 -->
    <div class="modal fade" ref="connectionModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editingConnection ? '编辑数据库连接' : '新增数据库连接' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveConnection">
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">连接名称 <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" v-model="connectionForm.name" required>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">数据库类型 <span class="text-danger">*</span></label>
                    <select class="form-select" v-model="connectionForm.type" @change="onTypeChange" required>
                      <option value="">请选择数据库类型</option>
                      <option v-for="dbType in databaseTypes" :key="dbType.value" :value="dbType.value">
                        {{ dbType.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="row" v-if="connectionForm.type !== 'sqlite'">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">主机地址 <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" v-model="connectionForm.host" 
                           placeholder="localhost" required>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">端口 <span class="text-danger">*</span></label>
                    <input type="number" class="form-control" v-model="connectionForm.port" required>
                  </div>
                </div>
              </div>

              <div class="row" v-if="connectionForm.type === 'sqlite'">
                <div class="col-12">
                  <div class="mb-3">
                    <label class="form-label">数据库文件路径 <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" v-model="connectionForm.database" 
                           placeholder="/path/to/database.db" required>
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">数据库名称</label>
                    <input type="text" class="form-control" v-model="connectionForm.database"
                           v-if="connectionForm.type !== 'sqlite'">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">用户名</label>
                    <input type="text" class="form-control" v-model="connectionForm.username"
                           v-if="connectionForm.type !== 'sqlite'">
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">密码</label>
                    <input type="password" class="form-control" v-model="connectionForm.password"
                           v-if="connectionForm.type !== 'sqlite'">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <div class="form-check mt-4">
                      <input class="form-check-input" type="checkbox" v-model="connectionForm.enabled" id="enabled">
                      <label class="form-check-label" for="enabled">
                        启用连接
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" @click="saveConnection">
              {{ editingConnection ? '更新' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
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
</script>

<style scoped>
.table td {
  vertical-align: middle;
}

.badge {
  font-size: 0.8em;
}

.btn-group-sm > .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
</style>