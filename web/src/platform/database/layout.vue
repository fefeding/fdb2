<template>
  <div class="database-layout">
    <!-- 顶部导航栏 -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">
          <i class="bi bi-database"></i> 数据库管理工具
        </a>
        
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <router-link to="/database/index" class="nav-link" :class="{ active: isActive('/database/index') }">
                <i class="bi bi-house"></i> 首页
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/database/connections" class="nav-link" :class="{ active: isActive('/database/connections') }">
                <i class="bi bi-database-add"></i> 连接管理
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/database/schemas" class="nav-link" :class="{ active: isActive('/database/schemas') }">
                <i class="bi bi-diagram-3"></i> 数据库结构
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/database/query" class="nav-link" :class="{ active: isActive('/database/query') }">
                <i class="bi bi-code-slash"></i> SQL查询
              </router-link>
            </li>
          </ul>
          
          <ul class="navbar-nav">
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                <i class="bi bi-person-circle"></i> 用户
              </a>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="/admin/system/profile">
                  <i class="bi bi-person"></i> 个人资料
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="/admin/login">
                  <i class="bi bi-box-arrow-right"></i> 退出登录
                </a></li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 底部信息 -->
    <footer class="bg-light py-3">
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-6">
            <small class="text-muted">
              <i class="bi bi-code-slash"></i> 
              基于 TypeORM + Vue3 + Bootstrap5 构建
            </small>
          </div>
          <div class="col-md-6 text-end">
            <small class="text-muted">
              <i class="bi bi-clock"></i> 
              版本 1.0.0 | {{ currentTime }}
            </small>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const currentTime = ref(new Date().toLocaleString('zh-CN'));

// 检查当前路由是否激活
function isActive(path: string): boolean {
  return route.path.startsWith(path);
}

// 更新时间
function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN');
}

onMounted(() => {
  setInterval(updateTime, 1000);
});
</script>

<style scoped>
.database-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar-brand {
  font-weight: 600;
}

.navbar-nav .nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.navbar-nav .nav-link.active {
  font-weight: 600;
}

.main-content {
  flex: 1;
  padding: 0;
  background-color: #f8f9fa;
}

footer {
  border-top: 1px solid #dee2e6;
}

footer .row {
  align-items: center;
}

@media (max-width: 768px) {
  .navbar-nav {
    margin-top: 1rem;
  }
  
  footer .text-md-end {
    text-align: start !important;
    margin-top: 0.5rem;
  }
}
</style>