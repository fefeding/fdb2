import { createApp, getCurrentInstance } from 'vue';
import BootstrapToast from './toast.vue';

export type ToastType = {
  show: (message: string, title: string, type: string, duration?: number) => void,
  success: (msg: string, title?: string, duration?: number) => void,
  error: (msg: string, title?: string, duration?: number) => void,
  warning: (msg: string, title?: string, duration?: number) => void
};

export default {
  install(app: any) {
    // 挂载到DOM
    const toastMount = document.createElement('div');
    document.body.appendChild(toastMount);
    
    // 创建Toast实例
    const toastApp = createApp(BootstrapToast);
    const toastInstance = toastApp.mount(toastMount) as any;
    
    // 全局注入
    app.config.globalProperties.$toast = {
      show: (message: string, title: string, type: string, duration = 3000) => toastInstance.addToast(title, message, type, duration),
      success: (msg: string, title?: string, duration = 3000) => toastInstance.addToast(title, msg, 'success', duration),
      error: (msg: string, title?: string, duration = 3000) => toastInstance.addToast(title, msg, 'danger', duration),
      warning: (msg: string, title?: string, duration = 3000) => toastInstance.addToast(title, msg, 'warning', duration)
    } as ToastType;
  },
  getToast() {
    const instance  = getCurrentInstance();
    if(!instance ) return null;
    // @ts-ignore
    const toast = instance.appContext.config?.globalProperties?.$toast as ToastType;
    return toast;
  }
};