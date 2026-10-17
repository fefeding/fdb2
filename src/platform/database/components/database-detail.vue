<template>
  <div class="database-detail">
    <!-- 数据库头部信息 -->
    <div class="database-header">
      <div class="database-header-content">
        <div class="database-info">
          <div class="database-icon">
            <i class="bi bi-database"></i>
          </div>
          <div class="database-meta">
            <h4 class="database-name">{{ database }}</h4>
            <div class="connection-info">
              <span class="crumb crumb-link" @click="emit('navigate-connection')" :title="$t('databaseDetail.backToConnection')">
                <i class="bi bi-hdd-network me-1"></i>{{ connection?.name }}
              </span>
              <i class="bi bi-chevron-right"></i>
              <span class="crumb crumb-current">{{ database }}</span>
              <span class="connection-type ms-2">{{ getDbTypeLabel(connection?.type) }}</span>
            </div>
          </div>
        </div>
        <div class="database-stats">
          <div class="stat-item">
            <!-- 用过滤后的表列表计数：databaseInfo.tableCount 来自后端 getTables，含视图，
                 会与列表（已排除视图，视图在"视图"标签页）对不上 -->
            <div class="stat-value">{{ (tables || []).length }}</div>
            <div class="stat-label">{{ $t('connection.tableCount') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatSize(databaseInfo?.size || 0) }}</div>
            <div class="stat-label">{{ $t('databaseDetail.size') }}</div>
          </div>
        </div>
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
            <i class="bi bi-table"></i> {{ $t('databaseDetail.tables') }}
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'views' }"
            @click="activeTab = 'views'"
          >
            <i class="bi bi-eye"></i> {{ $t('databaseDetail.views') }}
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'procedures' }"
            @click="activeTab = 'procedures'"
          >
            <i class="bi bi-gear"></i> {{ $t('databaseDetail.procedures') }}
          </button>
        </li>
        <!-- <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'functions' }"
            @click="activeTab = 'functions'"
          >
            <i class="bi bi-code-slash"></i> 函数
          </button>
        </li> -->
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'sql' }"
            @click="activeTab = 'sql'"
          >
            <i class="bi bi-terminal"></i> {{ $t('databaseDetail.executeSQL') }}
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'tools' }"
            @click="activeTab = 'tools'"
          >
            <i class="bi bi-tools"></i> {{ $t('databaseDetail.tools') }}
          </button>
        </li>
      </ul>

      <div class="tab-content">
        <!-- 数据表标签页 -->
        <div v-show="activeTab === 'tables'" class="tab-panel">
          <!-- 操作栏 -->
          <div class="tables-actions mb-3">
            <button class="btn btn-primary btn-sm" @click="createNewTable">
              <i class="bi bi-plus-lg"></i> {{ $t('databaseDetail.createTable') }}
            </button>
            <button class="btn btn-outline-secondary btn-sm" @click="handleRefreshDatabase">
              <i class="bi bi-arrow-clockwise"></i> {{ $t('common.refresh') }}
            </button>
          </div>
          
          <!-- 加载状态 -->
          <div v-if="loading" class="loading-state">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">{{ $t('common.loading') }}</span>
            </div>
            <p>{{ $t('databaseDetail.loadingTables') }}</p>
          </div>
          
          <!-- 表格列表 -->
          <div v-else>
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
                    <div class="table-name-wrapper">
                      <div class="table-name" :title="table.name">{{ table.name }}</div>
                      <div class="table-engine">{{ table.engine || '-' }}</div>
                    </div>
                    <div class="table-comment-header" v-if="table.comment" :title="table.comment">
                      {{ table.comment }}
                    </div>
                  </div>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-outline-primary" @click.stop="editTable(table)" :title="$t('common.edit')">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <!-- <button class="btn btn-sm btn-outline-danger" @click.stop="deleteTable(table)">
                      <i class="bi bi-trash"></i>
                    </button> -->
                  </div>
                </div>
                <div class="card-body">
                    <div class="table-stats">
                      <div class="stat" v-if="table.rowCount !== undefined">
                        <span class="stat-label">{{ $t('databaseDetail.rowCountLabel') }}</span>
                        <span class="stat-value">{{ formatNumber(table.rowCount) }}</span>
                      </div>
                      <div class="stat" v-if="table.dataSize !== undefined">
                        <span class="stat-label">{{ $t('databaseDetail.size') }}</span>
                        <span class="stat-value">{{ formatSize(table.dataSize) }}</span>
                      </div>
                    </div>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="!tables || tables.length === 0" class="empty-state">
              <i class="bi bi-inbox"></i>
              <p>{{ $t('databaseDetail.noTable') }}</p>
              <button class="btn btn-primary" @click="createNewTable">
                <i class="bi bi-plus"></i> {{ $t('databaseDetail.createTable') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 视图标签页 -->
        <div v-show="activeTab === 'views'" class="tab-panel">
          <div class="views-actions mb-3">
            <button class="btn btn-success btn-sm" @click="showCreateViewModal">
              <i class="bi bi-plus-lg"></i> {{ $t('databaseDetail.createView') }}
            </button>
            <button class="btn btn-info btn-sm" @click="refreshViews">
              <i class="bi bi-arrow-clockwise"></i> {{ $t('common.refresh') }}
            </button>
          </div>

          <div class="views-grid" v-if="views.length > 0">
            <div 
              v-for="view in views"
              :key="view.name"
              class="view-card"
            >
              <div class="card-header">
                <div class="view-icon">
                  <i class="bi bi-eye"></i>
                </div>
                <div class="view-info">
                  <div class="view-name">{{ view.name }}</div>
                  <div class="view-comment" v-if="view.comment">{{ view.comment }}</div>
                </div>
              </div>
              <div class="card-body">
                <div class="view-actions">
                  <button class="btn btn-sm btn-outline-primary" @click="editView(view)">
                    <i class="bi bi-pencil"></i> {{ $t('common.edit') }}
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="deleteView(view)">
                    <i class="bi bi-trash"></i> {{ $t('common.delete') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-state">
            <i class="bi bi-eye"></i>
            <p>{{ $t('databaseDetail.noView') }}</p>
            <button class="btn btn-success" @click="showCreateViewModal">
              <i class="bi bi-plus"></i> {{ $t('databaseDetail.createView') }}
            </button>
          </div>
        </div>

        <!-- 存储过程标签页 -->
        <div v-show="activeTab === 'procedures'" class="tab-panel">
          <div class="procedures-actions mb-3">
            <button class="btn btn-info btn-sm" @click="showCreateProcedureModal">
              <i class="bi bi-plus-lg"></i> {{ $t('databaseDetail.createProcedure') }}
            </button>
            <button class="btn btn-info btn-sm" @click="refreshProcedures">
              <i class="bi bi-arrow-clockwise"></i> {{ $t('common.refresh') }}
            </button>
          </div>

          <div class="procedures-grid" v-if="procedures.length > 0">
            <div 
              v-for="procedure in procedures"
              :key="procedure.name"
              class="procedure-card"
            >
              <div class="card-header">
                <div class="procedure-icon">
                  <i class="bi bi-gear"></i>
                </div>
                <div class="procedure-info">
                  <div class="procedure-name">{{ procedure.name }}</div>
                  <div class="procedure-comment" v-if="procedure.comment">{{ procedure.comment }}</div>
                  <div class="procedure-type">
                    <span class="badge bg-info">{{ procedure.type }}</span>
                    <span class="badge bg-secondary ms-1" v-if="procedure.returnType">{{ procedure.returnType }}</span>
                  </div>
                </div>
              </div>
              <div class="card-body">
                <div class="procedure-actions">
                  <button class="btn btn-sm btn-outline-primary" @click="editProcedure(procedure)">
                    <i class="bi bi-pencil"></i> {{ $t('common.edit') }}
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="deleteProcedure(procedure)">
                    <i class="bi bi-trash"></i> {{ $t('common.delete') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-state">
            <i class="bi bi-gear"></i>
            <p>{{ $t('databaseDetail.noProcedure') }}</p>
            <button class="btn btn-info" @click="showCreateProcedureModal">
              <i class="bi bi-plus"></i> {{ $t('databaseDetail.createProcedure') }}
            </button>
          </div>
        </div>

        <!-- 函数标签页 -->
        <div v-show="activeTab === 'functions'" class="tab-panel">
          <div class="empty-state">
            <i class="bi bi-code-slash"></i>
            <p>{{ $t('databaseDetail.functionInDev') }}</p>
          </div>
        </div>

        <!-- SQL执行标签页 -->
        <div v-show="activeTab === 'sql'" class="tab-panel">
          <div class="sql-executor-section">
            <SqlExecutor 
              :connection="connection"
              :database="database"
            />
          </div>
        </div>

        <!-- 工具标签页 -->
        <div v-show="activeTab === 'tools'" class="tab-panel">
          <DbTools :connection="connection" :database="database" @execute-sql="handleExecuteSQL" />
        </div>
      </div>
    </div>

    <!-- 创建表模态框 -->
    <div v-if="showCreateTable" class="modal fade show d-block" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ $t('databaseDetail.createTableTitle') }}</h5>
            <button type="button" class="btn-close" @click="showCreateTable = false"></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="mb-3">
                <label class="form-label">{{ $t('databaseDetail.tableNameLabel') }}</label>
                <input type="text" class="form-control" v-model="newTable.name" :placeholder="$t('databaseDetail.enterTableName')">
              </div>
              <div class="mb-3">
                <label class="form-label">{{ $t('databaseDetail.commentLabel') }}</label>
                <textarea class="form-control" v-model="newTable.comment" :placeholder="$t('databaseDetail.enterTableComment')"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateTable = false">{{ $t('common.cancel') }}</button>
            <button type="button" class="btn btn-primary" @click="createTable">{{ $t('common.create') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑视图模态框 -->
    <div v-if="showCreateView && editingView" class="modal fade show d-block" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ views.some(v => v.name === editingView.name) ? $t('databaseDetail.editView') : $t('databaseDetail.createViewTitle') }}</h5>
            <button type="button" class="btn-close" @click="showCreateView = false"></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="mb-3">
                <label class="form-label">{{ $t('databaseDetail.viewNameLabel') }}</label>
                <input type="text" class="form-control" v-model="editingView.name" :placeholder="$t('databaseDetail.enterViewName')">
              </div>
              <div class="mb-3">
                <label class="form-label">{{ $t('databaseDetail.viewDefinition') }}</label>
                <textarea 
                  class="form-control" 
                  rows="8" 
                  v-model="editingView.definition" 
                  :placeholder="$t('databaseDetail.viewDefinitionPlaceholder')"
                ></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ $t('databaseDetail.commentLabel') }}</label>
                <input type="text" class="form-control" v-model="editingView.comment" :placeholder="$t('databaseDetail.enterTableComment')">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateView = false">{{ $t('common.cancel') }}</button>
            <button type="button" class="btn btn-primary" @click="createOrUpdateView">{{ $t('common.save') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑存储过程模态框 -->
    <div v-if="showCreateProcedure && editingProcedure" class="modal fade show d-block" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ procedures.some(p => p.name === editingProcedure.name) ? $t('databaseDetail.editProcedure') : $t('databaseDetail.createProcedureTitle') }}</h5>
            <button type="button" class="btn-close" @click="showCreateProcedure = false"></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="mb-3">
                <label class="form-label">{{ $t('databaseDetail.procedureNameLabel') }}</label>
                <input type="text" class="form-control" v-model="editingProcedure.name" :placeholder="$t('databaseDetail.enterProcedureName')">
              </div>
              <div class="mb-3">
                <label class="form-label">{{ $t('databaseDetail.procedureDefinition') }}</label>
                <textarea 
                  class="form-control" 
                  rows="12" 
                  v-model="editingProcedure.definition" 
                  :placeholder="$t('databaseDetail.procedureDefPlaceholder')"
                ></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ $t('databaseDetail.commentLabel') }}</label>
                <input type="text" class="form-control" v-model="editingProcedure.comment" :placeholder="$t('databaseDetail.enterTableComment')">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateProcedure = false">{{ $t('common.cancel') }}</button>
            <button type="button" class="btn btn-primary" @click="createOrUpdateProcedure">{{ $t('common.save') }}</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 表结构编辑器 -->
    <TableEditor
      :visible="showTableEditor"
      :connection="connection"
      :database="database"
      :table="editingTable"
      :mode="tableEditorMode"
      @close="closeTableEditor"
      @submit="handleTableChange"
      @execute-sql="handleExecuteSQL"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import { useI18n } from 'vue-i18n';
