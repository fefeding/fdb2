<template>
  <!-- 点击遮罩不关闭：避免误触丢失已填写的表结构；只能通过右上角关闭或取消按钮关闭 -->
  <div v-if="visible" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-lg" style="width: 80%; max-width: none;" @click.stop>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-pencil-square me-2"></i>
            {{ mode === 'create' ? $t('tableEditor.createNewTable') : $t('tableEditor.modifyStructure') }}
          </h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>
        
        <div class="modal-body">
          <!-- 表基本信息 -->
          <div class="table-info-section mb-4">
            <h6 class="section-title">{{ $t('tableEditor.tableInfo') }}</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">{{ $t('tableEditor.tableNameLabel') }}</label>
                  <input 
                    v-model="formData.tableName" 
                    type="text" 
                    class="form-control" 
                    :disabled="mode === 'edit'"
                    :placeholder="$t('tableEditor.tableNamePlaceholder')"
                  >
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">{{ $t('tableEditor.tableCommentLabel') }}</label>
                  <input
                    v-model="formData.tableComment"
                    type="text"
                    class="form-control"
                    :disabled="tableCommentDisabled"
                    :title="tableCommentDisabled ? '该数据库不支持表注释' : undefined"
                    :placeholder="$t('tableEditor.tableCommentPlaceholder')"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- 字段管理 -->
          <div class="columns-section">
            <div class="section-header d-flex justify-content-between align-items-center mb-3">
              <h6 class="section-title mb-0">{{ $t('tableEditor.columnManagement') }}</h6>
              <button class="btn btn-success btn-sm" @click="addColumn">
                <i class="bi bi-plus-lg"></i> {{ $t('tableEditor.addColumn') }}
              </button>
            </div>
            
            <div class="table-responsive">
              <table class="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th width="120">{{ $t('tableEditor.columnNameHeader') }}</th>
                    <th width="140">{{ $t('tableEditor.dataTypeHeader') }}</th>
                    <th width="120">{{ $t('tableEditor.lengthPrecisionHeader') }}</th>
                    <th width="80">{{ $t('tableEditor.nullableHeader') }}</th>
                    <th width="100">{{ $t('tableEditor.defaultHeader') }}</th>
                    <th width="80">{{ $t('tableEditor.primaryKeyHeader') }}</th>
                    <th width="80">{{ $t('tableEditor.autoIncHeader') }}</th>
                    <th>{{ $t('tableEditor.commentHeader') }}</th>
                    <th width="100">{{ $t('tableEditor.operationsHeader') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(column, index) in formData.columns" :key="index">
                    <td>
                      <input 
                        v-model="column.name" 
                        type="text" 
                        class="form-control form-control-sm" 
                        :disabled="renameDisabled"
                        :title="renameDisabled ? '该数据库不支持修改列名' : undefined"
                        :placeholder="$t('tableEditor.columnNamePlaceholder')"
                      >
                    </td>
                    <td>
                      <select v-model="column.type" class="form-select form-select-sm">
                        <option value="">{{ $t('tableEditor.selectType') }}</option>
                        <optgroup v-for="(types, category) in columnTypesByCategory" :key="category" :label="getCategoryLabel(category)">
                          <option v-for="type in types" :key="type.name" :value="type.name">
                            {{ type.label }}
                          </option>
                        </optgroup>
                        <option :value="CUSTOM_TYPE_VALUE">{{ $t('tableEditor.customType') }}</option>
                      </select>
                      <input
                        v-if="column.type === CUSTOM_TYPE_VALUE"
                        v-model="column.customType"
                        type="text"
                        class="form-control form-control-sm mt-1"
                        :placeholder="$t('tableEditor.customTypePlaceholder')"
                      >
                    </td>
                    <td>
                      <div class="input-group input-group-sm" v-if="needsLength(column) || needsPrecision(column)">
                        <input 
                          v-if="needsLength(column)"
                          v-model="column.length" 
                          type="number" 
                          class="form-control form-control-sm" 
                          :placeholder="$t('tableEditor.lengthPlaceholder')"
                        >
                        <input 
                          v-if="needsPrecision(column)"
                          v-model="column.precision" 
                          type="number" 
                          class="form-control form-control-sm" 
                          :placeholder="$t('tableEditor.precisionPlaceholder')"
                        >
                        <input 
                          v-if="needsScale(column)"
                          v-model="column.scale" 
                          type="number" 
                          class="form-control form-control-sm" 
                          :placeholder="$t('tableEditor.scalePlaceholder')"
                        >
                      </div>
                      <span v-else class="text-muted">-</span>
                    </td>
                    <td>
                      <div class="form-check">
                        <input 
                          v-model="column.nullable" 
                          type="checkbox" 
                          class="form-check-input"
                        >
                      </div>
                    </td>
                    <td>
                      <input 
                        v-model="column.defaultValue" 
                        type="text" 
                        class="form-control form-control-sm" 
                        :placeholder="$t('tableEditor.defaultHeader')"
                      >
                    </td>
                    <td>
                      <div class="form-check">
                        <input 
                          v-model="column.isPrimary" 
                          type="checkbox" 
                          class="form-check-input"
                          :disabled="pkDisabled"
                          :title="pkDisabled ? '该数据库不支持在线修改主键' : undefined"
                          @change="onPrimaryKeyChange(column)"
                        >
                      </div>
                    </td>
                    <td>
                      <div class="form-check">
                        <input 
                          v-model="column.isAutoIncrement" 
                          type="checkbox" 
                          class="form-check-input"
                          :disabled="!column.isPrimary || !supportsAutoIncrement(column)"
                          :title="supportsAutoIncrement(column) ? '自增列将作为唯一主键' : undefined"
                          @change="onAutoIncrementChange(column, index)"
                        >
                      </div>
                    </td>
                    <td>
                      <input
                        v-model="column.comment"
                        type="text"
                        class="form-control form-control-sm"
                        :disabled="columnCommentDisabled"
                        :title="columnCommentDisabled ? '该数据库不支持列注释' : undefined"
                        :placeholder="$t('tableEditor.fieldComment')"
                      >
                    </td>
                    <td>
                      <button 
                        class="btn btn-outline-danger btn-sm" 
                        @click="removeColumn(index)"
                        :disabled="formData.columns.length <= 1"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- SQL预览：后端生成（create/edit 均与执行同一出口，所见即所得） -->
          <div class="sql-preview-section mt-4">
            <div class="d-flex align-items-center justify-content-between">
              <h6 class="section-title mb-0">{{ $t('tableEditor.sqlPreview') }}</h6>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :disabled="refreshingTables"
                title="重新拉取表列表（重名检测等依赖它；预览默认走 30 秒缓存）"
                @click="refreshTableList"
              >
                {{ refreshingTables ? '刷新中...' : '刷新表列表' }}
              </button>
            </div>
            <pre class="sql-preview mt-2">{{ previewSql }}</pre>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">{{ $t('common.cancel') }}</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="submitDisabled"
            :title="submitDisabledHint || undefined"
            @click="submit"
          >{{ $t('common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import { DatabaseService } from '@/service/database';
import { modal } from '@/utils/modal';
import { getColumnTypesByName, ColumnCategory } from '@/typings/database-types';
// DDL 契约（单一事实来源：前端不再自己拼 SQL/diff，只组装目标态 TableSpec）
import type { TableSpec, ColumnSpec, DdlCapability } from '../../../../server/model/ddl-spec';

// Props
const props = defineProps<{
  visible: boolean;
  connection: ConnectionEntity | null;
  database: string;
  table?: TableEntity | null;
  columns?: any[];
  mode: 'create' | 'edit';
}>();

// Emits
const emit = defineEmits<{
  close: [];
  submit: [result: any];
}>();

const databaseService = new DatabaseService();
const { t } = useI18n();

// 自定义类型的哨兵值：选中后由用户输入完整类型（如 ENUM('a','b')、DECIMAL(10,2)）
const CUSTOM_TYPE_VALUE = '__custom__';

// 列的最终类型字符串
function rawType(column: any): string {
  if (!column) return '';
  return column.type === CUSTOM_TYPE_VALUE ? (column.customType || '') : (column.type || '');
}

// 获取当前数据库支持的列类型
const columnTypes = computed(() => {
  if (!props.connection) return [];
  return getColumnTypesByName(props.connection.type);
});

// 按类别分组的列类型
const columnTypesByCategory = computed(() => {
  const categories: Record<string, any[]> = {};
  columnTypes.value.forEach(type => {
    if (!categories[type.category]) {
      categories[type.category] = [];
    }
    (categories[type.category] as any[]).push(type);
  });
  return categories;
});

// 表单数据
const formData = ref({
  tableName: '',
  tableComment: '',
  columns: [{
    name: '',
    type: '',
    customType: '',
    length: '',
    precision: null as string | null,
    scale: null as string | null,
    nullable: false,
    defaultValue: '',
    isPrimary: false,
    isAutoIncrement: false,
    comment: ''
  }] as Array<{
    name: string;
    type: string;
    customType: string;
    length: string;
    precision: string | null;
    scale: string | null;
    nullable: boolean;
    defaultValue: string;
    isPrimary: boolean;
    isAutoIncrement: boolean;
    comment: string;
  }>
});

// 解析类型字符串，提取基础类型名和长度/精度
// 例如: "varchar(255)" -> { baseType: "VARCHAR", length: "255" }
//       "decimal(10,2)" -> { baseType: "DECIMAL", precision: "10", scale: "2" }
//       "int(11)" -> { baseType: "INT", length: "11" }
function parseColumnType(typeStr: string): { baseType: string; length?: string; precision?: string; scale?: string } {
  const result: { baseType: string; length?: string; precision?: string; scale?: string } = {
    baseType: typeStr
  };

  if (!typeStr) return result;

  const match = typeStr.match(/^([a-zA-Z\s]+)\(([^)]+)\)$/);
  if (match) {
    result.baseType = (match[1] as string).trim().toUpperCase();
    const params = (match[2] as string).split(',').map((s: string) => s.trim());

    // 查找类型定义，判断是长度还是精度
    const typeInfo = columnTypes.value.find(t => t.name.toUpperCase() === result.baseType);
    if (typeInfo?.requiresPrecision) {
      result.precision = params[0] || undefined;
      result.scale = params[1] || undefined;
    } else {
      result.length = params[0] || '';
    }
  } else {
    // 不带括号，直接使用大写作为基础类型
    result.baseType = typeStr.trim().toUpperCase();
  }

  return result;
}

// 初始化表单数据
function initFormData() {  
  if (props.mode === 'edit' && props.table) {
    const columns = props.columns || props.table.columns || [];
    const tableData = {
      tableName: props.table.name || '',
      tableComment: props.table.comment || '',
      columns: columns.map(col => {
        // 解析类型字符串，提取基础类型名和长度/精度
        const rawColType = col.type || '';
        const parsed = parseColumnType(rawColType);
        // ENUM('a','b') 这类参数不是数字的类型整体作为自定义类型，避免参数被拆坏
        const isNonNumericParamType = /^[a-zA-Z\s]+\([^)]*'[^)]*\)$/.test(rawColType);
        return {
          name: col.name || '',
          type: isNonNumericParamType ? CUSTOM_TYPE_VALUE : parsed.baseType,
          customType: isNonNumericParamType ? rawColType : (col.customType || ''),
          length: col.length || parsed.length || '',
          precision: col.precision || parsed.precision || null,
          scale: col.scale || parsed.scale || null,
          nullable: col.nullable || false,
          defaultValue: col.defaultValue || '',
          isPrimary: col.isPrimary || false,
          isAutoIncrement: col.isAutoIncrement || false,
          comment: col.comment || ''
        } as any;
      }) || []
    };
    formData.value = { ...tableData };
  } else {
    // 创建模式：如果传入 partial table，预填表名/注释
    const isCreateWithPrefill = props.mode === 'create' && props.table;
    formData.value = {
      tableName: isCreateWithPrefill ? (props.table!.name || '') : '',
      tableComment: isCreateWithPrefill ? (props.table!.comment || '') : '',
      columns: [{
        name: '',
        type: '',
        customType: '',
        length: '',
        precision: null,
        scale: null,
        nullable: false,
        defaultValue: '',
        isPrimary: false,
        isAutoIncrement: false,
        comment: ''
      } as any]
    };
  }
}

/**
 * 目标态组装：UI 表单 -> TableSpec（前端唯一的职责）。
 * 原始态由后端实时读取，diff/SQL 生成全部在后端 schema 引擎完成——
 * 前端不再持有"旧结构缓存"，缓存过期导致的错误语句从机制上消除。
 */
function buildTableSpec(): TableSpec {
  const columns: ColumnSpec[] = formData.value.columns
    .filter(col => col.name && rawType(col))
    .map(col => {
      const raw = rawType(col).trim();
      const isCustom = col.type === CUSTOM_TYPE_VALUE;
      // UI 约定：默认值输入框为空串 = 无默认值（hasDefault: false）；
      // '0'、'NULL' 等文本由后端三态归一，不再受前端假值兜底影响
      const hasDefault = col.defaultValue !== '' && col.defaultValue !== null && col.defaultValue !== undefined;
      const spec: ColumnSpec = {
        name: col.name.trim(),
        type: isCustom ? raw : col.type,
        nullable: col.nullable,
        hasDefault,
        autoIncrement: !!col.isAutoIncrement
      };
      if (isCustom) {
        spec.customType = raw;
      } else {
        if (col.length !== '' && col.length !== null && col.length !== undefined) spec.length = col.length;
        if (col.precision !== null && col.precision !== undefined && col.precision !== '') spec.precision = col.precision;
        if (col.scale !== null && col.scale !== undefined && col.scale !== '') spec.scale = col.scale;
      }
      if (hasDefault) spec.defaultValue = String(col.defaultValue);
      if (col.comment) spec.comment = col.comment;
      return spec;
    });
  return {
    name: formData.value.tableName.trim(),
    comment: formData.value.tableComment ?? '',
    columns,
    // 表级主键：勾选/取消只改这个数组（单归属），不产生列级记账
    primaryKey: formData.value.columns
      .filter(c => c.isPrimary && c.name)
      .map(c => c.name.trim())
  };
}

// SQL 预览：create/edit 都调后端 preview（与执行同一出口，所见即所得）；
// 顺带缓存后端返回的方言能力（capabilities），驱动 UI 按真实能力禁用输入。
const previewSql = ref('-- 完善表单后将在此显示后端生成的 SQL');
const caps = ref<DdlCapability | null>(null);
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let previewSeq = 0;

async function refreshPreview() {
  if (!props.connection?.id) return;
  if (props.mode === 'edit' && !props.table?.name) return;
  if (!formData.value.tableName) return;
  // 字段信息未填完时明确提示，而不是沿用上一次的预览结果——
  // 否则会出现"预览显示没有检测到任何修改、保存却真的执行了语句"的错觉
  if (formData.value.columns.some(col => col.name && !rawType(col))) {
    previewSql.value = '-- 请完善字段信息（列名与类型）后再查看 SQL';
    return;
  }

  const seq = ++previewSeq;
  const spec = buildTableSpec();
  try {
    const result = props.mode === 'create'
      ? await databaseService.previewCreateTable(props.connection.id, props.database, spec)
      : await databaseService.previewAlterTable(props.connection.id, props.database, props.table!.name, spec);
    if (seq !== previewSeq) return; // 过期响应丢弃（用户已继续编辑）
    if (result?.capabilities) caps.value = result.capabilities;
    previewSql.value = result?.ret === 0
      ? (result.preview || (props.mode === 'create' ? '-- 完善表单后将在此显示建表 SQL' : '没有检测到任何修改'))
      : (result?.message || '预览失败');
  } catch (error: any) {
    if (seq !== previewSeq) return;
    previewSql.value = `预览失败: ${error?.message || error}`;
  }
}

// 表单变化后防抖刷新预览（create/edit 均生效）
watch(formData, () => {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, 500);
}, { deep: true });

// ---- 方言能力驱动的 UI 禁用（在 caps 拉到前不禁用，避免闪烁） ----
// 表注释：SQLite 等不支持（caps.tableComment === false）
const tableCommentDisabled = computed(() => caps.value?.tableComment === false);
// 列注释：SQLite 等不支持
const columnCommentDisabled = computed(() => caps.value?.columnComment === false);
// 编辑模式改主键：CockroachDB 等不支持
const pkDisabled = computed(() => props.mode === 'edit' && caps.value?.alterPrimaryKey === false);
// 编辑模式改列名（改名）：ClickHouse 等不支持
const renameDisabled = computed(() => props.mode === 'edit' && caps.value?.renameColumn === false);
// 提交不可用：非 SQL 方言建表 / 整体不支持在线改表
const submitDisabled = computed(() =>
  (props.mode === 'create' && caps.value?.createTable === false) ||
  (props.mode === 'edit' && caps.value?.alterStrategy === 'unsupported')
);
const submitDisabledHint = computed(() => {
  if (props.mode === 'create' && caps.value?.createTable === false) {
    return '该数据库类型不支持通过 SQL 建表';
  }
  if (props.mode === 'edit' && caps.value?.alterStrategy === 'unsupported') {
    return '该数据库类型不支持在线修改表结构';
  }
  return '';
});

// 手动刷新表列表：预览默认走后端 30 秒缓存，需要最新结构（如别处刚建了同名表）时点这里全量拉取
const refreshingTables = ref(false);
async function refreshTableList() {
  if (!props.connection?.id) return;
  refreshingTables.value = true;
  try {
    const result = await databaseService.refreshTableCache(props.connection.id, props.database);
    if (result?.ret !== 0) {
      await modal.warning(result?.message || '刷新表列表失败');
    }
    await refreshPreview(); // 用最新表列表重算预览
  } catch (error: any) {
    await modal.warning(`刷新表列表失败: ${error?.message || error}`);
  } finally {
    refreshingTables.value = false;
  }
}

// 添加字段
function addColumn() {
  formData.value.columns.push({
    name: '',
    type: '',
    customType: '',
    length: '',
    precision: null,
    scale: null,
    nullable: false,
    defaultValue: '',
    isPrimary: false,
    isAutoIncrement: false,
    comment: ''
  });
  // 结构性改动立即刷新，不等 500ms 防抖：避免用户加完列就保存时预览仍是旧结果
  void refreshPreview();
}

// 删除字段
function removeColumn(index: number) {
  if (formData.value.columns.length > 1) {
    formData.value.columns.splice(index, 1);
    // 同上：删列是结构性改动，立即刷新预览
    void refreshPreview();
  }
}

// 主键变更处理：支持复合主键（同时勾选多列）
function onPrimaryKeyChange(column: any) {
  // 取消主键时同步取消自增（自增列必须是主键）
  if (!column.isPrimary) {
    column.isAutoIncrement = false;
  }
}

// 自增变更处理：自增列必须单独成主键
//（MySQL 要求 AUTO_INCREMENT 列是索引的首列，放在复合主键的非首位会报错）
function onAutoIncrementChange(column: any, index: number) {
  if (!column.isAutoIncrement) return;
  formData.value.columns.forEach((col, idx) => {
    col.isPrimary = idx === index;
    if (idx !== index) col.isAutoIncrement = false;
  });
}

// 提交表单
async function submit() {
  try {
    if (!formData.value.tableName) {
      await modal.warning('请输入表名');
      return;
    }
    
    if (formData.value.columns.some(col => !col.name || !rawType(col))) {
      await modal.warning('请完善所有字段信息');
      return;
    }
    
    if (!props.connection?.id) {
      await modal.warning('请先选择数据库连接');
      return;
    }

    let result;

    if (props.mode === 'create') {
      // 创建表：同样只传目标态 TableSpec——建表 DDL 由后端 emitCreateDdl 生成
      //（与 SQLite 重建、方言 syncTable 建表同一渲染出口），后端先做重名检测
      result = await databaseService.executeCreateTable(
        props.connection.id,
        props.database,
        buildTableSpec()
      );
    } else {
      // 修改表：只传目标态 TableSpec——对比/生成/执行全在后端 schema 引擎，
      // 基于实时结构 diff，前端缓存过期不再可能生成错误语句
      result = await databaseService.executeAlterTable(
        props.connection.id,
        props.database,
        props.table!.name,
        buildTableSpec()
      );

      // 后端基于实时结构判定无变更（含"改了又改回"），保持旧 UX：提示且不关弹窗
      if (result.ret === 0 && (!result.statements || result.statements.length === 0)) {
        await modal.info(result.message || '没有检测到任何修改');
        return;
      }
    }

    const success = result.ret === 0;
    emit('submit', {
      success,
      message: success ? (result.message || '操作成功') : (result.message || '操作失败'),
      data: result.data,
      mode: props.mode
    });

    // 失败时保留弹窗内容：建表重名、约束冲突等都是改一下就能重试的错误，
    // 关掉会让用户重新填整个表单
    if (success) close();
  } catch (error) {
    console.error('提交失败:', error);
    emit('submit', {
      success: false,
      message: '操作失败',
      mode: props.mode
    });
  }
}

// 关闭弹窗
function close() {
  emit('close');
}

// 监听props变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initFormData();
    caps.value = null;
    // 打开即拉一次后端预览（后续靠 formData watch 防抖刷新）：
    // 首次响应带回 capabilities，弹窗一打开 UI 就能按真实方言能力禁用输入
    previewSql.value = '-- 完善表单后将在此显示后端生成的 SQL';
    setTimeout(refreshPreview, 0);
  }
});

