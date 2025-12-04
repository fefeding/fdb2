<template>
  <div class="database-dashboard-modern">
    <div class="container-fluid">
      <!-- 现代欢迎横幅 -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-background">
            <div class="hero-shapes">
              <div class="hero-shape shape-1"></div>
              <div class="hero-shape shape-2"></div>
              <div class="hero-shape shape-3"></div>
            </div>
          </div>
          <div class="row align-items-center">
            <div class="col-lg-7">
              <div class="hero-text">
                <div class="hero-badge">
                  <i class="bi bi-stars"></i>
                  <span>欢迎回来</span>
                </div>
                <h1 class="hero-title">
                  <span class="gradient-text">数据库管理平台</span>
                </h1>
                <p class="hero-description">
                  专业的数据库管理和监控工具，为开发者提供一站式数据库操作体验。支持多种主流数据库类型，提供直观的可视化界面和强大的查询功能。
                </p>
                <div class="hero-actions">
                  <router-link to="/database/explorer" class="btn-hero btn-primary-hero">
                    <i class="bi bi-plus-lg"></i>
                    <span>添加连接</span>
                    <div class="btn-glow"></div>
                  </router-link>
                  <router-link to="/database/explorer" class="btn-hero btn-secondary-hero">
                    <i class="bi bi-terminal"></i>
                    <span>SQL查询</span>
                  </router-link>
                </div>
                <div class="hero-stats">
                  <div class="hero-stat">
                    <span class="stat-number">{{ connections.length }}</span>
                    <span class="stat-label">连接数</span>
                  </div>
                  <div class="hero-stat">
                    <span class="stat-number">5</span>
                    <span class="stat-label">支持类型</span>
                  </div>
                  <div class="hero-stat">
                    <span class="stat-number">24/7</span>
                    <span class="stat-label">在线监控</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-lg-5">
              <div class="hero-visual">
                <div class="database-illustration">
                  <div class="db-layer layer-1">
                    <i class="bi bi-database"></i>
                  </div>
                  <div class="db-layer layer-2">
                    <i class="bi bi-diagram-3"></i>
                  </div>
                  <div class="db-layer layer-3">
                    <i class="bi bi-table"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 快速统计卡片 -->
      <section class="stats-section">
        <div class="row g-4">
          <div class="col-md-3">
            <div class="stat-card-modern stat-gradient-1">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">
                  <i class="bi bi-plugin"></i>
                </div>
                <div class="stat-trend">
                  <i class="bi bi-arrow-up"></i>
                  <span>+12%</span>
                </div>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ connections.length }}</div>
                <div class="stat-title">数据库连接</div>
                <div class="stat-description">活跃连接配置</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card-modern stat-gradient-2">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">
                  <i class="bi bi-activity"></i>
                </div>
                <div class="stat-trend">
                  <i class="bi bi-arrow-up"></i>
                  <span>98%</span>
                </div>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ enabledConnections }}</div>
                <div class="stat-title">在线状态</div>
                <div class="stat-description">正常运行</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card-modern stat-gradient-3">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">
                  <i class="bi bi-diagram-3"></i>
                </div>
                <div class="stat-trend">
                  <i class="bi bi-arrow-right"></i>
                  <span>5种</span>
                </div>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ dbTypesCount }}</div>
                <div class="stat-title">数据库类型</div>
                <div class="stat-description">支持的引擎</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card-modern stat-gradient-4">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">
                  <i class="bi bi-lightning"></i>
                </div>
                <div class="stat-trend">
                  <i class="bi bi-arrow-up"></i>
                  <span>15ms</span>
                </div>
              </div>
              <div class="stat-content">
                <div class="stat-number">极速</div>
                <div class="stat-title">响应时间</div>
                <div class="stat-description">平均查询性能</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 功能特性展示 -->
      <section class="features-section">
        <div class="section-header">
          <div class="section-icon">
            <i class="bi bi-stars"></i>
          </div>
          <h2 class="section-title">核心功能</h2>
          <p class="section-subtitle">强大的数据库管理功能，满足您的所有需求</p>
        </div>
        
        <div class="features-grid">
          <div class="feature-card" v-for="(feature, index) in features" :key="index">
            <div class="feature-icon-wrapper">
              <div class="feature-icon" :class="`feature-${index + 1}`">
                <i :class="feature.icon"></i>
              </div>
              <div class="feature-number">{{ String(index + 1).padStart(2, '0') }}</div>
            </div>
            <div class="feature-content">
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
              <div class="feature-tags">
                <span class="feature-tag" v-for="tag in feature.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
            <div class="feature-action">
              <router-link :to="feature.link" class="feature-link">
                <i class="bi bi-arrow-right"></i>
              </router-link>
            </div>
          </div>
        </div>
      </section>

      <!-- 快速连接访问 -->
      <section class="quick-access-section" v-if="connections.length > 0">
        <div class="section-header">
          <div class="section-icon">
            <i class="bi bi-lightning"></i>
          </div>
          <h2 class="section-title">快速访问</h2>
          <p class="section-subtitle">一键访问您的数据库连接</p>
        </div>
        
        <div class="quick-access-grid">
          <div class="quick-access-card" v-for="connection in connections.slice(0, 6)" :key="connection.id">
            <div class="quick-access-header">
              <div class="db-avatar" :class="getDbTypeClass(connection.type)">
                <i :class="getDbTypeIcon(connection.type)"></i>
              </div>
              <div class="connection-status" :class="connection.enabled ? 'status-online' : 'status-offline'">
                <div class="status-dot"></div>
              </div>
            </div>
            <div class="quick-access-body">
              <h4 class="connection-name">{{ connection.name }}</h4>
              <p class="connection-info">
                <span class="db-type">{{ getDbTypeLabel(connection.type) }}</span>
                <span class="connection-host">{{ connection.host }}:{{ connection.port }}</span>
              </p>
            </div>
            <div class="quick-access-footer">
              <button class="quick-access-btn" @click="goToSchemas(connection)">
                <i class="bi bi-folder2-open"></i>
                <span>查看</span>
              </button>
            </div>
          </div>
        </div>
        
        <div class="view-all-connections" v-if="connections.length > 6">
          <router-link to="/database/explorer" class="view-all-btn">
            <i class="bi bi-grid"></i>
            <span>查看所有连接 ({{ connections.length }})</span>
            <i class="bi bi-arrow-right"></i>
          </router-link>
        </div>
      </section>

      <!-- 空状态 -->
      <section class="empty-state-section" v-else>
        <div class="empty-state-content">
          <div class="empty-illustration">
            <div class="empty-icon-wrapper">
              <i class="bi bi-inbox"></i>
            </div>
            <div class="empty-shapes">
              <div class="empty-shape shape-a"></div>
              <div class="empty-shape shape-b"></div>
              <div class="empty-shape shape-c"></div>
            </div>
          </div>
          <h2 class="empty-title">开始您的数据库管理之旅</h2>
          <p class="empty-description">
            还没有配置数据库连接？让我们添加第一个连接，开始强大的数据库管理体验。
          </p>
          <router-link to="/database/explorer" class="btn-hero btn-primary-hero">
            <i class="bi bi-plus-lg"></i>
            <span>添加数据库连接</span>
            <div class="btn-glow"></div>
          </router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ConnectionService } from '@/service/database';
