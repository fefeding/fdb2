<template>
  <div class="database-dashboard">
    <div class="container-fluid py-4">
      <!-- 欢迎横幅 -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="card bg-primary text-white">
            <div class="card-body">
              <div class="row align-items-center">
                <div class="col-md-8">
                  <h1 class="card-title">
                    <i class="bi bi-database"></i> 数据库管理工具
                  </h1>
                  <p class="card-text">
                    专业的数据库管理和查询工具，支持多种数据库类型，提供直观的操作界面
                  </p>
                </div>
                <div class="col-md-4 text-end">
                  <div class="btn-group-vertical">
                    <router-link to="/database/connections" class="btn btn-light btn-lg mb-2">
                      <i class="bi bi-database-add"></i> 添加连接
                    </router-link>
                    <router-link to="/database/query" class="btn btn-outline-light">
                      <i class="bi bi-code-slash"></i> SQL查询
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能特性 -->
      <div class="row mb-4">
        <div class="col-md-3 mb-3">
          <div class="card h-100 text-center">
            <div class="card-body">
              <i class="bi bi-database-add text-primary fs-1 mb-3"></i>
              <h5 class="card-title">连接管理</h5>
              <p class="card-text">支持MySQL、PostgreSQL、SQLite等多种数据库的连接配置和管理</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card h-100 text-center">
            <div class="card-body">
              <i class="bi bi-diagram-3 text-success fs-1 mb-3"></i>
              <h5 class="card-title">结构查看</h5>
              <p class="card-text">直观展示数据库表结构、索引、外键关系等信息</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card h-100 text-center">
            <div class="card-body">
              <i class="bi bi-table text-info fs-1 mb-3"></i>
              <h5 class="card-title">数据操作</h5>
              <p class="card-text">查看、编辑、删除表数据，支持分页和条件查询</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card h-100 text-center">
            <div class="card-body">
              <i class="bi bi-code-slash text-warning fs-1 mb-3"></i>
              <h5 class="card-title">SQL查询</h5>
              <p class="card-text">强大的SQL编辑器，支持语法高亮和查询历史</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速连接列表 -->
      <div class="row mb-4" v-if="connections.length > 0">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-link-45deg"></i> 快速连接
              </h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-4 mb-3" v-for="connection in connections.slice(0, 6)" :key="connection.id">
                  <div class="card border-primary">
                    <div class="card-body">
                      <div class="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 class="card-title mb-1">
                            {{ connection.name }}
                          </h6>
                          <small class="text-muted">
                            {{ getDbTypeLabel(connection.type) }} - {{ connection.host }}
                          </small>
                        </div>
                        <div>
                          <button 
                            class="btn btn-sm btn-outline-primary" 
                            @click="goToSchemas(connection)"
                          >
                            <i class="bi bi-folder"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="text-center mt-3" v-if="connections.length > 6">
                <router-link to="/database/connections" class="btn btn-outline-primary">
                  查看所有连接 ({{ connections.length }})
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用提示 -->
      <div class="row" v-if="connections.length === 0">
        <div class="col-12">
          <div class="card border-info">
            <div class="card-body text-center">
              <i class="bi bi-info-circle text-info fs-1 mb-3"></i>
              <h5 class="card-title">开始使用</h5>
              <p class="card-text">
                您还没有配置任何数据库连接。点击下方按钮开始添加您的第一个数据库连接。
              </p>
              <router-link to="/database/connections" class="btn btn-primary btn-lg">
                <i class="bi bi-plus-lg"></i> 添加数据库连接
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ConnectionService } from '@/service/database';
import type { ConnectionEntity } from '@/typings/database';

const router = useRouter();
const connectionService = new ConnectionService();

const connections = ref<ConnectionEntity[]>([]);

onMounted(async () => {
  await loadConnections();
});

async function loadConnections() {
  try {
    const response = await connectionService.getAllConnections();
    connections.value = response.data || [];
  } catch (error) {
    console.error('加载连接列表失败:', error);
  }
}

function goToSchemas(connection: ConnectionEntity) {
  router.push(`/database/schemas?connectionId=${connection.id}`);
}

function getDbTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    mysql: 'MySQL',
    postgres: 'PostgreSQL',
    sqlite: 'SQLite',
    mssql: 'SQL Server',
    oracle: 'Oracle'
  };
  return labelMap[type] || type;
}
</script>

<style scoped>
.database-dashboard {
  min-height: calc(100vh - 200px);
}

.card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.card.bg-primary {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
}

.btn-group-vertical .btn {
  width: 200px;
}

@media (max-width: 768px) {
  .btn-group-vertical .btn {
    width: 100%;
  }
  
  .text-md-end {
    text-align: center !important;
    margin-top: 1rem;
  }
}
</style>