// 获取类别标签
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    [ColumnCategory.NUMERIC]: t('tableEditor.catNumeric'),
    [ColumnCategory.STRING]: t('tableEditor.catString'),
    [ColumnCategory.TEXT]: t('tableEditor.catText'),
    [ColumnCategory.DATE_TIME]: t('tableEditor.catDateTime'),
    [ColumnCategory.BOOLEAN]: t('tableEditor.catBoolean'),
    [ColumnCategory.BINARY]: t('tableEditor.catBinary'),
    [ColumnCategory.JSON]: t('tableEditor.catJson'),
    [ColumnCategory.ARRAY]: t('tableEditor.catArray'),
    [ColumnCategory.SPATIAL]: t('tableEditor.catSpatial'),
    [ColumnCategory.OTHER]: t('tableEditor.catOther')
  };
  return labels[category] || category;
}

// 获取选中的类型信息
function getSelectedType(column: any) {
  const raw = rawType(column);
  if (!raw) return null;

  // 类型本身已带括号（如 ENUM('a','b')、DECIMAL(10,2)），无需再填长度/精度
  if (raw.includes('(')) return null;

  const lower = raw.trim().toLowerCase();

  // 先按完整类型名精确匹配（如 CHARACTER VARYING、DOUBLE PRECISION）
  let typeInfo = columnTypes.value.find(t => t.name.toLowerCase() === lower);

  // 再退回复数类型名匹配（处理 "INT " 这类多余空格）
  if (!typeInfo) {
    const typeName = lower.match(/^[a-zA-Z]+/)?.[0] || lower;
    typeInfo = columnTypes.value.find(t => t.name.toLowerCase() === typeName);
  }

  return typeInfo || null;
}

