<template>
  <div class="database-monitor">
    <div class="monitor-header">
      <div class="monitor-title">
        <i class="bi bi-activity"></i>
        <span>数据库监控</span>
      </div>
      <div class="monitor-controls">
        <select v-model="selectedConnection" class="connection-select" @change="loadMonitorData">
          <option value="">选择数据库连接</option>
          <option v-for="connection in connections" :key="connection.id" :value="connection.id">
            {{ connection.name }}
          </option>
        </select>
        <button class="btn-refresh" @click="refreshData" :disabled="!selectedConnection">
          <i class="bi bi-arrow-clockwise" :class="{ 'spin': isRefreshing }"></i>
          <span>刷新</span>
        </button>
        <div class="auto-refresh">
          <input type="checkbox" id="autoRefresh" v-model="autoRefresh" @change="toggleAutoRefresh">
          <label for="autoRefresh">自动刷新</label>
          <select v-model="refreshInterval" @change="updateRefreshInterval">
            <option value="5000">5秒</option>
            <option value="10000">10秒</option>
            <option value="30000">30秒</option>
            <option value="60000">1分钟</option>
          </select>
        </div>
      </div>
    </div>

    <div class="monitor-content" v-if="selectedConnection">
      <!-- 状态概览 -->
      <div class="status-overview">
        <div class="status-card status-connection">
          <div class="status-icon" :class="connectionStatus?.status">
            <i :class="getStatusIcon(connectionStatus?.status)"></i>
          </div>
          <div class="status-info">
            <div class="status-title">连接状态</div>
            <div class="status-value">{{ getStatusText(connectionStatus?.status) }}</div>
            <div class="status-detail">{{ connectionStatus?.uptime || '-' }}</div>
          </div>
        </div>

        <div class="status-card status-performance">
          <div class="status-icon">
            <i class="bi bi-speedometer2"></i>
          </div>
          <div class="status-info">
            <div class="status-title">响应时间</div>
            <div class="status-value">{{ connectionStatus?.responseTime || '-' }}ms</div>
            <div class="status-detail">{{ getPerformanceLevel(connectionStatus?.responseTime) }}</div>
          </div>
        </div>

        <div class="status-card status-queries">
          <div class="status-icon">
            <i class="bi bi-graph-up"></i>
          </div>
          <div class="status-info">
            <div class="status-title">活跃查询</div>
            <div class="status-value">{{ connectionStatus?.activeQueries || 0 }}</div>
            <div class="status-detail">{{ connectionStatus?.totalQueries || 0 }} 总查询</div>
          </div>
        </div>

        <div class="status-card status-storage">
          <div class="status-icon">
            <i class="bi bi-hdd"></i>
          </div>
          <div class="status-info">
            <div class="status-title">存储使用</div>
            <div class="status-value">{{ formatBytes(connectionStatus?.storageUsed) }}</div>
            <div class="status-detail">{{ formatBytes(connectionStatus?.storageTotal) }} 总容量</div>
          </div>
        </div>
      </div>

      <!-- 性能图表 -->
      <div class="charts-section">
        <div class="chart-container">
          <div class="chart-header">
            <h3>查询性能趋势</h3>
            <div class="chart-controls">
              <button 
                v-for="range in timeRanges" 
                :key="range.value"
                class="range-btn"
                :class="{ active: selectedTimeRange === range.value }"
                @click="selectedTimeRange = range.value"
              >
                {{ range.label }}
              </button>
            </div>
          </div>
          <div class="chart-content">
            <canvas ref="performanceChart" width="800" height="300"></canvas>
          </div>
        </div>

        <div class="chart-container">
          <div class="chart-header">
            <h3>连接数变化</h3>
          </div>
          <div class="chart-content">
            <canvas ref="connectionsChart" width="400" height="300"></canvas>
          </div>
        </div>
      </div>

      <!-- 慢查询列表 -->
      <div class="slow-queries-section">
        <div class="section-header">
          <h3>慢查询分析</h3>
          <button class="btn-clear" @click="clearSlowQueries" v-if="slowQueries.length > 0">
            <i class="bi bi-trash"></i>
            <span>清除记录</span>
          </button>
        </div>
        
        <div class="queries-table-wrapper">
          <table class="queries-table" v-if="slowQueries.length > 0">
            <thead>
              <tr>
                <th>时间</th>
                <th>执行时间</th>
                <th>查询类型</th>
                <th>查询语句</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="query in slowQueries" :key="query.id">
                <td>{{ formatTime(query.timestamp) }}</td>
                <td>
                  <span class="execution-time" :class="getExecutionTimeClass(query.executionTime)">
                    {{ query.executionTime }}ms
                  </span>
                </td>
                <td>
                  <span class="query-type" :class="query.type.toLowerCase()">
                    {{ query.type }}
                  </span>
                </td>
                <td class="query-sql" :title="query.sql">
                  {{ truncateSql(query.sql) }}
                </td>
                <td>
                  <button class="btn-analyze" @click="analyzeQuery(query)">
                    <i class="bi bi-search"></i>
                    分析
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="empty-state" v-else>
            <i class="bi bi-check-circle"></i>
            <p>暂无慢查询记录</p>
            <small>所有查询都在正常执行时间内完成</small>
          </div>
        </div>
      </div>

      <!-- 资源使用详情 -->
      <div class="resources-section">
        <div class="section-header">
          <h3>资源使用详情</h3>
        </div>
        
        <div class="resources-grid">
          <div class="resource-item">
            <div class="resource-label">CPU使用率</div>
            <div class="resource-value">
              <div class="resource-bar">
                <div class="resource-fill cpu" :style="{ width: resources.cpu + '%' }"></div>
              </div>
              <span>{{ resources.cpu }}%</span>
            </div>
          </div>

          <div class="resource-item">
            <div class="resource-label">内存使用率</div>
            <div class="resource-value">
              <div class="resource-bar">
                <div class="resource-fill memory" :style="{ width: resources.memory + '%' }"></div>
              </div>
              <span>{{ resources.memory }}%</span>
            </div>
          </div>

          <div class="resource-item">
            <div class="resource-label">磁盘I/O</div>
            <div class="resource-value">
              <div class="resource-bar">
                <div class="resource-fill disk" :style="{ width: resources.disk + '%' }"></div>
              </div>
              <span>{{ resources.disk }}%</span>
            </div>
          </div>

          <div class="resource-item">
            <div class="resource-label">网络带宽</div>
            <div class="resource-value">
              <div class="resource-bar">
                <div class="resource-fill network" :style="{ width: resources.network + '%' }"></div>
              </div>
              <span>{{ resources.network }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <i class="bi bi-diagram-3"></i>
      <h3>选择数据库连接开始监控</h3>
      <p>从上方选择一个数据库连接以查看实时监控数据</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { ConnectionService } from '@/service/database';
import type { ConnectionEntity } from '@/typings/database';

const connectionService = new ConnectionService();

// 响应式数据
const selectedConnection = ref('');
const connections = ref<ConnectionEntity[]>([]);
const connectionStatus = ref<any>(null);
const slowQueries = ref<any[]>([]);
const resources = ref({
  cpu: 0,
  memory: 0,
  disk: 0,
  network: 0
});

const isRefreshing = ref(false);
const autoRefresh = ref(true);
const refreshInterval = ref(10000);
const selectedTimeRange = ref('1h');
const refreshTimer = ref<any>(null);

// 图表相关
const performanceChart = ref<HTMLCanvasElement>();
const connectionsChart = ref<HTMLCanvasElement>();
const performanceChartInstance = ref<any>(null);
const connectionsChartInstance = ref<any>(null);

const timeRanges = [
  { label: '1小时', value: '1h' },
  { label: '6小时', value: '6h' },
  { label: '24小时', value: '24h' },
  { label: '7天', value: '7d' }
];

// 方法
async function loadConnections() {
  try {
    const response = await connectionService.getAllConnections();
    connections.value = response || [];
  } catch (error) {
    console.error('加载连接列表失败:', error);
  }
}

async function loadMonitorData() {
  if (!selectedConnection.value) return;
  
  isRefreshing.value = true;
  
  try {
    // 模拟数据加载
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 模拟连接状态
    connectionStatus.value = {
      status: 'online',
      uptime: '15天 3小时',
      responseTime: Math.floor(Math.random() * 50) + 10,
      activeQueries: Math.floor(Math.random() * 20) + 1,
      totalQueries: 15420,
      storageUsed: 1258291200,
      storageTotal: 10737418240
    };
    
    // 模拟慢查询
    slowQueries.value = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 5 * 60000),
        executionTime: 2450,
        type: 'SELECT',
        sql: 'SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.status = "pending" AND c.created_at > "2024-01-01"'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 15 * 60000),
        executionTime: 1890,
        type: 'UPDATE',
        sql: 'UPDATE products SET price = price * 1.1 WHERE category_id IN (SELECT id FROM categories WHERE name LIKE "%electronics%")'
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 30 * 60000),
        executionTime: 3200,
        type: 'DELETE',
        sql: 'DELETE FROM user_sessions WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) AND last_activity < DATE_SUB(NOW(), INTERVAL 7 DAY)'
      }
    ];
    
    // 模拟资源使用
    resources.value = {
      cpu: Math.floor(Math.random() * 40) + 20,
      memory: Math.floor(Math.random() * 30) + 40,
      disk: Math.floor(Math.random() * 50) + 10,
      network: Math.floor(Math.random() * 20) + 5
    };
    
    // 更新图表
    updateCharts();
    
  } catch (error) {
    console.error('加载监控数据失败:', error);
  } finally {
    isRefreshing.value = false;
  }
}

