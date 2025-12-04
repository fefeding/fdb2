<template>
  <div class="database-detail">
    <!-- 数据库头部信息 -->
    <div class="database-header">
      <div class="database-info">
        <div class="database-icon">
          <i class="bi bi-database"></i>
        </div>
        <div class="database-meta">
          <h4 class="database-name">{{ database }}</h4>
          <div class="connection-info">
            <span class="connection-name">{{ connection?.name }}</span>
            <span class="connection-type">{{ getDbTypeLabel(connection?.type) }}</span>
          </div>
        </div>
      </div>
      <div class="database-stats">
        <div class="stat-item">
          <div class="stat-value">{{ databaseInfo?.tableCount || 0 }}</div>
          <div class="stat-label">表</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatSize(databaseInfo?.size || 0) }}</div>
          <div class="stat-label">大小</div>
        </div>
      </div>
    </div>

    <!-- 操作工具栏 -->
    <div class="database-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary btn-sm" @click="createNewTable">
          <i class="bi bi-plus-lg"></i> 创建表
        </button>
        <button class="btn btn-success btn-sm" @click="showCreateViewModal">
          <i class="bi bi-eye-lg"></i> 创建视图
        </button>
        <button class="btn btn-info btn-sm" @click="showCreateProcedureModal">
          <i class="bi bi-gear-lg"></i> 存储过程
        </button>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-outline-secondary btn-sm" @click="handleRefreshDatabase">
          <i class="bi bi-arrow-clockwise"></i> 刷新
        </button>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="database-tabs">
      <ul class="nav nav-tabs">
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'tables' }"
            @click="activeTab = 'tables'"
          >
            <i class="bi bi-table"></i> 数据表
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
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'functions' }"
            @click="activeTab = 'functions'"
          >
            <i class="bi bi-code-slash"></i> 函数
          </button>
        </li>
      </ul>

      <div class="tab-content">
        <!-- 数据表标签页 -->
        <div v-show="activeTab === 'tables'" class="tab-panel">
          <div class="table-grid">
            <div 
              v-for="table in tables"
              :key="table.name"
              class="table-card"
              @click="selectTable(table)"
            >
              <div class="card-header">
                <div class="table-icon">
                  <i class="bi bi-table"></i>
                </div>
                <div class="table-info">
                  <div class="table-name">{{ table.name }}</div>
                  <div class="table-engine">{{ table.engine || '-' }}</div>
                </div>
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
                <div class="table-actions">
                  <button class="btn btn-sm btn-outline-primary" @click.stop="editTable(table)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click.stop="deleteTable(table)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="!tables || tables.length === 0" class="empty-state">
            <i class="bi bi-inbox"></i>
            <p>暂无数据表</p>
            <button class="btn btn-primary" @click="createNewTable">
              <i class="bi bi-plus"></i> 创建第一个表
            </button>
          </div>
        </div>

        <!-- 视图标签页 -->
        <div v-show="activeTab === 'views'" class="tab-panel">
          <div class="empty-state">
            <i class="bi bi-eye"></i>
            <p>视图功能开发中...</p>
            <button class="btn btn-success" @click="showCreateViewModal">
              <i class="bi bi-plus"></i> 创建视图
            </button>
          </div>
        </div>

        <!-- 存储过程标签页 -->
        <div v-show="activeTab === 'procedures'" class="tab-panel">
          <div class="empty-state">
            <i class="bi bi-gear"></i>
            <p>存储过程功能开发中...</p>
            <button class="btn btn-info" @click="showCreateProcedureModal">
              <i class="bi bi-plus"></i> 创建存储过程
            </button>
          </div>
        </div>

        <!-- 函数标签页 -->
        <div v-show="activeTab === 'functions'" class="tab-panel">
          <div class="empty-state">
            <i class="bi bi-code-slash"></i>
            <p>函数功能开发中...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建表模态框 -->
    <div v-if="showCreateTable" class="modal fade show d-block" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">创建数据表</h5>
            <button type="button" class="btn-close" @click="showCreateTable = false"></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="mb-3">
                <label class="form-label">表名</label>
                <input type="text" class="form-control" v-model="newTable.name" placeholder="输入表名">
              </div>
              <div class="mb-3">
                <label class="form-label">注释</label>
                <textarea class="form-control" v-model="newTable.comment" placeholder="输入表注释"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateTable = false">取消</button>
            <button type="button" class="btn btn-primary" @click="createTable">创建</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 表结构编辑器 -->
    <TableEditor
      :visible="showTableEditor"
      :connection="connection"
      :database="database"
      :table-name="editingTableName"
      @close="closeTableEditor"
      @execute-sql="handleExecuteSQL"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import TableEditor from './table-editor.vue';

