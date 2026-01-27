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
              :class="{ 'selected': selectedConnection?.id === connection.id && !selectedDatabase && !selectedTable }"
            >
              <!-- 连接节点 -->
              <div class="node-content connection-content">
                <div class="node-expand" @click="toggleConnection(connection)">
                  <i class="bi bi-chevron-right" :class="{ 'expanded': expandedConnections.has(connection.id) }"></i>
                </div>
                <div class="node-main" @click="selectConnection(connection)">
                  <div class="node-icon">
                    <div class="db-logo" :class="getDbLogoClass(connection.type)">
                      {{ getDbLogoText(connection.type) }}
                    </div>
                  </div>
                  <div class="node-label">
                    <span class="connection-name">{{ connection.name }}</span>
                    <span class="connection-type">{{ getDbTypeLabel(connection.type) }}</span>
                  </div>
                </div>
                <div class="node-actions">
                  <button 
                    class="btn btn-sm btn-icon" 
                    @click.stop="refreshConnection(connection)"
                    title="刷新连接"
                  >
                    <i class="bi bi-arrow-clockwise"></i>
                  </button>
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
                  <button 
                    class="btn btn-sm btn-icon btn-icon-danger" 
                    @click.stop="deleteConnection(connection)"
                    title="删除连接"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <div class="node-spinner" v-if="loadingConnections.has(connection.id)">
                  <div class="spinner-border spinner-border-sm"></div>
                </div>
              </div>
              
              <!-- 数据库子节点 -->
              <div v-if="expandedConnections.has(connection.id)" class="tree-children">
                <div 
                  v-for="database in getDatabasesForConnection(connection.id)"
                  :key="`${connection.id}-${database}`"
                  class="tree-node database-node"
                  :class="{ 'selected': selectedDatabase === database && selectedConnection?.id === connection.id && !selectedTable }"
                >
                  <!-- 数据库节点 -->
                  <div class="node-content database-content">
                    <div class="node-expand" @click="toggleDatabase(connection, database)">
                      <i class="bi bi-chevron-right" :class="{ 'expanded': expandedDatabases.has(`${connection.id}-${database}`) }"></i>
                    </div>
                    <div class="node-main" @click="selectDatabase(connection, database)">
                      <div class="node-icon">
                        <i class="bi bi-database"></i>
                      </div>
                      <div class="node-label">
                        <span class="database-name">{{ database }}</span>
                      </div>
                    </div>
                    <div class="node-actions">
                      <button 
                        class="btn btn-sm btn-icon" 
                        @click.stop="refreshDatabase(connection, database)"
                        title="刷新数据库"
                      >
                        <i class="bi bi-arrow-clockwise"></i>
                      </button>
                      <button 
                        class="btn btn-sm btn-icon btn-icon-danger" 
                        @click.stop="deleteDatabase(connection, database)"
                        title="删除数据库"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
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
                      :class="{ 'selected': selectedTable?.name === table.name && selectedDatabase === database && selectedConnection?.id === connection.id }"
                    >
                      <!-- 表节点 -->
                      <div class="node-content table-content">
                        <div class="node-icon">
                          <i class="bi bi-table"></i>
                        </div>
                        <div class="node-main" @click="selectTable(connection, database, table)">
                          <div class="node-label">
                            <span class="table-name">{{ table.name }}</span>
                            <span class="table-info" v-if="table.rowCount !== undefined">{{ formatNumber(table.rowCount) }} 行</span>
                          </div>
                        </div>
                        <div class="node-actions">
                          <button 
                            class="btn btn-sm btn-icon" 
                            @click.stop="refreshTable(connection, database, table)"
                            title="刷新表"
                          >
                            <i class="bi bi-arrow-clockwise"></i>
                          </button>
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
        <!-- 连接详情组件 -->
        <ConnectionDetail 
          v-if="selectedConnection && !selectedDatabase && !selectedTable"
          :connection="selectedConnection"
          @test-connection="handleTestConnection"
          @edit-connection="handleEditConnection"
          @refresh-all="handleRefreshAll"
          @open-sql-query="handleOpenSqlQuery"
          @export-schema="handleExportSchema"
          @view-logs="handleViewLogs"
        />

        <!-- 数据库详情组件 -->
        <DatabaseDetail 
          v-else-if="selectedConnection && selectedDatabase && !selectedTable"
          :connection="selectedConnection"
          :database="selectedDatabase"
          :tables="getTablesForDatabase(selectedConnection.id||'', selectedDatabase)"
          :database-info="databaseInfo"
          :loading="loadingDatabases.has(`${selectedConnection.id}-${selectedDatabase}`)"
          @select-table="selectTable"
          @refresh-database="handleRefreshDatabase"
          @create-table="handleCreateTable"
          @execute-sql="handleExecuteSql"
        />

        <!-- 表详情组件 -->
        <TableDetail 
          v-else-if="selectedConnection && selectedDatabase && selectedTable"
          :connection="selectedConnection"
          :database="selectedDatabase"
          :table="selectedTable"
          :table-data="tableData"
          :table-structure="tableStructure"
          :loading="isGlobalLoading"
          :total="totalRecords"
          :sql-result="sqlResult"
          :sql-executing="sqlExecuting"
          @refresh-data="refreshTableData"
          @refresh-database="handleRefreshDatabase"
          @refresh-structure="handleRefreshStructure"
          @insert-data="handleInsertData"
          @export-table="handleExportTable"
          @truncate-table="handleTruncateTable"
          @edit-row="handleEditRow"
          @delete-row="handleDeleteRow"
          @execute-sql="handleExecuteSql"
        />

        <!-- 默认空状态 -->
        <div v-else class="default-state">
          <div class="default-content">
            <div class="default-icon">
              <i class="bi bi-diagram-3"></i>
            </div>
            <h5>数据库浏览器</h5>
            <p>请从左侧选择一个连接、数据库或表来查看详细信息</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 全局Loading -->
    <!-- <Loading :isLoading="isGlobalLoading" :message="loadingMessage" /> -->
    
    <!-- 连接编辑器 -->
    <ConnectionEditor ref="connectionEditorRef" @saved="onConnectionSaved" />
    
    <!-- Toast -->
    <Toast ref="toastRef" />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ConnectionService, DatabaseService } from '@/service/database';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import ConnectionEditor from '@/components/connection-editor/index.vue';
