/**
 * WebView 全局错误捕获。
 *
 * 目的：webview 内部抛出的错误默认只进 webview 的 DevTools Console，
 * 既不会出现在 VSCode「输出」面板，也不会进调试控制台，排障时极难发现。
 * 这里把它们集中：
 *   1) 打到面板浮层（即使 Vue 没挂载也能看到）；
 *   2) 通过消息桥转发到扩展宿主的 “Database Tool” 输出通道。
 *
 * 引入方式：作为入口文件的「第一个 import」，保证监听器先于其它模块求值安装，
 * 从而也能捕获后续模块在求值阶段抛出的错误。
 */
import { getVSCodeBridge } from './bridge';

let installed = false;
let overlayShown = false;

function showOverlay(title: string, detail: string): void {
  if (overlayShown || typeof document === 'undefined') return;
  overlayShown = true;
  try {
    const el = document.createElement('div');
    el.setAttribute('data-webview-error', '1');
    el.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;background:#1e1e1e;color:#e06c75;' +
      'font:12px/1.55 ui-monospace,Menlo,Consolas,monospace;padding:16px;' +
      'overflow:auto;white-space:pre-wrap;box-sizing:border-box;';
    el.textContent =
      'Webview 运行错误（同时已写入扩展 “Database Tool” 输出通道，可在 VSCode「输出」面板查看）:\n\n' +
      title +
      '\n\n' +
      detail;
    document.body.appendChild(el);
  } catch {
    /* 极端情况忽略 */
  }
}

/** 统一上报：打 console + 转发扩展 + 浮层 */
export function reportError(title: string, detail: string): void {
  const text = `${title}\n${detail}`;
  // eslint-disable-next-line no-console
  console.error('[webview error]', text);
  try {
    getVSCodeBridge().postMessage({ command: 'log', level: 'error', message: text });
  } catch {
    /* 非 VSCode 环境忽略 */
  }
  showOverlay(title, detail);
}

/** 给 Vue 应用挂载 errorHandler（捕获渲染/生命周期错误） */
export function setVueErrorHandler(app: any): void {
  app.config.errorHandler = (err: any, _instance: any, info: string) => {
    const msg = err?.message || String(err);
    const stack = err?.stack || '';
    reportError(`[vue] ${msg} (${info || 'render'})`, stack);
  };
}

function install(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e: any) => {
    const detail = `${e?.error?.stack || ''}\nsource: ${e?.filename || ''}:${e?.lineno || ''}:${e?.colno || ''}`;
    reportError(e?.message || 'Script error', detail);
  });

  window.addEventListener('unhandledrejection', (e: any) => {
    const r = e?.reason || {};
    reportError('Unhandled promise rejection', `${r?.message || r}\n${r?.stack || ''}`);
  });
}

install();