import TableEditor from './table-editor.vue';
import SqlExecutor from './sql-executor.vue';
import DbTools from './db-tools.vue';
import { modal } from '@/utils/modal';
import { DatabaseService } from '@/service/database';

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
  'select-table': [connection: ConnectionEntity, database: string, table: TableEntity];
  'refresh-database': [];
  'create-table': [table: { name: string; comment: string }];
  'execute-sql': [sql: string];
  'navigate-connection': [];
}>();

const databaseService = new DatabaseService();
const { t } = useI18n();
// 响应式数据
const activeTab = ref('tables');
const showCreateTable = ref(false);
const showCreateView = ref(false);
const showCreateProcedure = ref(false);
const newTable = ref({ name: '', comment: '' });

// 视图相关
const views = ref<any[]>([]);
const editingView = ref<any>(null);

// 存储过程相关
const procedures = ref<any[]>([]);
const editingProcedure = ref<any>(null);

// 表编辑器相关
const showTableEditor = ref(false);
const tableEditorMode = ref<'create' | 'edit'>('create');
const editingTable = ref<TableEntity | null>(null);



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
  // @ts-ignore
  emit('select-table', props.connection, props.database, table);
}

function handleRefreshDatabase() {
  emit('refresh-database');
}

function showCreateTableModal() {
  showCreateTable.value = true;
  newTable.value = { name: '', comment: '' };
}

