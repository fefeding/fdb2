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
