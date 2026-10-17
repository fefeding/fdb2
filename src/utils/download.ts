/**
 * 文本文件保存工具。
 *
 * 桌面端（浏览器）用 Blob + <a download> 直接下载；
 * VSCode webview 里 <a download> 不会落盘（沙箱吞掉），
 * 统一交给宿主：saveFile → showSaveDialog + workspace.fs 写文件。
 */
import { getVSCodeBridge, isVSCodeEnvironment } from '@/platform/vscode/bridge';

let seq = 0;

export interface SaveResult {
  /** 落盘路径（仅 webview 宿主侧返回） */
  path?: string;
  /** 用户在保存对话框里取消了 */
  cancelled?: boolean;
}

/**
 * 保存文本内容为文件。
 * @param filename 建议文件名（含扩展名）
 * @param content  文本内容
 * @param filters  保存对话框的扩展名过滤，如 { SQL: ['sql'] }
 */
export async function saveTextFile(
  filename: string,
  content: string,
  filters?: Record<string, string[]>
): Promise<SaveResult> {
  if (isVSCodeEnvironment()) {
    return saveViaHost(filename, content, filters);
  }
  downloadInBrowser(filename, content);
  return {};
}

function downloadInBrowser(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 立即 revoke 在部分浏览器上会中断下载，延后一拍
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 走宿主保存：saveFile → saveFileResult（按 id 配对）。
 *
 * 直接挂一次性 window 监听而不用 bridge.onMessage：
 * 后者只加不移，反复保存会累积无效的监听器。
 * 同样不做 origin 过滤（与 bridge.onMessage 保持一致）。
 */
function saveViaHost(
  filename: string,
  content: string,
  filters?: Record<string, string[]>
): Promise<SaveResult> {
  const bridge = getVSCodeBridge();
  const id = ++seq;

  return new Promise<SaveResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('保存文件超时'));
    }, 120_000);

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || msg.command !== 'saveFileResult' || msg.id !== id) return;
      window.removeEventListener('message', handler);
      clearTimeout(timer);

      const data = msg.data || {};
      if (data.error) {
        reject(new Error(data.error));
      } else {
        resolve({ path: data.path || undefined, cancelled: !!data.cancelled });
      }
    };

    window.addEventListener('message', handler);
    bridge.postMessage({ command: 'saveFile', id, data: { filename, content, filters } });
  });
}