import type { ConnectionEntity } from '@/typings/database';

const router = useRouter();
const connectionService = new ConnectionService();

// 响应式数据
const connections = ref<ConnectionEntity[]>([]);

// 功能特性数据
const features = ref([
  {
    title: '连接管理',
    icon: 'bi bi-plugin',
    description: '支持MySQL、PostgreSQL、SQLite、SQL Server、Oracle等主流数据库的连接配置和管理',
    tags: ['多数据库支持', '安全连接', '连接池'],
    link: '/database/explorer'
  },
  {
    title: '结构浏览',
    icon: 'bi bi-diagram-3',
    description: '直观展示数据库表结构、索引、外键关系、视图、存储过程等数据库对象',
    tags: ['可视化', '关系图', '详细视图'],
    link: '/database/explorer'
  },
  {
    title: '数据操作',
    icon: 'bi bi-table',
    description: '查看、编辑、删除表数据，支持批量操作、分页浏览、条件筛选和数据导入导出',
    tags: ['CRUD操作', '批量处理', '导入导出'],
    link: '/database/explorer'
  },
  {
    title: 'SQL查询',
    icon: 'bi bi-terminal',
    description: '强大的SQL编辑器，支持语法高亮、自动补全、查询历史和结果导出功能',
    tags: ['语法高亮', '查询历史', '结果导出'],
    link: '/database/explorer'
  }
]);

