// 数据导出工具函数
import { exportToExcel } from '@/utils/xlsx';

// 导出为Excel
export async function exportDataToExcel(
  data: Array<any>,
  headers: Record<string, string> = {},
  filename: string = 'export.xlsx'
) {
  if (data.length === 0) {
    console.warn('没有数据可导出');
    return;
  }

  // 如果没有提供headers，则使用第一行的键作为header
  if (Object.keys(headers).length === 0 && data.length > 0) {
    data[0].forEach((value: any, key: string) => {
      headers[key] = key;
    });
  }

  const blob = await exportToExcel(data, headers);
  downloadFile(blob, filename);
}

// 导出为CSV
export function exportDataToCSV(
  data: Array<any>,
  headers: Record<string, string> = {},
  filename: string = 'export.csv'
) {
  if (data.length === 0) {
    console.warn('没有数据可导出');
    return;
  }

  // 如果没有提供headers，则使用第一行的键作为header
  if (Object.keys(headers).length === 0 && data.length > 0) {
    const firstRow = data[0];
    Object.keys(firstRow).forEach(key => {
      headers[key] = key;
    });
  }

  // 构建CSV内容
  const headerRow = Object.values(headers);
  const rows = data.map(row => 
    Object.keys(headers).map(key => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      // 处理包含逗号、引号或换行符的字段
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
  );

  const csvContent = [
    headerRow.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  downloadFile(blob, filename);
}

// 导出为JSON
export function exportDataToJSON(
  data: Array<any>,
  filename: string = 'export.json'
) {
  if (data.length === 0) {
    console.warn('没有数据可导出');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { 
    type: 'application/json;charset=utf-8;' 
  });
  downloadFile(blob, filename);
}

// 导出为SQL
export function exportDataToSQL(
  data: Array<any>,
  tableName: string,
  headers: Record<string, string> = {},
  filename: string = 'export.sql'
) {
  if (data.length === 0) {
    console.warn('没有数据可导出');
    return;
  }

  // 如果没有提供headers，则使用第一行的键作为header
  if (Object.keys(headers).length === 0 && data.length > 0) {
    const firstRow = data[0];
    Object.keys(firstRow).forEach(key => {
      headers[key] = key;
    });
  }

  const columns = Object.keys(headers);
  const values = data.map(row => 
    '(' + columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'boolean') return value ? '1' : '0';
      if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }).join(', ') + ')'
  ).join(',\n');

  const sqlContent = `-- Generated at ${new Date().toLocaleString()}\n`;
  const sqlInsert = `INSERT INTO ${tableName} (${columns.join(', ')})\nVALUES\n${values};`;

  const blob = new Blob([sqlContent + sqlInsert], { 
    type: 'text/plain;charset=utf-8;' 
  });
  downloadFile(blob, filename);
}

// 通用的文件下载函数
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 格式化文件名，添加时间戳
export function formatFileName(baseName: string, extension: string): string {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  return `${baseName}_${timestamp}.${extension}`;
}

// 获取导出文件的内容类型
export function getExportMimeType(format: 'excel' | 'csv' | 'json' | 'sql'): string {
  const mimeTypes = {
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv;charset=utf-8;',
    json: 'application/json;charset=utf-8;',
    sql: 'text/plain;charset=utf-8;'
  };
  return mimeTypes[format];
}

// 验证导出数据
export function validateExportData(data: any[]): { valid: boolean; error?: string } {
  if (!Array.isArray(data)) {
    return { valid: false, error: '导出数据必须是数组' };
  }
  
  if (data.length === 0) {
    return { valid: false, error: '没有数据可导出' };
  }
  
  // 检查数据结构是否一致
  if (data.length > 1) {
    const firstKeys = Object.keys(data[0]);
    for (let i = 1; i < data.length; i++) {
      const currentKeys = Object.keys(data[i]);
      if (JSON.stringify(firstKeys.sort()) !== JSON.stringify(currentKeys.sort())) {
        return { 
          valid: false, 
          error: `数据结构不一致，第1行有 ${firstKeys.length} 个字段，第${i + 1}行有 ${currentKeys.length} 个字段` 
        };
      }
    }
  }
  
  return { valid: true };
}

// 自动检测并生成表头映射
export function generateHeaders(data: any[]): Record<string, string> {
  if (data.length === 0) return {};
  
  const firstRow = data[0];
  const headers: Record<string, string> = {};
  
  Object.keys(firstRow).forEach(key => {
    // 将驼峰命名转换为更友好的显示名称
    const displayName = key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    headers[key] = displayName;
  });
  
  return headers;
}

// 分批导出大数据集
export async function exportDataInBatches(
  data: Array<any>,
  exportFunction: (batch: any[], batchIndex: number) => Promise<void>,
  batchSize: number = 1000
) {
  const totalBatches = Math.ceil(data.length / batchSize);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, data.length);
    const batch = data.slice(start, end);
    
    await exportFunction(batch, i);
    
    // 添加延迟以避免浏览器卡顿
    if (i < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}