<template>
  <div class="connection-form">
    <h1 class="panel-title">{{ isEditMode ? '编辑' : '添加' }}数据库连接</h1>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label class="form-label">连接名称</label>
        <input
          type="text"
          v-model="form.name"
          class="form-control"
          placeholder="例如：生产环境 MySQL"
          required
        />
      </div>

      <div class="form-group">
        <label class="form-label">数据库类型</label>
        <select v-model="form.type" class="form-control" @change="handleTypeChange" required>
          <option v-for="db in databaseTypes" :key="db.type" :value="db.type">
            {{ db.name }}
          </option>
        </select>
      </div>

      <div class="form-row" v-if="form.type !== 'sqlite'">
        <div class="form-col form-group">
          <label class="form-label">主机地址</label>
          <input
            type="text"
            v-model="form.host"
            class="form-control"
            placeholder="localhost"
            required
          />
        </div>

        <div class="form-col form-group">
          <label class="form-label">端口</label>
          <input
            type="number"
            v-model.number="form.port"
            class="form-control"
            placeholder="3306"
            required
          />
        </div>
      </div>

      <div class="form-group" :id="form.type === 'sqlite' ? 'sqlite-path' : 'database-name'">
        <label class="form-label">
          {{ form.type === 'sqlite' ? '数据库文件路径' : '数据库名称' }}
        </label>
        <input
          type="text"
          v-model="form.database"
          class="form-control"
          :placeholder="form.type === 'sqlite' ? '/path/to/database.sqlite' : '数据库名称'"
        />
      </div>

      <div class="form-group" v-if="form.type !== 'sqlite'">
        <div class="form-row">
          <div class="form-col">
            <label class="form-label">用户名</label>
            <input
              type="text"
              v-model="form.username"
              class="form-control"
              placeholder="root"
            />
          </div>

          <div class="form-col">
            <label class="form-label">密码</label>
            <input
              type="password"
              v-model="form.password"
              class="form-control"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" @click="handleTestConnection" class="btn btn-secondary">
          测试连接
        </button>
        <button type="button" @click="handleCancel" class="btn btn-secondary">
          取消
        </button>
        <button type="submit" class="btn btn-primary">
          {{ isEditMode ? '保存' : '添加' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { getVSCodeBridge } from '../bridge';

const vscode = getVSCodeBridge();

const isEditMode = ref(false);
const editingConnection = ref<any>(null);

const form = reactive({
  name: '',
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: '',
  username: '',
  password: ''
});

const databaseTypes = [
  { type: 'mysql', name: 'MySQL', defaultPort: 3306 },
  { type: 'postgresql', name: 'PostgreSQL', defaultPort: 5432 },
  { type: 'sqlite', name: 'SQLite', defaultPort: 0 },
  { type: 'sqlserver', name: 'SQL Server', defaultPort: 1433 },
  { type: 'oracle', name: 'Oracle', defaultPort: 1521 }
];

onMounted(() => {
  // 监听来自扩展的消息
  vscode.onMessage((message: any) => {
    if (message.command === 'editConnection') {
      enterEditMode(message.data);
    } else if (message.command === 'testResult') {
      handleTestResult(message.data);
    }
  });
});

function enterEditMode(connection: any) {
  editingConnection.value = connection;
  isEditMode.value = true;

  Object.assign(form, {
    name: connection.name,
    type: connection.type,
    host: connection.host,
    port: connection.port,
    database: connection.database || '',
    username: connection.username || '',
    password: connection.password || ''
  });
}

function handleTypeChange() {
  const dbType = databaseTypes.find(db => db.type === form.type);
  if (dbType && dbType.defaultPort > 0) {
    form.port = dbType.defaultPort;
  }
}

function handleSubmit() {
  const connectionData = { ...form };

  if (isEditMode.value && editingConnection.value) {
    connectionData.id = editingConnection.value.id;
    vscode.postMessage({ command: 'updateConnection', data: connectionData });
  } else {
    vscode.postMessage({ command: 'addConnection', data: connectionData });
  }
}

function handleTestConnection() {
  vscode.postMessage({ command: 'testConnection', data: { ...form } });
}

function handleTestResult(data: any) {
  if (data.success) {
    alert('连接测试成功');
  } else {
    alert('连接测试失败');
  }
}

function handleCancel() {
  // 在 WebView 中无法直接关闭，通知扩展关闭
  vscode.postMessage({ command: 'close' });
}
</script>

<style scoped>
.connection-form {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--vscode-foreground);
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--vscode-foreground);
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-col {
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.btn-secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-secondary:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}
</style>
