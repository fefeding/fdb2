import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 获取应用数据目录路径
 * 优先级: DB_TOOL_DATA_DIR 环境变量 > 用户主目录/.fdb2
 */
export function getDataDir(): string {
  const envDataDir = process.env.DB_TOOL_DATA_DIR;
  if (envDataDir) {
    return envDataDir;
  }
  return path.join(os.homedir(), '.fdb2');
}

/**
 * 获取数据文件的完整路径
 * @param filename 文件名（可以包含子目录）
 */
export function getDataPath(filename: string): string {
  return path.join(getDataDir(), filename);
}

/**
 * 确保数据目录存在，如果不存在则创建
 */
export function ensureDataDir(): void {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * 修复数据目录权限（仅在 Unix-like 系统上）
 */
export function fixPermissions(): void {
  if (process.platform !== 'win32') {
    const dataDir = getDataDir();
    try {
      fs.chmodSync(dataDir, 0o700);
    } catch (error) {
      console.warn('Failed to set permissions on data directory:', error);
    }
  }
}