/**
 * VSCode WebView 桥接层
 * 提供 Vue 应用与 VSCode 扩展之间的通信
 */

/**
 * VSCode API 接口
 */
interface VSCodeAPI {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
}

declare const acquireVsCodeApi: () => VSCodeAPI;

/**
 * VSCode 桥接类
 */
export class VSCodeBridge {
    private vscode: VSCodeAPI | null = null;

    constructor() {
        if (typeof window !== 'undefined' && typeof acquireVsCodeApi === 'function') {
            this.vscode = acquireVsCodeApi();
        }
    }

    /**
     * 判断是否在 VSCode 环境中
     */
    isVSCodeEnvironment(): boolean {
        return this.vscode !== null;
    }

    /**
     * 发送消息到 VSCode 扩展
     */
    postMessage(message: any): void {
        if (!this.vscode) {
            console.warn('Not in VSCode environment');
            return;
        }
        this.vscode.postMessage(message);
    }

    /**
     * 监听来自 VSCode 扩展的消息
     */
    onMessage(callback: (message: any) => void): void {
        window.addEventListener('message', event => {
            // 安全检查：确保消息来自扩展
            if (event.origin) {
                return;
            }
            callback(event.data);
        });
    }

    /**
     * 获取状态
     */
    getState(): any {
        if (!this.vscode) {
            return {};
        }
        return this.vscode.getState();
    }

    /**
     * 保存状态
     */
    setState(state: any): void {
        if (!this.vscode) {
            return;
        }
        this.vscode.setState(state);
    }

    /**
     * 初始化桥接
     */
    init(messageHandler?: (message: any) => void): void {
        if (this.isVSCodeEnvironment()) {
            if (messageHandler) {
                this.onMessage(messageHandler);
            }
            // 恢复之前保存的状态
            const savedState = this.getState();
            if (savedState) {
                this.postMessage({
                    command: 'restoreState',
                    data: savedState
                });
            }
        }
    }
}

// 创建全局实例
let bridgeInstance: VSCodeBridge | null = null;

/**
 * 获取 VSCode 桥接实例
 */
export function getVSCodeBridge(): VSCodeBridge {
    if (!bridgeInstance) {
        bridgeInstance = new VSCodeBridge();
    }
    return bridgeInstance;
}

/**
 * 判断是否在 VSCode 环境中
 */
export function isVSCodeEnvironment(): boolean {
    if (!bridgeInstance) {
        bridgeInstance = new VSCodeBridge();
    }
    return bridgeInstance.isVSCodeEnvironment();
}