function createTable() {
  if (!newTable.value.name.trim()) {
    return;
  }
  // 直接打开表编辑器，而不是创建空表
  tableEditorMode.value = 'create';
  editingTable.value = {
    name: newTable.value.name,
    comment: newTable.value.comment,
    rowCount: 0,
    dataSize: 0,
    indexSize: 0,
    columns: []
  };
  showTableEditor.value = true;
  showCreateTable.value = false;
}

async function editTable(table: TableEntity) {
  if (!props.connection?.id) return;
  try {
    const response = await databaseService.getTableInfo(props.connection.id, props.database, table.name);
    editingTable.value = response.data || null;
    tableEditorMode.value = 'edit';
    showTableEditor.value = true;
  } catch (error) {
    console.error('获取表结构失败:', error);
    modal.error(t('databaseDetail.getTableInfoFailed'));
  }
}

// async function deleteTable(table: TableEntity) {
//   const result = await modal.confirm(`确定要删除表 "${table.name}" 吗？此操作不可恢复。`);
//   if (result) {
//     try {
//       const databaseService = new DatabaseService();
//       const response = await databaseService.dropTable(
//         props.connection?.id || '',
//         props.database,
//         table.name
//       );
//       debugger
//       if (response.success || response.ok) {
//         await modal.success('表删除成功');
//         // 刷新数据库表列表
//         emit('refresh-database');
//       } else {
//         await modal.error('表删除失败');
//       }
//     } catch (error) {
//       console.error('删除表失败:', error);
//       modal.error(error.message || '删除表失败', {
//         operation: 'DROP_TABLE',
//         table: table.name,
//         stack: error.stack
//       });
//     }
//   }
// }



