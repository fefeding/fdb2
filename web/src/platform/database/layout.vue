<template>
  <div class="database-layout">

    <!-- 主要内容区域 -->
    <main class="main-content-modern">
      <div class="content-wrapper">
        <router-view />
      </div>
    </main>

    <!-- 现代底部信息 -->
    <footer class="footer-modern">
      <div class="container-fluid">
        <div class="footer-content">
          <div class="footer-section">
            <div class="footer-brand">
              <i class="bi bi-database-gear"></i>
              <span>数据库管理平台</span>
            </div>
            <div class="footer-description">
              专业的数据库管理和监控工具
            </div>
          </div>
          
          <div class="footer-section">
            <div class="footer-links">
              <a href="#" class="footer-link">文档中心</a>
              <a href="#" class="footer-link">API接口</a>
              <a href="#" class="footer-link">技术支持</a>
            </div>
          </div>
          
          <div class="footer-section text-end">
            <div class="footer-info">
              <div class="footer-stats">
                <span class="stat-item">
                  <i class="bi bi-cpu"></i>
                  <span>版本 1.0.0</span>
                </span>
                <span class="stat-item">
                  <i class="bi bi-clock-history"></i>
                  <span>{{ currentTime }}</span>
                </span>
              </div>
              <div class="footer-tech">
                <i class="bi bi-stack"></i>
                <span>TypeORM + Vue3 + Bootstrap5</span>
              </div>
            </div>
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
/* 主布局样式 */
.database-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

/* 现代导航栏样式 */
.navbar-modern {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 0.75rem 0;
  position: sticky;
  top: 0;
  z-index: 1030;
  backdrop-filter: blur(10px);
}

/* 品牌区域 */
.navbar-brand-wrapper {
  margin-right: 2rem;
}

.navbar-brand-modern {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: #1e293b;
  transition: all 0.3s ease;
}

.navbar-brand-modern:hover {
  color: #667eea;
  transform: translateX(2px);
}

.brand-icon {
  width: 45px;
  height: 45px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.brand-icon:hover {
  transform: rotate(5deg) scale(1.05);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
}

.brand-subtitle {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* 移动端切换按钮 */
.navbar-toggler-modern {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: none;
  flex-direction: column;
  gap: 4px;
}

.navbar-toggler-line {
  width: 25px;
  height: 3px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 2px;
  transition: all 0.3s ease;
}

/* 导航折叠区域 */
.navbar-collapse-modern {
  background: transparent;
}

/* 主导航样式 */
.navbar-nav-modern {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-item-modern {
  position: relative;
}

.nav-link-modern {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  color: #64748b;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.nav-link-modern:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  transform: translateY(-1px);
}

.nav-link-modern.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.nav-icon {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
}

.nav-text {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.025em;
}

.nav-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.3s ease;
}

.nav-link-modern.active .nav-indicator {
  opacity: 1;
}

/* 用户菜单样式 */
.nav-icon-only {
  padding: 0.75rem;
  min-width: auto;
}

.notification-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid white;
  animation: pulse 2s ease-in-out infinite;
}

.user-menu-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.user-menu-toggle:hover {
  background: rgba(102, 126, 234, 0.1);
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
}

.user-role {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.dropdown-arrow {
  color: #94a3b8;
  font-size: 0.75rem;
  transition: all 0.3s ease;
}

.user-menu-toggle:hover .dropdown-arrow {
  color: #667eea;
  transform: translateY(1px);
}

/* 现代下拉菜单样式 */
.dropdown-menu-modern {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
  padding: 0.75rem;
  min-width: 280px;
  backdrop-filter: blur(10px);
  margin-top: 0.75rem;
}

.dropdown-header {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 0.5rem;
}

.dropdown-item-modern {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  color: #374151;
  text-decoration: none;
  transition: all 0.2s ease;
  margin-bottom: 2px;
}

.dropdown-item-modern:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  color: #667eea;
  transform: translateX(4px);
}

.dropdown-item-modern.text-danger:hover {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  color: #dc2626;
}

.dropdown-item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-item-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: inherit;
}

.dropdown-item-desc {
  font-size: 0.75rem;
  color: #94a3b8;
}

.dropdown-divider-modern {
  margin: 0.75rem -0.75rem;
  border: none;
  border-top: 1px solid #f1f5f9;
}

/* 主要内容区域 */
.main-content-modern {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.content-wrapper {
  flex: 1;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

/* 现代底部样式 */
.footer-modern {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: #e2e8f0;
  padding: 2rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.footer-content {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.footer-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
}

.footer-brand i {
  font-size: 1.25rem;
}

.footer-description {
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.5;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-link {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  padding: 0.25rem 0;
}

.footer-link:hover {
  color: #667eea;
  transform: translateX(4px);
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: end;
}

.footer-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #94a3b8;
  font-size: 0.85rem;
}

.stat-item i {
  color: #667eea;
}

.footer-tech {
  color: #64748b;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-tech i {
  color: #667eea;
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .footer-content {
    grid-template-columns: 1fr 1fr;
    gap: 2rem 1rem;
  }
  
  .footer-section:last-child {
    grid-column: span 2;
    text-align: center;
    align-items: center;
  }
  
  .footer-info {
    align-items: center;
  }
}

@media (max-width: 768px) {
  .navbar-brand-wrapper {
    margin-right: 1rem;
  }
  
  .brand-name {
    font-size: 1rem;
  }
  
  .brand-subtitle {
    display: none;
  }
  
  .navbar-toggler-modern {
    display: flex;
  }
  
  .navbar-collapse-modern {
    background: white;
    border-radius: 12px;
    margin-top: 1rem;
    padding: 1rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  
  .navbar-nav-modern {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
    width: 100%;
  }
  
  .nav-link-modern {
    padding: 1rem;
    border-radius: 8px;
  }
  
  .nav-text {
    font-size: 1rem;
  }
  
  .content-wrapper {
    padding: 1rem;
  }
  
  .footer-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    text-align: center;
  }
  
  .footer-section:last-child {
    grid-column: span 1;
  }
  
  .footer-info {
    align-items: center;
  }
  
  .footer-stats {
    align-items: center;
  }
  
  .dropdown-menu-modern {
    margin-top: 0.5rem;
    min-width: 250px;
  }
}

@media (max-width: 480px) {
  .brand-icon {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
  }
  
  .navbar-brand-modern {
    gap: 0.75rem;
  }
  
  .footer-modern {
    padding: 1.5rem 0;
  }
  
  .footer-brand {
    font-size: 1rem;
  }
  
  .stat-item {
    font-size: 0.8rem;
  }
  
  .footer-tech {
    font-size: 0.8rem;
  }
}
</style>