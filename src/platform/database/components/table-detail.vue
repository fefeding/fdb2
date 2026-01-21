<template>
  <div class="table-detail">
    <!-- 表头部信息 -->
    <div class="table-header">
      <div class="table-header-content">
        <div class="table-info">
          <div class="table-icon">
            <i class="bi bi-table"></i>
          </div>
          <div class="table-meta">
            <h4 class="table-name">{{ table?.name }}</h4>
            <div class="table-breadcrumb">
              <span class="connection">{{ connection?.name }}</span>
              <i class="bi bi-chevron-right"></i>
              <span class="database">{{ database }}</span>
              <i class="bi bi-chevron-right"></i>
              <span class="table">{{ table?.name }}</span>
            </div>
          </div>
        </div>
        <div class="table-stats">
          <div class="stat-item">
            <div class="stat-value">{{ formatNumber(table?.rowCount || 0) }}</div>
            <div class="stat-label">行数据</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ tableStructure?.columns?.length || 0 }}</div>
            <div class="stat-label">列</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ tableStructure?.indexes?.length || 0 }}</div>
            <div class="stat-label">索引</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatSize(table?.dataSize || 0) }}</div>
            <div class="stat-label">大小</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作工具栏 -->
    <div class="table-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary btn-sm" @click="refreshData">
          <i class="bi bi-arrow-clockwise"></i> 刷新数据
        </button>
        <button class="btn btn-info btn-sm" @click="editTableStructure">
          <i class="bi bi-pencil-square"></i> 修改表结构
        </button>
        <button class="btn btn-success btn-sm" @click="()=>insertData()">
          <i class="bi bi-plus-lg"></i> 插入数据
        </button>
        <div class="btn-group">
          <button class="btn btn-info btn-sm dropdown-toggle" data-bs-toggle="dropdown">
            <i class="bi bi-download"></i> 导出
          </button>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" @click="exportTableData('csv')">
              <i class="bi bi-file-earmark-spreadsheet me-2"></i>导出 CSV
            </a></li>
            <li><a class="dropdown-item" href="#" @click="exportTableData('json')">
              <i class="bi bi-file-earmark-code me-2"></i>导出 JSON
            </a></li>
            <li><a class="dropdown-item" href="#" @click="exportTableData('excel')">
              <i class="bi bi-file-earmark-excel me-2"></i>导出 Excel
            </a></li>
          </ul>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-outline-warning btn-sm" @click="truncateTable" v-if="tableData.length > 0">
          <i class="bi bi-trash"></i> 清空表
        </button>
        <button class="btn btn-outline-danger btn-sm" @click="dropTable">
          <i class="bi bi-x-circle"></i> 删除表
        </button>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="table-tabs">
      <ul class="nav nav-tabs">
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'data' }"
            @click="activeTab = 'data'"
          >
            <i class="bi bi-grid"></i> 数据
            <span class="badge bg-secondary ms-2" v-if="tableData.length > 0">{{ tableData.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'structure' }"
            @click="activeTab = 'structure'"
          >
            <i class="bi bi-diagram-3"></i> 结构
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'indexes' }"
            @click="activeTab = 'indexes'"
          >
            <i class="bi bi-key"></i> 索引
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'relations' }"
            @click="activeTab = 'relations'"
          >
            <i class="bi bi-link-45deg"></i> 关系
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'sql' }"
            @click="activeTab = 'sql'"
          >
            <i class="bi bi-code-slash"></i> SQL
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'tools' }"
            @click="activeTab = 'tools'"
          >
            <i class="bi bi-tools"></i> 工具
          </button>
        </li>
      </ul>

      <div class="tab-content">
        <!-- 数据标签页 -->
        <div v-show="activeTab === 'data'" class="tab-panel">    
          <div class="data-content" :class="{ 'loading': loading }">
            <div class="table-responsive" v-if="!loading && paginatedData.length > 0">
              <table class="table table-sm table-striped table-hover">
                <thead class="table-light">
                  <tr>
                    <th v-for="column in safeTableColumns" :key="column.name">
                      <div class="column-header">
                        <span>{{ column.name }}</span>
                        <small class="text-muted d-block">{{ column.type }}</small>
                        <span class="column-key" v-if="column.isPrimary">
                          <i class="bi bi-key-fill"></i>
                        </span>
                      </div>
                    </th>
                    <th width="100">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in paginatedData" :key="index">
                    <td v-for="(value, key) in row" :key="key">
                      <div class="cell-value">
                        {{ formatCellValue(value) }}
                      </div>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" @click="editRow(row)">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" @click="deleteRow(row)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 加载状态 -->
            <div v-if="loading" class="loading-state">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
              </div>
              <p>正在加载数据...</p>
            </div>

            <!-- 空状态 -->
            <div v-if="!loading && paginatedData.length === 0" class="empty-state">
              <i class="bi bi-inbox"></i>
              <p v-if="searchQuery">没有找到匹配的数据</p>
              <p v-else>表中暂无数据</p>
              <button class="btn btn-success" @click="()=>insertData()">
                <i class="bi bi-plus"></i> 插入第一条数据
              </button>
            </div>

            <!-- 分页 -->
            <nav v-if="!loading && totalPages > 0" class="pagination-nav">
              <div class="pagination-container">
                <div class="pagination-info">
                  共 {{ formatNumber(total) }} 条记录，第 {{ formatNumber(currentPage) }} 页/共 {{ formatNumber(totalPages) }} 页
                </div>
                <ul class="pagination pagination-sm">
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <a class="page-link" href="#" @click.prevent="goToPage(1)" title="首页">
                      <i class="bi bi-chevron-double-left"></i>
                    </a>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)" title="上一页">
                      <i class="bi bi-chevron-left"></i>
                    </a>
                  </li>
                  
                  <!-- 第一页和省略号 -->
                  <li v-if="currentPage > 4" class="page-item">
                    <a class="page-link" href="#" @click.prevent="goToPage(1)">1</a>
                  </li>
                  <li v-if="currentPage > 5" class="page-item disabled">
                    <span class="page-link">...</span>
                  </li>
                  
                  <!-- 中间页码 -->
                  <li 
                    v-for="page in visiblePages" 
                    :key="page"
                    class="page-item" 
                    :class="{ active: currentPage === page }"
                  >
                    <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
                  </li>
                  
                  <!-- 省略号和最后一页 -->
                  <li v-if="currentPage < totalPages - 4" class="page-item disabled">
                    <span class="page-link">...</span>
                  </li>
                  <li v-if="currentPage < totalPages - 3" class="page-item">
                    <a class="page-link" href="#" @click.prevent="goToPage(totalPages)">{{ totalPages }}</a>
                  </li>
                  
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <a class="page-link" href="#" @click.prevent="goToPage(currentPage + 1)" title="下一页">
                      <i class="bi bi-chevron-right"></i>
                    </a>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <a class="page-link" href="#" @click.prevent="goToPage(totalPages)" title="末页">
                      <i class="bi bi-chevron-double-right"></i>
                    </a>
                  </li>
                </ul>
                <div class="page-size-selector">
                  <label class="form-label-sm mb-0">每页显示：</label>
                  <select class="form-select form-select-sm ms-2" v-model="pageSize" style="width: 80px;">
                    <option :value="10">10</option>
                    <option :value="20">20</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                    <option :value="200">200</option>
                    <option :value="500">500</option>
                  </select>
                </div>
                <div class="page-jump">
                  <label class="form-label-sm mb-0">跳转到：</label>
                  <input 
                    type="number" 
                    class="form-control form-control-sm ms-2" 
                    v-model.number="jumpToPage"
                    min="1" 
                    :max="totalPages"
                    style="width: 70px;"
                    @keyup.enter="jumpToPageHandler"
                    @blur="jumpToPageHandler"
                  >
                  <button class="btn btn-primary btn-sm ms-2" @click="jumpToPageHandler">
                    跳转
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </div>

        <!-- 结构标签页 -->
        <div v-show="activeTab === 'structure'" class="tab-panel">
          <div class="structure-actions mb-3">
            <button class="btn btn-success btn-sm" @click="addColumn">
              <i class="bi bi-plus-lg"></i> 新增字段
            </button>
            <button class="btn btn-info btn-sm" @click="editTableStructure">
              <i class="bi bi-pencil-square"></i> 修改表结构
            </button>
          </div>
          
          <div class="structure-content">
            <div class="structure-table">
              <table class="table table-bordered">
                <thead class="table-dark">
                  <tr>
                    <th>列名</th>
                    <th>数据类型</th>
                    <th>可空</th>
                    <th>默认值</th>
                    <th>主键</th>
                    <th>自增</th>
                    <th>注释</th>
                    <th width="100">操作</th>
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
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" @click="editColumn(column)">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" @click="deleteColumn(column)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 索引标签页 -->
        <div v-show="activeTab === 'indexes'" class="tab-panel">
          <div class="indexes-content">
            <div class="indexes-table">
              <table class="table table-bordered">
                <thead class="table-dark">
                  <tr>
                    <th>索引名</th>
                    <th>类型</th>
                    <th>唯一</th>
                    <th>列</th>
                    <th width="100">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="index in tableStructure?.indexes || []" :key="index.name">
                    <td><strong>{{ index.name }}</strong></td>
                    <td><span class="badge bg-info">{{ index.type }}</span></td>
                    <td>
                      <span :class="index.unique ? 'text-success' : 'text-secondary'">
                        <i :class="index.unique ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i>
                        {{ index.unique ? '是' : '否' }}
                      </span>
                    </td>
                    <td><code>{{ index.columns.join(', ') }}</code></td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" @click="editIndex(index)">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" @click="deleteIndex(index)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 关系标签页 -->
        <div v-show="activeTab === 'relations'" class="tab-panel">
          <div class="relations-content">
            <div class="relations-table">
              <table class="table table-bordered">
                <thead class="table-dark">
                  <tr>
                    <th>约束名</th>
                    <th>本表列</th>
                    <th>目标表</th>
                    <th>目标列</th>
                    <th>删除规则</th>
                    <th>更新规则</th>
                    <th width="100">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fk in tableStructure?.foreignKeys || []" :key="fk.name">
                    <td><strong>{{ fk.name }}</strong></td>
                    <td><code>{{ fk.column }}</code></td>
                    <td><code>{{ fk.referencedTable }}</code></td>
                    <td><code>{{ fk.referencedColumn }}</code></td>
                    <td>{{ fk.onDelete || '-' }}</td>
                    <td>{{ fk.onUpdate || '-' }}</td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-danger btn-sm" @click="deleteForeignKey(fk)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- SQL标签页 -->
        <div v-show="activeTab === 'sql'" class="tab-panel">
          <div class="sql-section">
            <SqlExecutor 
              :connection="connection"
              :database="database"
              :height="600"
            />
          </div>
        </div>

        <!-- 工具标签页 -->
        <div v-show="activeTab === 'tools'" class="tab-panel">
          <DbTools 
            :connection="connection"
            :database="database"
            @execute-sql="handleExecuteSqlFromTool"
          />
        </div>
      </div>
    </div>
      
    <!-- 数据编辑器 -->
    <DataEditor
      :visible="showDataEditor"
      :is-edit="isEditMode"
      :data="editingRow"
      :columns="safeTableColumns"
      :connection="connection"
      :database="database"
      :table-name="table?.name"
      @close="closeDataEditor"
      @submit="handleDataSubmit"
    />

    <!-- 表格编辑器 -->
    <TableEditor
      :visible="showTableEditor"
      :connection="connection"
      :database="database"
      :table="table"
      :mode="tableEditorMode"
      @close="closeTableEditor"
      @submit="handleTableStructureChange"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import { DatabaseService } from '@/service/database';