// Props
const props = defineProps<{
  connection: ConnectionEntity | null;
  database: string;
  tables: TableEntity[];
  databaseInfo: any;
  loading: boolean;
}>();

// Emits
const emit = defineEmits<{
  'select-table': [table: TableEntity];
  'refresh-database': [];
  'create-table': [table: { name: string; comment: string }];
  'execute-sql': [sql: string];
}>();

// 响应式数据
const activeTab = ref('tables');
const showCreateTable = ref(false);
const showCreateView = ref(false);
const showCreateProcedure = ref(false);
const newTable = ref({ name: '', comment: '' });

// 表编辑器相关
const showTableEditor = ref(false);
const editingTableName = ref('');

// 计算属性
const tables = computed(() => {
  const tbs = props.tables || [];
  return tbs;
});

// 方法
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

function selectTable(table: TableEntity) {
  emit('select-table', table);
}

function handleRefreshDatabase() {
  emit('refresh-database');
}

function showCreateTableModal() {
  showCreateTable.value = true;
  newTable.value = { name: '', comment: '' };
}

function showCreateViewModal() {
  showCreateView.value = true;
}

function showCreateProcedureModal() {
  showCreateProcedure.value = true;
}

function createTable() {
  if (!newTable.value.name.trim()) {
    return;
  }
  // 直接打开表编辑器，而不是创建空表
  editingTableName.value = newTable.value.name;
  showTableEditor.value = true;
  showCreateTable.value = false;
}

function editTable(table: TableEntity) {
  editingTableName.value = table.name;
  showTableEditor.value = true;
}

function deleteTable(table: TableEntity) {
  if (confirm(`确定要删除表 "${table.name}" 吗？此操作不可恢复。`)) {
    // TODO: 实现删除表功能
    console.log('删除表:', table);
  }
}

function handleExecuteSQL(sql: string) {
  // 这里应该发送SQL到后端执行
  emit('execute-sql', sql);
}

function createNewTable() {
  editingTableName.value = '';
  showTableEditor.value = true;
}

function closeTableEditor() {
  showTableEditor.value = false;
  editingTableName.value = '';
}
</script>

<style scoped>
.database-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.database-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
}

.database-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.database-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.database-meta h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-weight: 600;
}

.connection-info {
  display: flex;
  gap: 0.75rem;
}

.connection-name {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.connection-type {
  background: #f1f5f9;
  color: #64748b;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.database-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
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

.database-toolbar {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 0.5rem;
}

.database-tabs {
  flex: 1;
  overflow: hidden;
}

.nav-tabs {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 1.5rem;
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
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.table-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
}

.table-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.card-header {
  background: #f8fafc;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.table-icon {
  width: 40px;
  height: 40px;
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
  margin-bottom: 0.25rem;
}

.table-engine {
  font-size: 0.75rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.125rem 0.375rem;
  border-radius: 8px;
}

.card-body {
  padding: 1rem;
}

.table-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.table-comment {
  font-size: 0.875rem;
  color: #64748b;
  font-style: italic;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #64748b;
  text-align: center;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* 模态框样式 */
.modal-dialog {
  margin-top: 10vh;
}

.modal-content {
  border-radius: 12px;
  border: none;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  border-bottom: 1px solid #e2e8f0;
  padding: 1rem 1.5rem;
}

.modal-title {
  margin: 0;
  font-weight: 600;
  color: #1e293b;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  border-top: 1px solid #e2e8f0;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>