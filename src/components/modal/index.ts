import { createApp, getCurrentInstance, ref } from 'vue';
import BootstrapModal from './index.vue';

export type ModalType = {
  show: () => void,
  hide: () => void,
  open: () => void,
  close: () => void,
};


// modal方法类型定义
const modalMethods = {
  alert: {} as (options: ModalOptions | string) => Promise<boolean>,
  confirm: {} as (options: ModalOptions | string) => Promise<boolean>,
  success: {} as (content: string, title?: string) => Promise<boolean>,
  error: {} as (content: string, title?: string) => Promise<boolean>,
  warning: {} as (content: string, title?: string) => Promise<boolean>,
  info: {} as (content: string, title?: string) => Promise<boolean>,
  showModal: {} as (options: ModalOptions) => Promise<boolean>
};

export type ModalTypeWithMethods = ModalType & typeof modalMethods;

export type ModalOptions = {
  title?: string;
  content?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

// 全局modal实例
let globalModalInstance: any = null;
let modalInstance: ModalTypeWithMethods;
const modalQueue = ref<ModalOptions[]>([]);

export default {
  install(app: any) {
    // 挂载到DOM
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    
    // 创建实例
    const modalApp = createApp(BootstrapModal);
    globalModalInstance = modalApp.mount(mount) as any;
    
    // 全局注入
    app.config.globalProperties.$modal = modalInstance = {
      show: () => globalModalInstance.show(),
      hide: () => globalModalInstance.hide(),
      open: () => globalModalInstance.show(),
      close: () => globalModalInstance.hide(),
      // 新增方法
      alert(options: ModalOptions | string) {
        const opts = typeof options === 'string' 
          ? { content: options, type: 'info' as const, showCancel: false }
          : { ...options, showCancel: false };
        return showModal(opts);
      },
      confirm(options: ModalOptions | string) {
        const opts = typeof options === 'string'
          ? { content: options, type: 'warning' as const }
          : { ...options, showCancel: true };
        return showModal(opts);
      },
      success(content: string, title = '成功') {
        return this.alert({ title, content, type: 'success' as const, confirmText: '确定' });
      },
      error (content: string, title = '错误') {
        return this.alert({ title, content, type: 'error' as const, confirmText: '确定' });
      },
      warning(content: string, title = '警告') {
        return this.alert({ title, content, type: 'warning' as const, confirmText: '确定' });
      },
      info(content: string, title = '提示') {
        return this.alert({ title, content, type: 'info' as const, confirmText: '确定' });
      },
    } as ModalTypeWithMethods;
  },
  get() {
    const instance  = getCurrentInstance();
    if(!instance ) return null;
    // @ts-ignore
    const modal = instance.appContext.config?.globalProperties?.$modal as ModalTypeWithMethods;
    return modal;
  }
};

export const getModalInstance = (): ModalTypeWithMethods => {
  return modalInstance;
}

// 导出便捷函数供非Vue环境使用
export const showModal = (options: ModalOptions) => {
  if (globalModalInstance) {
    return new Promise<boolean>((resolve) => {
      const finalOptions = {
        title: '提示',
        confirmText: '确定',
        cancelText: '取消',
        showCancel: false,
        ...options,
        onConfirm: () => {
          options.onConfirm?.();
          resolve(true);
          globalModalInstance.hide();
        },
        onCancel: () => {
          options.onCancel?.();
          resolve(false);
          globalModalInstance.hide();
        }
      };
      
      //Object.assign(globalModalInstance, finalOptions);
      globalModalInstance.setOptions?.(finalOptions);
      globalModalInstance.show();
    });
  }
};

export const showAlert = (content: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
  const titles = {
    success: '成功',
    error: '错误', 
    warning: '警告',
    info: '提示'
  };
  return showModal({
    title: title || titles[type],
    content,
    type,
    showCancel: false
  });
};

export const showConfirm = (content: string, options?: Omit<ModalOptions, 'content' | 'showCancel'>) => {
  return showModal({
    title: '确认',
    content,
    type: 'warning',
    showCancel: true,
    ...options
  });
};