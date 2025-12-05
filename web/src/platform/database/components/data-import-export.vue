<template>
  <div class="data-import-export">
    <div class="import-export-header">
      <div class="header-title">
        <i class="bi bi-arrow-left-right"></i>
        <span>数据导入导出</span>
      </div>
      <div class="header-tabs">
        <button 
          class="tab-btn"
          :class="{ active: activeTab === 'import' }"
          @click="activeTab = 'import'"
        >
          <i class="bi bi-download"></i>
          <span>数据导入</span>
        </button>
        <button 
          class="tab-btn"
          :class="{ active: activeTab === 'export' }"
          @click="activeTab = 'export'"
        >
          <i class="bi bi-upload"></i>
          <span>数据导出</span>
        </button>
      </div>
    </div>

    <div class="import-export-content">
      <!-- 数据导入 -->
      <div class="import-section" v-if="activeTab === 'import'">
        <div class="step-indicator">
          <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
            <span class="step-number">1</span>
            <span class="step-title">选择文件</span>
          </div>
          <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
            <span class="step-number">2</span>
            <span class="step-title">配置选项</span>
          </div>
          <div class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
            <span class="step-number">3</span>
            <span class="step-title">预览数据</span>
          </div>
          <div class="step" :class="{ active: currentStep >= 4 }">
            <span class="step-number">4</span>
            <span class="step-title">执行导入</span>
          </div>
        </div>

        <!-- 步骤1: 选择文件 -->
        <div class="step-content" v-if="currentStep === 1">
          <div class="file-upload-area" :class="{ 'drag-over': isDragOver }" 
               @drop="handleDrop" 
               @dragover.prevent="isDragOver = true" 
               @dragleave="isDragOver = false">
            <div class="upload-icon">
              <i class="bi bi-cloud-upload"></i>
            </div>
            <h3>拖拽文件到此处或点击选择</h3>
            <p>支持 CSV、Excel (xlsx)、JSON 格式</p>
            <input type="file" ref="fileInput" @change="handleFileSelect" accept=".csv,.xlsx,.json" hidden>
            <button class="btn-select-file" @click="$refs.fileInput.click()">
              <i class="bi bi-folder2-open"></i>
              <span>选择文件</span>
            </button>
          </div>
          
          <div class="selected-files" v-if="selectedFiles.length > 0">
            <h4>已选择的文件:</h4>
            <div class="file-list">
              <div class="file-item" v-for="(file, index) in selectedFiles" :key="index">
                <div class="file-icon">
                  <i :class="getFileIcon(file.name)"></i>
                </div>
                <div class="file-info">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-size">{{ formatFileSize(file.size) }}</div>
                </div>
                <button class="btn-remove-file" @click="removeFile(index)">
                  <i class="bi bi-x"></i>
                </button>
              </div>
            </div>
            <button class="btn-next" @click="nextStep" :disabled="selectedFiles.length === 0">
              下一步
              <i class="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- 步骤2: 配置选项 -->
        <div class="step-content" v-if="currentStep === 2">
          <div class="config-form">
            <div class="form-section">
              <h4>目标表配置</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>数据库连接</label>
                  <select v-model="importConfig.connectionId" class="form-input">
                    <option value="">选择连接</option>
                    <option v-for="connection in connections" :key="connection.id" :value="connection.id">
                      {{ connection.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>目标表</label>
                  <select v-model="importConfig.tableName" class="form-input" :disabled="!importConfig.connectionId">
                    <option value="">选择表</option>
                    <option v-for="table in tables" :key="table" :value="table">
                      {{ table }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h4>导入选项</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>导入模式</label>
                  <select v-model="importConfig.mode" class="form-input">
                    <option value="insert">插入新数据</option>
                    <option value="replace">替换表数据</option>
                    <option value="update">更新现有数据</option>
                    <option value="append">追加数据</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>编码格式</label>
                  <select v-model="importConfig.encoding" class="form-input">
                    <option value="utf-8">UTF-8</option>
                    <option value="gbk">GBK</option>
                    <option value="latin1">Latin1</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h4>CSV/Excel 选项</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>分隔符</label>
                  <select v-model="importConfig.delimiter" class="form-input">
                    <option value=",">逗号 (,)</option>
                    <option value=";">分号 (;)</option>
                    <option value="\t">制表符 (Tab)</option>
                    <option value="|">竖线 (|)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>首行是否为标题</label>
                  <div class="checkbox-group">
                    <input type="checkbox" id="hasHeader" v-model="importConfig.hasHeader">
                    <label for="hasHeader">首行是列标题</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button class="btn-prev" @click="prevStep">
              <i class="bi bi-arrow-left"></i>
              上一步
            </button>
            <button class="btn-next" @click="nextStep" :disabled="!isConfigValid">
              下一步
              <i class="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- 步骤3: 预览数据 -->
        <div class="step-content" v-if="currentStep === 3">
          <div class="preview-section">
            <div class="preview-header">
              <h4>数据预览</h4>
              <div class="preview-info">
                <span>显示前 {{ previewData.length }} 行数据</span>
                <button class="btn-load-more" @click="loadPreviewData" v-if="hasMoreData">
                  加载更多
                </button>
              </div>
            </div>
            
            <div class="preview-table-wrapper">
              <table class="preview-table">
                <thead>
                  <tr>
                    <th v-for="column in previewColumns" :key="column">
                      {{ column }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in previewData" :key="index">
                    <td v-for="column in previewColumns" :key="column">
                      {{ row[column] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="step-actions">
            <button class="btn-prev" @click="prevStep">
              <i class="bi bi-arrow-left"></i>
              上一步
            </button>
            <button class="btn-next" @click="nextStep">
              下一步
              <i class="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- 步骤4: 执行导入 -->
        <div class="step-content" v-if="currentStep === 4">
          <div class="import-progress">
            <div class="progress-header">
              <h4>正在导入数据</h4>
              <div class="progress-stats">
                <span>{{ importProgress.current }} / {{ importProgress.total }}</span>
                <span>{{ Math.round((importProgress.current / importProgress.total) * 100) }}%</span>
              </div>
            </div>
            
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (importProgress.current / importProgress.total) * 100 + '%' }"></div>
            </div>
            
            <div class="progress-details" v-if="importProgress.message">
              <p>{{ importProgress.message }}</p>
            </div>
            
            <div class="import-result" v-if="importComplete">
              <div class="result-icon">
                <i class="bi bi-check-circle"></i>
              </div>
              <h5>导入完成!</h5>
              <p>成功导入 {{ importResult.success }} 条记录，失败 {{ importResult.failed }} 条</p>
              <button class="btn-view-details" @click="showImportDetails = true">
                查看详细信息
              </button>
            </div>
          </div>

          <div class="step-actions" v-if="importComplete">
            <button class="btn-new-import" @click="resetImport">
              <i class="bi bi-plus-circle"></i>
              新建导入
            </button>
          </div>
        </div>
      </div>

      <!-- 数据导出 -->
      <div class="export-section" v-if="activeTab === 'export'">
        <div class="export-form">
          <div class="form-section">
            <h4>数据源配置</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>数据库连接</label>
                <select v-model="exportConfig.connectionId" @change="loadTables" class="form-input">
                  <option value="">选择连接</option>
                  <option v-for="connection in connections" :key="connection.id" :value="connection.id">
                    {{ connection.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>表名</label>
                <select v-model="exportConfig.tableName" class="form-input" :disabled="!exportConfig.connectionId">
                  <option value="">选择表</option>
                  <option v-for="table in tables" :key="table" :value="table">
                    {{ table }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>导出选项</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>导出格式</label>
                <select v-model="exportConfig.format" class="form-input">
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                  <option value="json">JSON</option>
                  <option value="sql">SQL</option>
                </select>
              </div>
              <div class="form-group">
                <label>编码格式</label>
                <select v-model="exportConfig.encoding" class="form-input">
                  <option value="utf-8">UTF-8</option>
                  <option value="gbk">GBK</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>数据筛选</h4>
            <div class="form-group">
              <label>WHERE 条件 (可选)</label>
              <textarea 
                v-model="exportConfig.whereCondition" 
                class="form-textarea" 
                placeholder="例如: created_at > '2024-01-01' AND status = 'active'"
                rows="3"
              ></textarea>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>限制行数</label>
                <input type="number" v-model="exportConfig.limit" class="form-input" placeholder="0表示无限制">
              </div>
              <div class="form-group">
                <label>排序字段</label>
                <input type="text" v-model="exportConfig.orderBy" class="form-input" placeholder="例如: id DESC">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>列选择</h4>
            <div class="columns-selection">
              <div class="selection-header">
                <div class="checkbox-group">
                  <input type="checkbox" id="selectAll" v-model="selectAllColumns" @change="toggleAllColumns">
                  <label for="selectAll">全选</label>
                </div>
                <span>{{ selectedColumns.length }} / {{ availableColumns.length }} 列已选择</span>
              </div>
              <div class="columns-grid">
                <div class="column-item" v-for="column in availableColumns" :key="column">
                  <div class="checkbox-group">
                    <input 
                      type="checkbox" 
                      :id="column" 
                      :value="column"
                      v-model="selectedColumns"
                    >
                    <label :for="column">{{ column }}</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="export-actions">
            <button class="btn-preview" @click="previewExport" :disabled="!isExportConfigValid">
              <i class="bi bi-eye"></i>
              预览数据
            </button>
            <button class="btn-export" @click="startExport" :disabled="!isExportConfigValid || isExporting">
              <i class="bi bi-download" v-if="!isExporting"></i>
              <i class="bi bi-arrow-clockwise spin" v-if="isExporting"></i>
              <span v-if="!isExporting">开始导出</span>
              <span v-if="isExporting">导出中...</span>
            </button>
          </div>
        </div>

        <!-- 导出预览 -->
        <div class="export-preview" v-if="exportPreview.length > 0">
          <div class="preview-header">
            <h4>导出预览</h4>
            <div class="preview-info">
              <span>共 {{ exportTotalCount }} 条记录</span>
              <button class="btn-close-preview" @click="closePreview">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
          
          <div class="preview-table-wrapper">
            <table class="preview-table">
              <thead>
                <tr>
                  <th v-for="column in selectedColumns" :key="column">
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in exportPreview" :key="index">
                  <td v-for="column in selectedColumns" :key="column">
                    {{ row[column] }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { ConnectionService } from '@/service/database';
import type { ConnectionEntity } from '@/typings/database';
import { exportDataToCSV, exportDataToJSON, exportDataToExcel, exportDataToSQL } from '../utils/export';

const connectionService = new ConnectionService();

// 响应式数据
const activeTab = ref('import');
const currentStep = ref(1);
const selectedFiles = ref<File[]>([]);
const isDragOver = ref(false);
const connections = ref<ConnectionEntity[]>([]);
const tables = ref<string[]>([]);

// 导入配置
const importConfig = ref({
  connectionId: '',
  tableName: '',
  mode: 'insert',
  encoding: 'utf-8',
  delimiter: ',',
  hasHeader: true
});

// 导出配置
const exportConfig = ref({
  connectionId: '',
  tableName: '',
  format: 'csv',
  encoding: 'utf-8',
  whereCondition: '',
  limit: 0,
  orderBy: ''
});

// 预览数据
const previewData = ref<any[]>([]);
const previewColumns = ref<string[]>([]);
const hasMoreData = ref(false);

// 导入进度
const importProgress = ref({
  current: 0,
  total: 0,
  message: '',
  status: 'pending' // pending, processing, completed, error
});

const importComplete = ref(false);
const importResult = ref({
  success: 0,
  failed: 0,
  errors: [] as string[]
});

// 导出进度
const exportProgress = ref({
  current: 0,
  total: 0,
  message: '',
  status: 'pending'
});

const exportComplete = ref(false);
const exportResult = ref({
  success: 0,
  failed: 0,
  fileUrl: ''
});

// 导出相关
const availableColumns = ref<string[]>([]);
const selectedColumns = ref<string[]>([]);
const exportPreview = ref<any[]>([]);
const exportTotalCount = ref(0);
const isExporting = ref(false);
const showImportDetails = ref(false);
const showExportDetails = ref(false);

// 计算属性
const selectAllColumns = computed({
  get: () => selectedColumns.value.length === availableColumns.value.length && availableColumns.value.length > 0,
  set: (value: boolean) => {
    if (value) {
      selectedColumns.value = [...availableColumns.value];
    } else {
      selectedColumns.value = [];
    }
  }
});

const isConfigValid = computed(() => {
  return importConfig.value.connectionId && 
         importConfig.value.tableName && 
         selectedFiles.value.length > 0;
});

const isExportConfigValid = computed(() => {
  return exportConfig.value.connectionId && 
         exportConfig.value.tableName && 
         selectedColumns.value.length > 0;
});

// 方法
async function loadConnections() {
  try {
    const response = await connectionService.getAllConnections();
    connections.value = response || [];
  } catch (error) {
    console.error('加载连接失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    showToast('错误', `加载连接失败: ${errorMessage}`, 'error');
  }
  } catch (error) {
    console.error('加载连接失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    showToast('错误', `加载连接失败: ${errorMessage}`, 'error');
  }
  } catch (error) {
    console.error('加载连接列表失败:', error);
  }
}

async function loadTables() {
  if (!exportConfig.value.connectionId) return;
  
  try {
    // 模拟加载表列表
    tables.value = ['users', 'orders', 'products', 'categories', 'reviews'];
    availableColumns.value = ['id', 'name', 'email', 'created_at', 'updated_at'];
    selectedColumns.value = [...availableColumns.value];
  } catch (error) {
    console.error('加载表列表失败:', error);
  }
}

function handleFileSelect(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (files) {
    selectedFiles.value = Array.from(files);
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = false;
  
  const files = event.dataTransfer?.files;
  if (files) {
    selectedFiles.value = Array.from(files);
  }
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1);
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'csv': return 'bi-file-earmark-spreadsheet';
    case 'xlsx': return 'bi-file-earmark-excel';
    case 'json': return 'bi-file-earmark-code';
    default: return 'bi-file-earmark';
  }
}

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function nextStep() {
  if (currentStep.value === 2) {
    loadPreviewData();
  } else if (currentStep.value === 3) {
    startImport();
  }
  currentStep.value++;
}

function prevStep() {
  currentStep.value--;
}

async function loadPreviewData() {
  // 模拟预览数据
  previewColumns.value = ['id', 'name', 'email', 'age', 'city'];
  previewData.value = [
    { id: 1, name: '张三', email: 'zhangsan@example.com', age: 25, city: '北京' },
    { id: 2, name: '李四', email: 'lisi@example.com', age: 30, city: '上海' },
    { id: 3, name: '王五', email: 'wangwu@example.com', age: 28, city: '广州' },
    { id: 4, name: '赵六', email: 'zhaoliu@example.com', age: 35, city: '深圳' },
    { id: 5, name: '钱七', email: 'qianqi@example.com', age: 27, city: '杭州' }
  ];
  hasMoreData.value = true;
}

async function startImport() {
  importProgress.value.total = selectedFiles.value.length * 1000; // 模拟数据量
  importProgress.value.current = 0;
  importProgress.value.message = '准备导入数据...';
  
  // 模拟导入过程
  const interval = setInterval(() => {
    importProgress.value.current += 50;
    const progress = (importProgress.value.current / importProgress.value.total) * 100;
    
    if (progress < 30) {
      importProgress.value.message = '解析文件格式...';
    } else if (progress < 60) {
      importProgress.value.message = '验证数据格式...';
    } else if (progress < 90) {
      importProgress.value.message = '插入数据到数据库...';
    } else {
      importProgress.value.message = '完成导入...';
    }
    
    if (importProgress.value.current >= importProgress.value.total) {
      clearInterval(interval);
      importComplete.value = true;
      importResult.value = {
        success: 4500,
        failed: 50
      };
    }
  }, 50);
}

async function previewExport() {
  try {
    // 模拟预览数据
    exportPreview.value = [
      { id: 1, name: '张三', email: 'zhangsan@example.com', created_at: '2024-01-01' },
      { id: 2, name: '李四', email: 'lisi@example.com', created_at: '2024-01-02' },
      { id: 3, name: '王五', email: 'wangwu@example.com', created_at: '2024-01-03' },
      { id: 4, name: '赵六', email: 'zhaoliu@example.com', created_at: '2024-01-04' },
      { id: 5, name: '钱七', email: 'qianqi@example.com', created_at: '2024-01-05' }
    ];
    exportTotalCount.value = 5000;
  } catch (error) {
    console.error('预览导出数据失败:', error);
  }
}

async function startExport() {
  if (!exportConfig.value.connectionId || !exportConfig.value.tableName) {
    console.error('缺少导出配置');
    return;
  }
  
  isExporting.value = true;
  
  try {
    // 这里应该调用API获取实际数据
    // const response = await databaseService.exportTableData(exportConfig.value);
    
    // 模拟数据
    const mockData = [
      { id: 1, name: '张三', email: 'zhangsan@example.com' },
      { id: 2, name: '李四', email: 'lisi@example.com' },
      { id: 3, name: '王五', email: 'wangwu@example.com' }
    ];
    
    const filename = `${exportConfig.value.tableName}_${new Date().getTime()}`;
    
    // 使用新的导出工具
    switch (exportConfig.value.format) {
      case 'csv':
        await exportDataToCSV(mockData, {}, filename + '.csv');
        break;
      case 'json':
        await exportDataToJSON(mockData, filename + '.json');
        break;
      case 'excel':
        await exportDataToExcel(mockData, {}, filename + '.xlsx');
        break;
      case 'sql':
        await exportDataToSQL(mockData, exportConfig.value.tableName, {}, filename + '.sql');
        break;
    }
    
  } catch (error) {
    console.error('导出失败:', error);
  } finally {
    isExporting.value = false;
  }
}

function generateExportContent(): string {
  // 模拟生成导出内容
  const data = [
    { id: 1, name: '张三', email: 'zhangsan@example.com' },
    { id: 2, name: '李四', email: 'lisi@example.com' },
    { id: 3, name: '王五', email: 'wangwu@example.com' }
  ];
  
  switch (exportConfig.value.format) {
    case 'csv':
      return 'id,name,email\n' + 
             data.map(row => `${row.id},${row.name},${row.email}`).join('\n');
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'sql':
      return `INSERT INTO ${exportConfig.value.tableName} (id, name, email) VALUES\n` +
             data.map(row => `(${row.id}, '${row.name}', '${row.email}')`).join(',\n') + ';';
    default:
      return '';
  }
}

function getContentType(format: string): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    case 'sql': return 'text/sql';
    default: return 'application/octet-stream';
  }
}

function toggleAllColumns() {
  if (selectAllColumns.value) {
    selectedColumns.value = [...availableColumns.value];
  } else {
    selectedColumns.value = [];
  }
}

function closePreview() {
  exportPreview.value = [];
}

function resetImport() {
  currentStep.value = 1;
  selectedFiles.value = [];
  importComplete.value = false;
  importProgress.value = {
    current: 0,
    total: 0,
    message: ''
  };
}

// 生命周期
onMounted(() => {
  loadConnections();
});
</script>

<style scoped>
.data-import-export {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.import-export-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #1e293b;
  font-size: 1.1rem;
}

.header-tabs {
  display: flex;
  gap: 0.5rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: #f3f4f6;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.import-export-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

/* 步骤指示器 */
.step-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3rem;
  position: relative;
}

.step-indicator::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 2px;
  background: #e5e7eb;
  z-index: 1;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
}

.step.active .step-number {
  border-color: #667eea;
  color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.step.completed .step-number {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
  color: white;
}

.step-title {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.step.active .step-title {
  color: #1e293b;
  font-weight: 600;
}

.step.completed .step-title {
  color: #10b981;
}

/* 步骤内容 */
.step-content {
  min-height: 400px;
}

/* 文件上传区域 */
.file-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.file-upload-area:hover,
.file-upload-area.drag-over {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.upload-icon {
  font-size: 3rem;
  color: #667eea;
  margin-bottom: 1rem;
}

.file-upload-area h3 {
  font-size: 1.25rem;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.file-upload-area p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.btn-select-file {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-select-file:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.selected-files {
  margin-top: 2rem;
}

.selected-files h4 {
  font-size: 1rem;
  color: #1e293b;
  margin-bottom: 1rem;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.file-icon {
  color: #667eea;
  font-size: 1.25rem;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  color: #1e293b;
}

.file-size {
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-remove-file {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-remove-file:hover {
  background: #fef2f2;
}

/* 表单样式 */
.config-form,
.export-form {
  max-width: 800px;
}

.form-section {
  margin-bottom: 2rem;
}

.form-section h4 {
  font-size: 1.125rem;
  color: #1e293b;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f3f4f6;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #667eea;
}

.checkbox-group label {
  cursor: pointer;
  user-select: none;
}

/* 步骤操作按钮 */
.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.btn-prev,
.btn-next {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-prev:hover,
.btn-next:hover:not(:disabled) {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.btn-next:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-next:not(:disabled) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

/* 预览表格 */
.preview-section {
  margin-bottom: 2rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-header h4 {
  font-size: 1.125rem;
  color: #1e293b;
  margin: 0;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-load-more {
  padding: 0.25rem 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}

.preview-table-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.preview-table th {
  background: #f8fafc;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 1;
}

.preview-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-table tr:hover {
  background: #fafbfc;
}

/* 导入进度 */
.import-progress {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.progress-header h4 {
  font-size: 1.25rem;
  color: #1e293b;
  margin: 0;
}

.progress-stats {
  font-size: 0.875rem;
  color: #6b7280;
}

.progress-bar {
  width: 100%;
  height: 12px;
  background: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

.progress-details p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
}

.import-result {
  padding: 2rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  margin-top: 2rem;
}

.result-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  margin: 0 auto 1rem;
}

.import-result h5 {
  font-size: 1.25rem;
  color: #065f46;
  margin-bottom: 0.5rem;
}

.import-result p {
  color: #047857;
  margin-bottom: 1.5rem;
}

.btn-view-details {
  padding: 0.75rem 1.5rem;
  background: white;
  color: #10b981;
  border: 1px solid #10b981;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-view-details:hover {
  background: #10b981;
  color: white;
}

.btn-new-import {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0 auto;
}

.btn-new-import:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 列选择 */
.columns-selection {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.columns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
}

.column-item {
  padding: 0.5rem;
  border: 1px solid #f3f4f6;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.column-item:hover {
  background: #fafbfc;
}

/* 导出操作 */
.export-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.btn-preview,
.btn-export {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-preview:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #667eea;
  color: #667eea;
}

.btn-export {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
}

.btn-export:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-preview:disabled,
.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-close-preview {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-close-preview:hover {
  background: #f3f4f6;
  color: #374151;
}

.export-preview {
  margin-top: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .import-export-content {
    padding: 1rem;
  }
  
  .step-indicator {
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .step-indicator::before {
    display: none;
  }
  
  .step {
    flex-direction: row;
    justify-content: flex-start;
    gap: 1rem;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .step-actions {
    flex-direction: column;
    gap: 1rem;
  }
  
  .export-actions {
    flex-direction: column;
  }
  
  .columns-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
}
</style>