import * as vscode from 'vscode';

/**
 * 连接树节点的「数据库类型徽章」图标。
 *
 * VSCode 树视图的 ThemeIcon 无法按类型着色（所有数据库都会显示成同一个 database 图标），
 * 这里用内联 SVG（data URI）绘制圆角方块 + 字母的徽章，配色与 web 端数据库浏览器一致。
 *
 * 为什么用 data URI：TreeItem.iconPath 支持 Uri，data URI 无需落盘临时文件，
 * 在扩展宿主内零 IO、随用随生成，且不会污染 .vscodeignore / 打包产物。
 */

interface Badge {
  letter: string;
  color: string;
  /** 徽章文字颜色：默认白色；浅色底（如 ClickHouse 黄）需要用深色字保证可读 */
  text?: string;
}

const BADGES: Record<string, Badge> = {
  mysql: { letter: 'M', color: '#00758F' },
  postgres: { letter: 'P', color: '#336791' },
  postgresql: { letter: 'P', color: '#336791' },
  cockroachdb: { letter: 'CR', color: '#6933FF' },
  oracle: { letter: 'O', color: '#F80000' },
  mssql: { letter: 'MS', color: '#CC2927' },
  sqlserver: { letter: 'MS', color: '#CC2927' },
  mongodb: { letter: 'MG', color: '#4FAA41' },
  clickhouse: { letter: 'CH', color: '#FFCC01', text: '#1A1A1A' },
  sqlite: { letter: 'S', color: '#0F80CC' },
  sap: { letter: 'H', color: '#008FD3' },
  'sap-hana': { letter: 'H', color: '#008FD3' },
  saphana: { letter: 'H', color: '#008FD3' }
};

/** 未知类型的兜底徽章 */
const FALLBACK: Badge = { letter: 'D', color: '#6E7681' };

const cache = new Map<string, vscode.Uri>();

/** 生成（并缓存）某个数据库类型的徽章图标 */
export function dbBadgeIcon(type?: string): vscode.Uri {
  const t = (type || '').toLowerCase();
  const hit = cache.get(t);
  if (hit) return hit;

  // 未登记的类型：取类型首字母，而不是所有未知类型都显示同一个字母
  const badge = BADGES[t] || {
    letter: (type || 'D').trim().charAt(0).toUpperCase() || 'D',
    color: FALLBACK.color
  };
  const text = badge.text || '#FFFFFF';
  // 两个字母时缩小字号避免溢出圆角方块
  const fontSize = badge.letter.length > 1 ? 7 : 9;
  const svg =
    `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="1" y="1" width="14" height="14" rx="3.5" fill="${badge.color}"/>` +
    `<text x="8" y="11.5" font-family="'Segoe UI',Helvetica,Arial,sans-serif" font-size="${fontSize}" ` +
    `font-weight="700" fill="${text}" text-anchor="middle">${badge.letter}</text>` +
    `</svg>`;
  const uri = vscode.Uri.parse('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'));
  cache.set(t, uri);
  return uri;
}
