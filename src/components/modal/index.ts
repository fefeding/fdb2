import { createApp, getCurrentInstance } from 'vue';
import BootstrapModal from './index.vue';

export type ModalType = {
  show: () => void,
  hide: () => void,
  open: () => void,
  close: () => void,
};

export default {
  install(app: any) {
    // 挂载到DOM
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    
    // 创建实例
    const modalApp = createApp(BootstrapModal);
    const instance = modalApp.mount(mount) as any;
    
    // 全局注入
    app.config.globalProperties.$modal = {
      show: () => instance.show(),
      hide: () => instance.hide(),
      open: () => instance.show(),
      close: () => instance.hide(),
    } as ModalType;
  },
  get() {
    const instance  = getCurrentInstance();
    if(!instance ) return null;
    // @ts-ignore
    const modal = instance.appContext.config?.globalProperties?.$modal as ModalType;
    return modal;
  }
};