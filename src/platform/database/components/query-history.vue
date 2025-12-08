<template>
  <div class="query-history">
    <div class="history-header">
      <div class="header-title">
        <i class="bi bi-clock-history"></i>
        <span>查询历史</span>
      </div>
      <div class="header-controls">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="搜索查询..."
            @input="handleSearch"
          >
        </div>
        <select v-model="filterType" class="filter-select" @change="filterQueries">
          <option value="all">所有类型</option>
          <option value="SELECT">SELECT</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="CREATE">CREATE</option>
          <option value="ALTER">ALTER</option>
          <option value="DROP">DROP</option>
        </select>
        <button class="btn-clear-history" @click="confirmClearHistory">
          <i class="bi bi-trash"></i>
          <span>清空历史</span>
        </button>
      </div>
    </div>

    <div class="history-content">
      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-clock"></i>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ totalQueries }}</div>
            <div class="stat-label">总查询数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-lightning"></i>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ recentQueries.length }}</div>
            <div class="stat-label">今日查询</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-star"></i>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ favoriteQueries.length }}</div>
            <div class="stat-label">收藏查询</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-activity"></i>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ Math.round(averageExecutionTime) }}ms</div>
            <div class="stat-label">平均执行时间</div>
          </div>
        </div>
      </div>

      <!-- 快速筛选标签 -->
      <div class="quick-filters">
        <button 
          class="filter-tag"
          :class="{ active: activeFilter === 'all' }"
          @click="setActiveFilter('all')"
        >
          <i class="bi bi-grid"></i>
          <span>全部</span>
        </button>
        <button 
          class="filter-tag"
          :class="{ active: activeFilter === 'recent' }"
          @click="setActiveFilter('recent')"
        >
          <i class="bi bi-clock"></i>
          <span>最近</span>
        </button>
        <button 
          class="filter-tag"
          :class="{ active: activeFilter === 'favorites' }"
          @click="setActiveFilter('favorites')"
        >
          <i class="bi bi-star"></i>
          <span>收藏</span>
        </button>
        <button 
          class="filter-tag"
          :class="{ active: activeFilter === 'slow' }"
          @click="setActiveFilter('slow')"
        >
          <i class="bi bi-exclamation-triangle"></i>
          <span>慢查询</span>
        </button>
        <button 
          class="filter-tag"
          :class="{ active: activeFilter === 'failed' }"
          @click="setActiveFilter('failed')"
        >
          <i class="bi bi-x-circle"></i>
          <span>失败</span>
        </button>
      </div>

      <!-- 查询列表 -->
      <div class="queries-list">
        <div class="list-header">
          <div class="list-title">
            <span>查询记录 ({{ filteredQueries.length }})</span>
          </div>
          <div class="list-actions">
            <button class="btn-export" @click="exportHistory">
              <i class="bi bi-download"></i>
              <span>导出</span>
            </button>
          </div>
        </div>

        <div class="query-items">
          <div 
            v-for="query in paginatedQueries" 
            :key="query.id"
            class="query-item"
            :class="{ 
              'expanded': expandedQuery === query.id,
              'failed': query.status === 'failed',
              'slow': query.executionTime > 2000
            }"
          >
            <div class="query-header" @click="toggleExpand(query.id)">
              <div class="query-info">
                <div class="query-type-badge" :class="query.type.toLowerCase()">
                  {{ query.type }}
                </div>
                <div class="query-summary">
                  <span class="query-text">{{ truncateSql(query.sql) }}</span>
                </div>
                <div class="query-meta">
                  <span class="execution-time" :class="getExecutionTimeClass(query.executionTime)">
                    {{ query.executionTime }}ms
                  </span>
                  <span class="timestamp">{{ formatTime(query.timestamp) }}</span>
                  <span class="connection">{{ query.connectionName }}</span>
                </div>
              </div>
              <div class="query-actions">
                <button 
                  class="btn-favorite"
                  :class="{ 'active': query.isFavorite }"
                  @click.stop="toggleFavorite(query)"
                  :title="query.isFavorite ? '取消收藏' : '收藏查询'"
                >
                  <i class="bi bi-star-fill" v-if="query.isFavorite"></i>
                  <i class="bi bi-star" v-else></i>
                </button>
                <button 
                  class="btn-execute"
                  @click.stop="executeQuery(query)"
                  title="重新执行"
                >
                  <i class="bi bi-play-fill"></i>
                </button>
                <button 
                  class="btn-copy"
                  @click.stop="copyQuery(query)"
                  title="复制SQL"
                >
                  <i class="bi bi-clipboard"></i>
                </button>
                <button 
                  class="btn-delete"
                  @click.stop="deleteQuery(query)"
                  title="删除记录"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
            
            <div class="query-details" v-show="expandedQuery === query.id">
              <div class="details-tabs">
                <button 
                  class="tab-btn"
                  :class="{ active: activeDetailTab === 'sql' }"
                  @click="activeDetailTab = 'sql'"
                >
                  <span>SQL语句</span>
                </button>
                <button 
                  class="tab-btn"
                  :class="{ active: activeDetailTab === 'result' }"
                  @click="activeDetailTab = 'result'"
                  v-if="query.status === 'success'"
                >
                  <span>执行结果</span>
                </button>
                <button 
                  class="tab-btn"
                  :class="{ active: activeDetailTab === 'error' }"
                  @click="activeDetailTab = 'error'"
                  v-if="query.status === 'failed'"
                >
                  <span>错误信息</span>
                </button>
                <button 
                  class="tab-btn"
                  :class="{ active: activeDetailTab === 'plan' }"
                  @click="activeDetailTab = 'plan'"
                >
                  <span>执行计划</span>
                </button>
              </div>
              
              <div class="details-content">
                <div class="detail-panel" v-if="activeDetailTab === 'sql'">
                  <div class="sql-editor">
                    <pre><code>{{ query.sql }}</code></pre>
                    <button class="btn-copy-sql" @click="copySql(query.sql)">
                      <i class="bi bi-clipboard"></i>
                      复制
                    </button>
                  </div>
                </div>
                
                <div class="detail-panel" v-if="activeDetailTab === 'result' && query.status === 'success'">
                  <div class="result-info">
                    <div class="result-stat">
                      <span class="stat-label">影响行数:</span>
                      <span class="stat-value">{{ query.affectedRows || 0 }}</span>
                    </div>
                    <div class="result-stat">
                      <span class="stat-label">返回行数:</span>
                      <span class="stat-value">{{ query.returnedRows || 0 }}</span>
                    </div>
                    <div class="result-stat">
                      <span class="stat-label">执行时间:</span>
                      <span class="stat-value">{{ query.executionTime }}ms</span>
                    </div>
                  </div>
                  <div class="result-preview" v-if="query.resultPreview">
                    <table class="preview-table">
                      <thead>
                        <tr>
                          <th v-for="column in query.resultPreview.columns" :key="column">
                            {{ column }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, index) in query.resultPreview.data" :key="index">
                          <td v-for="column in query.resultPreview.columns" :key="column">
                            {{ row[column] }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div class="detail-panel" v-if="activeDetailTab === 'error' && query.status === 'failed'">
                  <div class="error-message">
                    <i class="bi bi-exclamation-triangle"></i>
                    <div class="error-content">
                      <h4>执行错误</h4>
                      <pre>{{ query.errorMessage }}</pre>
                    </div>
                  </div>
                </div>
                
                <div class="detail-panel" v-if="activeDetailTab === 'plan'">
                  <div class="execution-plan">
                    <pre>{{ query.executionPlan || '暂无执行计划数据' }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button @click="prevPage" :disabled="currentPage === 1">
          <i class="bi bi-chevron-left"></i>
        </button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- 确认清空对话框 -->
    <div class="modal-overlay" v-if="showClearConfirm">
      <div class="modal-content">
        <div class="modal-header">
          <h3>确认清空</h3>
          <button class="modal-close" @click="showClearConfirm = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>确定要清空所有查询历史记录吗？此操作无法撤销。</p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showClearConfirm = false">取消</button>
          <button class="btn-confirm" @click="clearHistory">确认清空</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';

// 响应式数据
const searchQuery = ref('');
const filterType = ref('all');
const activeFilter = ref('all');
const expandedQuery = ref<string | null>(null);
const activeDetailTab = ref('sql');
const currentPage = ref(1);
const pageSize = ref(20);
const showClearConfirm = ref(false);

// 模拟查询历史数据
const queryHistory = ref([
  {
    id: '1',
    type: 'SELECT',
    sql: 'SELECT * FROM users WHERE status = "active" AND created_at > "2024-01-01"',
    timestamp: new Date(Date.now() - 5 * 60000),
    executionTime: 245,
    status: 'success',
    connectionName: 'MySQL主库',
    isFavorite: true,
    affectedRows: 0,
    returnedRows: 125,
    resultPreview: {
      columns: ['id', 'name', 'email', 'status'],
      data: [
        { id: 1, name: '张三', email: 'zhangsan@example.com', status: 'active' },
        { id: 2, name: '李四', email: 'lisi@example.com', status: 'active' }
      ]
    }
  },
  {
    id: '2',
    type: 'UPDATE',
    sql: 'UPDATE products SET price = price * 1.1 WHERE category_id = 5',
    timestamp: new Date(Date.now() - 15 * 60000),
    executionTime: 3200,
    status: 'success',
    connectionName: 'MySQL主库',
    isFavorite: false,
    affectedRows: 48,
    returnedRows: 0
  },
  {
    id: '3',
    type: 'INSERT',
    sql: 'INSERT INTO orders (user_id, product_id, quantity, total_amount) VALUES (1, 10, 2, 299.99)',
    timestamp: new Date(Date.now() - 30 * 60000),
    executionTime: 120,
    status: 'success',
    connectionName: 'MySQL主库',
    isFavorite: false,
    affectedRows: 1,
    returnedRows: 0
  },
  {
    id: '4',
    type: 'SELECT',
    sql: 'SELECT u.name, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.created_at > "2024-01-01" GROUP BY u.id, u.name HAVING COUNT(o.id) > 5',
    timestamp: new Date(Date.now() - 60 * 60000),
    executionTime: 5600,
    status: 'success',
    connectionName: 'MySQL主库',
    isFavorite: true,
    affectedRows: 0,
    returnedRows: 23
  },
  {
    id: '5',
    type: 'DELETE',
    sql: 'DELETE FROM user_sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 30 DAY)',
    timestamp: new Date(Date.now() - 120 * 60000),
    executionTime: 1850,
    status: 'failed',
    connectionName: 'MySQL主库',
    isFavorite: false,
    errorMessage: 'Error 1451: Cannot delete or update a parent row: a foreign key constraint fails'
  }
]);

// 计算属性
const totalQueries = computed(() => queryHistory.value.length);

const recentQueries = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return queryHistory.value.filter(q => q.timestamp >= today);
});

