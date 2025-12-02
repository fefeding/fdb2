import EventEmitter from '@fefeding/eventemitter';
/**
 * @public
 * An interface to define a callback function with any number and type of parameters, and any return.
 */
export interface CallBack {
    (...args: any[]): any;
}


/**
 * @public
 * @param newValue - The new state value.
 * @param oldValue - The previous state value.
 * @param key - The key which the state value was updated.
 */
export interface WatchCallBack {
    (
        newValue: Record<string, any>,
        oldVaule: Record<string, any>,
        key: string
    ): void;
}

// 菜单项类型
export type MenuItem = {
    id: string,
    name: string,
    icon?: string,
    path?: string;
    /**
     * 是否展开
     */
    expanded?: boolean,
    children?: Array<MenuItem>;
  }

/**
 * @public
 * Entity class with watchable state.
 */
export default class Entity<T> extends EventEmitter {
    /**
     * 状态
     * @public
     */
    state: T;

    /**
     * @public
     * @param  data - initialization data.
     */
    constructor(data?:T) {
        super();
        this.state = new Proxy(data || {}, {
            set: (oTarget: any, sKey, vValue) => {
                if (oTarget[sKey] !== vValue) {
                    const oldValue = { ...oTarget };
                    oTarget[sKey] = vValue;
                    // 这里不传入this.state, 避免在update回调那里再修改state，造成死循环
                    this.emit('update', { ...oTarget }, oldValue, sKey);
                    // if (typeof sKey === 'string') {
                    //     this.emit(`update:${sKey}`, oTarget[sKey], oldValue[sKey]);
                    // }
                }
                return true;
            },
        });
    }
    /**
     * @public
     * @param  cb - Callback function to execute on state updates.
     * return Callback to lift the watch state.
     */
    watch(cb: WatchCallBack): CallBack {
        this.on('update', cb);
        return () => this.off('update', cb);
    }
    // 目前看，根据key监听暂时用不到
    // watch(cb: WatchCallBack): CallBack;
    // watch(key: string, cb: WatchCallBack): CallBack;
    // watch(keyOrCb: string | WatchCallBack, cb?: WatchCallBack): CallBack {
    //     if (typeof keyOrCb === 'string' && cb) {
    //         this.on(`update:${keyOrCb}`, cb);
    //         return () => this.off('update', cb);
    //     } else if (typeof keyOrCb === 'function') {
    //         this.on('update', keyOrCb);
    //         return () => this.off('update', keyOrCb);
    //     }
    //     return () => {};
    // }
}