import Toast from '@/components/toast/toast.vue';
import Loading from '@/components/loading/index.vue';
import ConnectionDetail from './components/connection-detail.vue';
import DatabaseDetail from './components/database-detail.vue';
import TableDetail from './components/table-detail.vue';
import { modal } from '@/utils/modal';

const route = useRoute();
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
const loadingConnections = ref(new Set<string>());

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
const totalRecords = ref(0);

// SQL执行结果
const sqlResult = ref<any>(null);
const sqlExecuting = ref(false);

// 全局Loading状态
const isGlobalLoading = ref(false);
const loadingMessage = ref('加载中...');

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
  loadConnections().then(() => {
    // 加载连接后处理 URL query 参数
    handleRouteQuery();
  });
});

// 处理 URL query 参数
function handleRouteQuery() {
  const connectionId = route.query.connectionId as string;
  const database = route.query.database as string;
  
  if (connectionId) {
    // 查找对应的连接
    const connection = connections.value.find(conn => conn.id === connectionId);
    if (connection) {
      // 选择连接
      selectConnection(connection);
      
      // 展开连接节点并加载数据库
      if (!expandedConnections.value.has(connectionId)) {
        expandedConnections.value.add(connectionId);
        loadDatabasesForConnection(connection);
      }
      
      // 如果提供了数据库参数，选择数据库
      if (database) {
        setTimeout(() => {
          selectDatabase(connection, database);
          
          // 展开数据库节点
          const dbKey = `${connectionId}-${database}`;
          if (!expandedDatabases.value.has(dbKey)) {
            expandedDatabases.value.add(dbKey);
            loadDatabaseInfo(connection, database);
            loadTablesForDatabase(connection, database);
          }
        }, 100);
      }
    }
  }
}