const favoriteQueries = computed(() => 
  queryHistory.value.filter(q => q.isFavorite)
);

const averageExecutionTime = computed(() => {
  const successfulQueries = queryHistory.value.filter(q => q.status === 'success');
  if (successfulQueries.length === 0) return 0;
  const total = successfulQueries.reduce((sum, q) => sum + q.executionTime, 0);
  return total / successfulQueries.length;
});

const filteredQueries = computed(() => {
  let filtered = queryHistory.value;
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(q => 
      q.sql.toLowerCase().includes(query) ||
      q.connectionName.toLowerCase().includes(query)
    );
  }
  
  // 类型过滤
  if (filterType.value !== 'all') {
    filtered = filtered.filter(q => q.type === filterType.value);
  }
  
  // 快速筛选
  switch (activeFilter.value) {
    case 'recent':
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(q => q.timestamp >= today);
      break;
    case 'favorites':
      filtered = filtered.filter(q => q.isFavorite);
      break;
    case 'slow':
      filtered = filtered.filter(q => q.executionTime > 2000);
      break;
    case 'failed':
      filtered = filtered.filter(q => q.status === 'failed');
      break;
  }
  
  // 按时间倒序
  return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
});

const totalPages = computed(() => 
  Math.ceil(filteredQueries.value.length / pageSize.value)
);

