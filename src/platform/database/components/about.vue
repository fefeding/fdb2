<template>
  <div class="about-page">
    <div class="about-header">
      <div class="about-logo">
        <i class="bi bi-database"></i>
      </div>
      <div class="about-title">
        <h2>fdb2</h2>
        <p>开源数据库管理工具</p>
      </div>
    </div>
    
    <div class="about-content">
      <section class="about-section">
        <h3>关于 fdb2</h3>
        <p>
          fdb2 是一款轻量级、跨平台的数据库管理工具，支持多种数据库类型，提供类似 Navicat Premium 的使用体验。
        </p>
      </section>
      
      <section class="about-section">
        <h3>获取更多信息</h3>
        <div class="about-links">
          <a href="https://surl.fit/tools/tools/fdb2" target="_blank" class="about-link">
            <i class="bi bi-globe"></i>
            <span>官方网站</span>
          </a>
          <a href="https://github.com/fefeding/fdb2/" target="_blank" class="about-link">
            <i class="bi bi-github"></i>
            <span>GitHub 仓库</span>
          </a>
        </div>
      </section>
      
      <section class="about-section">
        <h3>核心优势</h3>
        <ul class="feature-list">
          <li><i class="bi bi-check-circle"></i> 零配置启动：全局安装后即可使用，无需复杂配置</li>
          <li><i class="bi bi-check-circle"></i> 跨平台支持：Windows、macOS、Linux 全平台兼容</li>
          <li><i class="bi bi-check-circle"></i> 轻量高效：资源占用低</li>
          <li><i class="bi bi-check-circle"></i> 本地存储：数据保存在本地，安全可靠</li>
          <li><i class="bi bi-check-circle"></i> 离线使用：无需联网即可管理本地数据库</li>
        </ul>
      </section>
      
      <section class="about-section">
        <h3>支持的数据库类型</h3>
        <div class="database-types">
          <div class="db-type" v-for="db in databaseTypes" :key="db.name">
            <span class="db-name">{{ db.name }}</span>
            <span class="db-port">{{ db.port }}</span>
          </div>
        </div>
      </section>
      
      <section class="about-section">
        <h3>许可证</h3>
        <p>fdb2 是一个完全开源的项目，采用 MIT 开源协议，自由使用。</p>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
const databaseTypes = [
  { name: 'MySQL', port: '3306' },
  { name: 'PostgreSQL', port: '5432' },
  { name: 'SQLite', port: '-' },
  { name: 'SQL Server', port: '1433' },
  { name: 'Oracle', port: '1521' },
  { name: 'CockroachDB', port: '26257' },
  { name: 'MongoDB', port: '27017' },
  { name: 'SAP HANA', port: '39013' }
];
</script>

<style scoped>
.about-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.about-logo {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
}

.about-title h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.about-title p {
  margin: 0.25rem 0 0 0;
  color: #64748b;
  font-size: 1.125rem;
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.about-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.about-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.about-section p {
  margin: 0 0 1rem 0;
  color: #64748b;
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  color: #64748b;
}

.feature-list li i {
  color: #10b981;
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.database-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.db-type {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 6px;
}

.db-name {
  font-weight: 500;
  color: #374151;
}

.db-port {
  color: #6b7280;
  font-size: 0.875rem;
}

.about-links {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.about-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.about-link:hover {
  background: #e0e7ff;
  transform: translateX(4px);
}

.about-link i {
  flex-shrink: 0;
}
</style>