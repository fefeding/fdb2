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
                    <td><span class="badge bg-warning">{{ fk.onDelete }}</span></td>
                    <td><span class="badge bg-info">{{ fk.onUpdate }}</span></td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" @click="editForeignKey(fk)">
                          <i class="bi bi-pencil"></i>
                        </button>
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
            <div class="sql-toolbar">
              <div class="toolbar-left">
                <button class="btn btn-primary btn-sm" @click="executeSql">
                  <i class="bi bi-play-fill"></i> 执行SQL
                </button>
                <button class="btn btn-outline-secondary btn-sm" @click="formatSql">
                  <i class="bi bi-braces"></i> 格式化
                </button>
              </div>
              <div class="toolbar-right">
                <button class="btn btn-outline-primary btn-sm" @click="generateSelectSql">
                  <i class="bi bi-file-text"></i> 生成SELECT
                </button>
                <button class="btn btn-outline-success btn-sm" @click="generateInsertSql">
                  <i class="bi bi-plus-circle"></i> 生成INSERT
                </button>
                <button class="btn btn-outline-info btn-sm" @click="generateUpdateSql">
                  <i class="bi bi-pencil-square"></i> 生成UPDATE
                </button>
              </div>
            </div>
            <div class="sql-editor">
              <VAceEditor 
                v-model:value="sqlQuery" 
                lang="sql" 
                theme="chrome" 
                :options="editorOptions"
                placeholder="输入SQL查询语句..."
              ></VAceEditor>
            </div>
            
            <!-- SQL执行结果显示 -->
            <div v-if="props.sqlResult || props.sqlExecuting" class="sql-result">
              <div class="result-header">
                <h6 class="result-title">
                  <div v-if="props.sqlExecuting" class="sql-loading">
                    <div class="spinner-border spinner-border-sm me-2"></div>
                    执行中...
                  </div>
                  <template v-else-if="props.sqlResult">
                    <i class="bi bi-check-circle-fill text-success" v-if="props.sqlResult.success"></i>
                    <i class="bi bi-x-circle-fill text-danger" v-else></i>
                    执行结果
                  </template>
                </h6>
                <div class="result-stats" v-if="props.sqlResult && props.sqlResult.success">
                  <span class="badge bg-primary">影响行数: {{ props.sqlResult.affectedRows }}</span>
                  <span class="badge bg-success ms-2" v-if="props.sqlResult.insertId">插入ID: {{ props.sqlResult.insertId }}</span>
                </div>
              </div>
              
              <!-- 执行中的loading状态 -->
              <div v-if="props.sqlExecuting" class="sql-loading-state">
                <div class="d-flex align-items-center justify-content-center py-4">
                  <div class="spinner-border text-primary me-3"></div>
                  <div>
                    <div class="fw-bold">正在执行SQL...</div>
                    <div class="text-muted small">请稍候，复杂查询可能需要较长时间</div>
                  </div>
                </div>
              </div>
              
              <!-- 查询结果表格 -->
              <div v-else-if="props.sqlResult && props.sqlResult.success && props.sqlResult.data.length > 0" class="result-table">
                <div class="result-info">
                  查询到 {{ props.sqlResult.data.length }} 条记录
                  <div class="result-actions ms-auto">
                    <button class="btn btn-sm btn-outline-primary me-2" @click="exportSqlResult('csv')">
                      <i class="bi bi-file-earmark-spreadsheet"></i> 导出CSV
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" @click="exportSqlResult('json')">
                      <i class="bi bi-file-earmark-code"></i> 导出JSON
                    </button>
                  </div>
                </div>
                <div class="table-responsive result-table-container">
                  <table class="table table-sm table-striped">
                    <thead class="table-dark sticky-top">
                      <tr>
                        <th v-for="column in props.sqlResult.columns" :key="column">
                          {{ column }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, index) in props.sqlResult.data" :key="index">
                        <td v-for="column in props.sqlResult.columns" :key="column">
                          {{ formatCellValue(row[column]) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- 错误结果显示 -->
              <div v-else-if="props.sqlResult && !props.sqlResult.success" class="sql-error">
                <div class="alert alert-danger">
                  <h6 class="alert-heading">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    SQL执行失败
                  </h6>
                  <p class="mb-0">{{ props.sqlResult.error }}</p>
                </div>
              </div>
            </div>
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
import { exportDataToCSV, exportDataToJSON, exportDataToExcel, formatFileName } from '../utils/export';
import { modal } from '@/utils/modal';
import { isNumericType, isBooleanType } from '@/utils/database-types';
import { VAceEditor } from 'vue3-ace-editor';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';
import 'ace-builds/src-noconflict/keybinding-vscode';

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

// SQL编辑器配置
const editorOptions = ref({
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
  enableSnippets: true,
  fontSize: 14,
  tabSize: 2,
  wrap: true,
  showPrintMargin: false,
  showGutter: true,
  highlightActiveLine: true,
  autoScrollEditorIntoView: true,
  scrollPastEnd: 0.5
});

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
    
    const sql = `INSERT INTO \`${props.table?.name}\` (${columns.join(', ')}) VALUES (${values.join(', ')})`;
    
    // 发送执行SQL请求
    const result = await databaseService.executeQuery(
      props.connection?.id || '',
      sql,
      props.database
    );
    
    if (result.ret === 0) {
      emit('refresh-data');
      closeDataEditor();
      await modal.success('数据插入成功');
    } else {
      await modal.error('数据插入失败');
    }
  } catch (error) {
    console.error('插入数据失败:', error);
    modal.error(error.msg || error.message || '插入失败', {
      operation: 'INSERT',
      table: props.table?.name,
      stack: error.stack
    });
  }
}

