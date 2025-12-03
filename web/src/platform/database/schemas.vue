<template>
  <div class="container-fluid py-4">
    <!-- 连接选择器 -->
    <div class="row mb-4">
      <div class="col-md-4">
        <label class="form-label">选择数据库连接</label>
        <select class="form-select" v-model="selectedConnectionId" @change="loadDatabases">
          <option value="">请选择连接</option>
          <option v-for="conn in connections" :key="conn.id" :value="conn.id">
            {{ conn.name }} ({{ getDbTypeLabel(conn.type) }})
          </option>
        </select>
      </div>
      <div class="col-md-4" v-if="databases.length > 0">
        <label class="form-label">选择数据库</label>
        <select class="form-select" v-model="selectedDatabase" @change="loadDatabaseInfo">
          <option value="">请选择数据库</option>
          <option v-for="db in databases" :key="db" :value="db">{{ db }}</option>
        </select>
      </div>
      <div class="col-md-4" v-if="selectedConnectionId">
        <label class="form-label">操作</label>
        <div class="btn-group w-100" role="group">
          <button type="button" class="btn btn-outline-primary" @click="editCurrentConnection">
            <i class="bi bi-pencil-square me-1"></i>编辑连接
          </button>
          <button type="button" class="btn btn-outline-success" @click="testCurrentConnection">
            <i class="bi bi-wifi me-1"></i>测试连接
          </button>
        </div>
      </div>
    </div>

    <!-- 连接错误提示 -->
    <div v-if="databaseLoadError && selectedConnectionId" class="row mb-4">
      <div class="col-12">
        <div class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <div class="flex-grow-1">
            <strong>连接失败</strong><br>
            无法连接到数据库服务器: {{ databaseLoadError.message || '未知错误' }}
          </div>
          <div class="ms-3">
            <button type="button" class="btn btn-outline-danger btn-sm" @click.stop="editCurrentConnection">
              <i class="bi bi-pencil-square me-1"></i>编辑连接配置
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm ms-2" @click="retryLoadDatabases">
              <i class="bi bi-arrow-clockwise me-1"></i>重试
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-if="selectedConnectionId && !databaseLoadError && databases.length === 0" class="row mb-4">
      <div class="col-12">
        <div class="alert alert-info d-flex align-items-center" role="alert">
          <i class="bi bi-info-circle-fill me-2"></i>
          <div class="flex-grow-1">
            <strong>暂无数据库</strong><br>
            当前连接下没有找到数据库，请检查连接配置或数据库权限。
          </div>
          <div class="ms-3">
            <button type="button" class="btn btn-outline-info btn-sm" @click="editCurrentConnection">
              <i class="bi bi-pencil-square me-1"></i>检查连接配置
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据库信息卡片 -->
    <div v-if="databaseInfo" class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-diagram-3"></i> {{ databaseInfo.name }}
            </h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-3">
                <div class="d-flex align-items-center">
                  <div class="flex-shrink-0">
                    <i class="bi bi-database text-primary fs-2"></i>
                  </div>
                  <div class="flex-grow-1 ms-3">
                    <h6 class="mb-0">表数量</h6>
                    <h4 class="text-primary mb-0">{{ databaseInfo.tableCount }}</h4>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="d-flex align-items-center">
                  <div class="flex-shrink-0">
                    <i class="bi bi-hdd text-success fs-2"></i>
                  </div>
                  <div class="flex-grow-1 ms-3">
                    <h6 class="mb-0">数据大小</h6>
                    <h4 class="text-success mb-0">{{ formatSize(databaseInfo.size) }}</h4>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="d-flex align-items-center">
                  <div class="flex-shrink-0">
                    <i class="bi bi-table text-info fs-2"></i>
                  </div>
                  <div class="flex-grow-1 ms-3">
                    <h6 class="mb-0">字符集</h6>
                    <h4 class="text-info mb-0">{{ databaseInfo.charset || 'N/A' }}</h4>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="d-flex align-items-center">
                  <div class="flex-shrink-0">
                    <i class="bi bi-sort-alpha-down text-warning fs-2"></i>
                  </div>
                  <div class="flex-grow-1 ms-3">
                    <h6 class="mb-0">排序规则</h6>
                    <h4 class="text-warning mb-0">{{ databaseInfo.collation || 'N/A' }}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 表格列表 -->
    <div v-if="databaseInfo" class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">数据表</h5>
          </div>
          <div class="card-body">
            <DataGrid 
              :data="databaseInfo?.tables || []" 
              :columns="tableColumns"
              :isLoading="false"
              :showPagination="false"
            >
              <!-- 自定义列渲染 -->
              <template #name="{ row }">
                <div>
                  <strong>{{ row.name }}</strong>
                  <br>
                  <small class="text-muted" v-if="row.comment">{{ row.comment }}</small>
                </div>
              </template>
              
              <template #type="{ row }">
                <span class="badge bg-secondary">{{ row.type }}</span>
              </template>
              
              <template #engine="{ row }">
                {{ row.engine || '-' }}
              </template>
              
              <template #rowCount="{ row }">
                {{ formatNumber(row.rowCount) }}
              </template>
              
              <template #dataSize="{ row }">
                {{ formatSize(row.dataSize) }}
              </template>
              
              <template #indexSize="{ row }">
                {{ formatSize(row.indexSize) }}
              </template>
              
              <template #collation="{ row }">
                {{ row.collation || '-' }}
              </template>
              
              <template #createdAt="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
              
              <template #actions="{ row }">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary btn-sm" @click="viewTableData(row)" title="查看数据">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button class="btn btn-outline-info btn-sm" @click="viewTableStructure(row)" title="查看结构">
                    <i class="bi bi-diagram-3"></i>
                  </button>
                </div>
              </template>
            </DataGrid>
          </div>
        </div>
      </div>
    </div>

    <!-- 表结构模态框 -->
    <Modal 
      ref="tableModal"
      :title="`表结构 - ${selectedTable?.name}`"
      :closeButton="{ text: '关闭', show: true }"
      :confirmButton="{ text: '查看数据', show: true }"
      :isFullScreen="true"
      @onConfirm="viewTableData(selectedTable!)"
    >
            <ul class="nav nav-tabs" role="tablist">
              <li class="nav-item">
                <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#columns">
                  <i class="bi bi-list-ul"></i> 列信息
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#indexes">
                  <i class="bi bi-key"></i> 索引信息
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#foreign-keys">
                  <i class="bi bi-link-45deg"></i> 外键关系
                </button>
              </li>
            </ul>
            
            <div class="tab-content mt-3">
              <!-- 列信息 -->
              <div class="tab-pane fade show active" id="columns">
                <div class="table-responsive">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>列名</th>
                        <th>数据类型</th>
                        <th>可空</th>
                        <th>默认值</th>
                        <th>主键</th>
                        <th>自增</th>
                        <th>长度</th>
                        <th>注释</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="column in selectedTableInfo?.columns" :key="column.name">
                        <td><strong>{{ column.name }}</strong></td>
                        <td><code>{{ column.type }}</code></td>
                        <td>
                          <span :class="column.nullable ? 'text-warning' : 'text-success'">
                            <i :class="column.nullable ? 'bi bi-unlock' : 'bi bi-lock-fill'"></i>
                            {{ column.nullable ? 'YES' : 'NO' }}
                          </span>
                        </td>
                        <td>{{ column.defaultValue || '-' }}</td>
                        <td>
                          <span v-if="column.isPrimary" class="badge bg-primary">
                            <i class="bi bi-key-fill"></i> 主键
                          </span>
                          <span v-else>-</span>
                        </td>
                        <td>
                          <span v-if="column.isAutoIncrement" class="badge bg-success">
                            <i class="bi bi-arrow-up-circle"></i> 自增
                          </span>
                          <span v-else>-</span>
                        </td>
                        <td>{{ column.length || '-' }}</td>
                        <td>{{ column.comment || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 索引信息 -->
              <div class="tab-pane fade" id="indexes">
                <div class="table-responsive">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>索引名</th>
                        <th>类型</th>
                        <th>唯一</th>
                        <th>列</th>
                        <th>注释</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="index in selectedTableInfo?.indexes" :key="index.name">
                        <td><strong>{{ index.name }}</strong></td>
                        <td>
                          <span class="badge bg-info">{{ index.type }}</span>
                        </td>
                        <td>
                          <span :class="index.unique ? 'text-success' : 'text-secondary'">
                            <i :class="index.unique ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i>
                            {{ index.unique ? '是' : '否' }}
                          </span>
                        </td>
                        <td>
                          <code>{{ index.columns.join(', ') }}</code>
                        </td>
                        <td>{{ index.comment || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 外键关系 -->
              <div class="tab-pane fade" id="foreign-keys">
                <div class="table-responsive">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>约束名</th>
                        <th>本表列</th>
                        <th>目标表</th>
                        <th>目标列</th>
                        <th>删除规则</th>
                        <th>更新规则</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="fk in selectedTableInfo?.foreignKeys" :key="fk.name">
                        <td><strong>{{ fk.name }}</strong></td>
                        <td><code>{{ fk.column }}</code></td>
                        <td><code>{{ fk.referencedTable }}</code></td>
                        <td><code>{{ fk.referencedColumn }}</code></td>
                        <td><span class="badge bg-warning">{{ fk.onDelete }}</span></td>
                        <td><span class="badge bg-info">{{ fk.onUpdate }}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
    </Modal>
    
    <!-- 连接编辑组件 -->
    <ConnectionEditor ref="connectionEditorRef" @saved="onConnectionSaved" />
    
    <!-- Toast组件 -->
    <Toast ref="toastRef" />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ConnectionService, DatabaseService } from '@/service/database';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import Modal from '@/components/modal/index.vue';
import DataGrid from '@/components/dataGrid/index.vue';
import Toast from '@/components/toast/toast.vue';
import ConnectionEditor from '@/components/connection-editor/index.vue';

const router = useRouter();
const route = useRoute();

const connectionService = new ConnectionService();
const databaseService = new DatabaseService();

// 响应式数据
const connections = ref<ConnectionEntity[]>([]);
const databases = ref<string[]>([]);
const selectedConnectionId = ref('');
const selectedDatabase = ref('');
const databaseInfo = ref<any>(null);
const selectedTable = ref<TableEntity | null>(null);
const selectedTableInfo = ref<any>(null);
const databaseLoadError = ref<any>(null);

const tableModal = ref();
const toastRef = ref();
const connectionEditorRef = ref();

// 表格列配置
const tableColumns = ref([
  { name: 'name', text: '表名' },
  { name: 'type', text: '类型' },
  { name: 'engine', text: '引擎' },
  { name: 'rowCount', text: '行数' },
  { name: 'dataSize', text: '数据大小' },
  { name: 'indexSize', text: '索引大小' },
  { name: 'collation', text: '字符集' },
  { name: 'createdAt', text: '创建时间' },
  { name: 'actions', text: '操作' }
]);

// Toast提示方法
function showToast(title: string, message: string, type: string = 'success', duration?: number) {
  toastRef.value?.addToast(title, message, type, duration);
}

// 生命周期
onMounted(async () => {
  // 先加载连接列表
  await loadConnections();
  
  // 从路由参数获取连接ID
  if (route.query.connectionId) {
    selectedConnectionId.value = route.query.connectionId as string;
    // 延迟加载数据库，确保UI更新完成
    setTimeout(() => {
      loadDatabases();
    }, 100);
  }
});

// 加载连接列表
async function loadConnections() {
  try {
    const response = await connectionService.getAllConnections();
    connections.value = response || [];
  } catch (error) {
    console.error('加载连接列表失败:', error);
  }
}

// 加载数据库列表
async function loadDatabases() {
  if (!selectedConnectionId.value) return;
  
  try {
    const response = await databaseService.getDatabases(selectedConnectionId.value);
    databases.value = response || [];
    selectedDatabase.value = '';
    databaseInfo.value = null;
    databaseLoadError.value = null;
  } catch (error) {
    console.error('加载数据库列表失败:', error);
    databases.value = [];
    selectedDatabase.value = '';
    databaseInfo.value = null;
    databaseLoadError.value = error;
    
    // 显示错误提示并提供编辑选项
    showToast('连接失败', `无法连接到数据库: ${error.message || '未知错误'}。请检查连接配置或点击"编辑连接"进行修改。`, 'error');
  }
}

// 加载数据库详细信息
async function loadDatabaseInfo() {
  if (!selectedConnectionId.value || !selectedDatabase.value) return;
  
  try {
    const response = await databaseService.getDatabaseInfo(selectedConnectionId.value, selectedDatabase.value);
    databaseInfo.value = response;
  } catch (error) {
    console.error('加载数据库信息失败:', error);
  }
}

// 查看表数据
function viewTableData(table: TableEntity) {
  if (!selectedConnectionId.value || !selectedDatabase.value) return;
  
  router.push(`/database/tables/${selectedConnectionId.value}/${selectedDatabase.value}/${table.name}`);
  tableModal.value?.hide();
}

// 查看表结构
async function viewTableStructure(table: TableEntity) {
  if (!selectedConnectionId.value || !selectedDatabase.value) return;
  
  try {
    selectedTable.value = table;
    const response = await databaseService.getTableInfo(
      selectedConnectionId.value,
      selectedDatabase.value,
      table.name
    );
    selectedTableInfo.value = response;
    tableModal.value?.show();
  } catch (error) {
    console.error('加载表结构失败:', error);
    showToast('错误', '加载表结构失败: ' + (error.message || '未知错误'), 'error');
  }
}

// 格式化大小
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// 格式化日期
function formatDate(date: string | Date | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
}

// 编辑当前连接
function editCurrentConnection() {
  if (!selectedConnectionId.value) return;
  
  const connection = connections.value.find(c => c.id === selectedConnectionId.value);
  if (connection) {
    connectionEditorRef.value?.showEditModal(connection);
  }
}

// 测试当前连接
async function testCurrentConnection() {
  if (!selectedConnectionId.value) return;
  
  const connection = connections.value.find(c => c.id === selectedConnectionId.value);
  if (connection) {
    try {
      const response = await connectionService.testConnection(connection);
      
      if (response) {
        showToast('成功', `连接 "${connection.name}" 测试成功`, 'success');
        // 测试成功后重新加载数据库列表
        await loadDatabases();
      } else {
        showToast('失败', `连接 "${connection.name}" 测试失败`, 'error');
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      showToast('错误', `连接 "${connection.name}" 测试失败: ${error.message || '未知错误'}`, 'error');
    }
  }
}

// 重试加载数据库列表
async function retryLoadDatabases() {
  if (!selectedConnectionId.value) return;
  
  databaseLoadError.value = null;
  await loadDatabases();
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
.card-body .row > div {
  border-right: 1px solid #dee2e6;
}

.card-body .row > div:last-child {
  border-right: none;
}

.table th {
  border-top: none;
  font-weight: 600;
}

.badge {
  font-size: 0.75em;
}
</style>