import DataEditor from './data-editor.vue';
import DbTools from './db-tools.vue';
import TableEditor from './table-editor.vue';
import SqlExecutor from './sql-executor.vue';
import { exportDataToCSV, exportDataToJSON, exportDataToExcel, formatFileName } from '../utils/export';
import { modal } from '@/utils/modal';
import { isNumericType, isBooleanType } from '@/utils/database-types';


// Props
const props = defineProps<{
  connection: ConnectionEntity | null;
  database: string;
  table: TableEntity | null;
  tableData: any[];
  tableStructure: any;
  loading: boolean;
  total: number;
  sqlExecuting?: boolean;
  sqlResult?: {
    success: boolean;
    message?: string;
    data?: any[];
    columns?: string[];
    affectedRows?: number;
    insertId?: any;
    error?: string;
  };
}>();

// Emits
const emit = defineEmits<{
  'refresh-data': [page: number, pageSize: number, searchQuery?: string];
  'refresh-database': [];
  'refresh-structure': [];
  'truncate-table': [];
  'drop-table': [];
  'delete-row': [row: any];
  'insert-data': [];
  'export-table': [];
  'edit-row': [row: any];
  'execute-sql': [sql: string];
}>();

const databaseService = new DatabaseService();

// 响应式数据
const activeTab = ref('data');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(50);
const sqlQuery = ref('');
const jumpToPage = ref(1);
const searchTimeout = ref<NodeJS.Timeout | null>(null);

