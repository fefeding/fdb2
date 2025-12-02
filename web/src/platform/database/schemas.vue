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
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>表名</th>
                    <th>类型</th>
                    <th>引擎</th>
                    <th>行数</th>
                    <th>数据大小</th>
                    <th>索引大小</th>
                    <th>字符集</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="table in databaseInfo.tables" :key="table.name">
                    <td>
                      <strong>{{ table.name }}</strong>
                      <br>
                      <small class="text-muted" v-if="table.comment">{{ table.comment }}</small>
                    </td>
                    <td>
                      <span class="badge bg-secondary">{{ table.type }}</span>
                    </td>
                    <td>{{ table.engine || '-' }}</td>
                    <td>{{ formatNumber(table.rowCount) }}</td>
                    <td>{{ formatSize(table.dataSize) }}</td>
                    <td>{{ formatSize(table.indexSize) }}</td>
                    <td>{{ table.collation || '-' }}</td>
                    <td>{{ formatDate(table.createdAt) }}</td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" @click="viewTableData(table)">
                          <i class="bi bi-eye"></i> 数据
                        </button>
                        <button class="btn btn-outline-info" @click="viewTableStructure(table)">
                          <i class="bi bi-diagram-3"></i> 结构
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!databaseInfo.tables || databaseInfo.tables.length === 0">
                    <td colspan="9" class="text-center text-muted py-4">
                      该数据库暂无数据表
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 表结构模态框 -->
    <div class="modal fade" ref="tableModal" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-diagram-3"></i> 表结构 - {{ selectedTable?.name }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
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
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
            <button type="button" class="btn btn-primary" @click="viewTableData(selectedTable!)">
              <i class="bi bi-eye"></i> 查看数据
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Modal } from 'bootstrap';
import { ConnectionService, DatabaseService } from '@/service/database';
import type { ConnectionEntity, TableEntity } from '@/typings/database';

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

const tableModal = ref<HTMLDivElement>();
let tableModalInstance: Modal | null = null;

// 生命周期
onMounted(async () => {
  tableModalInstance = new Modal(tableModal.value!);
  
  // 从路由参数获取连接ID
  if (route.query.connectionId) {
    selectedConnectionId.value = route.query.connectionId as string;
    await loadDatabases();
  }
  
  await loadConnections();
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

// 加载数据库列表
async function loadDatabases() {
  if (!selectedConnectionId.value) return;
  
  try {
    const response = await databaseService.getDatabases(selectedConnectionId.value);
    databases.value = response.data || [];
    selectedDatabase.value = '';
    databaseInfo.value = null;
  } catch (error) {
    console.error('加载数据库列表失败:', error);
  }
}

// 加载数据库详细信息
async function loadDatabaseInfo() {
  if (!selectedConnectionId.value || !selectedDatabase.value) return;
  
  try {
    const response = await databaseService.getDatabaseInfo(selectedConnectionId.value, selectedDatabase.value);
    databaseInfo.value = response.data;
  } catch (error) {
    console.error('加载数据库信息失败:', error);
  }
}

// 查看表数据
function viewTableData(table: TableEntity) {
  if (!selectedConnectionId.value || !selectedDatabase.value) return;
  
  router.push(`/database/tables/${selectedConnectionId.value}/${selectedDatabase.value}/${table.name}`);
  tableModalInstance?.hide();
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
    selectedTableInfo.value = response.data;
    tableModalInstance?.show();
  } catch (error) {
    console.error('加载表结构失败:', error);
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