function createNewTable() {
  tableEditorMode.value = 'create';
  editingTable.value = null;
  showTableEditor.value = true;
}

function closeTableEditor() {
  showTableEditor.value = false;
  tableEditorMode.value = 'create';
  editingTable.value = null;
}

// 生命周期
onMounted(() => {
  // 组件挂载时加载数据
  if (props.connection?.id && props.database) {
    loadViews();
    loadProcedures();
  }
});

// 监听变化
watch(() => [props.connection?.id, props.database], () => {
  // 连接或数据库变化时重新加载数据
  if (props.connection?.id && props.database) {
    loadViews();
    loadProcedures();
  }
});

// 视图管理方法
async function loadViews() {
  if (!props.connection?.id) return;
  
  try {
    const result = await databaseService.getViews(props.connection.id, props.database);
    views.value = result.data || [];
  } catch (error) {
    console.error('加载视图失败:', error);
    views.value = [];
  }
}

async function refreshViews() {
  await loadViews();
}

function showCreateViewModal() {
  editingView.value = { name: '', definition: '', comment: '' };
  showCreateView.value = true;
}

/**
 * 提取对象定义文本（视图/存储过程共用）。
 * 后端定义类接口返回的就是 SQL 字符串，并统一包装成 { ret, msg, data }；
 * 这里兼容「字符串 / 数组 / { definition }」三种形态，避免取值路径变化导致编辑框空白。
 */
