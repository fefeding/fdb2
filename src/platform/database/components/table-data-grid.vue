<template>
  <div class="table-data-grid">
    <div class="data-grid-wrapper">
      <DataGrid
        :data="tableData"
        :columns="gridColumns"
        :is-loading="loading"
        :total-pages="totalPages"
        :current-page="currentPage"
        :sort-field="sortField"
        :sort-order="sortOrder"
        @page-changed="handlePageChange"
        @sort-changed="handleSortChange"
      >
        <!-- 为操作列定义 slot -->
        <template #actions="{ row }">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary btn-sm" @click.stop="emits('edit-row', row)">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" @click.stop="emits('delete-row', row)">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </template>

        <!-- 为每一列定义 header slot，以显示类型和主键图标 -->
        <template v-for="column in props.columns" :key="column.name + '_header'" #[column.name+`_header`]>
            <div class="column-header-custom" @click="handleSortChange({field: column.name, order: sortField === column.name ? (sortOrder === 'ASC' ? 'DESC' : (sortOrder === 'DESC' ? '' : 'ASC')) : 'ASC'})" :title="column.comment || column.name">
                <div class="header-main">
                    <span class="column-name">{{ column.name }}</span>
                    <span v-if="column.isPrimary" class="column-key text-primary ms-1" title="主键">
                        <i class="bi bi-key-fill"></i>
                    </span>
                    <span class="sort-icon ms-1">
                        <i v-if="sortField === column.name && sortOrder === 'ASC'" class="bi bi-caret-up-fill"></i>
                        <i v-else-if="sortField === column.name && sortOrder === 'DESC'" class="bi bi-caret-down-fill"></i>
                        <i v-else class="bi bi-caret-up text-muted opacity-50"></i>
                    </span>
                </div>
                <div class="header-sub">
                    <small class="text-muted column-type">{{ column.type }}</small>
                    <small v-if="column.comment" class="text-muted column-comment ms-1">- {{ column.comment }}</small>
                </div>
            </div>
        </template>

        <!-- 自定义单元格渲染 -->
        <template v-for="column in props.columns" :key="column.name" #[column.name]="{ row }">
          <div class="cell-value" :title="String(row[column.name])">
            {{ formatCellValue(row[column.name], column.name) }}
          </div>
        </template>

        <!-- 空状态插槽 -->
        <template #footer v-if="!loading && tableData.length === 0">
          <tr>
            <td :colspan="gridColumns.length" class="text-center py-5">
                <div class="empty-state">
                    <i class="bi bi-inbox fs-1 text-muted"></i>
                    <p class="mt-2 text-muted">表中暂无数据</p>
                </div>
            </td>
          </tr>
        </template>
      </DataGrid>
    </div>

    <!-- 底部状态栏 -->
    <div class="grid-footer-bar mt-2 d-flex justify-content-between align-items-center px-3">
        <div class="pagination-info text-muted small">
            共 {{ total }} 条记录
        </div>
        <div class="page-size-selector d-flex align-items-center">
            <label class="small text-muted me-2">每页显示：</label>
            <select class="form-select form-select-sm" v-model="pageSize" @change="handlePageSizeChange" style="width: 80px;">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
            </select>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import DataGrid from '@/components/dataGrid/index.vue';
import type { ConnectionEntity, TableEntity, ColumnEntity } from '@/typings/database';
import { DatabaseService } from '@/service/database';

const props = defineProps<{
  connection: ConnectionEntity | null;
  database: string;
  table: TableEntity | null;
  columns: ColumnEntity[];
}>();

const emits = defineEmits<{
  'edit-row': [row: any];
  'delete-row': [row: any];
}>();

const databaseService = new DatabaseService();

// 状态
const tableData = ref<any[]>([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(50);
const sortField = ref('');
const sortOrder = ref(''); // ASC, DESC, ''

// 计算属性
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1);

const gridColumns = computed(() => {
  const cols = props.columns.map(col => ({
    name: col.name,
    text: col.name,
    sortable: true
  }));

  // 添加操作列
  cols.push({
    name: 'actions',
    text: '操作',
    sortable: false,
    headerStyle: 'width: 100px;'
  } as any);

  return cols;
});

// 方法
async function loadData() {
  if (!props.connection || !props.database || !props.table) return;

  loading.value = true;
  try {
    let orderBy = '';
    if (sortField.value && sortOrder.value) {
      orderBy = `${sortField.value} ${sortOrder.value}`;
    }

    const result = await databaseService.getTableData(
      props.connection.id,
      props.database,
      props.table.name,
      currentPage.value,
      pageSize.value,
      undefined,
      orderBy
    );

    if (result.ret === 0) {
      tableData.value = result.data?.data || [];
      total.value = result.data?.total || 0;
    }
  } catch (error) {
    console.error('加载表数据失败:', error);
  } finally {
    loading.value = false;
  }
}

function handlePageChange(page: number) {
  currentPage.value = page;
  loadData();
}

function handlePageSizeChange() {
  currentPage.value = 1;
  loadData();
}

function handleSortChange({ field, order }: { field: string, order: string }) {
  sortField.value = field;
  sortOrder.value = order;
  currentPage.value = 1;
  loadData();
}

function formatCellValue(value: any, columnName: string): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  
  // 检查是否为日期时间类型
  const column = props.columns.find(col => col.name === columnName);
  if (column && isDateTimeType(column.type) && value) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    } catch (e) {
      return String(value);
    }
  }
  
  return String(value);
}

// 检测是否为日期时间类型
function isDateTimeType(type: string): boolean {
  const upperType = type.toUpperCase();
  return upperType.includes('DATETIME') || upperType.includes('TIMESTAMP') || upperType.includes('DATE') || upperType.includes('TIME');
}

// 监听变化暴露刷新方法
defineExpose({
    refresh: loadData
});

// 监听变化
watch(() => [props.connection?.id, props.database, props.table?.name], () => {
  currentPage.value = 1;
  sortField.value = '';
  sortOrder.value = '';
  loadData();
});

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.table-data-grid {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.data-grid-wrapper {
  flex: 1;
  overflow: hidden;
}

.column-header-custom {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    user-select: none;
}

.header-main {
    display: flex;
    align-items: center;
}

.column-name {
    font-weight: 600;
}

.header-sub {
    display: flex;
    align-items: center;
    margin-top: 2px;
    max-width: 150px; /* 限制子标题区域的最大宽度 */
}

.column-type {
    font-size: 0.7rem;
    line-height: 1;
    flex-shrink: 0; /* 防止类型被压缩 */
}

.column-comment {
    font-size: 0.7rem;
    line-height: 1;
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1; /* 允许注释占据剩余空间并截断 */
}

.cell-value {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-footer-bar {
    background: #f8f9fa;
    border-top: 1px solid #dee2e6;
    padding: 8px 16px;
}
</style>
