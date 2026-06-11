// 拷贝
function copyText(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const success = document.execCommand('copy');
      if (success) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      return false;
    }
    finally {
        document.body.removeChild(textarea);
    }    
}
export async function copy(text: string) {
    // 优先使用 Electron preload 暴露的剪贴板 API
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.clipboard) {
        try {
            electronAPI.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Electron clipboard write failed:', err);
        }
    }
    try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // 降级到传统方法
        return copyText(text);
      }
}