// 监听 route.query 变化
watch(() => route.query, () => {
  // 当 query 参数变化时，重新处理
  handleRouteQuery();
}, { deep: true });

// 方法
async function loadConnections() {
  try {
    const response = await connectionService.getAllConnections();
    connections.value = (response as any)?.data || [];
  } catch (error) {
    console.error('加载连接失败:', error);
    modal.error(error.msg || error.message || '加载连接失败', {
      operation: 'LOAD_CONNECTIONS',
      stack: error.stack
    });
  }
}

function toggleConnection(connection: ConnectionEntity) {
  const connectionId = connection.id || '';
  if (expandedConnections.value.has(connectionId)) {
    expandedConnections.value.delete(connectionId);
  } else {
    expandedConnections.value.add(connectionId);
    loadDatabasesForConnection(connection);
  }
}

function selectConnection(connection: ConnectionEntity) {
  selectedConnection.value = connection;
  selectedDatabase.value = '';
  selectedTable.value = null;
  activeTab.value = 'overview';
}

async function loadDatabasesForConnection(connection: ConnectionEntity, forceRefresh = false) {
  const cacheKey = connection.id || '';
  
  // 检查缓存
  if (!forceRefresh && databaseCache.value.has(cacheKey)) {
    return;
  }
  
  if (!loadingConnections.value.has(cacheKey)) {
    loadingConnections.value.add(cacheKey);
  }
  
  try {
    const databases = await databaseService.getDatabases(cacheKey);
    databaseCache.value.set(cacheKey, (databases as any)?.data || []);
  } catch (error) {
    console.error('加载数据库失败:', error);
    
    modal.error(error.msg || error.message || '加载数据库失败', {
      operation: 'LOAD_DATABASES',
      connectionId: connection.id,
      stack: error.stack
    });
    databaseCache.value.set(cacheKey, []);
  } finally {
    loadingConnections.value.delete(cacheKey);
  }
}

function toggleDatabase(connection: ConnectionEntity, database: string) {
  const dbKey = `${connection.id}-${database}`;
  if (expandedDatabases.value.has(dbKey)) {
    expandedDatabases.value.delete(dbKey);
  } else {
    expandedDatabases.value.add(dbKey);
    loadDatabaseInfo(connection, database);
    //loadTablesForDatabase(connection, database);
  }
}

function selectDatabase(connection: ConnectionEntity, database: string) {
  selectedConnection.value = connection;
  selectedDatabase.value = database;
  selectedTable.value = null;
  activeTab.value = 'tables';

  loadDatabaseInfo(connection, database);
  //loadTablesForDatabase(connection, database);
}

async function loadTablesForDatabase(connection: ConnectionEntity, database: string, forceRefresh = false) {
  const dbKey = `${connection.id}-${database}`;
  
  if (loadingTables.value.has(dbKey)) return;
  
  // 检查缓存
  if (!forceRefresh && tableCache.value.has(dbKey)) {
    return;
  }
  
  loadingTables.value.add(dbKey);
  
  try {
    const info = await databaseService.getDatabaseInfo(connection.id, database);
    const tables = info?.data?.tables || [];
    tableCache.value.set(dbKey, tables);
  } catch (error) {
    console.error('加载表失败:', error);
    

    modal.error(error.msg || error.message || '加载表失败', {
      operation: 'LOAD_TABLES',
      database: database,
      stack: error.stack
    });
    tableCache.value.set(dbKey, []);
  } finally {
    loadingTables.value.delete(dbKey);
  }
}

