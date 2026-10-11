/**
 * VSCode webview 下的 API 传输层：
 * 把 src/service/base.ts 的 request() 转为带 requestId 的 webview 消息往返，
 * 由扩展宿主调用 server 的 handleDatabaseRoutes 后回包。
 * 响应格式与桌面端 vite dev server 保持一致：{ ret, msg, data }。
 */
import { getVSCodeBridge } from './bridge';

// 由 vite.config.vscode.ts 的 define 注入；桌面端构建中未定义（typeof 守卫保证运行时安全）
declare const __VS_CODE_ENV__: boolean;

let seq = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
let installed = false;

/**
 * 是否运行在 VSCode webview 构建中。
 * 注意：不能用 base/detect 的 isVSCode——桌面端若从 VSCode 终端启动会带上 VSCODE_PID 而误判。
 */
export function isVscodeWebview(): boolean {
  return typeof __VS_CODE_ENV__ !== 'undefined' && !!__VS_CODE_ENV__;
}

function installListener(): void {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    window.addEventListener('message', (event) => {
        const m = event.data;
        if (!m || m.command !== 'apiResponse' || typeof m.id !== 'number') return;
        const p = pending.get(m.id);
        if (!p) return;
        pending.delete(m.id);
        p.resolve(m.body);
    });
}

/**
 * 发送 API 请求到扩展宿主，resolve 为 { ret, msg, data } 包装体（与桌面端 HTTP 响应体一致）。
 */
export function vscodeApiRequest(path: string, data?: any): Promise<any> {
    installListener();
    const id = ++seq;
    return new Promise((resolve, reject) => {
        pending.set(id, {
            resolve,
            reject: (e) => {
                resolve(undefined);
                void e;
            }
        });
        // 数据可能含 Vue Proxy，先序列化为纯对象
        const plain = data != null ? JSON.parse(JSON.stringify(data)) : {};
        getVSCodeBridge().postMessage({ command: 'apiRequest', id, path, data: plain });
        // 超时兜底（60s），避免 UI 永久 pending
        setTimeout(() => {
            if (pending.has(id)) {
                pending.delete(id);
                resolve({ ret: 504, msg: '请求超时: ' + path });
            }
        }, 60000);
    });
}

// ---------------- 保存文件（webview 内 <a download> 不生效，改由宿主写盘） ----------------

let saveFileSeq = 0;
const saveFilePending = new Map<number, { resolve: (v: string | null) => void }>();
let saveFileInstalled = false;

function installSaveFileListener(): void {
  if (saveFileInstalled || typeof window === 'undefined') return;
  saveFileInstalled = true;
  window.addEventListener('message', (event) => {
    const m = event.data;
    if (!m || m.command !== 'saveFileResult' || typeof m.id !== 'number') return;
    const p = saveFilePending.get(m.id);
    if (!p) return;
    saveFilePending.delete(m.id);
    p.resolve(m.data?.path ?? null);
  });
}

export interface VscodeSaveFileOptions {
  filename: string;
  /** 文本内容（与 base64 二选一） */
  content?: string;
  /** 二进制内容的 base64（xlsx 等） */
  base64?: string;
  /** 保存对话框的文件类型过滤，如 { 'CSV 文件': ['csv'] } */
  filters?: Record<string, string[]>;
}

/** 弹出保存对话框并由宿主写文件，返回最终路径；用户取消或失败返回 null。 */
export function vscodeSaveFile(opts: VscodeSaveFileOptions): Promise<string | null> {
  installSaveFileListener();
  const bridge = getVSCodeBridge();
  if (!bridge.isVSCodeEnvironment()) return Promise.resolve(null);
  const id = ++saveFileSeq;
  return new Promise((resolve) => {
    saveFilePending.set(id, { resolve });
    bridge.postMessage({ command: 'saveFile', id, data: opts });
    // 用户可能长时间停留在保存对话框，超时给 5 分钟
    setTimeout(() => {
      if (saveFilePending.has(id)) {
        saveFilePending.delete(id);
        resolve(null);
      }
    }, 300000);
  });
}

/** 用宿主打开已导出的文件；reveal=true 时在文件管理器中定位 */
export function vscodeOpenPath(path: string, reveal = false): void {
  if (!path) return;
  getVSCodeBridge().postMessage({ command: 'openPath', data: { path, reveal } });
}

/** 通知宿主"导出完成"，由宿主弹出带「打开 / 在资源管理器中显示」的提示 */
export function vscodeNotifyExported(path: string): void {
  if (!path) return;
  getVSCodeBridge().postMessage({ command: 'showExportedFile', data: { path } });
}

/** Blob -> base64（二进制导出需要） */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('read blob failed'));
    reader.readAsDataURL(blob);
  });
}

// ---------------- 选择保存文件夹 ----------------

let saveFolderSeq = 0;
const saveFolderPending = new Map<number, { resolve: (v: string | null) => void }>();
let saveFolderInstalled = false;

function installSaveFolderListener(): void {
    if (saveFolderInstalled || typeof window === 'undefined') return;
    saveFolderInstalled = true;
    window.addEventListener('message', (event) => {
        const m = event.data;
        if (!m || m.command !== 'pickSaveFolderResult' || typeof m.id !== 'number') return;
        const p = saveFolderPending.get(m.id);
        if (!p) return;
        saveFolderPending.delete(m.id);
        p.resolve(m.data?.path ?? null);
    });
}

/**
 * 在 VSCode 环境中弹出系统文件夹选择器，返回用户选中的目录路径（绝对路径）。
 * 非 VSCode 环境直接 resolve(null)，调用方据此跳过（沿用后端默认目录）。
 * 用户取消选择也返回 null。
 */
export function vscodePickSaveFolder(defaultUri?: string): Promise<string | null> {
    installSaveFolderListener();
    const bridge = getVSCodeBridge();
    if (!bridge.isVSCodeEnvironment()) {
        return Promise.resolve(null);
    }
    const id = ++saveFolderSeq;
    return new Promise((resolve) => {
        saveFolderPending.set(id, { resolve });
        bridge.postMessage({
            command: 'pickSaveFolder',
            id,
            data: defaultUri ? { defaultUri } : {}
        });
        // 超时兜底（120s）
        setTimeout(() => {
            if (saveFolderPending.has(id)) {
                saveFolderPending.delete(id);
                resolve(null);
            }
        }, 120000);
    });
}