const paginatedQueries = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredQueries.value.slice(start, end);
});

// 方法
function handleSearch() {
  currentPage.value = 1;
}

function filterQueries() {
  currentPage.value = 1;
}

function setActiveFilter(filter: string) {
  activeFilter.value = filter;
  currentPage.value = 1;
}

function toggleExpand(queryId: string) {
  expandedQuery.value = expandedQuery.value === queryId ? null : queryId;
  activeDetailTab.value = 'sql';
}

function toggleFavorite(query: any) {
  query.isFavorite = !query.isFavorite;
  // 这里可以调用API更新收藏状态
}

function executeQuery(query: any) {
  console.log('执行查询:', query);
  // 这里应该跳转到SQL编辑器并加载查询
}

function copyQuery(query: any) {
  copySql(query.sql);
}

function copySql(sql: string) {
  navigator.clipboard.writeText(sql).then(() => {
    // 这里可以显示复制成功提示
    console.log('SQL已复制到剪贴板');
  });
}

function deleteQuery(query: any) {
  const index = queryHistory.value.findIndex(q => q.id === query.id);
  if (index > -1) {
    queryHistory.value.splice(index, 1);
    // 这里可以调用API删除记录
  }
}

function truncateSql(sql: string, maxLength = 80): string {
  if (sql.length <= maxLength) return sql;
  return sql.substring(0, maxLength) + '...';
}

function formatTime(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return timestamp.toLocaleDateString('zh-CN');
}

