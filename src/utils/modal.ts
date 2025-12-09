import { getCurrentInstance } from 'vue';
import { getModalInstance, showAlert, showConfirm, type ModalTypeWithMethods } from '@/components/modal';

/**
 * 全局Modal工具类
 * 提供统一的弹窗接口
 */
export class ModalHelper {
  /**
   * 获取全局modal实例
   */
  private getModal(): ModalTypeWithMethods|null {
    const instance = getModalInstance();
    if (!instance) {
      console.warn('ModalHelper: Vue实例不存在，使用默认实现');
      return null;
    }
    
    // @ts-ignore
    return instance;
  }

  /**
   * 成功提示
   */
  success(content: string): Promise<boolean> {
    const modal = this.getModal();
    if (modal?.success) {
      return modal.success(content);
    }
    return showAlert(content, 'success') || Promise.resolve(true);
  }

  /**
   * 错误提示
   */
  error(content: string | Error, title?: string): Promise<boolean> {
    const modal = this.getModal();
    
    // 处理错误对象
    let errorMessage: string;
    if (content instanceof Error) {
      errorMessage = content.message;
      console.error('Error details:', {
        name: content.name,
        message: content.message,
        stack: content.stack
      });
    } else {
      errorMessage = String(content);
    }
    
    if (modal?.error) {
      return modal.error(errorMessage, title);
    }
    return showAlert(errorMessage, 'error', title) || Promise.resolve(true);
  }



  /**
   * 警告提示
   */
  warning(content: string): Promise<boolean> {
    const modal = this.getModal();
    if (modal?.warning) {
      return modal.warning(content);
    }
    return showAlert(content, 'warning') || Promise.resolve(true);
  }

  /**
   * 信息提示
   */
  info(content: string): Promise<boolean> {
    const modal = this.getModal();
    if (modal?.info) {
      return modal.info(content);
    }
    return showAlert(content, 'info') || Promise.resolve(true);
  }

  /**
   * 简单提示（替代alert）
   */
  alert(content: string): Promise<boolean> {
    const modal = this.getModal();
    if (modal?.alert) {
      return modal.alert(content);
    }
    return showAlert(content, 'info') || Promise.resolve(true);
  }

  /**
   * 确认对话框（替代confirm）
   */
  confirm(content: string, options?: {
    title?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }): Promise<boolean> {
    const modal = this.getModal();
    if (modal?.confirm) {
      return modal.confirm({
        ...options,
        content,
      });
    }
    return showConfirm(content, options) || Promise.resolve(false);
  }
}

// 导出单例实例
export const modal = new ModalHelper();

// 兼容性导出
export const showToast = modal.info.bind(modal);
export const showError = modal.error.bind(modal);
export const showSuccess = modal.success.bind(modal);
export const showWarning = modal.warning.bind(modal);

// 替代原生函数
export const alert = modal.alert.bind(modal);
export const confirm = modal.confirm.bind(modal);