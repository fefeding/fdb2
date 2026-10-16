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
     *
     * 这里刻意不按 event.origin 过滤：VSCode 各版本经 webview.postMessage 下发时
     * 携带的 origin 并不稳定（部分版本为非空值），一旦过滤就会把宿主消息整批丢掉，
     * 表现为「连接下拉为空 / 数据库列表不展示」这类面板级静默失效。
     * rpc.ts 与 entry/explorer.ts 的监听同样不过滤，这里与之保持一致。
     * webview 内 CSP 已限定脚本来源、宿主是唯一消息来源，该过滤没有实际收益。
     */
    onMessage(callback: (message: any) => void): void {
        window.addEventListener('message', (event) => {
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