function getExecutionTimeClass(time: number): string {
  if (time < 100) return 'fast';
  if (time < 1000) return 'normal';
  if (time < 2000) return 'slow';
  return 'very-slow';
}

function confirmClearHistory() {
  showClearConfirm.value = true;
}

function clearHistory() {
  queryHistory.value = [];
  showClearConfirm.value = false;
  currentPage.value = 1;
}

function exportHistory() {
  const data = filteredQueries.value.map(q => ({
    时间: q.timestamp.toLocaleString('zh-CN'),
    类型: q.type,
    连接: q.connectionName,
    执行时间: q.executionTime + 'ms',
    状态: q.status,
    SQL: q.sql
  }));
  
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `query_history_${new Date().getTime()}.csv`;
  link.click();
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

// 生命周期
onMounted(() => {
  // 加载查询历史数据
});
</script>

<style scoped>
.query-history {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.history-header {
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

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 0.75rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.search-box input {
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  width: 250px;
}

.search-box input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
}

.btn-clear-history {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border: 1px solid #ef4444;
  border-radius: 8px;
  background: white;
  color: #ef4444;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-history:hover {
  background: #ef4444;
  color: white;
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* 统计卡片 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
}

/* 快速筛选 */
.quick-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  background: white;
  color: #6b7280;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tag:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.filter-tag.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

/* 查询列表 */
.queries-list {
  flex: 1;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.list-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.list-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-export {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border: 1px solid #667eea;
  border-radius: 8px;
  background: white;
  color: #667eea;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-export:hover {
  background: #667eea;
  color: white;
}

.query-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.query-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.query-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.query-item.failed {
  border-left: 4px solid #ef4444;
}

.query-item.slow {
  border-left: 4px solid #f59e0b;
}

.query-item.expanded {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.query-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.query-header:hover {
  background: #f8fafc;
}

.query-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.query-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

.query-type-badge.select { background: #3b82f6; }
.query-type-badge.insert { background: #10b981; }
.query-type-badge.update { background: #f59e0b; }
.query-type-badge.delete { background: #ef4444; }
.query-type-badge.create { background: #8b5cf6; }
.query-type-badge.alter { background: #06b6d4; }
.query-type-badge.drop { background: #dc2626; }

.query-summary {
  flex: 1;
  min-width: 0;
}

.query-text {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  color: #374151;
  display: block;
}

.query-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.execution-time {
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.execution-time.fast { color: #10b981; background: #d1fae5; }
.execution-time.normal { color: #3b82f6; background: #dbeafe; }
.execution-time.slow { color: #f59e0b; background: #fef3c7; }
.execution-time.very-slow { color: #ef4444; background: #fee2e2; }

.query-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.query-actions button {
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.query-actions button:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.btn-favorite.active {
  background: #fbbf24;
  border-color: #fbbf24;
  color: white;
}

.btn-execute:hover {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.btn-copy:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.btn-delete:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}

.query-details {
  border-top: 1px solid #e5e7eb;
  background: #fafbfc;
}

.details-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: #374151;
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.details-content {
  padding: 1.25rem;
}

.detail-panel {
  min-height: 100px;
}

.sql-editor {
  position: relative;
  background: #1e293b;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.sql-editor pre {
  margin: 0;
  color: #e2e8f0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.btn-copy-sql {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy-sql:hover {
  background: rgba(255, 255, 255, 0.2);
}

.result-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.result-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.result-preview {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
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
  border-bottom: 1px solid #e5e7eb;
}

.preview-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
}

.error-message i {
  font-size: 1.25rem;
  color: #ef4444;
  margin-top: 0.125rem;
}

.error-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.error-content pre {
  margin: 0;
  background: #fee2e2;
  padding: 0.75rem;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
}

.execution-plan {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.execution-plan pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  color: #374151;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.pagination button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
}

.modal-close:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0;
  color: #374151;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-confirm {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

.btn-confirm {
  background: #ef4444;
  border: none;
  color: white;
}

.btn-confirm:hover {
  background: #dc2626;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .history-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-controls {
    flex-wrap: wrap;
  }
  
  .search-box input {
    width: 100%;
  }
  
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-filters {
    justify-content: center;
  }
  
  .query-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .query-info {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .query-meta {
    justify-content: space-between;
  }
  
  .query-actions {
    justify-content: center;
  }
  
  .details-tabs {
    overflow-x: auto;
  }
  
  .tab-btn {
    flex-shrink: 0;
  }
}

@media (max-width: 480px) {
  .history-content {
    padding: 1rem;
  }
  
  .stats-section {
    grid-template-columns: 1fr;
  }
  
  .list-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .result-info {
    grid-template-columns: 1fr;
  }
}
</style>