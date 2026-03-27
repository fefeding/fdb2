<template>
<div class="datagrid-container">
  <div class="datagrid-inner">
    <table class="table table-light table-striped table-hover">
        <thead class="table-light">
            <tr>
                <th v-for="column in props.columns" :key="column.name" scope="col" class="datagrid-th" :style="column.headerStyle||''" 
                    @click="column.sortable !== false && handleSort(column.name)"
                    :class="{ 'sortable': column.sortable !== false }"> 
                  <slot :name="column.name+'_header'" :column="column">
                        <div class="header-content">
                            <span>{{column.text||column.name||''}}</span>
                            <span v-if="column.sortable !== false" class="sort-icon">
                                <i v-if="props.sortField === column.name && props.sortOrder === 'ASC'" class="bi bi-caret-up-fill"></i>
                                <i v-else-if="props.sortField === column.name && props.sortOrder === 'DESC'" class="bi bi-caret-down-fill"></i>
                                <i v-else class="bi bi-caret-up text-muted opacity-50"></i>
                            </span>
                        </div>
                    </slot>                    
                </th>
            </tr>
        </thead>
        <tbody class="table-group-divider">
            <tr v-for="(row, index) in props.data" :key="index" @click="emits('rowClicked', row, index)" style="cursor: pointer;">
                <td v-for="column in props.columns" :key="column.name">
                    <slot :name="column.name||column" :row="row" :column="column">
                        <component v-if="column.component" :is="column.component"></component>
                        <span v-else>{{ renderDataItem(row, column) }}</span>
                    </slot>                    
                </td>
            </tr>
        </tbody>
        <tfoot>
            <slot name="footer" :columns="props.columns"></slot>   
        </tfoot>
    </table>
    <Loading :isLoading="props.isLoading" :message="props.loadingMessage"></Loading>
  </div>
    <!-- 分页组件 -->
    <Pagination v-if="props.showPagination" :currentPage="props.currentPage" :totalPages="props.totalPages" @pageChanged="pageChanged"></Pagination>
</div>
</template>
  
<script setup lang="ts">
  import { ref, computed, defineComponent, type Component } from 'vue';
  import Loading from '../loading/index.vue';
  import Pagination from './pagination.vue';

  type ColumnType = {
    name: string;
    text?: string;
    component?: Component;
    headerStyle?: string;
    style?: string;
    sortable?: boolean;
    formatter?: (row: any, column: ColumnType) => string;
  };
  
  const props = defineProps({
    isLoading: {
      type: Boolean,
      default: false
    },
    loadingMessage: {
      type: String,
      default: '加载中...'
    },
    // 总页数
    totalPages: {
        type: Number,
        default: 1
    },
    currentPage: {
        type: Number,
        default: 1,
    },
    showPagination: {
        type: Boolean,
        default: true
    },
    data: {
        type: Array<any>,
        default: []
    },
    columns: {
        type: Array<ColumnType>,
        default: []
    },
    sortField: {
        type: String,
        default: ''
    },
    sortOrder: {
        type: String,
        default: '' // ASC, DESC, ''
    }
  });

  const emits = defineEmits(['pageChanged', 'rowClicked', 'sortChanged']);

  function renderDataItem(row: any, column: any) {
    if(typeof column === 'string') return row[column];
    if(column.formatter) {
        return column.formatter(row, column);
    }
    return row[column.name];
  }

  function pageChanged(page: number) {
    emits('pageChanged', page);
  }

  function handleSort(field: string) {
    let order: 'ASC' | 'DESC' | '' = 'ASC';
    if (props.sortField === field) {
        if (props.sortOrder === 'ASC') {
            order = 'DESC';
        } else if (props.sortOrder === 'DESC') {
            order = ''; // 取消排序
        }
    }
    emits('sortChanged', { field: order ? field : '', order });
  }

</script>
  
<style scoped>
  .datagrid-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .datagrid-inner {
    flex: 1;
    overflow: auto;
    margin-bottom: 10px;
  }
  .datagrid-th {
    min-width: 80px;
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: #f8f9fa;
  }
  .datagrid-th.sortable {
    cursor: pointer;
    user-select: none;
  }
  .datagrid-th.sortable:hover {
    background-color: #e9ecef;
  }
  .header-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .sort-icon {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
  }
</style>  