// 检查类型是否需要长度参数
function needsLength(column: any): boolean {
  const typeInfo = getSelectedType(column);
  return typeInfo?.requiresLength || false;
}

// 检查类型是否需要精度参数
function needsPrecision(column: any): boolean {
  const typeInfo = getSelectedType(column);
  return typeInfo?.requiresPrecision || false;
}

// 检查类型是否需要小数位数参数
function needsScale(column: any): boolean {
  const typeInfo = getSelectedType(column);
  return typeInfo?.requiresScale || false;
}

// 检查类型是否支持自增
function supportsAutoIncrement(column: any): boolean {
  const typeInfo = getSelectedType(column);
  return typeInfo?.supportsAutoIncrement || false;
}

// 初始化
onMounted(() => {
  if (props.visible) {
    initFormData();
  }
});
</script>

<style scoped>
.section-title {
  color: var(--db-text-body);
  font-weight: 600;
  border-bottom: 2px solid var(--db-border-soft);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.sql-preview {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  padding: 0.75rem;
  border-radius: var(--db-radius-sm);
  /* 深色代码块：与全局 pre / SQL 编辑器一致，跟随主题令牌，不使用 Bootstrap bg-light */
  background-color: var(--db-code-bg);
  color: var(--db-code-fg);
  border: 1px solid var(--db-border);
  white-space: pre-wrap;
  word-break: break-all;
}

.table th {
  font-size: 0.875rem;
  font-weight: 600;
}
.table td {
  padding: 0!important;
}
.table .form-control, .table .form-select {
  border: none;
  border-radius: 0;
  box-shadow: none;
}
.form-control-sm, .form-select-sm {
  font-size: 0.875rem;
}

.modal-content {
  max-height: 90vh;
  overflow-y: auto;
}

.modal-body {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.input-group-sm .form-control {
  border-radius: 0;
}

.input-group-sm .form-control:first-child {
  border-top-left-radius: 0.25rem;
  border-bottom-left-radius: 0.25rem;
}

.input-group-sm .form-control:last-child {
  border-top-right-radius: 0.25rem;
  border-bottom-right-radius: 0.25rem;
}

.text-muted {
  color: var(--db-text-muted) !important;
}
</style>