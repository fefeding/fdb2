<template>
  <!-- 统一modal组件 - 添加/编辑连接 -->
  <Modal 
    ref="connectionModal"
    :title="editingConnection ? '编辑数据库连接' : '新增数据库连接'"
    :closeButton="{ text: '取消', show: true }"
    :confirmButton="{ text: '', show: false }"
    :isFullScreen="true"
    :style="{ maxWidth: '800px' }"
    @onClose="handleModalClose"
  >
    <form @submit.prevent="saveConnection" class="connection-form-modern">
      <!-- 基本信息 -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon">
            <i class="bi bi-info-circle"></i>
          </div>
          <h3 class="section-title">基本信息</h3>
        </div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-tag me-2"></i>连接名称 <span class="required">*</span>
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.name" 
                     placeholder="为连接起一个易记的名称" required>
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-diagram-3 me-2"></i>数据库类型 <span class="required">*</span>
              </label>
              <select class="form-select-modern" v-model="connectionForm.type" @change="onTypeChange" required>
                <option value="">请选择数据库类型</option>
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
          <h3 class="section-title">连接配置</h3>
        </div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-server me-2"></i>主机地址 <span class="required">*</span>
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.host" 
                     placeholder="数据库服务器地址" required>
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-door-closed me-2"></i>端口 <span class="required">*</span>
              </label>
              <input type="number" class="form-control-modern" v-model.number="connectionForm.port" 
                     placeholder="数据库端口号" min="1" max="65535" required>
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-database me-2"></i>数据库名 <span class="required">*</span>
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.database" 
                     placeholder="要连接的数据库名" required>
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-clock me-2"></i>连接超时
              </label>
              <input type="number" class="form-control-modern" v-model.number="connectionForm.options.timeout" 
                     placeholder="连接超时时间（秒）" min="1">
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
          <h3 class="section-title">SQLite配置</h3>
        </div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-file-earmark me-2"></i>数据库文件 <span class="required">*</span>
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.database" 
                     placeholder="SQLite数据库文件路径" required>
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
          <h3 class="section-title">认证信息</h3>
        </div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-person me-2"></i>用户名
              </label>
              <input type="text" class="form-control-modern" v-model="connectionForm.username" 
                     placeholder="数据库用户名">
            </div>
            <div class="form-group-modern">
              <label class="form-label-modern">
                <i class="bi bi-key me-2"></i>密码
              </label>
              <input type="password" class="form-control-modern" v-model="connectionForm.password" 
                     placeholder="数据库密码">
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
          <h3 class="section-title">其他选项</h3>
        </div>
        <div class="section-content">
          <div class="form-group-modern">
            <label class="form-label-modern">
              <i class="bi bi-toggle-on me-2"></i>连接状态
            </label>
            <div class="form-check-modern">
              <input class="form-check-input-modern" type="checkbox" v-model="connectionForm.enabled" id="enabled">
              <label class="form-check-label-modern" for="enabled">
                <span class="check-text">启用此连接</span>
                <span class="check-description">创建后将自动启用连接</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
    
    <!-- 自定义footer -->
    <template #footer>
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
        <i class="bi bi-x-circle me-1"></i>取消
      </button>
      <button type="button" class="btn btn-outline-primary" @click="testConnection(connectionForm)">
        <i class="bi bi-wifi me-1"></i>测试连接
      </button>
      <button type="button" class="btn btn-primary" @click="saveConnection">
        <i class="bi bi-save me-1"></i>{{ editingConnection ? '更新配置' : '保存配置' }}
      </button>
      <button type="button" class="btn btn-success" @click="saveAndTestConnection">
        <i class="bi bi-check-circle me-1"></i>保存并测试
      </button>
    </template>
  </Modal>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { ConnectionService } from '@/service/database';