function extractDefinition(result: any): string {
  const raw = typeof result === 'string' ? result : result?.data;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return String(raw[0]?.definition ?? raw[0]?.ddl ?? '');
  if (raw && typeof raw === 'object') return String(raw.definition ?? raw.ddl ?? raw.sql ?? '');
  return '';
}

async function editView(view: any) {
  try {
    const result = await databaseService.getViewDefinition(props.connection?.id || '', props.database, view.name);
    const definition = extractDefinition(result);
    editingView.value = {
      name: view.name,
      definition,
      comment: view.comment
    };
    showCreateView.value = true;
    if (!definition) {
      modal.warning(t('databaseDetail.getViewDefFailed'));
    }
  } catch (error) {
    console.error('获取视图定义失败:', error);
    modal.error(t('databaseDetail.getViewDefFailed'));
  }
}

/**
 * 视图定义归一为「AS 之后的部分」。
 * 各方言 getViewDefinition 返回的形态不同：MySQL/PG/MSSQL 只给 SELECT 片段，
 * 而 SQLite/Oracle 给的是完整 CREATE VIEW 语句——直接回传会被后端再拼一次
 * `CREATE VIEW <name> AS ...` 而变成语法错误，改名时还会沿用旧视图名。
 */
function normalizeViewDefinition(definition: string): string {
  const s = String(definition || '').trim();
  const m = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:ALGORITHM\s*=\s*\w+\s+)?(?:DEFINER\s*=\s*\S+\s+)?(?:SQL\s+SECURITY\s+\w+\s+)?VIEW\s+.+?\s+AS\s+/is.exec(s);
  return m ? s.slice(m[0].length).trim() : s;
}

