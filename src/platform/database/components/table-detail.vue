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
          <div class="stat-item" v-if="table?.rowCount !== undefined">
            <div class="stat-value">{{ formatNumber(table?.rowCount) }}</div>
            <div class="stat-label">{{ $t('tableDetail.rowData') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ tableStructure?.columns?.length || 0 }}</div>
            <div class="stat-label">{{ $t('common.columns') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ tableStructure?.indexes?.length || 0 }}</div>
            <div class="stat-label">{{ $t('database.indexes') }}</div>
          </div>
          <div class="stat-item" v-if="table?.dataSize !== undefined">
            <div class="stat-value">{{ formatSize(table?.dataSize) }}</div>
            <div class="stat-label">{{ $t('databaseDetail.size') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作工具栏 -->
    <div class="table-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary btn-sm" @click="refreshData">
          <i class="bi bi-arrow-clockwise"></i> {{ $t('tableDetail.refreshData') }}
        </button>
        <button class="btn btn-info btn-sm" @click="editTableStructure">
          <i class="bi bi-pencil-square"></i> {{ $t('tableDetail.modifyStructure') }}
        </button>
        <button class="btn btn-success btn-sm" @click="()=>insertData()">
          <i class="bi bi-plus-lg"></i> {{ $t('tableDetail.insertData') }}
        </button>
        <div class="btn-group">
          <button class="btn btn-info btn-sm dropdown-toggle" data-bs-toggle="dropdown">
            <i class="bi bi-download"></i> {{ $t('tableDetail.exportMenu') }}
          </button>
          <ul class="dropdown-menu">
            <li><button class="dropdown-item" @click="exportTableData('csv')">
              <i class="bi bi-file-earmark-spreadsheet me-2"></i>{{ $t('tableDetail.exportCSV') }}
            </button></li>
            <li><button class="dropdown-item" @click="exportTableData('json')">
              <i class="bi bi-file-earmark-code me-2"></i>{{ $t('tableDetail.exportJSON') }}
            </button></li>
            <li><button class="dropdown-item" @click="exportTableData('excel')">
              <i class="bi bi-file-earmark-excel me-2"></i>{{ $t('tableDetail.exportExcel') }}
            </button></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item" @click="exportTableStructure()">
              <i class="bi bi-file-earmark-text me-2"></i>{{ $t('tableDetail.exportStructure') }}
            </button></li>
            <li><button class="dropdown-item" @click="exportTableDataSQL()">
              <i class="bi bi-file-earmark-code me-2"></i>{{ $t('tableDetail.exportDataSQL') }}
            </button></li>
          </ul>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-outline-warning btn-sm" @click="truncateTable" v-if="table?.rowCount">
          <i class="bi bi-trash"></i> {{ $t('tableDetail.truncateTable') }}
        </button>
        <button class="btn btn-outline-danger btn-sm" @click="dropTable">
          <i class="bi bi-x-circle"></i> {{ $t('tableDetail.dropTable') }}
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
            <i class="bi bi-grid"></i> {{ $t('tableDetail.dataTab') }}
            <span class="badge bg-secondary ms-2" v-if="table?.rowCount">{{ formatNumber(table?.rowCount) }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'structure' }"
            @click="activeTab = 'structure'"
          >
            <i class="bi bi-diagram-3"></i> {{ $t('tableDetail.structureTab') }}
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'indexes' }"
            @click="activeTab = 'indexes'"
          >
            <i class="bi bi-key"></i> {{ $t('tableDetail.indexesTab') }}
          </button>
        </li>
        <li class="nav-item">
          <button 
            class="nav-link" 
            :class="{ active: activeTab === 'relations' }"
            @click="activeTab = 'relations'"
          >
            <i class="bi bi-link-45deg"></i> {{ $t('tableDetail.relationsTab') }}
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
      </ul>

      <div class="tab-content">
        <!-- 数据标签页 -->
        <div v-show="activeTab === 'data'" class="tab-panel">    
          <TableDataGrid
            ref="tableDataGridRef"
            :connection="connection"
            :database="database"
            :table="table"
            :columns="tableStructure?.columns || []"
            @edit-row="editRow"
            @delete-row="deleteRow"
          />
        </div>

        <!-- 结构标签页 -->
        <div v-show="activeTab === 'structure'" class="tab-panel">
          <div class="structure-actions mb-3">
            <button class="btn btn-success btn-sm" @click="addColumn">
              <i class="bi bi-plus-lg"></i> {{ $t('tableDetail.addColumn') }}
            </button>
            <button class="btn btn-info btn-sm" @click="editTableStructure">
              <i class="bi bi-pencil-square"></i> {{ $t('tableDetail.modifyStructure') }}
            </button>
          </div>
          
          <div class="structure-content">
            <div class="structure-table">
              <table class="table table-bordered">
                <thead class="table-dark">
                  <tr>
                    <th>{{ $t('tableDetail.columnNameHeader') }}</th>
                    <th>{{ $t('tableDetail.dataTypeHeader') }}</th>
                    <th>{{ $t('tableDetail.nullableHeader') }}</th>
                    <th>{{ $t('tableDetail.defaultHeader') }}</th>
                    <th>{{ $t('tableDetail.primaryKeyHeader') }}</th>
                    <th>{{ $t('tableDetail.autoIncHeader') }}</th>
                    <th>{{ $t('tableDetail.commentHeader') }}</th>
                    <th width="100">{{ $t('tableDetail.operationsHeader') }}</th>
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
                        <i class="bi bi-key-fill"></i> {{ $t('tableDetail.primaryKeyHeader') }}
                      </span>
                      <span v-else>-</span>
                    </td>
                    <td>
                      <span v-if="column.isAutoIncrement" class="badge bg-success">
                        <i class="bi bi-arrow-up-circle"></i> {{ $t('tableDetail.autoIncHeader') }}
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
                    <th>{{ $t('tableDetail.indexNameHeader') }}</th>
                    <th>{{ $t('tableDetail.typeHeader') }}</th>
                    <th>{{ $t('tableDetail.uniqueHeader') }}</th>
                    <th>{{ $t('tableDetail.columnsHeader') }}</th>
                    <th width="100">{{ $t('tableDetail.operationsHeader') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="index in tableStructure?.indexes || []" :key="index.name">
                    <td><strong>{{ index.name }}</strong></td>
                    <td><span class="badge bg-info">{{ index.type }}</span></td>
                    <td>
                      <span :class="index.unique ? 'text-success' : 'text-secondary'">
                        <i :class="index.unique ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i>
                        {{ index.unique ? $t('common.yes') : $t('common.no') }}
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
                    <th>{{ $t('tableDetail.constraintNameHeader') }}</th>
                    <th>{{ $t('tableDetail.localColumnHeader') }}</th>
                    <th>{{ $t('tableDetail.targetTableHeader') }}</th>
                    <th>{{ $t('tableDetail.targetColumnHeader') }}</th>
                    <th>{{ $t('tableDetail.onDeleteHeader') }}</th>
                    <th>{{ $t('tableDetail.onUpdateHeader') }}</th>
                    <th width="100">{{ $t('tableDetail.operationsHeader') }}</th>
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
            />
          </div>
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
      :columns="tableStructure?.columns"
      :mode="tableEditorMode"
      @close="closeTableEditor"
      @submit="handleTableStructureChange"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import { useI18n } from 'vue-i18n';
import { DatabaseService } from '@/service/database';
import DataEditor from './data-editor.vue';

import TableDataGrid from './table-data-grid.vue';
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
const { t } = useI18n();

// 引用
const tableDataGridRef = ref();

// 响应式数据
const activeTab = ref('data');
const sqlQuery = ref('');

// 数据编辑相关
const showDataEditor = ref(false);
const isEditMode = ref(false);
const editingRow = ref<any>(null);

// 表格编辑器相关
const showTableEditor = ref(false);
const tableEditorMode = ref<'create' | 'edit'>('edit');

// 计算属性
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

// 监听变化
watch(() => props.table, () => {
  activeTab.value = 'data';
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

function refreshData() {
  nextTick(() => {
    if (tableDataGridRef.value) {
      tableDataGridRef.value.refresh();
    }
  });
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
      await modal.error(t('tableDetail.noInsertField'));
      return;
    }

    const sql = `INSERT INTO ${props.table?.name} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
    
    // 执行SQL
    emit('execute-sql', sql);
  } catch (error) {
    console.error('插入数据失败:', error);
    modal.error(t('tableDetail.insertFailed') + ': ' + (error as any).message);
  }
}

async function editRow(row: any) {
  editingRow.value = row;
  isEditMode.value = true;
  showDataEditor.value = true;
}

async function deleteRow(row: any) {
  try {
    const result = await modal.confirm(t('tableDetail.confirmDeleteRow'), {
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      type: 'danger'
    });

    if (result) {
      // 获取主键条件
      const primaryKeys = props.tableStructure?.columns?.filter((col: any) => col.isPrimary) || [];
      if (primaryKeys.length === 0) {
        await modal.warning(t('tableDetail.noPrimaryKey'));
        return;
      }

      const where: any = {};
      primaryKeys.forEach((pk: any) => {
        where[pk.name] = row[pk.name];
      });

      const response = await databaseService.deleteData(
        props.connection?.id || '',
        props.database,
        props.table?.name || '',
        where
      );

      if (response.ret === 0) {
        await modal.success(t('tableDetail.deleteSuccess'));
        refreshData();
      } else {
        await modal.error(t('tableDetail.deleteFailed') + ': ' + (response.msg || t('common.unknown')));
      }
    }
  } catch (error) {
    console.error('删除行失败:', error);
    modal.error(t('tableDetail.deleteFailed') + ': ' + (error as any).message);
  }
}

async function truncateTable() {
  try {
    const result = await modal.confirm(t('tableDetail.confirmTruncate'), {
      confirmButtonText: t('tableDetail.confirmTruncateBtn'),
      cancelButtonText: t('common.cancel'),
      type: 'danger'
    });

    if (result) {
      const response = await databaseService.truncateTable(
        props.connection?.id || '',
        props.database,
        props.table?.name || ''
      );
      if (response.ret === 0) {
        await modal.success(t('tableDetail.truncateSuccess'));
        nextTick(() => {
          refreshData();
        });
      } else {
        await modal.error(t('tableDetail.truncateFailed'));
      }
    }
  } catch (error) {
    console.error('清空表失败:', error);
  }
}

async function dropTable() {
  try {
    const result = await modal.confirm(t('tableDetail.confirmDrop'), {
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
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
          await modal.success(t('tableDetail.dropSuccess'));
          // 表删除后需要返回到数据库视图，这里通过事件通知父组件
          emit('refresh-database');
        } else {
          await modal.error(t('tableDetail.dropFailed'));
        }
      } catch (error) {
        console.error('删除表失败:', error);
        modal.error(error.msg || error.message || t('tableDetail.dropFailed'), {
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
      refreshData();
      closeDataEditor();
    } else {
      modal.error(t('tableDetail.operationFailed'));
    }
  } catch (error) {
    console.error('处理数据提交失败:', error);
    
    modal.error(error.msg || error.message || t('tableDetail.operationFailed'), {
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
      await modal.success(t('tableDetail.structureModifySuccess'));
    } else {
      await modal.error(t('tableDetail.structureModifyFailed'));
    }
  } catch (error) {
    console.error('处理表结构修改失败:', error);
    
    modal.error(error.msg || error.message || t('tableDetail.structureModifyFailed'), {
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
  modal.confirm(t('tableDetail.confirmDeleteColumn', { name: column.name }), {
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
  modal.confirm(t('tableDetail.confirmDeleteIndex', { name: index.name }), {
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
  modal.confirm(t('tableDetail.confirmDeleteFK', { name: fk.name }), {
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



async function exportTableData(format: 'csv' | 'json' | 'excel') {
  try {
    if (!props.connection || !props.database || !props.table?.name) {
      await modal.warning(t('tableDetail.missingConnectionInfo'));
      return;
    }
    
    // 调用后端API导出表数据
    let response;
    switch (format) {
      case 'csv':
        response = await databaseService.exportTableDataToCSV(
          props.connection.id,
          props.database,
          props.table.name
        );
        break;
      case 'json':
        response = await databaseService.exportTableDataToJSON(
          props.connection.id,
          props.database,
          props.table.name
        );
        break;
      case 'excel':
        response = await databaseService.exportTableDataToExcel(
          props.connection.id,
          props.database,
          props.table.name
        );
        break;
      default:
        throw new Error(t('tableDetail.unsupportedFormat'));
    }
    
    if (response.ret === 0) {
      await modal.success(t('tableDetail.exportSuccess', { path: response.data }));
    } else {
      await modal.error(t('tableDetail.exportFailed') + ': ' + response.msg);
    }
  } catch (error) {
    console.error('导出表数据失败:', error);
    modal.error(t('tableDetail.exportFailed') + ': ' + (error as any).message);
  }
}

async function exportTableStructure() {
  try {
    // 构建CREATE TABLE语句
    let createTableSQL = `CREATE TABLE ${props.table?.name} (
`;
    
    const columns = [];
    safeTableColumns.value.forEach((column: any, index: number) => {
      let columnDef = `  ${column.name} ${column.type}`;
      
      if (!column.nullable) {
        columnDef += ' NOT NULL';
      }
      
      if (column.defaultValue !== undefined && column.defaultValue !== null) {
        if (typeof column.defaultValue === 'string') {
          columnDef += ` DEFAULT '${column.defaultValue.replace(/'/g, "''")}'`;
        } else {
          columnDef += ` DEFAULT ${column.defaultValue}`;
        }
      }
      
      if (column.isPrimary) {
        columnDef += ' PRIMARY KEY';
      }
      
      if (column.isAutoIncrement) {
        columnDef += ' AUTO_INCREMENT';
      }
      
      if (column.comment) {
        columnDef += ` COMMENT '${column.comment.replace(/'/g, "''")}'`;
      }
      
      columns.push(columnDef);
    });
    
    createTableSQL += columns.join(',\n');
    createTableSQL += '\n);\n';
    
    // 添加索引
    if (props.tableStructure?.indexes) {
      props.tableStructure.indexes.forEach((index: any) => {
        if (!index.isPrimary) {
          createTableSQL += `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${props.table?.name} (${index.columns.join(', ')})\n`;
        }
      });
    }
    
    // 添加外键
    if (props.tableStructure?.foreignKeys) {
      props.tableStructure.foreignKeys.forEach((fk: any) => {
        createTableSQL += `ALTER TABLE ${props.table?.name} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${fk.column}) REFERENCES ${fk.referencedTable} (${fk.referencedColumn})${fk.onDelete ? ` ON DELETE ${fk.onDelete}` : ''}${fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : ''}\n`;
      });
    }
    
    // 下载SQL文件
    downloadSQLFile(createTableSQL, `${props.table?.name}_structure.sql`);
  } catch (error) {
    console.error('导出表结构失败:', error);
    modal.error(t('tableDetail.exportStructFailed') + ': ' + (error as any).message);
  }
}

async function exportTableDataSQL() {
  try {
    if (!props.connection || !props.database || !props.table?.name) {
      await modal.warning(t('tableDetail.missingConnectionInfo'));
      return;
    }
    
    // 调用后端API导出表数据
    const response = await databaseService.exportTableDataToSQL(
      props.connection.id,
      props.database,
      props.table.name
    );
    
    if (response.ret === 0) {
      await modal.success(t('tableDetail.exportSuccess', { path: response.data }));
    } else {
      await modal.error(t('tableDetail.exportFailed') + ': ' + response.msg);
    }
  } catch (error) {
    console.error('导出表数据失败:', error);
    modal.error(t('tableDetail.exportFailed') + ': ' + (error as any).message);
  }
}

function downloadSQLFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/sql;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
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
  flex-shrink: 0;
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
  display: flex;
  flex-direction: column;
}

.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
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