// 数据编辑相关
const showDataEditor = ref(false);
const isEditMode = ref(false);
const editingRow = ref<any>(null);

// 表格编辑器相关
const showTableEditor = ref(false);
const tableEditorMode = ref<'create' | 'edit'>('edit');

// 计算属性
const tableColumns = computed(() => props.tableStructure?.columns || []);

// 类型安全的表列数据
const safeTableColumns = computed(() => {
  const columns = props.tableStructure?.columns || [];
  return columns.map(col => ({
    ...col,
    name: col.name || '',
    type: col.type || '',
    nullable: !!col.nullable,
    isPrimary: !!col.isPrimary,
    isAutoIncrement: !!col.isAutoIncrement,
    comment: col.comment || ''
  }));
});

// 直接使用后端返回的数据，不需要前端分页和过滤
const paginatedData = computed(() => {
  return props.tableData || [];
});

const totalPages = computed(() => {
  const total = parseInt(props.total) || 0;
  return Math.ceil(total / pageSize.value);
});

const visiblePages = computed(() => {
  const pages: number[] = [];
  let start = Math.max(1, currentPage.value - 2);
  let end = Math.min(totalPages.value, start + 4);
  
  // 如果显示的页码数不足5个，调整起始位置
  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

// 监听变化
watch(() => props.table, () => {
  activeTab.value = 'data';
  currentPage.value = 1;
  searchQuery.value = '';
});

watch(pageSize, () => {
  currentPage.value = 1;
  jumpToPage.value = 1;
  // 调用后端分页接口
  emit('refresh-data', currentPage.value, pageSize.value, searchQuery.value);
});

watch(currentPage, (newPage) => {
  jumpToPage.value = newPage;
});

// 方法
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num: number): string {
  return num?.toLocaleString?.() || num?.toString() || '';
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  
  // 尝试检测并格式化 JSON 数据
  let strValue = String(value);
  if (typeof value === 'string') {
    // 检查是否可能是 JSON 字符串
    const trimmedValue = strValue.trim();
    if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) || 
        (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmedValue);
        // 格式化 JSON 并限制长度
        const formatted = JSON.stringify(parsed, null, 2);
        if (formatted.length > 50) {
          return formatted.substring(0, 50) + '...';
        }
        return formatted;
      } catch (e) {
        // 不是有效的 JSON，继续处理
      }
    }
  } else if (typeof value === 'object') {
    // 对于对象或数组类型，直接格式化
    try {
      const formatted = JSON.stringify(value, null, 2);
      if (formatted.length > 50) {
        return formatted.substring(0, 50) + '...';
      }
      return formatted;
    } catch (e) {
      // 格式化失败，继续处理
    }
  }
  
  // 对于普通字符串，限制显示长度
  if (strValue.length > 50) return strValue.substring(0, 50) + '...';
  
  return strValue;
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    // 调用后端分页接口
    emit('refresh-data', currentPage.value, pageSize.value, searchQuery.value);
  }
}

