// 在任何 server 模块导入之前，先配置好数据目录与环境变量。
// server 顶层会 new ConnectionService()，其构造时即读取 DB_TOOL_DATA_DIR，
// 因此本文件必须在 extension.ts 的其他 import（间接引入 server）之前执行。
import 'reflect-metadata';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

// 允许用户通过 settings.json 的 dbtool.dataDir 覆盖；否则落到用户主目录下的 .vscode-db-tool。
function resolveDataDir(): string {
  let cfg = '';
  try {
    cfg = vscode.workspace.getConfiguration('dbtool').get<string>('dataDir') || '';
  } catch {
    /* 在极少数尚无 vscode 上下文的场景下忽略 */
  }
  if (cfg && cfg.trim()) return cfg.trim();
  if (process.env.DB_TOOL_DATA_DIR) return process.env.DB_TOOL_DATA_DIR;
  return path.join(os.homedir(), '.vscode-db-tool');
}

if (!process.env.DB_TOOL_DATA_DIR) {
  process.env.DB_TOOL_DATA_DIR = resolveDataDir();
}

export {};
