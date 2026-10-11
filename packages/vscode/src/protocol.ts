// 宿主 <-> Webview 消息协议（与 src/platform/vscode 前端 Vue 面板约定一致）。

/** Webview 发送给宿主的消息 */
export type WebviewMessage =
  | { command: 'ready' }
  | { command: 'getConnections' }
  | { command: 'addConnection'; data: any }
  | { command: 'updateConnection'; data: any }
  | { command: 'deleteConnection'; data: { id: string } }
  | { command: 'testConnection'; data: any }
  | { command: 'getDatabases'; data: { id: string } }
  | { command: 'getTables'; data: { id: string; database: string } }
  | { command: 'getViews'; data: { id: string; database: string } }
  | { command: 'getTableData'; data: { id: string; database: string; table: string; page?: number; pageSize?: number; where?: string; orderBy?: string } }
  | { command: 'getTableInfo'; data: { id: string; database: string; table: string } }
  | { command: 'executeQuery'; data: { id: string; sql: string; database?: string } }
  | { command: 'refreshTree' }
  | { command: 'close' }
  | { command: 'pickSaveFolder'; id: number; data?: { defaultUri?: string } }
  // 文件通道：webview 内 <a download> 不落盘，统一由宿主 showSaveDialog + workspace.fs 写文件
  | { command: 'saveFile'; id: number; data: { filename: string; content?: string; base64?: string; filters?: Record<string, string[]> } }
  | { command: 'openPath'; data: { path: string; reveal?: boolean } }
  | { command: 'showExportedFile'; data: { path: string } };

/** 宿主发送给 Webview 的消息 */
export type HostMessage =
  | { command: 'connections'; data: any[] }
  | { command: 'saved' }
  | { command: 'testResult'; data: { success: boolean; message?: string } }
  | { command: 'databases'; data: any[] }
  | { command: 'tables'; data: any[] }
  | { command: 'views'; data: any[] }
  | { command: 'tableData'; data: { columns: string[]; rows: any[][]; total: number; page: number; pageSize: number } }
  | { command: 'tableInfo'; data: any }
  | { command: 'queryResult'; data: { columns: string[]; rows: any[][]; rowCount: number; executionTime: number; message?: string } }
  | { command: 'error'; data: string }
  | { command: 'editConnection'; data: any }
  | { command: 'selectConnection'; data: { id: string } }
  | { command: 'init'; data: any }
  | { command: 'pickSaveFolderResult'; id: number; data: { path: string | null } }
  | { command: 'saveFileResult'; id: number; data: { path: string | null; cancelled?: boolean; error?: string } }
  | { command: 'navigate'; data: Record<string, string> }
  // 主题变化通知（同为深色/浅色的两个主题互相切换时 body 类名不变，需显式通知重绘）
  | { command: 'themeChanged' };

/**
 * 将后端返回的结果（数组对象 / 数组数组 / 标量）统一规范化为 { columns, rows } 结构。
 */
export function normalizeResult(data: any): { columns: string[]; rows: any[][] } {
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
      const columns = Object.keys(data[0]);
      const rows = data.map((r) => columns.map((c) => (r ? r[c] : null)));
      return { columns, rows };
    }
    if (data.length > 0 && Array.isArray(data[0])) {
      const n = data[0].length;
      const columns = Array.from({ length: n }, (_, i) => `column${i + 1}`);
      return { columns, rows: data as any[][] };
    }
    return { columns: ['result'], rows: data.map((r) => [r]) };
  }
  return { columns: ['result'], rows: [[data]] };
}

/**
 * 规范化 executeQuery 的结果。SELECT 返回行集；写操作返回 OkPacket 等对象。
 */
export function normalizeQueryResult(
  res: any,
  executionTime: number
): { columns: string[]; rows: any[][]; rowCount: number; executionTime: number; message?: string } {
  if (Array.isArray(res)) {
    const { columns, rows } = normalizeResult(res);
    return { columns, rows, rowCount: rows.length, executionTime };
  }
  // 非数组：INSERT/UPDATE/DELETE 等写操作，或单值
  if (res && typeof res === 'object') {
    const affectedRows = (res as any).affectedRows;
    const insertId = (res as any).insertId;
    if (affectedRows !== undefined || insertId !== undefined) {
      return {
        columns: ['affectedRows', 'insertId', 'message'],
        rows: [[affectedRows ?? 0, insertId ?? '', (res as any).message || '']],
        rowCount: 1,
        executionTime,
        message: `影响行数: ${affectedRows ?? 0}`
      };
    }
    const { columns, rows } = normalizeResult(res);
    return { columns, rows, rowCount: rows.length, executionTime };
  }
  return {
    columns: ['result'],
    rows: [[String(res)]],
    rowCount: 1,
    executionTime,
    message: 'OK'
  };
}