// 计算属性
const enabledConnections = computed(() => 
  connections.value?.filter?.(c => c.enabled)?.length
);

const dbTypesCount = computed(() => {
  const types = new Set(connections.value?.map?.(c => c.type)||[]);
  return types.size;
});

// 生命周期
onMounted(async () => {
  await loadConnections();
});

// 方法
async function loadConnections() {
  try {
    const response = await connectionService.getAllConnections();
    connections.value = response || [];
  } catch (error) {
    console.error('加载连接列表失败:', error);
  }
}

function goToSchemas(connection: ConnectionEntity) {
  router.push(`/database/explorer?connectionId=${connection.id}`);
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

function getDbTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    mysql: 'bi-database',
    postgres: 'bi-database',
    sqlite: 'bi-database',
    mssql: 'bi-database',
    oracle: 'bi-database'
  };
  return iconMap[type] || 'bi-database';
}

function getDbTypeClass(type: string): string {
  const classMap: Record<string, string> = {
    mysql: 'db-mysql',
    postgres: 'db-postgres',
    sqlite: 'db-sqlite',
    mssql: 'db-mssql',
    oracle: 'db-oracle'
  };
  return classMap[type] || 'db-default';
}
</script>

<style scoped>
/* 主容器 */
.database-dashboard-modern {
  min-height: calc(100vh - 200px);
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 2rem 0;
}

/* Hero 区域 */
.hero-section {
  position: relative;
  margin-bottom: 4rem;
  overflow: hidden;
}

.hero-content {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 24px;
  padding: 3rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.5);
  position: relative;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.hero-shapes {
  position: absolute;
  width: 100%;
  height: 100%;
}

.hero-shape {
  position: absolute;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.05));
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 200px;
  height: 200px;
  top: -50px;
  right: -50px;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  bottom: -30px;
  left: 20%;
  animation-delay: 2s;
}

