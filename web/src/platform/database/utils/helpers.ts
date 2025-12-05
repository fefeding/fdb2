// 数据库平台通用工具函数

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// 格式化时间
export function formatTime(timestamp: Date): string {
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

// 格式化日期时间
export function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 格式化执行时间
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}

// 获取执行时间状态类
export function getExecutionTimeClass(time: number): string {
  if (time < 100) return 'fast';
  if (time < 1000) return 'normal';
  if (time < 2000) return 'slow';
  return 'very-slow';
}

// 截断SQL语句
export function truncateSql(sql: string, maxLength = 80): string {
  if (sql.length <= maxLength) return sql;
  return sql.substring(0, maxLength) + '...';
}

// 格式化SQL语句
export function formatSql(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/,/g, ',\n    ')
    .replace(/\bFROM\b/gi, '\nFROM')
    .replace(/\bWHERE\b/gi, '\nWHERE')
    .replace(/\bORDER BY\b/gi, '\nORDER BY')
    .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
    .replace(/\bHAVING\b/gi, '\nHAVING')
    .replace(/\bLIMIT\b/gi, '\nLIMIT')
    .trim();
}

// 获取SQL类型
export function getSqlType(sql: string): string {
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT')) return 'SELECT';
  if (trimmed.startsWith('INSERT')) return 'INSERT';
  if (trimmed.startsWith('UPDATE')) return 'UPDATE';
  if (trimmed.startsWith('DELETE')) return 'DELETE';
  if (trimmed.startsWith('CREATE')) return 'CREATE';
  if (trimmed.startsWith('ALTER')) return 'ALTER';
  if (trimmed.startsWith('DROP')) return 'DROP';
  if (trimmed.startsWith('TRUNCATE')) return 'TRUNCATE';
  return 'OTHER';
}

// 验证SQL语句
export function validateSql(sql: string): { valid: boolean; error?: string } {
  if (!sql || sql.trim() === '') {
    return { valid: false, error: 'SQL语句不能为空' };
  }
  
  // 基本的SQL注入检查
  const dangerousPatterns = [
    /DROP\s+DATABASE/i,
    /DROP\s+TABLE/i,
    /TRUNCATE/i,
    /DELETE\s+FROM.*WHERE\s+1\s*=\s*1/i,
    /UPDATE.*SET.*WHERE\s+1\s*=\s*1/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      return { valid: false, error: '检测到潜在的危险SQL操作' };
    }
  }
  
  return { valid: true };
}

// 生成UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 深拷贝对象
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

// 复制到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (error) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

// 下载文件
export function downloadFile(content: string, filename: string, contentType = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 导出为CSV
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');
  
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

// 导出为JSON
export function exportToJSON(data: any[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

// 获取数据库类型图标
export function getDbTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    mysql: 'bi-database',
    postgres: 'bi-database',
    postgresql: 'bi-database',
    sqlite: 'bi-database',
    mssql: 'bi-database',
    sqlserver: 'bi-database',
    oracle: 'bi-database',
    mongodb: 'bi-diagram-3'
  };
  return iconMap[type.toLowerCase()] || 'bi-database';
}

// 获取数据库类型标签
export function getDbTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    mysql: 'MySQL',
    postgres: 'PostgreSQL',
    postgresql: 'PostgreSQL',
    sqlite: 'SQLite',
    mssql: 'SQL Server',
    sqlserver: 'SQL Server',
    oracle: 'Oracle',
    mongodb: 'MongoDB'
  };
  return labelMap[type.toLowerCase()] || type;
}

// 获取数据库类型样式类
export function getDbTypeClass(type: string): string {
  const classMap: Record<string, string> = {
    mysql: 'db-mysql',
    postgres: 'db-postgres',
    postgresql: 'db-postgres',
    sqlite: 'db-sqlite',
    mssql: 'db-mssql',
    sqlserver: 'db-mssql',
    oracle: 'db-oracle',
    mongodb: 'db-mongodb'
  };
  return classMap[type.toLowerCase()] || 'db-default';
}

// 计算百分比
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// 格式化数字
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 获取颜色值
export function getColorByValue(value: number, ranges: { threshold: number; color: string }[]): string {
  for (const range of ranges) {
    if (value <= range.threshold) {
      return range.color;
    }
  }
  return ranges[ranges.length - 1].color;
}

// 创建Toast通知
export function createToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="bi bi-${getToastIcon(type)}"></i>
      <span>${message}</span>
    </div>
  `;
  
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: '250px',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease'
  });
  
  document.body.appendChild(toast);
  
  // 触发动画
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // 自动移除
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

function getToastIcon(type: string): string {
  const iconMap: Record<string, string> = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };
  return iconMap[type] || 'info-circle';
}

// 数组去重
export function uniqueArray<T>(array: T[], key?: keyof T): T[] {
  if (!key) return [...new Set(array)];
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

// 数组分组
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// 数组排序
export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal === null || aVal === undefined) return direction === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return direction === 'asc' ? -1 : 1;
    
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
}

// 检查对象是否为空
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

// 合并对象
export function mergeObjects<T extends Record<string, any>>(...objects: Partial<T>[]): T {
  return objects.reduce((result, obj) => {
    return { ...result, ...obj };
  }, {} as T);
}

// 获取嵌套对象属性
export function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// 设置嵌套对象属性
export function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}