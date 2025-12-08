import { h, render, type Component, type ComponentObjectPropsOptions } from 'vue';
import { snapdom } from '@zumer/snapdom';
import JSZip from 'jszip';

// 渲染组件
export function renderComponent(component: Component, props?: ComponentObjectPropsOptions, target: HTMLElement = document.body) {
    const vnode = h(component, props||null);
    render(vnode, target);
    
    return vnode;
}

// 转自符串为json，主要用于ai返回的json格式问题
export function parseAiJSON(str: string) {
    str = str.trim();
    if(str.startsWith('```json')) str = str.replace('```json', '');
    if(str.startsWith('json')) str = str.replace('json', '');
    if(str.endsWith('```')) str = str.substring(0, str.length - 3);
    try {
        const res = JSON.parse(str);
        return res;
    }
    catch (e) {
        //str = str.replace(/{\s*{/g, '{').replace(/}\s*}/g, '}');
        let jsonIndex = str.indexOf('{');
        let jsonLast = str.lastIndexOf('}');
        if(jsonIndex === -1) jsonIndex = 0;
        if(jsonLast === -1) jsonLast = str.length - 1;
        let jsonStr = str.substring(jsonIndex, jsonLast + 1);
        jsonStr = jsonStr.replace(/\s*\/\/(.*)?\s+/g, '');// 去除注释
        try {
            const result = JSON.parse(jsonStr);
            return result;
        }
        catch(e) {
            console.error(jsonStr);
            return null;
        }
    }
}

// 导出dom为图片
export const exportDomAsImage = async (dom: HTMLElement, option: {
    type: 'jpg'|'png',
    filename: string
}) => {
    if (dom) {
        try {
            await snapdom.download(dom, { 
                format: option.type || 'png', 
                type: option.type || 'png', 
                filename: option.filename,
                // 1. 解决锯齿/模糊的核心：提升分辨率
                dpr: Math.max(window.devicePixelRatio||2, 2), // 关键！用设备物理像素比，无则默认2倍
                scale: 2, // 额外缩放DOM渲染尺寸（1.2-2倍为宜，避免过度放大导致性能问题）
                quality: 1, // 质量拉满（仅对jpeg/webp生效，png无需此参数但设1不影响）
                embedFonts: true, // 嵌入字体（防止文字因字体缺失导致锯齿/错位）
                fast: false, // 关闭"快速模式"（快速模式会跳过部分细节渲染，优先保证质量）
                width: dom.offsetWidth,
                height: dom.offsetHeight,
            });
        } catch (error) {
            console.error('导出图片时出错:', error);
        }
    }
  };

  /**
 * 将Blob类型的数组打包成ZIP文件并下载
 * @param blobs 包含Blob和文件名的数组
 * @param zipFileName 导出的ZIP文件名
 */
export const compressBlobToZip = async (
    blobs: Array<{ blob: Blob; fileName: string }|Blob>,
  ): Promise<Blob> => {
    // 验证输入
    if (!blobs || blobs.length === 0) {
      throw new Error('没有需要导出的文件');
    }
  
    return new Promise<Blob>(async (resolve, reject) => {
        // 创建JSZip实例
        const zip = new JSZip();
    
        try {
        // 遍历图片数组，添加到ZIP
        for (let [index, blob] of blobs.entries()) {
            const data = blob instanceof Blob? {
                fileName: `file-${index + 1}`,
                blob,
            }: blob;

            // 确保文件名有效，添加默认扩展名
            const fileName = data.fileName || `file-${index + 1}`;
            const fileWithExtension = fileName.includes('.') 
            ? fileName 
            : `${fileName}.png`; // 默认使用png扩展名
    
            // 将Blob转换为ArrayBuffer
            const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(data.blob);
            });
    
            // 添加文件到ZIP
            zip.file(fileWithExtension, arrayBuffer);
        }
    
        // 生成ZIP文件并下载
        zip.generateAsync({ type: 'blob', }, (metadata) => {
            // 可以在这里添加进度提示逻辑
            console.log(`打包进度: ${metadata.percent.toFixed(2)}%`);
        }).then(content => {
            resolve(content);
        }).catch((reason) => {
            reject(reason)
        });
    
        } catch (error) {
            console.error('打包ZIP文件失败:', error);
            reject(error)
        }            
    });
  }

export const download = async (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 200);
}

// 用form触发下载
export const downloadWithForm = function (url: string, params: any = {}): void {
    // 1. 创建表单元素
    const form = document.createElement('form');
    
    // 2. 设置表单属性
    form.method = 'post';       // 使用POST方法
    form.action = url;          // 接口地址
    form.target = '_blank';     // 在新窗口打开，避免当前页面跳转
    form.style.display = 'none'; // 隐藏表单（不影响页面）
    
    // 3. 动态添加表单参数（将params转为隐藏输入框）
    Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';  // 隐藏输入框，不显示在页面
        input.name = key;       // 参数名
        input.value = value as string;    // 参数值
        form.appendChild(input);
    });
    
    // 4. 将表单添加到页面
    document.body.appendChild(form);
    
    // 5. 提交表单（触发下载）
    form.submit();
    
    // 6. 清理：移除表单（可选，不影响功能）
    setTimeout(() => {
        document.body.removeChild(form);
    }, 100);
}
