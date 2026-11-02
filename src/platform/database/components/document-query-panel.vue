<template>
  <div class="document-query-panel">
    <div class="query-toolbar d-flex flex-wrap gap-2 align-items-center mb-2">
      <select class="form-select form-select-sm" style="width: 220px;" v-model="collection">
        <option v-for="t in tables" :key="t.name" :value="t.name">{{ t.name }}</option>
      </select>

      <div class="btn-group btn-group-sm" role="group">
        <button class="btn" :class="mode === 'find' ? 'btn-primary' : 'btn-outline-primary'" @click="mode = 'find'">
          {{ $t('documentQuery.filterTab') }}
        </button>
        <button class="btn" :class="mode === 'aggregate' ? 'btn-primary' : 'btn-outline-primary'" @click="mode = 'aggregate'">
          {{ $t('documentQuery.aggregateTab') }}
        </button>
      </div>

      <template v-if="mode === 'find'">
        <input v-model="sort" class="form-control form-control-sm" style="width: 180px;" :placeholder="$t('documentQuery.sortPlaceholder')" />
        <select class="form-select form-select-sm" style="width: 90px;" v-model.number="pageSize">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </template>

      <button class="btn btn-success btn-sm" :disabled="loading || !collection" @click="run">
        <i class="bi bi-play-fill"></i> {{ loading ? $t('documentQuery.executing') : $t('documentQuery.execute') }}
      </button>
      <span v-if="total !== null" class="text-muted small">{{ $t('documentQuery.totalLabel', { count: total }) }}</span>
    </div>

    <div class="row g-2">
      <div class="col-md-5">
        <label class="form-label small">
          {{ mode === 'find' ? $t('documentQuery.filterLabel') : $t('documentQuery.aggregateLabel') }}
        </label>
        <textarea
          class="form-control font-monospace"
          rows="12"
          v-model="queryText"
          spellcheck="false"
          :placeholder='mode === "find" ? "{\n  \"status\": \"active\"\n}" : "[\n  { \"$group\": { \"_id\": \"$status\", \"count\": { \"$sum\": 1 } } }\n]"'
        ></textarea>
        <div class="text-muted small mt-1">
          {{ mode === 'find' ? $t('documentQuery.filterHint') : $t('documentQuery.aggregateHint') }}
        </div>
      </div>
      <div class="col-md-7">
        <label class="form-label small">{{ $t('documentQuery.result') }}</label>
        <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>
        <div v-else-if="result.length === 0" class="text-muted small">{{ $t('documentQuery.noResult') }}</div>
        <pre v-else class="result-json">{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ConnectionEntity, TableEntity } from '@/typings/database';
import { DatabaseService } from '@/service/database';

const { t } = useI18n();

const props = defineProps<{
  connection: ConnectionEntity | null;
  database: string;
  tables: TableEntity[];
}>();

const databaseService = new DatabaseService();

const mode = ref<'find' | 'aggregate'>('find');
const collection = ref<string>('');
const queryText = ref<string>('{\n  \n}');
const sort = ref<string>('');
const pageSize = ref<number>(50);
const result = ref<any[]>([]);
const total = ref<number | null>(null);
const loading = ref(false);
const error = ref('');

// 集合列表变化时默认选中第一个
watch(
  () => props.tables,
  (list) => {
    const first = list?.[0];
    if (first && !collection.value) collection.value = String(first.name);
  },
  { immediate: true, deep: true }
);

// 切换模式时换成对应形态的占位文本
watch(mode, (m) => {
  result.value = [];
  total.value = null;
  error.value = '';
  queryText.value = m === 'find' ? '{\n  \n}' : '[\n  \n]';
});

async function run() {
  if (!props.connection?.id || !collection.value) return;
  error.value = '';
  loading.value = true;
  try {
    // 空对象/空数组视为"无条件"
    const trimmed = queryText.value.trim();
    const parsed = trimmed ? JSON.parse(trimmed) : (mode.value === 'find' ? {} : []);
    if (mode.value === 'find') {
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        error.value = t('documentQuery.filterMustBeObject');
        return;
      }
      const res: any = await databaseService.getTableData(
        props.connection.id,
        props.database,
        collection.value,
        1,
        pageSize.value,
        Object.keys(parsed).length ? JSON.stringify(parsed) : undefined,
        sort.value.trim() || undefined
      );
      result.value = res?.data?.data || [];
      total.value = res?.data?.total ?? 0;
    } else {
      if (!Array.isArray(parsed)) {
        error.value = t('documentQuery.aggregateMustBeArray');
        return;
      }
      const res: any = await databaseService.aggregate(
        props.connection.id,
        props.database,
        collection.value,
        parsed
      );
      result.value = res?.data || [];
      total.value = result.value.length;
    }
  } catch (e: any) {
    error.value = e?.message || String(e);
    result.value = [];
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.result-json {
  max-height: 420px;
  overflow: auto;
  margin: 0;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  background: rgba(128, 128, 128, 0.08);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
