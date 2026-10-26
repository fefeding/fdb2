/**
 * VS Code webview 内 navigator.clipboard 常被 CSP / 权限限制，writeText 静默失败，
 * 导致 CodeMirror、复制按钮等基于它的复制操作失效。
 *
 * 该 polyfill 在保留原生实现的前提下，把 writeText 兜底为
 * 隐藏 textarea + document.execCommand('copy')，对 readText 也做最小兜底。
 * 仅应在 webview 入口调用（桌面端浏览器原生实现已正常，无需覆盖）。
 */
function execCopy(text: string): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
  } catch {
    /* 忽略：部分环境下 execCommand 亦被禁用，但已尽力兜底 */
  } finally {
    document.body.removeChild(ta);
  }
}

export function installClipboardPolyfill(): void {
  if (typeof navigator === 'undefined' || !navigator) return;
  const original: any = (navigator as any).clipboard;

  if (!original) {
    (navigator as any).clipboard = {
      writeText: async (text: string) => execCopy(text),
      readText: async () => ''
    };
    return;
  }

  (navigator as any).clipboard = {
    ...original,
    writeText: async (text: string) => {
      try {
        if (window.isSecureContext && typeof original.writeText === 'function') {
          await original.writeText(text);
          return;
        }
      } catch {
        /* 原生失败时退回到 execCommand 兜底 */
      }
      execCopy(text);
    },
    readText: async () => {
      try {
        if (window.isSecureContext && typeof original.readText === 'function') {
          return await original.readText();
        }
      } catch {
        /* 忽略 */
      }
      return '';
    }
  };
}