import type { ConnectionEntity } from '@/typings/database';
import Modal from '@/components/modal/index.vue';
import Toast from '@/components/toast/toast.vue';

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
    return { isValid: false, message: '连接名称不能为空' };
  }
  
  if (!connection.type?.trim()) {
    return { isValid: false, message: '数据库类型不能为空' };
  }
  
  if (connection.type !== 'sqlite') {
    if (!connection.host?.trim()) {
      return { isValid: false, message: '主机地址不能为空' };
    }
    
    if (!connection.port || connection.port <= 0 || connection.port > 65535) {
      return { isValid: false, message: '端口号必须在1-65535之间' };
    }
  }
  
  // 对于某些数据库类型，数据库名是必需的
  if (['mysql', 'postgres', 'mssql'].includes(connection.type) && !connection.database?.trim()) {
    return { isValid: false, message: `${connection.type.toUpperCase()} 数据库名不能为空` };
  }
  
  // SQLite需要数据库文件路径
  if (connection.type === 'sqlite' && !connection.database?.trim()) {
    return { isValid: false, message: 'SQLite数据库文件路径不能为空' };
  }
  
  return { isValid: true, message: '配置验证通过' };
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
async function saveConnection() {
  try {
    // 先进行前端验证
    const validation = validateConnection(connectionForm.value);
    if (!validation.isValid) {
      showToast('错误', validation.message, 'error');
      return;
    }
    
    const connectionService = new ConnectionService();
    if (editingConnection.value) {
      await connectionService.updateConnection(editingConnection.value.id!, connectionForm.value);
    } else {
      await connectionService.addConnection(connectionForm.value);
    }
    
    hide();
    emit('saved', connectionForm.value);
    showToast('成功', editingConnection.value ? '连接配置更新成功' : '连接配置添加成功');
  } catch (error) {
    console.error('保存连接配置失败:', error);
    let errorMessage = '保存配置失败';
    if (error.message) {
      if (error.message.includes('连接') && error.message.includes('失败')) {
        errorMessage = '配置保存失败，请检查服务器状态';
      } else {
        errorMessage = `保存配置失败: ${error.message}`;
      }
    }
    showToast('错误', errorMessage, 'error');
  }
}

// 保存并测试连接
async function saveAndTestConnection() {
  try {
    // 先保存配置
    const connectionService = new ConnectionService();
    if (editingConnection.value) {
      await connectionService.updateConnection(editingConnection.value.id!, connectionForm.value);
    } else {
      await connectionService.addConnection(connectionForm.value);
    }
    
    // 然后测试连接
    await testConnection(connectionForm.value);
    
    hide();
    emit('saved', connectionForm.value);
    showToast('成功', editingConnection.value ? '连接配置更新并测试成功' : '连接配置添加并测试成功');
  } catch (error) {
    console.error('保存并测试连接失败:', error);
    if (error.message && error.message.includes('连接测试失败')) {
      showToast('警告', '配置已保存，但连接测试失败', 'warning');
      hide();
      emit('saved', connectionForm.value);
    } else {
      showToast('错误', `操作失败: ${error.message || '未知错误'}`, 'error');
    }
  }
}

// 测试连接
async function testConnection(connection: ConnectionEntity) {
  try {
    const connectionService = new ConnectionService();
    const response = await connectionService.testConnection(connection);
    
    if (response) {
      showToast('成功', `"${connection.name}" 连接测试成功`, 'success');
    } else {
      showToast('失败', `"${connection.name}" 连接测试失败`, 'error');
    }
  } catch (error) {
    console.error('测试连接失败:', error);
    showToast('错误', `"${connection.name}" 连接测试失败: ${error.message || '未知错误'}`, 'error');
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
function showToast(title: string, message: string, type: string) {
  toastRef.value?.show(title, message, type);
}

// 加载数据库类型
async function loadDatabaseTypes() {
  try {
    const connectionService = new ConnectionService();
    const response = await connectionService.getDatabaseTypes();
    databaseTypes.value = response || [];
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
  border-bottom: 2px solid #f0f0f0;
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
  color: #333;
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
  font-weight: 500;
  color: #555;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.form-control-modern,
.form-select-modern {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
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
  color: #333;
  margin-bottom: 0.25rem;
}

.check-description {
  font-size: 0.85rem;
  color: #666;
}

.required {
  color: #dc3545;
  margin-left: 0.25rem;
}
</style>