async function createOrUpdateView() {
  if (!editingView.value?.name || !editingView.value?.definition) {
    modal.error(t('databaseDetail.fillViewNameAndDef'));
    return;
  }

  try {
    const definition = normalizeViewDefinition(editingView.value.definition);
    
    if (views.value.some(v => v.name === editingView.value.name)) {
      // 编辑视图 - 先删除再创建
      await databaseService.dropView(props.connection?.id || '', props.database, editingView.value.name);
    }
    
    const result = await databaseService.createView(
      props.connection?.id || '',
      props.database,
      editingView.value.name,
      definition
    );
    
    if (result.success || result.ret === 0) {
      await modal.success(t('databaseDetail.viewSaveSuccess'));
      showCreateView.value = false;
      editingView.value = null;
      await loadViews();
    } else {
      await modal.error(t('databaseDetail.viewSaveFailed'));
    }
  } catch (error) {
    console.error('保存视图失败:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    modal.error(errorMsg || '保存视图失败');
  }
}

async function deleteView(view: any) {
  const result = await modal.confirm(t('databaseDetail.confirmDeleteView', { name: view.name }));
  if (result) {
    try {
      const response = await databaseService.dropView(props.connection?.id || '', props.database, view.name);
      
      if (response.success || response.ok) {
        await modal.success(t('databaseDetail.viewDeleteSuccess'));
        await loadViews();
      } else {
        await modal.error(t('databaseDetail.viewDeleteFailed'));
      }
    } catch (error) {
      console.error('删除视图失败:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      modal.error(errorMsg || t('databaseDetail.viewDeleteFailed'));
    }
  }
}

// 存储过程管理方法
async function loadProcedures() {
  if (!props.connection?.id) return;
  
  try {
    const result = await databaseService.getProcedures(props.connection.id, props.database);
    procedures.value = result.data || [];
  } catch (error) {
    console.error('加载存储过程失败:', error);
    procedures.value = [];
  }
}

async function refreshProcedures() {
  await loadProcedures();
}

function showCreateProcedureModal() {
  editingProcedure.value = { name: '', definition: '', comment: '' };
  showCreateProcedure.value = true;
}

async function editProcedure(procedure: any) {
  try {
    const result = await databaseService.getProcedureDefinition(props.connection?.id || '', props.database, procedure.name);
    const definition = extractDefinition(result);
    editingProcedure.value = {
      name: procedure.name,
      definition,
      comment: procedure.comment
    };
    showCreateProcedure.value = true;
    if (!definition) {
      modal.warning(t('databaseDetail.getProcedureDefFailed'));
    }
  } catch (error) {
    console.error('获取存储过程定义失败:', error);
    modal.error(t('databaseDetail.getProcedureDefFailed'));
  }
}

async function createOrUpdateProcedure() {
  if (!editingProcedure.value?.name || !editingProcedure.value?.definition) {
    modal.error(t('databaseDetail.fillProcedureNameAndDef'));
    return;
  }

  try {
    
    // 如果是编辑模式，先删除旧的存储过程
    if (procedures.value.some(p => p.name === editingProcedure.value.name)) {
      await databaseService.dropProcedure(props.connection?.id || '', props.database, editingProcedure.value.name);
    }
    
    const result = await databaseService.createProcedure(
      props.connection?.id || '',
      props.database,
      editingProcedure.value.name,
      editingProcedure.value.definition
    );
    
    if (result.success || result.ret === 0) {
      await modal.success(t('databaseDetail.procedureSaveSuccess'));
      showCreateProcedure.value = false;
      editingProcedure.value = null;
      await loadProcedures();
    } else {
      await modal.error(t('databaseDetail.procedureSaveFailed'));
    }
  } catch (error) {
    console.error('保存存储过程失败:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    modal.error(errorMsg || '保存存储过程失败');
  }
}

async function deleteProcedure(procedure: any) {
  const result = await modal.confirm(t('databaseDetail.confirmDeleteProcedure', { name: procedure.name }));
  if (result) {
    try {
      const response = await databaseService.dropProcedure(props.connection?.id || '', props.database, procedure.name);
      
      if (response.success || response.ok) {
        await modal.success(t('databaseDetail.procedureDeleteSuccess'));
        await loadProcedures();
      } else {
        await modal.error(t('databaseDetail.procedureDeleteFailed'));
      }
    } catch (error) {
      console.error('删除存储过程失败:', error);
      modal.error(error.message || t('databaseDetail.procedureDeleteFailed'));
    }
  }
}

async function handleTableChange(result: any) {
  try {
      // 根据传递的 mode 来判断是创建表还是修改表结构
      const isCreate = result.mode === 'create';
      
      if (result.success) {
        // 操作成功，刷新结构
        emit('refresh-database');
        const successMessage = isCreate ? t('databaseDetail.tableCreateSuccess') : t('databaseDetail.tableModifySuccess');
        await modal.success(successMessage);
      } else {
        const errorMessage = isCreate ? t('databaseDetail.tableCreateFailed') : t('databaseDetail.tableModifyFailed');
        await modal.error(errorMessage);
      }
    } catch (error) {
      console.error('处理表操作失败:', error);
      
      const isCreate = result.mode === 'create';
      const errorMessage = isCreate ? t('databaseDetail.tableCreateFailed') : t('databaseDetail.tableModifyFailed');
      
      modal.error(error.msg || error.message || errorMessage, {
        operation: isCreate ? 'CREATE_TABLE' : 'MODIFY_TABLE',
        stack: error.stack
      });
    }
  }

function handleExecuteSQL(sql: string) {
  emit('execute-sql', sql);
}
</script>

<style scoped>
.database-detail {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* SQL 面板直接铺满 tab 内容区（内边距由 .tab-content 统一提供） */
.sql-executor-section {
  margin: 0;
  padding: 0;
  background-color: transparent;
  border: none;
  border-radius: 0;
  flex: 1;
  display: flex;
}

/* 加载状态样式 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  color: var(--db-text-muted);
}

.loading-state .spinner-border {
  margin-bottom: 10px;
  color: var(--db-primary-color);
}

.loading-state p {
  margin: 0;
  font-size: 12px;
}

.database-header {
  padding: 8px 12px;
  background: var(--db-bg-soft2);
  border-bottom: 1px solid var(--db-border);
}

.database-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.database-info {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.database-icon {
  width: 34px;
  height: 34px;
  background: var(--db-primary-bg);
  border: 1px solid var(--db-border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--db-primary-color);
  font-size: 1rem;
  flex-shrink: 0;
}

.database-meta h4 {
  margin: 0 0 0.25rem 0;
  font-size: 0.9375rem;
  color: var(--db-dark-color);
  font-weight: 600;
}

.connection-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
}

.connection-info .crumb {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border-radius: 0;
  font-size: 0.75rem;
  transition: color 0.15s ease;
}

.connection-info .crumb-link {
  cursor: pointer;
  background: transparent;
  color: var(--db-primary-color);
}

.connection-info .crumb-link:hover {
  color: var(--db-primary-light);
  text-decoration: underline;
}

.connection-info .crumb-current {
  font-weight: 500;
  color: var(--db-text-muted);
}

.connection-name {
  background: transparent;
  color: var(--db-primary-color);
  padding: 0;
  border-radius: 0;
  font-size: 0.75rem;
  font-weight: 500;
}

.connection-type {
  background: var(--db-primary-bg);
  color: var(--db-primary-color);
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 500;
}

.database-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  text-align: right;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--db-dark-color);
  margin-bottom: 0;
}

.stat-label {
  font-size: 0.6875rem;
  color: var(--db-text-muted);
  font-weight: 400;
}



.database-tabs {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.nav-tabs {
  background: var(--db-gray-light);
  border-bottom: 1px solid var(--db-border);
  padding: 0 0.5rem;
  gap: 0;
}

.nav-link {
  border: none;
  background: transparent;
  color: var(--db-text-muted);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.nav-link:hover {
  color: var(--db-dark-color);
  background: var(--db-bg-soft);
}

.nav-link.active {
  color: var(--db-primary-color);
  background: transparent;
  border-bottom: 2px solid var(--db-primary-color);
}

.tab-content {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tab-panel {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-grid {
  display: grid;
  /* 最小列宽 240px + 12px 间距：避免窄卡片把表名挤成「t_ai_agent_...」这类过度截断 */
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.table-card {
  background: var(--db-bg-soft2);
  border: 1px solid var(--db-border);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.15s ease, background-color 0.15s ease;
  cursor: pointer;
}

.table-card:hover {
  border-color: var(--db-primary-color);
  background: var(--db-bg-soft);
  box-shadow: none;
}

.card-header {
  background: var(--db-bg-soft);
  /* 右侧预留编辑按钮的常驻空间（约 32px）：按钮绝对定位不占 flex 位，
     用 padding 留白让表名/引擎名不会被按钮盖住，也不必为按钮压缩表名宽度 */
  padding: 6px 32px 6px 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

/* 卡片图标与引擎徽标统一收敛为中性灰：
   密集网格里高饱和的绿/蓝会互相干扰，改为描边+浅灰后表名才是视觉主角 */
.table-icon {
  width: 22px;
  height: 22px;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid var(--db-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--db-text-faint);
  flex-shrink: 0;
}

.table-info {
  flex: 1;
  min-width: 0; /* 允许子元素截断 */
}

.table-name-wrapper {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0;
}

.table-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--db-dark-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.table-engine {
  font-size: 0.625rem;
  /* 引擎名是次要信息：去掉高饱和底色，仅留浅灰文字 */
  color: var(--db-text-faint);
  background: transparent;
  padding: 0;
  border-radius: 999px;
  flex-shrink: 0;
}

.table-comment-header {
  font-size: 0.6875rem;
  color: var(--db-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 卡片正文：标签在上、数值在下 */
.card-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.table-stats {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  margin-bottom: 0;
  flex-wrap: wrap;
  min-width: 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
}

/* 卡片内的统计字号覆盖（不影响顶部数据库统计的大号数字） */
.table-card .stat-label {
  font-size: 0.6875rem;
  color: var(--db-text-muted);
}

.table-card .stat-value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--db-dark-color);
}

.table-comment {
  font-size: 0.8125rem;
  color: var(--db-text-muted);
  font-style: italic;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

/* 编辑按钮常驻右上角：绝对定位，不参与 flex 排版，
   因此不会像内联那样挤压表名（表名可用满 header 内容区宽度）。 */
.table-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 0.375rem;
}

.table-actions .btn {
  width: 22px;
  height: 22px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  line-height: 1;
  border: 1px solid var(--db-primary-color);
  border-radius: 4px;
  background: transparent;
  color: var(--db-primary-color);
}

.table-actions .btn:hover {
  background: var(--db-primary-bg);
  color: var(--db-primary-color);
  border-color: var(--db-primary-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 140px;
  color: var(--db-text-muted);
  text-align: center;
  font-size: 0.8125rem;
}

.empty-state i {
  font-size: 1.5rem;
  margin-bottom: 0;
  opacity: 0.5;
}

/* 视图和存储过程卡片样式 */
.views-grid, .procedures-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.view-card, .procedure-card {
  background: var(--db-bg-soft2);
  border: 1px solid var(--db-border);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.view-card:hover, .procedure-card:hover {
  border-color: var(--db-primary-color);
  background: var(--db-bg-soft);
  box-shadow: none;
  transform: none;
}

.view-card .card-header, .procedure-card .card-header {
  background: var(--db-bg-soft);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.view-icon, .procedure-icon {
  width: 26px;
  height: 26px;
  font-size: 0.8125rem;
  background: var(--db-info-bg);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--db-info-color);
  flex-shrink: 0;
}

.procedure-icon {
  background: var(--db-warning-bg);
  color: var(--db-warning-color);
}

.view-name, .procedure-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--db-dark-color);
  margin-bottom: 0.125rem;
}

.view-comment, .procedure-comment {
  font-size: 0.6875rem;
  color: var(--db-text-muted);
  margin-bottom: 0.375rem;
  line-height: 1.4;
}

.procedure-type {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.view-card .card-body, .procedure-card .card-body {
  padding: 8px 10px;
}

.view-actions, .procedure-actions {
  display: flex;
  gap: 0.375rem;
}

/* 操作栏：无底色无边框，只是一行工具按钮（对齐 VSCode 插件的 Create Table / Refresh） */
.views-actions, .procedures-actions, .tables-actions {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 10px;
  padding: 0;
  background: transparent;
  border-radius: 0;
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
  border-bottom: 1px solid var(--db-gray-medium);
  padding: 1rem 1.5rem;
}

.modal-title {
  margin: 0;
  font-weight: 600;
  color: var(--db-dark-color);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  border-top: 1px solid var(--db-gray-medium);
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>