async function loadDatabaseInfo(connection: ConnectionEntity, database: string) {
  const dbKey = `${connection.id}-${database}`;
  
  try {
    const info = await databaseService.getDatabaseInfo(connection.id || '', database);
    databaseInfoCache.value.set(dbKey, info.data);

    loadTablesForDatabase(connection, database);
  } catch (error) {
    console.error('加载数据库信息失败:', error);
    

    modal.error(error.msg || error.message || '加载数据库信息失败', {
      operation: 'LOAD_DATABASE_INFO',
      database: database,
      stack: error.stack
    });
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

async function loadTableData(connection: ConnectionEntity, database: string, tableName: string, page: number = 1, pageSize: number = 50, searchQuery?: string) {
  try {
    isGlobalLoading.value = true;
    loadingMessage.value = `正在加载表 "${tableName}" 的数据...`;
    
    // 构建WHERE条件用于搜索
    let whereClause = '';
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      
      // 根据表结构动态构建搜索条件
      if (tableStructure.value?.columns && tableStructure.value.columns.length > 0) {
        const searchableColumns = tableStructure.value.columns.filter((col: any) => {
          // 只搜索字符串类型和数字类型的列
          const type = col.type?.toLowerCase() || '';
          return type.includes('char') || type.includes('text') || type.includes('varchar') || 
                 type.includes('int') || type.includes('decimal') || type.includes('float');
        });
        
        if (searchableColumns.length > 0) {
          const conditions = searchableColumns.map((col: any) => {
            const columnName = col.name;
            const type = col.type?.toLowerCase() || '';
            
            if (type.includes('int') || type.includes('decimal') || type.includes('float')) {
              // 数字类型直接比较
              return `${columnName} = '${searchTerm}'`;
            } else {
              // 字符串类型使用LIKE模糊匹配
              return `${columnName} LIKE '%${searchTerm}%'`;
            }
          });
          
          whereClause = `WHERE (${conditions.join(' OR ')})`;
        }
      } else {
        // 如果没有表结构信息，使用默认搜索条件
        whereClause = `WHERE column1 LIKE '%${searchTerm}%' OR column2 LIKE '%${searchTerm}%'`;
      }
    }
    
    const response = await databaseService.getTableData(
      connection.id, 
      database, 
      tableName, 
      page, 
      pageSize,
      whereClause
    );
    
    // 假设后端返回的数据格式为 { data: [], total: number }
    tableData.value = response?.data?.data || [];
    // 更新总记录数，假设后端返回total字段
    totalRecords.value = parseInt(response?.data?.total) || 0;
    
    // 更新当前页码
    currentPage.value = page;
    
  } catch (error) {
    console.error('加载表数据失败:', error);
    

    modal.error(error.msg || error.message || '加载表数据失败', {
      operation: 'LOAD_TABLE_DATA',
      table: tableName,
      stack: error.stack
    });
    tableData.value = [];
  } finally {
    isGlobalLoading.value = false;
  }
}

async function loadTableStructure(connection: ConnectionEntity, database: string, tableName: string) {
  try {
    const structure = await databaseService.getTableInfo(connection.id, database, tableName);
    tableStructure.value = structure.data;
    tableColumns.value = structure?.data.columns || [];
  } catch (error) {
    console.error('加载表结构失败:', error);
    

    modal.error(error.msg || error.message || '加载表结构失败', {
      operation: 'LOAD_TABLE_STRUCTURE',
      table: tableName,
      stack: error.stack
    });
    tableStructure.value = null;
    tableColumns.value = [];
  }
}

function getDatabasesForConnection(connectionId: string): string[] {
  return databaseCache.value.get(connectionId) || [];
}

function getTablesForDatabase(connectionId: string | undefined, database: string): TableEntity[] {  
  if(!connectionId) return [];
  const dbKey = `${connectionId}-${database}`;
  return tableCache.value.get(dbKey) || [];
}

function editConnection(connection: ConnectionEntity) {
  connectionEditorRef.value?.showEditModal(connection);
}

async function testConnection(connection: ConnectionEntity) {
  try {
    const result = await connectionService.testConnection(connection);
    
    if (result.ret === 0 && result.data) {
      showToast('', `连接 "${connection.name}" 测试成功`, 'success');
    } else {
      showToast('', `连接 "${connection.name}" 测试失败`, 'error');
    }
  } catch (error) {

    modal.error(error.msg || error.message || '连接测试失败', {
      operation: 'TEST_CONNECTION',
      connectionId: connection.id,
      stack: error.stack
    });
  }
}

function showAddConnectionModal() {
  connectionEditorRef.value?.showAddModal();
}

function onConnectionSaved() {
  loadConnections();
}

// 连接详情相关事件处理
function handleTestConnection(connection: ConnectionEntity) {
  testConnection(connection);
}

function handleEditConnection(connection: ConnectionEntity) {
  editConnection(connection);
}

function handleRefreshAll(connection: ConnectionEntity) {
  refreshConnection(connection);
}

function handleOpenSqlQuery(connection: ConnectionEntity) {
  // TODO: 打开SQL查询界面
  showToast('提示', 'SQL查询功能开发中...', 'info');
}

function handleExportSchema(connection: ConnectionEntity) {
  // TODO: 导出数据库架构
  showToast('提示', '架构导出功能开发中...', 'info');
}

function handleViewLogs(connection: ConnectionEntity) {
  // TODO: 查看连接日志
  showToast('提示', '日志查看功能开发中...', 'info');
}

function refreshAll() {
  databaseCache.value.clear();
  tableCache.value.clear();
  databaseInfoCache.value.clear();
  loadConnections();
}

async function refreshTableData(page: number = 1, pageSize: number = 50, searchQuery?: string) {
  if (selectedConnection.value && selectedDatabase.value && selectedTable.value) {
    await loadTableData(selectedConnection.value, selectedDatabase.value, selectedTable.value.name, page, pageSize, searchQuery);
    // if (!searchQuery) {
    //   showToast('', '表数据已刷新', 'success');
    // }
  }
}

async function handleRefreshStructure() {
  if (selectedConnection.value && selectedDatabase.value && selectedTable.value) {
    await loadTableStructure(selectedConnection.value, selectedDatabase.value, selectedTable.value.name);
    showToast('', '表结构已刷新', 'success');
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

async function refreshConnection(connection: ConnectionEntity) {
  // 清除缓存并重新加载
  databaseCache.value.delete(connection.id);
  
  // 如果该连接已展开，则重新加载数据库
  if (expandedConnections.value.has(connection.id)) {
    await loadDatabasesForConnection(connection, true);
  }
  
  showToast('', `连接 "${connection.name}" 已刷新`, 'success');
}

async function refreshDatabase(connection: ConnectionEntity, database: string) {
  const dbKey = `${connection.id}-${database}`;
    selectedTable.value = null;
    
  // 清除缓存
  tableCache.value.delete(dbKey);
  databaseInfoCache.value.delete(dbKey);
  
  // 如果数据库已展开，则重新加载表
  //if (expandedDatabases.value.has(dbKey)) {
    await loadTablesForDatabase(connection, database, true);
    await loadDatabaseInfo(connection, database);
  //}
  
  showToast('', `数据库 "${database}" 已刷新`, 'success');
}

async function deleteDatabase(connection: ConnectionEntity, database: string) {
  const result = await modal.confirm(`确定要删除数据库 "${database}" 吗？此操作将删除数据库及其所有数据且不可恢复。`);
  if (result) {
    try {
      isGlobalLoading.value = true;
      loadingMessage.value = `正在删除数据库 "${database}"...`;
      
      // 执行删除数据库的SQL
      const deleteSql = `DROP DATABASE \`${database}\``;
      const result = await databaseService.executeQuery(connection.id, deleteSql);
      
      if (result.ret === 0) {
        showToast('成功', `数据库 "${database}" 已删除`, 'success');
        
        // 清除缓存
        const connectionId = connection.id || '';
        const databases = databaseCache.value.get(connectionId) || [];
        databaseCache.value.set(connectionId, databases.filter(db => db !== database));
        
        // 如果删除的是当前选中的数据库，清除选中状态
        if (selectedDatabase.value === database) {
          selectedDatabase.value = '';
          selectedTable.value = null;
        }
        
        // 清除相关的缓存
        const dbKey = `${connection.id}-${database}`;
        tableCache.value.delete(dbKey);
        databaseInfoCache.value.delete(dbKey);
      } else {
        showToast('错误', `删除数据库失败: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('删除数据库失败:', error);
      
      modal.error(error.msg || error.message || '删除数据库失败', {
        operation: 'DELETE_DATABASE',
        database: database,
        stack: error.stack
      });
    } finally {
      isGlobalLoading.value = false;
    }
  }
}

async function deleteConnection(connection: ConnectionEntity) {
  const result = await modal.confirm(`确定要删除连接 "${connection.name}" 吗？此操作将删除该连接的配置但不会删除实际的数据库数据。`);
  if (result) {
    try {
      isGlobalLoading.value = true;
      loadingMessage.value = `正在删除连接 "${connection.name}"...`;
      
      // 删除连接
      await connectionService.deleteConnection(connection.id || '');
      
      showToast('成功', `连接 "${connection.name}" 已删除`, 'success');
      
      // 从连接列表中移除
      const index = connections.value.findIndex(conn => conn.id === connection.id);
      if (index !== -1) {
        connections.value.splice(index, 1);
      }
      
      // 清除该连接的缓存
      databaseCache.value.delete(connection.id);
      tableCache.value.clear();
      databaseInfoCache.value.clear();
      expandedConnections.value.delete(connection.id);
      
      // 如果删除的是当前选中的连接，清除选中状态
      if (selectedConnection.value?.id === connection.id) {
        selectedConnection.value = null;
        selectedDatabase.value = '';
        selectedTable.value = null;
      }
    } catch (error) {
      console.error('删除连接失败:', error);
      
      modal.error(error.msg || error.message || '删除连接失败', {
        operation: 'DELETE_CONNECTION',
        connectionId: connection.id,
        stack: error.stack
      });
    } finally {
      isGlobalLoading.value = false;
    }
  }
}

async function refreshTable(connection: ConnectionEntity, database: string, table: TableEntity) {
  // 重新加载表数据和结构
  if (selectedTable.value?.name === table.name) {
    await loadTableData(connection, database, table.name);
    await loadTableStructure(connection, database, table.name);
  }
  
  showToast('', `表 "${table.name}" 已刷新`, 'success');
}

// 新增的处理方法
function handleRefreshDatabase() {
  if (selectedConnection.value && selectedDatabase.value) {
    refreshDatabase(selectedConnection.value, selectedDatabase.value);
  }
}

async function handleCreateTable(tableData: { name: string; comment: string }) {
  try {
    isGlobalLoading.value = true;
    loadingMessage.value = `正在创建表 "${tableData.name}"...`;
    
    // TODO: 实现创建表的逻辑
    console.log('创建表:', tableData);
    
    // 刷新数据库
    await handleRefreshDatabase();
    
    showToast('成功', `表 "${tableData.name}" 创建成功`, 'success');
  } catch (error) {
    console.error('创建表失败:', error);
    

    modal.error(error.msg || error.message || '创建表失败', {
      operation: 'CREATE_TABLE',
      stack: error.stack
    });
  } finally {
    isGlobalLoading.value = false;
  }
}

function handleInsertData() {
  // TODO: 实现插入数据的逻辑
  showToast('提示', '插入数据功能开发中...', 'info');
}

function handleExportTable() {
  // TODO: 实现导出表的逻辑
  showToast('提示', '导出表功能开发中...', 'info');
}

async function handleTruncateTable() {
  if (!selectedTable.value || !selectedConnection.value || !selectedDatabase.value) return;
  
  const result = await modal.confirm(`确定要清空表 "${selectedTable.value.name}" 吗？此操作将删除所有数据且不可恢复。`);
  if (result) {
    try {
      isGlobalLoading.value = true;
      loadingMessage.value = `正在清空表 "${selectedTable.value.name}"...`;
      
      // TODO: 实现清空表的逻辑
      console.log('清空表:', selectedTable.value.name);
      
      // 刷新表数据
      await refreshTableData();
      
      showToast('成功', `表 "${selectedTable.value.name}" 已清空`, 'success');
    } catch (error) {
      console.error('清空表失败:', error);
      

      modal.error(error.msg || error.message || '清空表失败', {
        operation: 'TRUNCATE_TABLE',
        stack: error.stack
      });
    } finally {
      isGlobalLoading.value = false;
    }
  }
}

function handleEditRow(row: any) {
  // TODO: 实现编辑行的逻辑
  showToast('提示', '编辑行功能开发中...', 'info');
}

function handleDeleteRow(row: any) {
  // TODO: 实现删除行的逻辑
  showToast('提示', '删除行功能开发中...', 'info');
}

async function handleExecuteSql(sql: string) {
  if (!selectedConnection.value) {
    showToast('错误', '请先选择数据库连接', 'error');
    return;
  }
  
  if (!sql.trim()) {
    showToast('错误', 'SQL语句不能为空', 'error');
    return;
  }
  
  try {
    // 清除之前的结果
    sqlResult.value = null;
    sqlExecuting.value = true;
    
    // 传入当前选中的数据库，如果选中的是表，则使用表所在的数据库
    const databaseName = selectedTable.value ? selectedDatabase.value : selectedDatabase.value;
    const result = await databaseService.executeQuery(selectedConnection.value.id, sql, databaseName);
    
    if (result.ret === 0 && result.data) {
      showToast('', 'SQL执行成功', 'success');
      
      // 保存SQL执行结果用于展示
      if (result.data && Array.isArray(result.data)) {
        sqlResult.value = {
          success: true,
          data: result.data,
          columns: result.data.length > 0 ? Object.keys(result.data[0]) : [],
          affectedRows: result.affectedRows || 0,
          insertId: result.insertId || null
        };
      } else {
        sqlResult.value = {
          success: true,
          data: [],
          columns: [],
          affectedRows: result.data.affectedRows || 0,
          insertId: result.data.insertId || null
        };
        showToast('', `执行成功，影响行数: ${result.data.affectedRows || 0}`, 'success');
      }
    } else {
      sqlResult.value = {
        success: false,
        data: [],
        columns: [],
        affectedRows: 0,
        error: result.error
      };
      showToast('错误', `SQL执行失败: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('SQL执行失败:', error);
    sqlResult.value = {
      success: false,
      data: [],
      columns: [],
      affectedRows: 0,
      error: error?.message || ''
    };
    

    modal.error(error.msg || error.message || 'SQL执行失败', {
      operation: 'EXECUTE_SQL',
      sql: sql,
      stack: error.stack
    });
  } finally {
    sqlExecuting.value = false;
  }
}

function showToast(title: string, message: string, type: string = 'success') {
  toastRef.value?.addToast(title, message, type);
}
</script>

<style scoped>
.database-explorer {
  height: 100vh;
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
  gap: 0.25rem;
}

.node-expand {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 0.25rem;
}

.node-expand i {
  font-size: 0.6875rem;
  color: #656d76;
  transition: transform 0.15s ease;
}

.node-expand i.expanded {
  transform: rotate(90deg);
}

.node-main {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.node-content:hover {
  background-color: #f3f4f6;
}

.tree-node.selected .node-content {
  background-color: #eff1ff;
  color: #0969da;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(9, 105, 218, 0.15);
}

.tree-node.selected .node-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(135deg, #0969da, #0550ae);
  border-radius: 3px 0 0 3px;
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

.btn-icon-danger:hover {
  background-color: #fee2e2;
}

.btn-icon-danger:hover i {
  color: #dc2626;
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
  height: 100%;
}

/* 详情组件容器 */
.explorer-main > * {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.content-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
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
  height: calc(100% - 60px); /* 减去导航栏高度 */
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