

import EventEmitter from '@fefeding/eventemitter';

export const AUTHTIMEOUT = 'AUTHTIMEOUT';


const GlobalEventBus = new EventEmitter();
const GlobalEventBusCache = new Map<string|symbol, any>();
// 订阅
export function subscribe(name: string|symbol, callback: any) {
    const id = typeof name === 'symbol' ? name : Symbol(name);
    GlobalEventBusCache.set(id, {
        name,
        callback
    });
    GlobalEventBus.on(name, callback);

    return id;
}

// 取消订阅
export function unsubscribe(eventId: string|symbol) {
    const event = GlobalEventBusCache.get(eventId);
    if(event) {
        GlobalEventBus.off(event.name, event.callback);
        GlobalEventBusCache.delete(eventId);
        return true;
    }
    return false;
}

// 发布事件
export function publish(name: string|symbol, data?: any) {
    return GlobalEventBus.emit(name, data);
}
 