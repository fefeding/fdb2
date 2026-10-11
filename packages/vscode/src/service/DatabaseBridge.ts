// 后端服务桥接层：直接调用 db_tool/server 的 handleDatabaseRoutes，
// 复用既有的 TypeORM + 方言服务实现（无需启动 HTTP 服务）。
//
// server 顶层会实例化 ConnectionService / DatabaseService 单例，并读取
// process.env.DB_TOOL_DATA_DIR 决定连接配置文件位置（见 prelude.ts）。
import { handleDatabaseRoutes } from '../../../../server/index';

export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class DatabaseBridge {
  /**
   * 调用后端路由。pathname 形如 /api/database/getConnections，body 为请求参数。
   */
  async call<T = any>(pathname: string, body: any = {}): Promise<T> {
    return (await handleDatabaseRoutes(pathname, body)) as T;
  }

  /**
   * 带错误捕获的调用，避免单个异常导致 Webview 消息处理中断。
   */
  async callSafe<T = any>(pathname: string, body: any = {}): Promise<ApiResult<T>> {
    try {
      const data = await this.call<T>(pathname, body);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }
}
