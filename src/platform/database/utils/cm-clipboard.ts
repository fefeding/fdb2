/**
 * VS Code / CodeBuddy webview 内 navigator.clipboard 常被 CSP 与权限限制，
 * CodeMirror 默认的复制/剪切（单行直接走 navigator.clipboard.writeText）会静默失败。
 * 这里用显式快捷键接管 Mod-c / Mod-x：
 *  - 有选区时直接写入剪贴板（execCommand 兜底）并（剪切时）删除选区；
 *  - 无选区时交还默认行为，由 navigator.clipboard polyfill 兜底。
 * 粘贴保持原生（浏览器 paste 事件会携带系统剪贴板数据，CodeMirror 默认处理即可），
 * 不应在此拦截 Mod-v，否则会丢失系统剪贴板内容（浏览器禁止同步读取）。
 */
import { keymap } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { copyToClipboard } from './helpers';

function copyOrCut(view: EditorView, cut: boolean): boolean {
  const { state } = view;
  const sel = state.selection.main;
  if (sel.empty) return false;
  const text = state.sliceDoc(sel.from, sel.to);
  void copyToClipboard(text);
  // 只读编辑器（如结果面板）不允许删除选区，仅复制
  if (cut && !state.facet(EditorState.readOnly)) {
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: '' },
      selection: { anchor: sel.from }
    });
  }
  return true;
}

export const clipboardKeymap = keymap.of([
  { key: 'Mod-c', preventDefault: true, run: (v: EditorView) => copyOrCut(v, false) },
  { key: 'Mod-x', preventDefault: true, run: (v: EditorView) => copyOrCut(v, true) }
]);