function jumpToPageHandler() {
  if (jumpToPage.value >= 1 && jumpToPage.value <= totalPages.value) {
    currentPage.value = jumpToPage.value;
    // 调用后端分页接口
    emit('refresh-data', currentPage.value, pageSize.value, searchQuery.value);
  } else {
    // 重置到有效范围
    jumpToPage.value = Math.max(1, Math.min(jumpToPage.value, totalPages.value));
    currentPage.value = jumpToPage.value;
    emit('refresh-data', currentPage.value, pageSize.value, searchQuery.value);
  }
}

function handleSearch() {
  // 使用防抖，避免频繁调用后端接口
  clearTimeout(searchTimeout.value);
  searchTimeout.value = setTimeout(() => {
    currentPage.value = 1;
    jumpToPage.value = 1;
    // 调用后端搜索接口
    emit('refresh-data', currentPage.value, pageSize.value, searchQuery.value);
  }, 500);
}

function refreshData() {
  emit('refresh-data', currentPage.value, pageSize.value, searchQuery.value);
}

function insertData(newData?: any) {  
  if (newData) {
    // 从编辑器来的新增数据
    performInsert(newData);
  } else {
    // 新增按钮点击，打开编辑器
    editingRow.value = null;
    isEditMode.value = false;
    showDataEditor.value = true;
  }
}