.shape-3 {
  width: 100px;
  height: 100px;
  top: 20%;
  right: 10%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

.hero-text {
  position: relative;
  z-index: 2;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  color: #1e293b;
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 1.125rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.btn-hero {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-primary-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.btn-primary-hero:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
}

.btn-secondary-hero {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary-hero:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
}

.btn-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn-hero:active .btn-glow {
  width: 300px;
  height: 300px;
}

.hero-stats {
  display: flex;
  gap: 3rem;
  margin-top: 2rem;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

/* 可视化插图 */
.hero-visual {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.database-illustration {
  position: relative;
  width: 300px;
  height: 300px;
}

.db-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  font-size: 4rem;
  color: white;
  animation: rotate 20s linear infinite;
}

.layer-1 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  animation-delay: 0s;
  z-index: 3;
}

.layer-2 {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  animation-delay: 6s;
  transform: scale(0.8) rotate(45deg);
  z-index: 2;
}

.layer-3 {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  animation-delay: 12s;
  transform: scale(0.6) rotate(90deg);
  z-index: 1;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 统计卡片区域 */
.stats-section {
  margin-bottom: 4rem;
}

.stat-card-modern {
  background: white;
  border-radius: 20px;
  padding: 1.5rem;
  border: 1px solid rgba(226, 232, 240, 0.5);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card-modern:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.stat-icon-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-trend {
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #10b981;
}

.stat-gradient-1 .stat-icon { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-gradient-2 .stat-icon { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.stat-gradient-3 .stat-icon { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.stat-gradient-4 .stat-icon { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-card-modern .stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.stat-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.stat-description {
  font-size: 0.875rem;
  color: #6b7280;
}

/* 功能特性区域 */
.features-section {
  margin-bottom: 4rem;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  margin: 0 auto 1rem;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.section-subtitle {
  color: #64748b;
  font-size: 1.125rem;
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(226, 232, 240, 0.5);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.feature-icon-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.feature-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  position: relative;
  z-index: 2;
}

.feature-1 { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.feature-2 { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.feature-3 { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.feature-4 { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }

.feature-number {
  font-size: 3rem;
  font-weight: 700;
  color: rgba(102, 126, 234, 0.1);
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

.feature-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0;
}

.feature-description {
  color: #64748b;
  line-height: 1.6;
  flex-grow: 1;
}

.feature-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.feature-tag {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #64748b;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.feature-action {
  display: flex;
  justify-content: end;
}

.feature-link {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: all 0.3s ease;
}

.feature-link:hover {
  transform: scale(1.1) rotate(45deg);
}

/* 快速访问区域 */
.quick-access-section {
  margin-bottom: 4rem;
}

.quick-access-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.quick-access-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(226, 232, 240, 0.5);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quick-access-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
}

.quick-access-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.db-avatar {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.connection-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: relative;
}

.status-online {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-offline {
  background: #6b7280;
}

.status-dot {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}

.quick-access-body {
  flex-grow: 1;
}

.connection-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.connection-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #64748b;
}

.db-type {
  font-weight: 600;
  color: #667eea;
}

.connection-host {
  color: #94a3b8;
}

.quick-access-footer {
  margin-top: auto;
}

.quick-access-btn {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #667eea;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.quick-access-btn:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-1px);
}

.view-all-connections {
  text-align: center;
}

.view-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  color: #64748b;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
}

.view-all-btn:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
}

/* 空状态 */
.empty-state-section {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state-content {
  max-width: 600px;
  margin: 0 auto;
}

.empty-illustration {
  position: relative;
  margin-bottom: 2rem;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-icon-wrapper {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 3rem;
  position: relative;
  z-index: 2;
}

.empty-shapes {
  position: absolute;
  width: 100%;
  height: 100%;
}

.empty-shape {
  position: absolute;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.05));
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;
}

.shape-a {
  width: 60px;
  height: 60px;
  top: 20px;
  left: 20px;
  animation-delay: 0s;
}

.shape-b {
  width: 40px;
  height: 40px;
  bottom: 30px;
  right: 30px;
  animation-delay: 2s;
}

.shape-c {
  width: 30px;
  height: 30px;
  top: 50%;
  left: 70%;
  animation-delay: 4s;
}

.empty-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
}

.empty-description {
  font-size: 1.125rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 2rem;
}

/* 数据库类型颜色 */
.db-mysql { background: linear-gradient(135deg, #00758f 0%, #005a70 100%); }
.db-postgres { background: linear-gradient(135deg, #336791 0%, #2a5278 100%); }
.db-sqlite { background: linear-gradient(135deg, #003b57 0%, #002d42 100%); }
.db-mssql { background: linear-gradient(135deg, #cc2927 0%, #a62220 100%); }
.db-oracle { background: linear-gradient(135deg, #f80000 0%, #d40000 100%); }
.db-default { background: linear-gradient(135deg, #64748b 0%, #475569 100%); }

/* 响应式设计 */
@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
  
  .quick-access-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .database-dashboard-modern {
    padding: 1rem 0;
  }
  
  .hero-content {
    padding: 2rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-description {
    font-size: 1rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .hero-stats {
    gap: 2rem;
    justify-content: center;
  }
  
  .hero-visual {
    height: 300px;
    margin-top: 2rem;
  }
  
  .database-illustration {
    width: 200px;
    height: 200px;
  }
  
  .db-layer {
    font-size: 3rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
  
  .section-subtitle {
    font-size: 1rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-access-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .hero-content {
    padding: 1.5rem;
  }
  
  .hero-title {
    font-size: 1.75rem;
  }
  
  .stat-card-modern .stat-number {
    font-size: 2rem;
  }
  
  .feature-card {
    padding: 1.5rem;
  }
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>