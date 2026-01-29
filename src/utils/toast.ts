import { getCurrentInstance } from 'vue';

export type ToastType = {
  show: (title: string, message: string, type: string, duration?: number) => void,
  success: (msg: string, title?: string, duration?: number) => void,
  error: (msg: string, title?: string, duration?: number) => void,
  warning: (msg: string, title?: string, duration?: number) => void,
  info: (msg: string, title?: string, duration?: number) => void
};

let globalToast: ToastType | null = null;

export function setGlobalToast(toast: ToastType) {
  globalToast = toast;
}

export function getGlobalToast(): ToastType | null {
  return globalToast;
}

export class ToastHelper {
  private getToast(): ToastType | null {
    if (globalToast) {
      return globalToast;
    }
    
    const instance = getCurrentInstance();
    if (!instance) {
      console.warn('ToastHelper: Vue实例不存在，请确保已注册toast插件');
      return null;
    }
    
    const toast = instance.appContext.config?.globalProperties?.$toast as ToastType;
    return toast || null;
  }

  success(message: string, title = '', duration = 3000): void {
    const toast = this.getToast();
    if (toast?.success) {
      toast.success(message, title, duration);
    }
  }

  error(message: string, title = '', duration = 3000): void {
    const toast = this.getToast();
    if (toast?.error) {
      toast.error(message, title, duration);
    }
  }

  warning(message: string, title = '', duration = 3000): void {
    const toast = this.getToast();
    if (toast?.warning) {
      toast.warning(message, title, duration);
    }
  }

  info(message: string, title = '', duration = 3000): void {
    const toast = this.getToast();
    if (toast?.info) {
      toast.info(message, title, duration);
    }
  }

  show(title: string, message: string, type: string, duration = 3000): void {
    const toast = this.getToast();
    if (toast?.show) {
      toast.show(message, title, type, duration);
    }
  }
}

export const toast = new ToastHelper();
