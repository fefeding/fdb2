<template>
  <!-- 统一modal组件 - 添加/编辑连接 -->
  <Modal 
    ref="connectionModal"
    :title="editingConnection ? $t('connection.editConnection') : $t('connection.addConnection')"
    :closeButton="{ text: $t('common.cancel'), show: true }"
    :confirmButton="{ text: '', show: false }"
    :isFullScreen="true"
    :style="{ maxWidth: '800px', width: '100%' }"
    @onClose="handleModalClose"
  >
    <form @submit.prevent="saveConnection" class="connection-form-modern">
      <!-- 基本信息 -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon">
            <i class="bi bi-info-circle"></i>
          </div>
          <h3 class="section-title">{{ $t('connection.basicInfo') }}</h3>
        </div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-tag me-2"></i>{{ $t('connection.connectionName') }} <span class="required">*</span>
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.name" 
                     :placeholder="$t('connection.connectionNamePlaceholder')" required>
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-diagram-3 me-2"></i>{{ $t('connection.databaseType') }} <span class="required">*</span>
              </label>
              <select class="form-select-modern" v-model="connectionForm.type" @change="onTypeChange" required>
                <option value="">{{ $t('connection.selectDatabaseType') }}</option>
                <option v-for="dbType in databaseTypes" :key="dbType.value" :value="dbType.value">
                  {{ dbType.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 连接配置 -->
      <div class="form-section" v-if="connectionForm.type !== 'sqlite'">
        <div class="section-header">
          <div class="section-icon">
            <i class="bi bi-hdd-network"></i>
          </div>
          <h3 class="section-title">{{ $t('connection.connectionConfig') }}</h3>
        </div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-server me-2"></i>{{ $t('connection.host') }} <span class="required">*</span>
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.host" 
                     :placeholder="$t('connection.hostPlaceholder')" required>
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-door-closed me-2"></i>{{ $t('connection.port') }} <span class="required">*</span>
              </label>
              <input type="number" class="form-control-modern" v-model.number="connectionForm.port" 
                     :placeholder="$t('connection.portPlaceholder')" min="1" max="65535" required>
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-database me-2"></i>{{ $t('connection.databaseName') }} <span class="required">*</span>
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.database" 
                     :placeholder="$t('connection.databaseNamePlaceholder')" required>
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-clock me-2"></i>{{ $t('connection.connectionTimeout') }}
              </label>
              <input type="number" class="form-control-modern" v-model.number="connectionForm.options.timeout" 
                     :placeholder="$t('connection.connectionTimeoutPlaceholder')" min="1">
            </div>
          </div>
        </div>
      </div>

      <!-- SQLite配置 -->
      <div class="form-section" v-if="connectionForm.type === 'sqlite'">
        <div class="section-header">
          <div class="section-icon">
            <i class="bi bi-file-earmark-text"></i>
          </div>
          <h3 class="section-title">{{ $t('connection.sqliteConfig') }}</h3>
        </div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-file-earmark me-2"></i>{{ $t('connection.databaseFile') }} <span class="required">*</span>
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.database" 
                     :placeholder="$t('connection.databaseFilePlaceholder')" required>
            </div>
          </div>
        </div>
      </div>

      <!-- 认证信息 -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon">
            <i class="bi bi-shield-lock"></i>
          </div>
          <h3 class="section-title">{{ $t('connection.authInfo') }}</h3>
        </div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-person me-2"></i>{{ $t('connection.username') }}
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.username" 
                     :placeholder="$t('connection.usernamePlaceholder')">
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-key me-2"></i>{{ $t('connection.password') }}
              </label>
              <input type="password" class="form-control-modern" v-model="connectionForm.password" 
                     :placeholder="$t('connection.passwordPlaceholder')">
            </div>
          </div>
        </div>
      </div>

      <!-- 高级选项 -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon">
            <i class="bi bi-gear"></i>
          </div>
          <h3 class="section-title">{{ $t('connection.otherOptions') }}</h3>
        </div>
        <div class="section-content">
          <div class="form-group-modern">
            <label class="form-label-modern">
              <i class="bi bi-toggle-on me-2"></i>{{ $t('connection.connectionStatus') }}
            </label>
            <div class="form-check-modern">
              <input class="form-check-input-modern" type="checkbox" v-model="connectionForm.enabled" id="enabled">
              <label class="form-check-label-modern" for="enabled">
                <span class="check-text">{{ $t('connection.enableConnection') }}</span>
                <span class="check-description">{{ $t('connection.enableConnectionDesc') }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
    
    <!-- 自定义footer -->
    <template #footer>
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
        <i class="bi bi-x-circle me-1"></i>{{ $t('common.cancel') }}
      </button>
      <button type="button" class="btn btn-outline-primary" @click="testConnection(connectionForm)">
        <i class="bi bi-wifi me-1"></i>{{ $t('connection.testConnection') }}
      </button>
      <button type="button" class="btn btn-primary" @click="saveConnection">
        <i class="bi bi-save me-1"></i>{{ editingConnection ? $t('connection.updateConfig') : $t('connection.saveConfig') }}
      </button>
      <button type="button" class="btn btn-success" @click="saveAndTestConnection">
        <i class="bi bi-check-circle me-1"></i>{{ $t('connection.saveAndTest') }}
      </button>
    </template>
  </Modal>
  
  <!-- 错误提示模态框 -->
  <Modal 
    ref="errorModal"
    :title="$t('connection.errorTitle')"
    :closeButton="{ text: $t('common.confirm'), show: true }"
    :confirmButton="{ text: '', show: false }"
    :isFullScreen="false"
    :style="{ maxWidth: '400px!important', width: '100%' }"
  >
    <div class="error-content">
      <div class="error-icon">
        <i class="bi bi-exclamation-triangle"></i>
      </div>
      <div class="error-message">{{ errorMessage }}</div>
    </div>
  </Modal>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ConnectionService } from '@/service/database';
import type { ConnectionEntity } from '@/typings/database';
import Modal from '@/components/modal/index.vue';
import Toast from '@/components/toast/toast.vue';

const { t } = useI18n();

// Props
interface Props {
  modelValue?: boolean;
  connection?: ConnectionEntity | null;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  connection: null
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'saved': [connection: ConnectionEntity];
}>();

// 组件实例
const connectionModal = ref();
const toastRef = ref();
const errorModal = ref();
const errorMessage = ref('');

// 响应式数据
const editingConnection = ref<ConnectionEntity | null>(null);
const connectionForm = ref<ConnectionEntity>({
  id: '',
  name: '',
  type: '',
  host: 'localhost',
  port: 3306,
  database: '',
  username: '',
  password: '',
  options: {},
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
const databaseTypes = ref<any[]>([]);

// 计算属性
const enabledConnections = computed(() => connections.value.filter(conn => conn.enabled));

// 验证连接配置（前端验证）
function validateConnection(connection: ConnectionEntity): { isValid: boolean; message: string } {
  if (!connection.name?.trim()) {
    return { isValid: false, message: t('connection.nameRequired') };
  }
  
  if (!connection.type?.trim()) {
    return { isValid: false, message: t('connection.typeRequired') };
  }
  
  if (connection.type !== 'sqlite') {
    if (!connection.host?.trim()) {
      return { isValid: false, message: t('connection.hostRequired') };
    }
    
    if (!connection.port || connection.port <= 0 || connection.port > 65535) {
      return { isValid: false, message: t('connection.portInvalid') };
    }
  }
  
  // 对于某些数据库类型，数据库名是必需的
  if (['mysql', 'postgres', 'mssql'].includes(connection.type) && !connection.database?.trim()) {
    return { isValid: false, message: t('connection.databaseRequired', { type: connection.type.toUpperCase() }) };
  }
  
  // SQLite需要数据库文件路径
  if (connection.type === 'sqlite' && !connection.database?.trim()) {
    return { isValid: false, message: t('connection.sqliteFileRequired') };
  }
  
  return { isValid: true, message: '' };
}

// 显示模态框
function show() {
  connectionModal.value?.show();
}

// 隐藏模态框
function hide() {
  connectionModal.value?.hide();
}

// 显示添加模态框
function showAddModal() {
  editingConnection.value = null;
  connectionForm.value = {
    id: '',
    name: '',
    type: '',
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: '',
    options: {},
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  show();
}

// 显示编辑模态框
function showEditModal(connection: ConnectionEntity) {
  editingConnection.value = connection;
  connectionForm.value = { ...connection };
  show();
}

// 保存连接配置（不测试连接）
async function saveConnection(closeModal = true) {
  try {
    // 先进行前端验证
    const validation = validateConnection(connectionForm.value);
    if (!validation.isValid) {
      errorMessage.value = validation.message;
      errorModal.value?.show();
      return;
    }
    
    const connectionService = new ConnectionService();
    if (editingConnection.value) {
      await connectionService.updateConnection(editingConnection.value.id!, connectionForm.value);
    } else {
      await connectionService.addConnection(connectionForm.value);
    }
    
    if (closeModal) {
      hide();
    }
    emit('saved', connectionForm.value);
    showToast('', editingConnection.value ? t('connection.configUpdateSuccess') : t('connection.configSaveSuccess'));
  } catch (error) {
    console.error('保存连接配置失败:', error);
    let errorMsg = '保存配置失败';
    if (error.message) {
      if (error.message.includes('连接') && error.message.includes('失败')) {
        errorMsg = '配置保存失败，请检查服务器状态';
      } else {
        errorMsg = `保存配置失败: ${error.message}`;
      }
    }
    errorMessage.value = errorMsg;
    errorModal.value?.show();
  }
}

// 保存并测试连接
async function saveAndTestConnection() {
  try {
    // 先保存配置（不关闭模态框）
    await saveConnection(false);
    
    // 然后测试连接
    await testConnection(connectionForm.value);
    
    // 测试成功后关闭模态框
    hide();
    emit('saved', connectionForm.value);
    showToast('', editingConnection.value ? t('connection.configUpdateAndTestSuccess') : t('connection.configAddAndTestSuccess'));
  } catch (error) {
    console.error('保存并测试连接失败:', error);
    // 如果是保存失败，错误已经在 saveConnection 中处理了
    // 如果是测试失败，显示警告
    if (error.message && error.message.includes('连接测试失败')) {
      showToast(t('common.warning'), t('connection.configSavedButTestFailed'), 'warning');
      hide();
      emit('saved', connectionForm.value);
    }
  }
}

// 测试连接
async function testConnection(connection: ConnectionEntity) {
  try {
    const connectionService = new ConnectionService();
    const response = await connectionService.testConnection(connection);
    
    if (response) {
      showToast('', `"${connection.name}" 连接测试成功`, 'success');
    } else {
      showToast('', `"${connection.name}" 连接测试失败`, 'error');
    }
  } catch (error) {
    console.error('测试连接失败:', error);
    showToast('', `"${connection.name}" 连接测试失败: ${error.message || '未知错误'}`, 'error');
  }
}

// 处理模态框关闭
function handleModalClose() {
  hide();
}

// 数据库类型改变
function onTypeChange() {
  const selectedType = databaseTypes.value.find(t => t.value === connectionForm.value.type);
  if (selectedType?.defaultPort) {
    connectionForm.value.port = selectedType.defaultPort;
  }
}

// Toast 提示
function showToast(title: string, message: string, type?: string) {
  toastRef.value?.show(title, message, type);
}

// 加载数据库类型
async function loadDatabaseTypes() {
  try {
    const connectionService = new ConnectionService();
    const response = await connectionService.getDatabaseTypes();
    databaseTypes.value = response?.data || [];
  } catch (error) {
    console.error('加载数据库类型失败:', error);
  }
}

// 监听 props 变化
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    show();
  } else {
    hide();
  }
});

watch(() => props.connection, (newConnection) => {
  if (newConnection) {
    showEditModal(newConnection);
  }
}, { immediate: true });

// 暴露方法给父组件
defineExpose({
  showAddModal,
  showEditModal,
  show,
  hide
});

// 生命周期
loadDatabaseTypes();
</script>

<style scoped>
/* 继承原有的样式，这里可以添加组件特定的样式 */
.connection-form-modern {
  padding: 0;
}

.form-section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #cbd5e1;
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 1rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
}

.section-content {
  padding-left: 56px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.form-group-modern {
  margin-bottom: 1rem;
}

.form-label-modern {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.form-control-modern,
.form-select-modern {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #94a3b8;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  color: #1e293b;
  background-color: #ffffff;
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-check-modern {
  display: flex;
  align-items: flex-start;
  padding: 0;
}

.form-check-input-modern {
  margin-right: 0.75rem;
  margin-top: 0.25rem;
}

.form-check-label-modern {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.check-text {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.check-description {
  font-size: 0.85rem;
  color: #475569;
}

.required {
  color: #dc3545;
  margin-left: 0.25rem;
}

.error-content {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  gap: 1rem;
}

.error-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.error-message {
  flex: 1;
  color: #1e293b;
  font-size: 0.95rem;
  line-height: 1.6;
}
</style>