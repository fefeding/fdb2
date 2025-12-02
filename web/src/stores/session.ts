import { defineStore } from 'pinia';
import type { User } from '@fefeding/common/dist/models/account/user';
//import type Account from '@fefeding/common/dist/models/account/account';
import type { Session, } from '@fefeding/common/dist/models/account/session';
import { sysConfig } from '@/domain/SysConfig';


// 定义会话状态类型
export type SessionState = Session & {
  lastDate: number
  iat: number,
}

const storage = window.sessionStorage;

const sessionStoreKey = 'login-session';
// 初始状态
// 从 localStorage 读取默认值
function getDefaultState() {
  try {
    const locStr = storage.getItem(sessionStoreKey);
    return locStr ? JSON.parse(locStr) : (sysConfig.session || {});
  } catch (e) {
    console.error('Failed to read localStorage:', e);
    return sysConfig.session || {};
  }
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => getDefaultState(),
  
  getters: {
    // 是否登录
    isLoggedIn: (state) => {
      console.log('Recomputing isLoggedIn', state, state.id, state.userId); // 调试
      return !!state.id && !!state.userId;
    },
    
    // 获取用户名
    userName: (state) => state.user?.name || '',
    
    // 获取登录ID
    userLoginId: (state) => state.loginId,
    
    // 获取用户头像
    userAvatar: (state) => state.user?.avatar || '',
    // 登陆token
    token: (state) => state.id || '',
  },
  
  actions: {
    // 设置登录状态
    setSession(session: Partial<SessionState>) {
      this.$patch((state) => {
        Object.assign(state, session); // 通过 $patch 触发响应式
      });
    },
    
    // 清除登录状态（退出登录）
    clearSession() {
      this.user = null as any;
      this.account = null as any;
      this.id = '';
      this.userId = 0;
      this.loginId = '';
      storage.removeItem?.(sessionStoreKey);
    },
    
    // 更新用户信息
    updateUserInfo(user: Partial<User>) {
      if(this.user) {
        this.$patch((state) => {
          // @ts-ignore
          state.user = Object.assign(state.user||{}, user); // 通过 $patch 触发响应式
        });
      }
    },
  },
  
  // 持久化存储配置（需要安装pinia-plugin-persistedstate）
  persist: {
    key: sessionStoreKey,
    storage: storage, // 可选sessionStorage
    //paths: ['lastDate', 'id', 'loginId', 'user', 'account', 'userId', 'iat']
  },
});