async function performInsert(data: any) {
  try {
    // 构建INSERT语句
    const columns = [];
    const values = [];
    
    safeTableColumns.value.forEach((column: any) => {
      if (!column.isPrimary || !column.isAutoIncrement) {
        columns.push(column.name);
        values.push(formatValueForSQL(data[column.name], column.type));
      }
    });

    if (columns.length === 0) {
      await modal.error('没有可插入的字段');
      return;
    }

    const sql = `INSERT INTO ${props.table?.name} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
    
    // 执行SQL
    emit('execute-sql', sql);
  } catch (error) {
    console.error('插入数据失败:', error);
    modal.error('插入数据失败: ' + (error as any).message);
  }
}

async function editRow(row: any) {
  editingRow.value = row;
  isEditMode.value = true;
  showDataEditor.value = true;
}

async function deleteRow(row: any) {
  try {
    const result = await modal.confirm('确定要删除这条记录吗？', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'danger'
    });

    if (result) {
      emit('delete-row', row);
    }
  } catch (error) {
    console.error('删除行失败:', error);
  }
}

async function truncateTable() {
  try {
    const result = await modal.confirm('确定要清空表中的所有数据吗？此操作不可恢复！', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'danger'
    });

    if (result) {
      emit('truncate-table');
    }
  } catch (error) {
    console.error('清空表失败:', error);
  }
}

async function dropTable() {
  try {
    const result = await modal.confirm('确定要删除此表吗？此操作不可恢复！', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'danger'
    });

    if (result) {
      try {
        const response = await databaseService.dropTable(
          props.connection?.id || '',
          props.database,
          props.table?.name || ''
        );
        
        if (response.ret === 0 && response.data?.success) {
          await modal.success('表删除成功');
          // 表删除后需要返回到数据库视图，这里通过事件通知父组件
          emit('refresh-database');
        } else {
          await modal.error('表删除失败');
        }
      } catch (error) {
        console.error('删除表失败:', error);
        modal.error(error.msg || error.message || '删除表失败', {
          operation: 'DROP_TABLE',
          table: props.table?.name,
          stack: error.stack
        });
      }
    }
  } catch (error) {
    console.error('删除表失败:', error);
  }
}

function handleDataSubmit(result: any) {
  try {
    
    if (result.ret === 0) {
      // 操作成功，刷新数据
      emit('refresh-data');
      closeDataEditor();
    } else {
      modal.error('操作失败');
    }
  } catch (error) {
    console.error('处理数据提交失败:', error);
    
    modal.error(error.msg || error.message || '操作失败', {
      //operation: operation,
      table: props.table?.name,
      stack: error.stack
    });
  }
}

function closeDataEditor() {
  showDataEditor.value = false;
  editingRow.value = null;
  isEditMode.value = false;
}

// 表格编辑相关方法
function editTableStructure() {
  tableEditorMode.value = 'edit';
  showTableEditor.value = true;
}

function addColumn() {
  // 这里可以打开列编辑器或直接调用表格编辑器
  tableEditorMode.value = 'edit';
  showTableEditor.value = true;
}

function closeTableEditor() {
  showTableEditor.value = false;
}

async function handleTableStructureChange(result: any) {
  try {
    
    if (result.success) {
      // 表结构修改成功，刷新结构
      emit('refresh-structure');
      emit('refresh-database');
      closeTableEditor();
      await modal.success('表结构修改成功');
    } else {
      await modal.error('表结构修改失败');
    }
  } catch (error) {
    console.error('处理表结构修改失败:', error);
    
    modal.error(error.msg || error.message || '表结构修改失败', {
      operation: 'MODIFY_TABLE',
      table: props.table?.name,
      stack: error.stack
    });
  }
}

// 其他方法
function editColumn(column: any) {
  // 打开列编辑器
  tableEditorMode.value = 'edit';
  showTableEditor.value = true;
}

function deleteColumn(column: any) {
  // 删除列
  modal.confirm(`确定要删除列 ${column.name} 吗？`, {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'danger'
  }).then(result => {
    if (result) {
      // 这里可以调用API删除列
      emit('refresh-structure');
    }
  });
}

function editIndex(index: any) {
  // 编辑索引
  console.log('编辑索引:', index);
}

function deleteIndex(index: any) {
  // 删除索引
  modal.confirm(`确定要删除索引 ${index.name} 吗？`, {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'danger'
  }).then(result => {
    if (result) {
      // 这里可以调用API删除索引
      emit('refresh-structure');
    }
  });
}

function deleteForeignKey(fk: any) {
  // 删除外键
  modal.confirm(`确定要删除外键 ${fk.name} 吗？`, {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'danger'
  }).then(result => {
    if (result) {
      // 这里可以调用API删除外键
      emit('refresh-structure');
    }
  });
}

function formatValueForSQL(value: any, type: string): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'string') {
    // 转义单引号
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  return String(value);
}

function handleExecuteSqlFromTool(sql: string) {
  emit('execute-sql', sql);
}

function exportTableData(format: 'csv' | 'json' | 'excel') {
  emit('export-table');
}
</script>

<style scoped>
.table-detail {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  padding: 15px 20px;
}

.table-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.table-icon {
  font-size: 32px;
  color: #495057;
}

.table-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.table-name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.table-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: #6c757d;
}

.table-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #495057;
}

.stat-label {
  font-size: 0.75rem;
  color: #6c757d;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.table-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nav-tabs {
  border-bottom: 1px solid #dee2e6;
  background-color: #f8f9fa;
}

.nav-tabs .nav-link {
  color: #495057;
  border: none;
  border-bottom: 3px solid transparent;
  border-radius: 0;
  padding: 10px 15px;
  font-weight: 500;
}

.nav-tabs .nav-link:hover {
  background-color: #e9ecef;
  border-bottom-color: #adb5bd;
}

.nav-tabs .nav-link.active {
  background-color: #fff;
  border-bottom-color: #0d6efd;
  color: #0d6efd;
}

.tab-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background-color: #fff;
}

.tab-panel {
  height: 100%;
}

.data-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.data-content.loading {
  opacity: 0.7;
  pointer-events: none;
}

.table-responsive {
  flex: 1;
  overflow: auto;
}

.column-header {
  position: relative;
}

.column-key {
  position: absolute;
  top: -5px;
  right: -15px;
  color: #0d6efd;
  font-size: 0.75rem;
}

.cell-value {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 15px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 15px;
  color: #6c757d;
}

.empty-state i {
  font-size: 48px;
  opacity: 0.5;
}

.pagination-nav {
  margin-top: 20px;
  border-top: 1px solid #dee2e6;
  padding-top: 15px;
}

.pagination-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.pagination-info {
  font-size: 0.875rem;
  color: #6c757d;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 5px;
}

.page-jump {
  display: flex;
  align-items: center;
  gap: 5px;
}

.structure-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.structure-table, .indexes-table, .relations-table {
  overflow: auto;
}

.structure-table table, .indexes-table table, .relations-table table {
  width: 100%;
}

.sql-section {
  height: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .table-header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .table-stats {
    width: 100%;
    justify-content: space-around;
  }
  
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .toolbar-left, .toolbar-right {
    justify-content: center;
  }
  
  .pagination-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .pagination {
    width: 100%;
    justify-content: center;
  }
}
</style>