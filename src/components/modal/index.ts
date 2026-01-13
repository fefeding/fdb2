import { createApp, getCurrentInstance, nextTick } from 'vue';
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
  success: {} as (content: string) => Promise<boolean>,
  error: {} as (content: string, details?: any) => Promise<boolean>,
  warning: {} as (content: string) => Promise<boolean>,
  info: {} as (content: string) => Promise<boolean>,
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
  details?: any;
  onConfirm?: () => void;
  onCancel?: () => void;
};

// 全局modal实例
let globalModalInstance: any = null;
let modalInstance: ModalTypeWithMethods;

export default {
  install(app: any) {
    // 挂载到DOM
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    
    // 创建实例
    const modalApp = createApp(BootstrapModal);
    globalModalInstance = modalApp.mount(mount) as any;
    
    // 添加事件监听，确保模态框完全隐藏后重置 isModalActive
    if (globalModalInstance && globalModalInstance.$el) {
      const modalElement = globalModalInstance.$el;
      modalElement.addEventListener('hidden.bs.modal', () => {
        isModalActive = false;
        console.log('Modal hidden, isModalActive reset to false');
        
        // 处理待显示的modal
        if (pendingModalOptions) {
          const pending = pendingModalOptions;
          pendingModalOptions = null;
          showModal(pending);
        }
      });
    }
    
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
      success(content: string) {
        return this.alert({ content, type: 'success' as const, confirmText: '确定' });
      },
      error(content: string, details?: any) {
        return this.alert({ content, type: 'error' as const, confirmText: '确定', details });
      },
      warning(content: string) {
        return this.alert({ content, type: 'warning' as const, confirmText: '确定' });
      },
      info(content: string) {
        return this.alert({ content, type: 'info' as const, confirmText: '确定' });
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

// 全局modal状态管理
let isModalActive = false;
let pendingModalOptions: ModalOptions | null = null;

// 导出便捷函数供非Vue环境使用
export const showModal = (options: ModalOptions) => {
  if (!globalModalInstance) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const finalOptions = {
      title: '提示',
      confirmText: '确定',
      cancelText: '取消',
      showCancel: false,
      type: 'info',
      ...options,
      onConfirm: () => {
        options.onConfirm?.();
        globalModalInstance.hide();
        nextTick(() => {
          resolve(true);
        });
      },
      onCancel: () => {
        options.onCancel?.();
        globalModalInstance.hide();
        nextTick(() => {
          resolve(false);
        });
      }
    };

    // 如果当前有modal正在显示，将新的请求加入队列
    if (isModalActive) {
      console.log('Modal busy, queuing new modal');
      pendingModalOptions = options;
      return;
    }

    // 显示新的modal
    const showModalInstance = () => {
      globalModalInstance.setOptions?.(finalOptions);
      isModalActive = true;
      
      // 使用Promise链确保正确的执行顺序
      return globalModalInstance.show?.() || Promise.resolve();
    };

    showModalInstance();
  });
};

export const showAlert = (content: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', details?: any) => {
  return showModal({
    content,
    type,
    showCancel: false,
    details
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