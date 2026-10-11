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