function exportTable() {
  exportTableData('csv');
}

function exportTableData(format: 'csv' | 'json' | 'excel') {
  if (!props.tableData || props.tableData.length === 0) {
    console.warn('没有数据可导出');
    return;
  }

  // 生成表头映射
  const headers: Record<string, string> = {};
  tableColumns.value.forEach((col: any) => {
    headers[col.name] = col.comment || col.name;
  });

  const filename = formatFileName(props.table?.name || 'data', format);

  switch (format) {
    case 'csv':
      exportDataToCSV(props.tableData, headers, filename);
      break;
    case 'json':
      exportDataToJSON(props.tableData, filename);
      break;
    case 'excel':
      exportDataToExcel(props.tableData, headers, filename);
      break;
  }
}

function exportToCSV() {
  const headers = tableColumns.value.map((col: any) => col.name).join(',');
  const rows = props.tableData.map(row => {
    return tableColumns.value.map((col: any) => {
      const value = row[col.name];
      if (value === null || value === undefined) {
        return '';
      }
      // 处理CSV特殊字符
      let strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        strValue = `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',');
  }).join('\n');
  
  const csv = `${headers}\n${rows}`;
  downloadFile(csv, `${props.table?.name}_data.csv`, 'text/csv;charset=utf-8');
}

function exportToJSON() {
  const jsonData = props.tableData.map(row => {
    const filteredRow: any = {};
    tableColumns.value.forEach((col: any) => {
      filteredRow[col.name] = row[col.name];
    });
    return filteredRow;
  });
  
  const json = JSON.stringify(jsonData, null, 2);
  downloadFile(json, `${props.table?.name}_data.json`, 'application/json;charset=utf-8');
}

function exportToExcel() {
  // 简单的Excel导出实现（使用HTML表格格式）
  const headers = tableColumns.value.map((col: any) => `<th>${col.name}</th>`).join('');
  const rows = props.tableData.map(row => {
    const cells = tableColumns.value.map((col: any) => {
      const value = row[col.name];
      return `<td>${value !== null && value !== undefined ? value : ''}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  
  const html = `
    <table border="1">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${props.table?.name}_data.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function truncateTable() {
  const result = await modal.confirm(`确定要清空表 "${props.table?.name}" 吗？此操作将删除所有数据且不可恢复。`);
  if (result) {
    try {
      const response = await databaseService.truncateTable(
        props.connection?.id || '',
        props.database,
        props.table?.name || ''
      );
      
      if (response.ret === 0 && response.data?.success) {
        await modal.success('表清空成功');
        emit('refresh-data');
      } else {
        await modal.error('表清空失败');
      }
    } catch (error) {
      console.error('清空表失败:', error);
      modal.error(error.message || '清空表失败', {
        operation: 'TRUNCATE_TABLE',
        table: props.table?.name,
        stack: error.stack
      });
    }
  }
}

async function dropTable() {
  const result = await modal.confirm(`确定要删除表 "${props.table?.name}" 吗？此操作将删除表结构和所有数据且不可恢复。`);
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
}

function editRow(row: any) {
  editingRow.value = row;
  isEditMode.value = true;
  showDataEditor.value = true;
}

async function handleDataSubmit(result: any) {
  try {
    
    if (result.ret === 0) {
      // 操作成功，刷新数据
      emit('refresh-data');
      closeDataEditor();
    } else {
      await modal.error('操作失败');
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

async function updateRow(originalRow: any, newData: any) {
  try {
    // 构建UPDATE语句
    const setClauses = [];
    const whereClauses = [];
    
    safeTableColumns.value.forEach((column: any) => {
      if (column.isPrimary && column.isAutoIncrement) {
        // 自增主键作为WHERE条件
        whereClauses.push(`${column.name} = ${formatValueForSQL(originalRow[column.name], column.type)}`);
      } else if (newData[column.name] !== originalRow[column.name]) {
        // 需要更新的字段
        setClauses.push(`${column.name} = ${formatValueForSQL(newData[column.name], column.type)}`);
      }
    });
    
    if (setClauses.length === 0) {
      return; // 没有数据需要更新
    }
    
    const sql = `UPDATE \`${props.table?.name}\` SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
    
    // 发送执行SQL请求
    const result = await databaseService.executeQuery(
      props.connection?.id || '',
      sql,
      props.database
    );
    
    if (result.ret === 0) {
      emit('refresh-data');
      await modal.success('数据更新成功');
    } else {
      await modal.error('数据更新失败');
    }
  } catch (error) {
    console.error('更新数据失败:', error);
    
    modal.error(error.msg || error.message || '数据更新失败', {
      operation: 'UPDATE',
      table: props.table?.name,
      //sql: sql,
      stack: error.stack
    });
  }
}

function formatValueForSQL(value: any, columnType: string): string {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }
  
  if (isNumberInput(columnType) || isBooleanInput(columnType)) {
    return String(value);
  }
  
  // 字符串类型需要加引号
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isNumberInput(type: string): boolean {
  return isNumericType(type);
}

function isBooleanInput(type: string): boolean {
  return isBooleanType(type);
}

async function deleteRow(row: any) {
  const result = await modal.confirm(`确定要删除这条记录吗？`);
  if (result) {
    emit('delete-row', row);
  }
}

async function editColumn(column: any) {
  try {
    // 构建ALTER TABLE语句来修改列
    const sql = `ALTER TABLE \`${props.table?.name}\` MODIFY COLUMN \`${column.name}\` ${column.type} ${column.nullable ? 'NULL' : 'NOT NULL'} ${column.defaultValue ? `DEFAULT ${column.defaultValue}` : ''} ${column.comment ? `COMMENT '${column.comment}'` : ''}`;
    
    const result = await databaseService.executeQuery(
      props.connection?.id || '',
      sql,
      props.database
    );
    
      if (result.ret === 0) {
        emit('refresh-structure');
        await modal.success('列修改成功');
      } else {
        await modal.error('列修改失败');
      }
    } catch (error) {
      console.error('修改列失败:', error);
      
      modal.error(error.msg || error.message || '列修改失败', {
        operation: 'MODIFY_COLUMN',
        table: props.table?.name,
        column: column.name,
        //sql: sql,
        stack: error.stack
      });
    }
}

async function deleteColumn(column: any) {
  const result = await modal.confirm(`确定要删除列 "${column.name}" 吗？此操作不可恢复。`);
  if (result) {
    try {
      // 构建ALTER TABLE语句来删除列
      const sql = `ALTER TABLE \`${props.table?.name}\` DROP COLUMN \`${column.name}\``;
      
      const result = await databaseService.executeQuery(
        props.connection?.id || '',
        sql,
        props.database
      );
      
      if (result.ret === 0) {
        emit('refresh-structure');
        await modal.success('列删除成功');
      } else {
        await modal.error('列删除失败');
      }
    } catch (error) {
      console.error('删除列失败:', error);
      
      modal.error(error.msg || error.message || '列删除失败', {
        operation: 'DELETE_COLUMN',
        table: props.table?.name,
        column: column.name,
        //sql: sql,
        stack: error.stack
      });
    }
  }
}

function editIndex(index: any) {
  console.log('编辑索引:', index);
}

async function deleteIndex(index: any) {
  const result = await modal.confirm(`确定要删除索引 "${index.name}" 吗？`);
  if (result) {
    console.log('删除索引:', index);
  }
}

function editForeignKey(fk: any) {
// 样式添加到组件的 style 部分
  console.log('编辑外键:', fk);
}

async function deleteForeignKey(fk: any) {
  const result = await modal.confirm(`确定要删除外键 "${fk.name}" 吗？`);
  if (result) {
    console.log('删除外键:', fk);
  }
}

function executeSql() {
  if (!sqlQuery.value.trim()) return;
  emit('execute-sql', sqlQuery.value);
}

function formatSql() {
  // TODO: 实现SQL格式化
  console.log('格式化SQL');
}

function generateSelectSql() {
  sqlQuery.value = `SELECT * FROM \`${props.table?.name}\` LIMIT 100;`;
}

function generateInsertSql() {
  const columns = tableColumns.value.map((col: any) => col.name).join(', ');
  sqlQuery.value = `INSERT INTO \`${props.table?.name}\` (${columns}) VALUES (...);`;
}

function generateUpdateSql() {
  sqlQuery.value = `UPDATE \`${props.table?.name}\` SET ... WHERE ...;`;
}

function exportSqlResult(format: 'csv' | 'json') {
  if (!props.sqlResult || !props.sqlResult.data || props.sqlResult.data.length === 0) {
    return;
  }
  
  if (format === 'csv') {
    const headers = (props.sqlResult?.columns || []).join(',');
    const rows = (props.sqlResult?.data || []).map(row => 
      (props.sqlResult?.columns || []).map(col => {
        const value = row[col];
        // 处理CSV特殊字符
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    downloadFile(csv, 'sql_result.csv', 'text/csv;charset=utf-8');
  } else if (format === 'json') {
    const json = JSON.stringify(props.sqlResult.data, null, 2);
    downloadFile(json, 'sql_result.json', 'application/json;charset=utf-8');
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleExecuteSqlFromTool(sql: string) {
  emit('execute-sql', sql);
}
</script>

<style scoped>
.table-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.table-header {
  padding: 1rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-bottom: 1px solid #e2e8f0;
}

.table-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.table-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.table-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.table-meta h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-weight: 600;
}

.table-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.connection, .database {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-weight: 500;
}

.table {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 0.25rem 0.5rem;
  border-radius: 0;
  font-weight: 500;
}

.table-breadcrumb i {
  color: #94a3b8;
  font-size: 0.75rem;
}

.table-stats {
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

.table-toolbar {
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

.table-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
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
  position: relative;
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
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.data-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.pagination-info {
  color: #64748b;
  font-size: 0.875rem;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.column-key {
  color: #f59e0b;
  font-size: 0.75rem;
}

.cell-value {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-responsive {
  border: 1px solid #e2e8f0;
  border-radius: 0;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #64748b;
  text-align: center;
}

.pagination-nav {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.pagination-container .pagination-info {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-jump {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-jump .form-control {
  text-align: center;
}

.page-item.disabled .page-link {
  color: #94a3b8;
  pointer-events: none;
  background-color: #f1f5f9;
  border-color: #e2e8f0;
}

.page-item.active .page-link {
  background-color: #667eea;
  border-color: #667eea;
  color: white;
}

.page-link {
  color: #475569;
  border: 1px solid #d1d5db;
  transition: all 0.2s ease;
}

.page-link:hover {
  background-color: #f1f5f9;
  border-color: #9ca3af;
}

@media (max-width: 768px) {
  .pagination-container {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .page-size-selector,
  .page-jump {
    justify-content: center;
  }
  
  .pagination {
    justify-content: center;
  }
}

.structure-table, .indexes-table, .relations-table {
  overflow-x: auto;
}

.sql-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sql-toolbar {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sql-editor {
  padding: 1rem;
  flex: 1;
  height: 400px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.sql-editor .ace_editor {
  height: 100%;
  width: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.table-striped tbody tr:nth-of-type(odd) {
  background-color: rgba(248, 250, 252, 0.5);
}

.table-hover tbody tr:hover {
  background-color: rgba(102, 126, 234, 0.05);
}

/* SQL执行结果样式 */
.sql-result {
  margin-top: 1rem;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e1e5e9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-stats {
  display: flex;
  gap: 0.5rem;
}

.result-info {
  padding: 0.5rem 1rem;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0 0 8px 8px;
}

.result-table {
  background: white;
}

.result-table .table {
  margin-bottom: 0;
  font-size: 0.875rem;
}

.result-table .table th {
  background: #495057;
  color: white;
  font-weight: 600;
  border-top: none;
  font-size: 0.75rem;
  padding: 0.5rem 0.75rem;
}

.result-table .table td {
  padding: 0.5rem 0.75rem;
  vertical-align: middle;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* SQL执行状态样式 */
.sql-loading {
  color: #007bff;
  display: flex;
  align-items: center;
}

.sql-loading-state {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0 0 8px 8px;
}

.sql-error {
  margin-top: 1rem;
}

.sql-error .alert {
  margin: 0;
  border-radius: 0 0 8px 8px;
}

.result-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0 0 8px 8px;
}

.result-actions {
  display: flex;
  gap: 0.5rem;
}

.result-table-container {
  max-height: 400px;
  overflow-y: auto;
}

.result-table-container .table {
  margin-bottom: 0;
}

.result-table-container .sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #495057;
}

/* 新的布局样式 */
.tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.data-content,
.structure-content,
.indexes-content,
.relations-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.data-content.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.structure-table,
.indexes-table,
.relations-table {
  overflow-x: auto;
}
</style>