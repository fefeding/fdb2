<template>
  <div class="database-explorer">
    <div class="explorer-layout">
      <!-- 左侧树形菜单 -->
      <div class="explorer-sidebar">
        <div class="sidebar-header">
          <h5 class="sidebar-title">
            <i class="bi bi-diagram-3"></i>
            数据库浏览器
          </h5>
          <div class="sidebar-actions">
            <button class="btn btn-sm btn-outline-primary" @click="refreshAll" title="刷新">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
            <button class="btn btn-sm btn-outline-success" @click="showAddConnectionModal" title="添加连接">
              <i class="bi bi-plus"></i>
            </button>
          </div>
        </div>
        
        <div class="sidebar-content">
          <!-- 连接树 -->
          <div class="tree-container">
            <div 
              v-for="connection in connections" 
              :key="connection.id" 
              class="tree-node connection-node"
              :class="{ 'selected': selectedConnection?.id === connection.id }"
            >
              <!-- 连接节点 -->
              <div class="node-content connection-content" @click="selectConnection(connection)">
                <div class="node-icon">
                  <div class="db-logo" :class="getDbLogoClass(connection.type)">
                    {{ getDbLogoText(connection.type) }}
                  </div>
                </div>
                <div class="node-label">
                  <span class="connection-name">{{ connection.name }}</span>
                  <span class="connection-type">{{ getDbTypeLabel(connection.type) }}</span>
                </div>
                <div class="node-actions">
                  <button 
                    class="btn btn-sm btn-icon" 
                    @click.stop="editConnection(connection)"
                    title="编辑连接"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-icon" 
                    @click.stop="testConnection(connection)"
                    title="测试连接"
                  >
                    <i class="bi bi-wifi"></i>
                  </button>
                </div>
              </div>
              
              <!-- 数据库子节点 -->
              <div v-if="expandedConnections.has(connection.id)" class="tree-children">
                <div 
                  v-for="database in getDatabasesForConnection(connection.id)"
                  :key="`${connection.id}-${database}`"
                  class="tree-node database-node"
                  :class="{ 'selected': selectedDatabase === database && selectedConnection?.id === connection.id }"
                >
                  <!-- 数据库节点 -->
                  <div class="node-content database-content" @click="selectDatabase(connection, database)">
                    <div class="node-icon">
                      <i class="bi bi-database"></i>
                    </div>
                    <div class="node-label">
                      <span class="database-name">{{ database }}</span>
                    </div>
                    <div class="node-spinner" v-if="loadingDatabases.has(`${connection.id}-${database}`)">
                      <div class="spinner-border spinner-border-sm"></div>
                    </div>
                  </div>
                  
                  <!-- 表子节点 -->
                  <div v-if="expandedDatabases.has(`${connection.id}-${database}`)" class="tree-children">
                    <div 
                      v-for="table in getTablesForDatabase(connection.id, database)"
                      :key="`${connection.id}-${database}-${table.name}`"
                      class="tree-node table-node"
                      :class="{ 'selected': selectedTable?.name === table.name && selectedDatabase === database }"
                    >
                      <!-- 表节点 -->
                      <div class="node-content table-content" @click="selectTable(connection, database, table)">
                        <div class="node-icon">
                          <i class="bi bi-table"></i>
                        </div>
                        <div class="node-label">
                          <span class="table-name">{{ table.name }}</span>
                          <span class="table-info" v-if="table.rowCount !== undefined">{{ formatNumber(table.rowCount) }} 行</span>
                        </div>
                        <div class="node-actions">
                          <button 
                            class="btn btn-sm btn-icon" 
                            @click.stop="viewTableStructure(connection, database, table)"
                            title="查看结构"
                          >
                            <i class="bi bi-diagram-3"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-if="connections.length === 0" class="empty-state">
            <div class="empty-icon">
              <i class="bi bi-inbox"></i>
            </div>
            <div class="empty-text">
              <p>还没有数据库连接</p>
              <button class="btn btn-primary btn-sm" @click="showAddConnectionModal">
                <i class="bi bi-plus"></i> 添加连接
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧内容区域 -->
      <div class="explorer-main">
        <!-- 数据库信息标签页 -->
        <div v-if="selectedConnection && selectedDatabase" class="content-tabs">
          <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item">
              <button 
                class="nav-link" 
                :class="{ active: activeTab === 'overview' }"
                @click="activeTab = 'overview'"
              >
                <i class="bi bi-info-circle"></i> 概览
              </button>
            </li>
            <li class="nav-item">
              <button 
                class="nav-link" 
                :class="{ active: activeTab === 'tables' }"
                @click="activeTab = 'tables'"
              >
                <i class="bi bi-table"></i> 数据表 ({{ databaseInfo?.tableCount || 0 }})
              </button>
            </li>
            <li class="nav-item">
              <button 
                class="nav-link" 
                :class="{ active: activeTab === 'views' }"
                @click="activeTab = 'views'"
              >
                <i class="bi bi-eye"></i> 视图
              </button>
            </li>
            <li class="nav-item">
              <button 
                class="nav-link" 
                :class="{ active: activeTab === 'procedures' }"
                @click="activeTab = 'procedures'"
              >
                <i class="bi bi-gear"></i> 存储过程
              </button>
            </li>
          </ul>

          <div class="tab-content">
            <!-- 概览标签页 -->
            <div v-show="activeTab === 'overview'" class="tab-pane active">
              <div class="overview-section">
                <div class="info-cards">
                  <div class="info-card">
                    <div class="card-icon">
                      <i class="bi bi-database"></i>
                    </div>
                    <div class="card-content">
                      <h6>数据库名</h6>
                      <p class="card-value">{{ selectedDatabase }}</p>
                    </div>
                  </div>
                  <div class="info-card">
                    <div class="card-icon">
                      <i class="bi bi-plugin"></i>
                    </div>
                    <div class="card-content">
                      <h6>连接</h6>
                      <p class="card-value">{{ selectedConnection.name }}</p>
                    </div>
                  </div>
                  <div class="info-card" v-if="databaseInfo">
                    <div class="card-icon">
                      <i class="bi bi-table"></i>
                    </div>
                    <div class="card-content">
                      <h6>表数量</h6>
                      <p class="card-value">{{ databaseInfo.tableCount }}</p>
                    </div>
                  </div>
                  <div class="info-card" v-if="databaseInfo">
                    <div class="card-icon">
                      <i class="bi bi-hdd"></i>
                    </div>
                    <div class="card-content">
                      <h6>大小</h6>
                      <p class="card-value">{{ formatSize(databaseInfo.size) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 数据表标签页 -->
            <div v-show="activeTab === 'tables'" class="tab-pane">
              <div class="table-grid">
                <div 
                  v-for="table in getTablesForDatabase(selectedConnection.id, selectedDatabase)"
                  :key="table.name"
                  class="table-card"
                  @click="selectTable(selectedConnection, selectedDatabase, table)"
                >
                  <div class="card-header">
                    <div class="table-icon">
                      <i class="bi bi-table"></i>
                    </div>
                    <div class="table-name">{{ table.name }}</div>
                  </div>
                  <div class="card-body">
                    <div class="table-stats">
                      <div class="stat">
                        <span class="stat-label">行数</span>
                        <span class="stat-value">{{ formatNumber(table.rowCount || 0) }}</span>
                      </div>
                      <div class="stat">
                        <span class="stat-label">大小</span>
                        <span class="stat-value">{{ formatSize(table.dataSize || 0) }}</span>
                      </div>
                    </div>
                    <div class="table-comment" v-if="table.comment">
                      {{ table.comment }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 视图标签页 -->
            <div v-show="activeTab === 'views'" class="tab-pane">
              <div class="empty-state">
                <i class="bi bi-eye"></i>
                <p>视图功能开发中...</p>
              </div>
            </div>

            <!-- 存储过程标签页 -->
            <div v-show="activeTab === 'procedures'" class="tab-pane">
              <div class="empty-state">
                <i class="bi bi-gear"></i>
                <p>存储过程功能开发中...</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 表信息标签页 -->
        <div v-else-if="selectedTable && selectedConnection && selectedDatabase" class="content-tabs">
          <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item">
              <button 
                class="nav-link" 
                :class="{ active: activeTableTab === 'data' }"
                @click="activeTableTab = 'data'"
              >
                <i class="bi bi-grid"></i> 数据
              </button>
            </li>
            <li class="nav-item">
              <button 
                class="nav-link" 
                :class="{ active: activeTableTab === 'structure' }"
                @click="activeTableTab = 'structure'"
              >
                <i class="bi bi-diagram-3"></i> 结构
              </button>
            </li>
            <li class="nav-item">
              <button 
                class="nav-link" 
                :class="{ active: activeTableTab === 'indexes' }"
                @click="activeTableTab = 'indexes'"
              >
                <i class="bi bi-key"></i> 索引
              </button>
            </li>
            <li class="nav-item">
              <button 
                class="nav-link" 
                :class="{ active: activeTableTab === 'relations' }"
                @click="activeTableTab = 'relations'"
              >
                <i class="bi bi-link-45deg"></i> 关系
              </button>
            </li>
          </ul>

          <div class="tab-content">
            <!-- 数据标签页 -->
            <div v-show="activeTableTab === 'data'" class="tab-pane active">
              <div class="data-toolbar">
                <div class="toolbar-left">
                  <button class="btn btn-sm btn-primary" @click="refreshTableData">
                    <i class="bi bi-arrow-clockwise"></i> 刷新
                  </button>
                  <button class="btn btn-sm btn-success" @click="insertNewRow">
                    <i class="bi bi-plus"></i> 新增
                  </button>
                </div>
                <div class="toolbar-right">
                  <input 
                    type="text" 
                    class="form-control form-control-sm" 
                    placeholder="搜索..."
                    v-model="tableDataSearch"
                  >
                </div>
              </div>
              
              <div class="table-responsive">
                <table class="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th v-for="column in tableColumns" :key="column.name">
                        {{ column.name }}
                        <small class="text-muted d-block">{{ column.type }}</small>
                      </th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in paginatedTableData" :key="index">
                      <td v-for="(value, key) in row" :key="key">
                        {{ formatCellValue(value) }}
                      </td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary btn-sm">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-outline-danger btn-sm">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- 分页 -->
              <nav v-if="tableData.length > pageSize">
                <ul class="pagination pagination-sm">
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <a class="page-link" href="#" @click.prevent="currentPage--">上一页</a>
                  </li>
                  <li 
                    v-for="page in totalPages" 
                    :key="page"
                    class="page-item" 
                    :class="{ active: currentPage === page }"
                  >
                    <a class="page-link" href="#" @click.prevent="currentPage = page">{{ page }}</a>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <a class="page-link" href="#" @click.prevent="currentPage++">下一页</a>
                  </li>
                </ul>
              </nav>
            </div>

            <!-- 结构标签页 -->
            <div v-show="activeTableTab === 'structure'" class="tab-pane">
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
                      <th>注释</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="column in tableStructure?.columns || []" :key="column.name">
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
                      <td>{{ column.comment || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 索引标签页 -->
            <div v-show="activeTableTab === 'indexes'" class="tab-pane">
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
                    <tr v-for="index in tableStructure?.indexes || []" :key="index.name">
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

            <!-- 关系标签页 -->
            <div v-show="activeTableTab === 'relations'" class="tab-pane">
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
                    <tr v-for="fk in tableStructure?.foreignKeys || []" :key="fk.name">
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

        <!-- 默认空状态 -->
        <div v-else class="default-state">
          <div class="default-content">
            <div class="default-icon">
              <i class="bi bi-diagram-3"></i>
            </div>
            <h5>数据库浏览器</h5>
            <p>请从左侧选择一个数据库或表来查看详细信息</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 连接编辑器 -->
    <ConnectionEditor ref="connectionEditorRef" @saved="onConnectionSaved" />
    
    <!-- Toast -->
    <Toast ref="toastRef" />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue';
import { ConnectionService, DatabaseService } from '@/service/database';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import ConnectionEditor from '@/components/connection-editor/index.vue';
import Toast from '@/components/toast/toast.vue';

const connectionService = new ConnectionService();
const databaseService = new DatabaseService();

// 响应式数据
const connections = ref<ConnectionEntity[]>([]);
const selectedConnection = ref<ConnectionEntity | null>(null);
const selectedDatabase = ref<string>('');
const selectedTable = ref<TableEntity | null>(null);

// 树形展开状态
const expandedConnections = ref(new Set<string>());
const expandedDatabases = ref(new Set<string>());

// 加载状态
const loadingDatabases = ref(new Set<string>());
const loadingTables = ref(new Set<string>());

// 数据缓存
const databaseCache = ref<Map<string, string[]>>(new Map());
const tableCache = ref<Map<string, TableEntity[]>>(new Map());
const databaseInfoCache = ref<Map<string, any>>(new Map());

// 标签页状态
const activeTab = ref('overview');
const activeTableTab = ref('data');

// 表数据相关
const tableData = ref<any[]>([]);
const tableStructure = ref<any>(null);
const tableColumns = ref<any[]>([]);
const tableDataSearch = ref('');
const currentPage = ref(1);
const pageSize = ref(50);

// 组件引用
const connectionEditorRef = ref();
const toastRef = ref();

// 计算属性
const databaseInfo = computed(() => {
  if (!selectedConnection.value || !selectedDatabase.value) return null;
  return databaseInfoCache.value.get(`${selectedConnection.value.id}-${selectedDatabase.value}`);
});

const paginatedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return tableData.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(tableData.value.length / pageSize.value);
});

// 生命周期
onMounted(() => {
  loadConnections();
});

// 方法
async function loadConnections() {
  try {
    const response = await connectionService.getAllConnections();
    connections.value = response || [];
  } catch (error) {
    console.error('加载连接失败:', error);
  }
}

function selectConnection(connection: ConnectionEntity) {
  selectedConnection.value = connection;
  selectedDatabase.value = '';
  selectedTable.value = null;
  
  // 切换展开状态
  if (expandedConnections.value.has(connection.id)) {
    expandedConnections.value.delete(connection.id);
  } else {
    expandedConnections.value.add(connection.id);
    loadDatabasesForConnection(connection);
  }
}

async function loadDatabasesForConnection(connection: ConnectionEntity) {
  const cacheKey = connection.id;
  
  // 检查缓存
  if (databaseCache.value.has(cacheKey)) {
    return;
  }
  
  try {
    const databases = await databaseService.getDatabases(connection.id);
    databaseCache.value.set(cacheKey, databases || []);
  } catch (error) {
    console.error('加载数据库失败:', error);
    showToast('错误', `加载数据库失败: ${error.message}`, 'error');
    databaseCache.value.set(cacheKey, []);
  }
}

function selectDatabase(connection: ConnectionEntity, database: string) {
  selectedConnection.value = connection;
  selectedDatabase.value = database;
  selectedTable.value = null;
  activeTab.value = 'overview';
  
  // 展开数据库节点
  const dbKey = `${connection.id}-${database}`;
  if (!expandedDatabases.value.has(dbKey)) {
    expandedDatabases.value.add(dbKey);
    loadTablesForDatabase(connection, database);
    loadDatabaseInfo(connection, database);
  }
}

async function loadTablesForDatabase(connection: ConnectionEntity, database: string) {
  const dbKey = `${connection.id}-${database}`;
  
  if (loadingTables.value.has(dbKey)) return;
  
  loadingTables.value.add(dbKey);
  
  try {
    const info = await databaseService.getDatabaseInfo(connection.id, database);
    const tables = info?.tables || [];
    tableCache.value.set(dbKey, tables);
  } catch (error) {
    console.error('加载表失败:', error);
    tableCache.value.set(dbKey, []);
  } finally {
    loadingTables.value.delete(dbKey);
  }
}

async function loadDatabaseInfo(connection: ConnectionEntity, database: string) {
  const dbKey = `${connection.id}-${database}`;
  
  try {
    const info = await databaseService.getDatabaseInfo(connection.id, database);
    databaseInfoCache.value.set(dbKey, info);
  } catch (error) {
    console.error('加载数据库信息失败:', error);
  }
}

function selectTable(connection: ConnectionEntity, database: string, table: TableEntity) {
  selectedConnection.value = connection;
  selectedDatabase.value = database;
  selectedTable.value = table;
  activeTableTab.value = 'data';
  
  loadTableData(connection, database, table.name);
  loadTableStructure(connection, database, table.name);
}

async function loadTableData(connection: ConnectionEntity, database: string, tableName: string) {
  try {
    const data = await databaseService.getTableData(connection.id, database, tableName);
    tableData.value = data || [];
    currentPage.value = 1;
  } catch (error) {
    console.error('加载表数据失败:', error);
    tableData.value = [];
  }
}

async function loadTableStructure(connection: ConnectionEntity, database: string, tableName: string) {
  try {
    const structure = await databaseService.getTableInfo(connection.id, database, tableName);
    tableStructure.value = structure;
    tableColumns.value = structure?.columns || [];
  } catch (error) {
    console.error('加载表结构失败:', error);
    tableStructure.value = null;
    tableColumns.value = [];
  }
}

function getDatabasesForConnection(connectionId: string): string[] {
  return databaseCache.value.get(connectionId) || [];
}

function getTablesForDatabase(connectionId: string, database: string): TableEntity[] {
  const dbKey = `${connectionId}-${database}`;
  return tableCache.value.get(dbKey) || [];
}

function editConnection(connection: ConnectionEntity) {
  connectionEditorRef.value?.showEditModal(connection);
}

async function testConnection(connection: ConnectionEntity) {
  try {
    const result = await connectionService.testConnection(connection);
    
    if (result) {
      showToast('成功', `连接 "${connection.name}" 测试成功`, 'success');
    } else {
      showToast('失败', `连接 "${connection.name}" 测试失败`, 'error');
    }
  } catch (error) {
    showToast('错误', `连接测试失败: ${error.message}`, 'error');
  }
}

function showAddConnectionModal() {
  connectionEditorRef.value?.showAddModal();
}

function onConnectionSaved() {
  loadConnections();
}

function refreshAll() {
  databaseCache.value.clear();
  tableCache.value.clear();
  databaseInfoCache.value.clear();
  loadConnections();
}

function refreshTableData() {
  if (selectedConnection.value && selectedDatabase.value && selectedTable.value) {
    loadTableData(selectedConnection.value, selectedDatabase.value, selectedTable.value.name);
  }
}

function insertNewRow() {
  showToast('提示', '新增功能开发中...', 'info');
}

function viewTableStructure(connection: ConnectionEntity, database: string, table: TableEntity) {
  selectTable(connection, database, table);
  activeTableTab.value = 'structure';
}

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

function getDbTypeIconClass(type: string): string {
  const classMap: Record<string, string> = {
    mysql: 'db-mysql',
    postgres: 'db-postgres',
    sqlite: 'db-sqlite',
    mssql: 'db-mssql',
    oracle: 'db-oracle'
  };
  return classMap[type] || 'db-default';
}

function getDbLogoClass(type: string): string {
  const classMap: Record<string, string> = {
    mysql: 'db-logo-mysql',
    postgres: 'db-logo-postgres',
    sqlite: 'db-logo-sqlite',
    mssql: 'db-logo-mssql',
    oracle: 'db-logo-oracle'
  };
  return classMap[type] || 'db-logo-default';
}

function getDbLogoText(type: string): string {
  const textMap: Record<string, string> = {
    mysql: 'M',
    postgres: 'P',
    sqlite: 'S',
    mssql: 'MS',
    oracle: 'O'
  };
  return textMap[type] || 'D';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'string') {
    if (value.length > 50) return value.substring(0, 50) + '...';
  }
  return String(value);
}

function showToast(title: string, message: string, type: string = 'success') {
  toastRef.value?.addToast(title, message, type);
}
</script>

<style scoped>
.database-explorer {
  height: calc(100vh - 200px);
  min-height: 600px;
}

.explorer-layout {
  display: flex;
  height: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 左侧边栏 */
.explorer-sidebar {
  width: 350px;
  flex-shrink: 0;
  border-right: 1px solid #e1e5e9;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.sidebar-header {
  padding: 1rem 0.875rem;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #24292f;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-title i {
  color: #656d76;
}

.sidebar-actions {
  display: flex;
  gap: 0.25rem;
}

.sidebar-actions .btn {
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  border: 1px solid #d0d7de;
  background-color: #ffffff;
  color: #24292f;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.sidebar-actions .btn:hover {
  background-color: #f3f4f6;
  border-color: #d0d7de;
}

.sidebar-actions .btn-outline-primary {
  border-color: #0969da;
  color: #0969da;
}

.sidebar-actions .btn-outline-primary:hover {
  background-color: #0969da;
  border-color: #0969da;
  color: #ffffff;
}

.sidebar-actions .btn-outline-success {
  border-color: #1a7f37;
  color: #1a7f37;
}

.sidebar-actions .btn-outline-success:hover {
  background-color: #1a7f37;
  border-color: #1a7f37;
  color: #ffffff;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

/* 树形结构 */
.tree-container {
  font-size: 0.875rem;
  user-select: none;
}

.tree-node {
  margin-bottom: 0;
}

.tree-children {
  margin-left: 0.75rem;
  border-left: 1px solid #e1e5e9;
  padding-left: 0.5rem;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
  position: relative;
  margin-right: 0.5rem;
  border-radius: 6px;
}

.node-content:hover {
  background-color: #f3f4f6;
}

.tree-node.selected .node-content {
  background-color: #eff1ff;
  color: #0969da;
}

.tree-node.selected .node-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #0969da;
  border-radius: 2px 0 0 2px;
}

.node-icon {
  width: 20px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 0.5rem;
}

.node-icon i {
  font-size: 0.875rem;
}

.node-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.connection-name,
.database-name,
.table-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}

.tree-node.selected .connection-name,
.tree-node.selected .database-name,
.tree-node.selected .table-name {
  font-weight: 600;
}

.connection-type,
.table-info {
  font-size: 0.75rem;
  color: #656d76;
  background-color: #f6f8fa;
  padding: 0.125rem 0.375rem;
  border-radius: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.tree-node.selected .connection-type,
.tree-node.selected .table-info {
  background-color: rgba(9, 105, 218, 0.1);
  color: #0969da;
}

.node-actions {
  display: flex;
  gap: 0.125rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.node-content:hover .node-actions {
  opacity: 1;
}

.btn-icon {
  padding: 0.25rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.btn-icon:hover {
  background-color: #e1e4e8;
}

.btn-icon i {
  font-size: 0.6875rem;
  color: #656d76;
}

.tree-node.selected .btn-icon:hover {
  background-color: rgba(9, 105, 218, 0.1);
}

.tree-node.selected .btn-icon i {
  color: #656d76;
}

.tree-node.selected .btn-icon:hover i {
  color: #0969da;
}

.node-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
}

/* 连接节点样式 */
.connection-content {
  font-weight: 500;
  color: #24292f;
}

.connection-content:hover {
  background-color: #f3f4f6;
}

.tree-node.selected .connection-content {
  background-color: #eff1ff;
  color: #0969da;
}

/* 数据库节点样式 */
.database-content {
  color: #24292f;
}

.database-content:hover {
  background-color: #f6f8fa;
}

.tree-node.selected .database-content {
  background-color: #eff1ff;
  color: #0969da;
}

/* 表节点样式 */
.table-content {
  color: #24292f;
}

.table-content:hover {
  background-color: #f6f8fa;
}

.tree-node.selected .table-content {
  background-color: #eff1ff;
  color: #0969da;
}

/* 数据库品牌色彩 */
.db-mysql { 
  color: #00758f !important; 
  background: linear-gradient(135deg, #00758f, #005a70);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.db-mysql-bg { background: linear-gradient(135deg, #00758f, #005a70); }

.db-postgres { 
  color: #336791 !important; 
  background: linear-gradient(135deg, #336791, #2a5278);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.db-postgres-bg { background: linear-gradient(135deg, #336791, #2a5278); }

.db-sqlite { 
  color: #003b57 !important; 
  background: linear-gradient(135deg, #003b57, #002d42);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.db-sqlite-bg { background: linear-gradient(135deg, #003b57, #002d42); }

.db-mssql { 
  color: #cc2927 !important; 
  background: linear-gradient(135deg, #cc2927, #a62220);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.db-mssql-bg { background: linear-gradient(135deg, #cc2927, #a62220); }

.db-oracle { 
  color: #f80000 !important; 
  background: linear-gradient(135deg, #f80000, #d40000);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.db-oracle-bg { background: linear-gradient(135deg, #f80000, #d40000); }

.db-default { 
  color: #64748b !important; 
  background: linear-gradient(135deg, #64748b, #475569);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.db-default-bg { background: linear-gradient(135deg, #64748b, #475569); }

.tree-node.selected .db-mysql,
.tree-node.selected .db-postgres,
.tree-node.selected .db-sqlite,
.tree-node.selected .db-mssql,
.tree-node.selected .db-oracle,
.tree-node.selected .db-default {
  color: white !important;
  background: none;
  -webkit-text-fill-color: white;
}

/* 数据库Logo图标 */
.db-logo {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.db-logo-mysql {
  background: linear-gradient(135deg, #00758f, #005a70);
  border: 1px solid #004d61;
}

.db-logo-postgres {
  background: linear-gradient(135deg, #336791, #2a5278);
  border: 1px solid #244566;
}

.db-logo-sqlite {
  background: linear-gradient(135deg, #003b57, #002d42);
  border: 1px solid #002939;
}

.db-logo-mssql {
  background: linear-gradient(135deg, #cc2927, #a62220);
  border: 1px solid #8b1f1d;
}

.db-logo-oracle {
  background: linear-gradient(135deg, #f80000, #d40000);
  border: 1px solid #b30000;
}

.db-logo-default {
  background: linear-gradient(135deg, #64748b, #475569);
  border: 1px solid #334155;
}

/* 右侧主内容 */
.explorer-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.nav-tabs {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 1rem;
}

.nav-link {
  border: none;
  background: transparent;
  color: #64748b;
  padding: 1rem 1.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.nav-link.active {
  color: #667eea;
  background: white;
  border-bottom: 2px solid #667eea;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* 概览样式 */
.overview-section {
  padding: 1rem 0;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-card {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid #e2e8f0;
}

.card-icon {
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

.card-content h6 {
  margin: 0 0 0.25rem 0;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

.card-value {
  margin: 0;
  color: #1e293b;
  font-weight: 600;
  font-size: 1.1rem;
}

/* 表格网格 */
.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.table-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.table-card .card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.table-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.table-name {
  font-weight: 600;
  color: #1e293b;
}

.table-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.table-comment {
  font-size: 0.75rem;
  color: #64748b;
  font-style: italic;
}

/* 数据工具栏 */
.data-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* 空状态 */
.empty-state,
.default-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  text-align: center;
}

.empty-icon,
.default-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-text h5,
.default-content h5 {
  color: #64748b;
  margin-bottom: 0.5rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .explorer-layout {
    flex-direction: column;
  }
  
  .explorer-sidebar {
    width: 100%;
    height: 40vh;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .info-cards {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .table-grid {
    grid-template-columns: 1fr;
  }
}
</style>