async function refreshData() {
  await loadMonitorData();
}

function toggleAutoRefresh() {
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function updateRefreshInterval() {
  if (autoRefresh.value) {
    stopAutoRefresh();
    startAutoRefresh();
  }
}

function startAutoRefresh() {
  refreshTimer.value = setInterval(() => {
    loadMonitorData();
  }, refreshInterval.value);
}

function stopAutoRefresh() {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
}

function updateCharts() {
  nextTick(() => {
    updatePerformanceChart();
    updateConnectionsChart();
  });
}

function updatePerformanceChart() {
  const canvas = performanceChart.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 简单的折线图绘制
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  const points = [];
  for (let i = 0; i < 24; i++) {
    points.push({
      x: (canvas.width / 23) * i,
      y: canvas.height - (Math.random() * 200 + 50)
    });
  }
  
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  
  ctx.stroke();
}

function updateConnectionsChart() {
  const canvas = connectionsChart.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 简单的柱状图
  const barWidth = canvas.width / 12;
  const data = Array.from({ length: 12 }, () => Math.random() * 50 + 10);
  
  ctx.fillStyle = '#10b981';
  data.forEach((value, index) => {
    const height = (value / 60) * canvas.height;
    const x = barWidth * index + 10;
    const y = canvas.height - height;
    
    ctx.fillRect(x, y, barWidth - 20, height);
  });
}

function clearSlowQueries() {
  slowQueries.value = [];
}

function analyzeQuery(query: any) {
  console.log('分析查询:', query);
  // 这里可以打开查询分析对话框
}

function getStatusIcon(status?: string): string {
  switch (status) {
    case 'online': return 'bi-check-circle';
    case 'offline': return 'bi-x-circle';
    case 'warning': return 'bi-exclamation-triangle';
    default: return 'bi-question-circle';
  }
}

function getStatusText(status?: string): string {
  switch (status) {
    case 'online': return '在线';
    case 'offline': return '离线';
    case 'warning': return '警告';
    default: return '未知';
  }
}

function getPerformanceLevel(responseTime?: number): string {
  if (!responseTime) return '-';
  if (responseTime < 50) return '优秀';
  if (responseTime < 100) return '良好';
  if (responseTime < 200) return '一般';
  return '较慢';
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatTime(timestamp: Date): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function getExecutionTimeClass(time: number): string {
  if (time < 1000) return 'good';
  if (time < 2000) return 'warning';
  return 'critical';
}

function truncateSql(sql: string, maxLength = 50): string {
  if (sql.length <= maxLength) return sql;
  return sql.substring(0, maxLength) + '...';
}

// 生命周期
onMounted(() => {
  loadConnections();
  if (autoRefresh.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.database-monitor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
}

.monitor-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #1e293b;
  font-size: 1.1rem;
}

.monitor-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.connection-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  min-width: 200px;
  font-size: 0.875rem;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-refresh .spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auto-refresh {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.auto-refresh select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
}

.monitor-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* 状态概览 */
.status-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.status-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.status-icon.online {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.status-icon.offline {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.status-icon.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.status-icon:not([class*="online"]):not([class*="offline"]):not([class*="warning"]) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.status-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.status-detail {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.chart-controls {
  display: flex;
  gap: 0.25rem;
}

.range-btn {
  padding: 0.25rem 0.75rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.range-btn:hover {
  background: #f3f4f6;
}

.range-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.chart-content {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-content canvas {
  max-width: 100%;
  max-height: 100%;
}

/* 慢查询部分 */
.slow-queries-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.btn-clear {
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

.btn-clear:hover {
  background: #ef4444;
  color: white;
}

.queries-table-wrapper {
  overflow-x: auto;
}

.queries-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.queries-table th {
  background: #f8fafc;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.queries-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.execution-time {
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.execution-time.good {
  color: #10b981;
  background: #d1fae5;
}

.execution-time.warning {
  color: #f59e0b;
  background: #fef3c7;
}

.execution-time.critical {
  color: #ef4444;
  background: #fee2e2;
}

.query-type {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  color: white;
  font-size: 0.75rem;
}

.query-type.select { background: #3b82f6; }
.query-type.insert { background: #10b981; }
.query-type.update { background: #f59e0b; }
.query-type.delete { background: #ef4444; }

.query-sql {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.8rem;
}

.btn-analyze {
  padding: 0.25rem 0.5rem;
  border: 1px solid #667eea;
  border-radius: 4px;
  background: white;
  color: #667eea;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-analyze:hover {
  background: #667eea;
  color: white;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #d1d5db;
}

.empty-state h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #374151;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

.empty-state small {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* 资源使用部分 */
.resources-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.resource-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.resource-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.resource-value {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.resource-bar {
  flex: 1;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.resource-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.resource-fill.cpu { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }
.resource-fill.memory { background: linear-gradient(90deg, #10b981, #059669); }
.resource-fill.disk { background: linear-gradient(90deg, #f59e0b, #d97706); }
.resource-fill.network { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }

.resource-value span {
  font-weight: 600;
  color: #1e293b;
  min-width: 40px;
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .status-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .monitor-controls {
    flex-wrap: wrap;
  }
  
  .connection-select {
    width: 100%;
  }
  
  .status-overview {
    grid-template-columns: 1fr;
  }
  
  .resources-grid {
    grid-template-columns: 1fr;
  }
  
  .monitor-content {
    padding: 1rem;
  }
  
  .queries-table {
    font-size: 0.75rem;
  }
  
  .queries-table th,
  .queries-table td {
    padding: 0.5rem;
  }
}
</style>