import { createApp, getCurrentInstance, nextTick } from 'vue';
import BootstrapModal from './index.vue';
import { getT } from '@/i18n';
import i18n from '@/i18n';

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
    modalApp.use(i18n);
    globalModalInstance = modalApp.mount(mount) as any;
    
    // 添加事件监听，确保模态框完全隐藏后重置 isModalActive
    // （点遮罩 / 关闭按钮等非 onConfirm、onCancel 路径只能靠这里复位）
    if (globalModalInstance && globalModalInstance.$el) {
      const modalElement = globalModalInstance.$el;
      modalElement.addEventListener('hidden.bs.modal', () => {
        // 关闭动作已由 onConfirm/onCancel 处理过：这里只是延迟到达的动画结束事件，
        // 不能再复位，否则会把期间新弹出的modal状态清掉
        if (closeHandled) {
          closeHandled = false;
          return;
        }
        isModalActive = false;
        console.log('Modal hidden, isModalActive reset to false');
        flushPendingModal();
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
        const t = getT();
        return this.alert({ content, type: 'success' as const, confirmText: t('common.confirm') });
      },
      error(content: string, details?: any) {
        const t = getT();
        return this.alert({ content, type: 'error' as const, confirmText: t('common.confirm'), details });
      },
      warning(content: string) {
        const t = getT();
        return this.alert({ content, type: 'warning' as const, confirmText: t('common.confirm') });
      },
      info(content: string) {
        const t = getT();
        return this.alert({ content, type: 'info' as const, confirmText: t('common.confirm') });
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
// 本次关闭是否已由 onConfirm/onCancel 处理（避免延迟的 hidden 事件重复复位）
let closeHandled = false;

type PendingModal = { options: ModalOptions; resolve: (value: boolean) => void };
let pendingModal: PendingModal | null = null;

/**
 * 复位 active 标记并消费待显示modal。
 *
 * 复位必须在关闭动作（onConfirm/onCancel）里立即做：
 * hide() 的关闭动画是异步的，hidden.bs.modal 可能在下一次 show 之后才触发，
 * 若只依赖该事件复位，"确认 -> 紧接着又弹一个提示" 就会被误判为
 * "Modal busy" 入队，而入队的 Promise 始终不 resolve，表现为
 * 弹窗一闪而过、之后再点任何弹窗都没反应。
 */
function releaseActive(): void {
  isModalActive = false;
  flushPendingModal();
}

/** 显示排队中的modal，并把结果回传给最初那次调用的 Promise */
function flushPendingModal(): void {
  if (!pendingModal) return;
  const pending = pendingModal;
  pendingModal = null;
  nextTick(() => {
    showModal(pending.options).then(pending.resolve);
  });
}

// 导出便捷函数供非Vue环境使用
export const showModal = (options: ModalOptions) => {
  if (!globalModalInstance) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const t = getT();
    const finalOptions = {
      title: t('common.tip'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      showCancel: false,
      type: 'info',
      ...options,
      onConfirm: () => {
        options.onConfirm?.();
        closeHandled = true;
        globalModalInstance.hide();
        // 立即复位，不等关闭动画结束，避免后续弹窗被误判为 busy
        releaseActive();
        nextTick(() => {
          resolve(true);
        });
      },
      onCancel: () => {
        options.onCancel?.();
        closeHandled = true;
        globalModalInstance.hide();
        releaseActive();
        nextTick(() => {
          resolve(false);
        });
      }
    };

    // 如果当前有modal正在显示，将新的请求加入队列
    // （入队时保留 resolve，等真正显示后再回传结果，避免调用方永久挂起）
    if (isModalActive) {
      console.log('Modal busy, queuing new modal');
      pendingModal = { options, resolve };
      return;
    }

    globalModalInstance.setOptions?.(finalOptions);
    isModalActive = true;
    closeHandled = false;

    // 使用Promise链确保正确的执行顺序
    globalModalInstance.show?.() || Promise.resolve();
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
  const t = getT();
  return showModal({
    title: t('common.confirmTitle'),
    content,
    type: 'warning',
    showCancel: true,
    ...options
  });
};