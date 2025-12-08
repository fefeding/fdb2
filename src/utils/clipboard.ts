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
    try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // 降级到传统方法
        return copyText(text);
      }
}