<template>
  <div class="connection-form">
    <h1 class="panel-title">{{ isEditMode ? '编辑连接' : '添加数据库连接' }}</h1>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label class="form-label">连接名称</label>
        <input v-model="form.name" class="form-control" placeholder="例如：生产环境 MySQL" required />
      </div>

      <div class="form-group">
        <label class="form-label">数据库类型</label>
        <select v-model="form.type" class="form-control" @change="handleTypeChange" required>
          <option v-for="db in databaseTypes" :key="db.type" :value="db.type">{{ db.name }}</option>
        </select>
      </div>

      <template v-if="form.type !== 'sqlite' && form.type !== 'remote'">
        <div class="form-row">
          <div class="form-col form-group">
            <label class="form-label">主机地址</label>
            <input v-model="form.host" class="form-control" placeholder="localhost" required />
          </div>
          <div class="form-col form-group">
            <label class="form-label">端口</label>
            <input v-model.number="form.port" type="number" class="form-control" placeholder="3306" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-col">
            <label class="form-label">用户名</label>
            <input v-model="form.username" class="form-control" placeholder="root" />
          </div>
          <div class="form-col">
            <label class="form-label">密码</label>
            <input v-model="form.password" type="password" class="form-control" placeholder="••••••••" />
          </div>
        </div>
      </template>

      <template v-if="form.type === 'remote'">
        <div class="form-group">
          <label class="form-label">远程服务地址 <span class="required">*</span></label>
          <input v-model="form.remoteUrl" class="form-control" placeholder="http://192.168.1.10:9800" />
        </div>
        <div class="form-group">
          <label class="form-label">访问令牌（可选）</label>
          <input v-model="form.remoteToken" type="password" class="form-control" placeholder="与服务端 DB_TOOL_REMOTE_TOKEN 一致" />
        </div>
        <p class="form-hint">保存后，该远程服务上的所有数据库连接会自动出现在连接列表中，可像本地数据库一样直接访问。</p>
      </template>

      <div class="form-group">
        <label class="form-label">
          {{ form.type === 'sqlite' ? '数据库文件路径' : '默认数据库（可选）' }}
        </label>
        <input
          v-model="form.database"
          class="form-control"
          :placeholder="form.type === 'sqlite' ? '/path/to/database.sqlite' : '数据库名称'"
        />
      </div>

      <div class="form-group" v-if="supportsSsl">
        <label class="form-check">
          <input type="checkbox" v-model="sslEnabled" /> 使用 SSL 连接
        </label>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="handleTestConnection">测试连接</button>
        <button type="button" class="btn btn-secondary" @click="handleCancel">取消</button>
        <button type="submit" class="btn btn-primary">{{ isEditMode ? '保存' : '添加' }}</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { getVSCodeBridge } from '../bridge';

const vscode = getVSCodeBridge();

const isEditMode = ref(false);
const editingConnection = ref<any>(null);
const sslEnabled = ref(false);

const databaseTypes = [
  { type: 'mysql', name: 'MySQL', defaultPort: 3306, ssl: false },
  { type: 'postgres', name: 'PostgreSQL', defaultPort: 5432, ssl: true },
  { type: 'sqlite', name: 'SQLite', defaultPort: 0, ssl: false },
  { type: 'mssql', name: 'SQL Server', defaultPort: 1433, ssl: true },
  { type: 'oracle', name: 'Oracle', defaultPort: 1521, ssl: false },
  { type: 'cockroachdb', name: 'CockroachDB', defaultPort: 26257, ssl: false },
  { type: 'mongodb', name: 'MongoDB', defaultPort: 27017, ssl: false },
  { type: 'sap', name: 'SAP HANA', defaultPort: 39013, ssl: false },
  { type: 'clickhouse', name: 'ClickHouse', defaultPort: 8123, ssl: false },
  { type: 'remote', name: '远程代理服务', defaultPort: 0, ssl: false }
];

const supportsSsl = computed(() => {
  const db = databaseTypes.find((d) => d.type === form.type);
  return !!db?.ssl;
});

const form = reactive({
  name: '',
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: '',
  username: '',
  password: '',
  remoteUrl: '',
  remoteToken: ''
});

onMounted(() => {
  vscode.postMessage({ command: 'ready' });
  vscode.onMessage((message: any) => {
    if (message.command === 'editConnection') {
      enterEditMode(message.data);
    } else if (message.command === 'testResult') {
      if (message.data?.success) {
        alert('连接测试成功');
      } else {
        alert('连接测试失败');
      }
    } else if (message.command === 'error') {
      alert('出错: ' + message.data);
    }
  });
});

function enterEditMode(connection: any) {
  editingConnection.value = connection;
  isEditMode.value = true;
  Object.assign(form, {
    name: connection.name,
    type: connection.type,
    host: connection.host || 'localhost',
    port: connection.port || 0,
    database: connection.database || '',
    username: connection.username || '',
    password: connection.password || '',
    remoteUrl: connection.options?.remoteUrl || '',
    remoteToken: connection.options?.remoteToken || ''
  });
  sslEnabled.value = !!connection.options?.ssl;
}

function handleTypeChange() {
  const db = databaseTypes.find((d) => d.type === form.type);
  if (db && db.defaultPort > 0 && !isEditMode.value) {
    form.port = db.defaultPort;
  }
}

function buildPayload() {
  const payload: any = {
    name: form.name,
    type: form.type,
    host: form.host,
    port: form.port,
    database: form.database,
    username: form.username,
    password: form.password,
    options: {}
  };
  if (form.type === 'remote') {
    payload.host = '';
    payload.port = 0;
    payload.username = '';
    payload.password = '';
    payload.database = '';
    payload.options.remoteUrl = form.remoteUrl;
    payload.options.remoteToken = form.remoteToken;
  } else if (supportsSsl.value && sslEnabled.value) {
    payload.options.ssl = true;
  }
  return payload;
}

function handleSubmit() {
  const data = buildPayload();
  if (isEditMode.value && editingConnection.value) {
    data.id = editingConnection.value.id;
    vscode.postMessage({ command: 'updateConnection', data });
  } else {
    vscode.postMessage({ command: 'addConnection', data });
  }
}

function handleTestConnection() {
  vscode.postMessage({ command: 'testConnection', data: buildPayload() });
}

function handleCancel() {
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
  color: var(--dbt-foreground);
}

.form-group {
  margin-bottom: 18px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--dbt-foreground);
}

.form-control {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--dbt-input-border);
  background-color: var(--dbt-input-background);
  color: var(--dbt-input-foreground);
  border-radius: 4px;
}

.form-control::placeholder {
  color: var(--dbt-descriptionForeground);
  opacity: 1;
}

.form-control:focus {
  outline: none;
  border-color: var(--dbt-focusBorder);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-col {
  flex: 1;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.btn {
  padding: 7px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary {
  background-color: var(--dbt-button-background);
  color: var(--dbt-button-foreground);
}

.btn-primary:hover {
  background-color: var(--dbt-button-hoverBackground);
}

.btn-secondary {
  background-color: var(--dbt-button-secondaryBackground);
  color: var(--dbt-button-secondaryForeground);
}

.btn-secondary:hover {
  background-color: var(--dbt-button-secondaryHoverBackground);
}

.required {
  color: #e5484d;
  margin-left: 0.25rem;
}

.form-hint {
  margin: 0.25rem 0 0;
  font-size: 12px;
  color: var(--dbt-descriptionForeground);
  line-height: 1.5;
}
</style>
