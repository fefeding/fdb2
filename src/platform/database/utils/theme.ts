// 主题探测：VSCode webview 由宿主维护 body 上的 vscode-light / vscode-dark / vscode-high-contrast 类，
// 桌面端（Electron/浏览器）统一为「编辑器深色」主题（见 database.css 的 body.platform-desktop 块），
// 不再跟随 OS 的 prefers-color-scheme，否则会出现「CSS 深色 + JS 浅色」的错配。
// 纯 CSS 能覆盖的部分由 --db-* 令牌处理，这里供 JS 侧（ECharts / CodeMirror 等）使用。

export function isDarkTheme(): boolean {
  if (typeof document === 'undefined') return false;
  const cls = document.body?.classList;
  if (cls && (cls.contains('vscode-light') || cls.contains('vscode-dark') || cls.contains('vscode-high-contrast'))) {
    return cls.contains('vscode-dark') || cls.contains('vscode-high-contrast');
  }
  if (cls?.contains('platform-desktop')) return true;
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/** 监听主题变化（webview 切主题 / OS 切深色），返回取消函数 */
export function onThemeChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  let disposed = false;
  const off: Array<() => void> = [];

  if (typeof MutationObserver !== 'undefined' && document.body) {
    let last = isDarkTheme();
    const observer = new MutationObserver(() => {
      const now = isDarkTheme();
      if (now !== last) {
        last = now;
        cb();
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    off.push(() => observer.disconnect());
  }

  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (mq?.addEventListener) {
    const handler = () => !disposed && cb();
    mq.addEventListener('change', handler);
    off.push(() => mq.removeEventListener('change', handler));
  }

  // 宿主主动通知：同为深色（或同为浅色）的两个主题之间切换时 body 类名不变，
  // 只有这条消息能触发重绘（扩展宿主监听 onDidChangeActiveColorTheme 下发）
  const onMsg = (event: MessageEvent) => {
    if (!disposed && event.data?.command === 'themeChanged') cb();
  };
  window.addEventListener('message', onMsg);
  off.push(() => window.removeEventListener('message', onMsg));

  return () => {
    disposed = true;
    off.forEach((fn) => fn());
  };
}

/** 读取 --db-* 令牌的实际取值（跟随 CSS 主题，避免在 JS 里重复维护一套色板） */
export function themeColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined' || !document.body) return fallback;
  const v = getComputedStyle(document.body).getPropertyValue(varName);
  return (v && v.trim()) || fallback;
}

/**
 * ECharts 的文字/轴线/网格/Tooltip 配色。
 * 图表是 canvas 绘制，不吃 CSS 变量，必须显式传色，否则默认深色文字在暗底上几乎不可见。
 */
export function chartTheme() {
  const isDark = isDarkTheme();
  const text = themeColor('--db-dark-color', isDark ? '#e2e8f0' : '#1e293b');
  const subText = themeColor('--db-text-muted', isDark ? '#8296ab' : '#64748b');
  const axis = themeColor('--db-border', isDark ? '#475569' : '#e2e8f0');
  const split = themeColor('--db-border-soft', isDark ? '#3d4a59' : '#e9ecef');
  const surface = themeColor('--db-surface', isDark ? '#1e293b' : '#ffffff');
  return {
    isDark,
    textStyle: { color: text },
    tooltip: {
      backgroundColor: surface,
      borderColor: axis,
      textStyle: { color: text }
    },
    axisLabel: { fontSize: 12, color: subText },
    axisLine: { lineStyle: { color: axis } },
    splitLine: { lineStyle: { color: split } },
    legend: { textStyle: { color: subText } }
  };
}
