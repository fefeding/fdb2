import { defineStore } from 'pinia';
import { DatabaseService, ConnectionService } from '@/service/database';
import type { ConnectionEntity, DatabaseEntity, TableEntity } from '@/typings/database';
import { modal } from '@/utils/modal';
import toast from '@/components/toast';

// 定义连接状态类型
export type ConnectionState = {
  // 当前连接
  currentConnection: ConnectionEntity | null;
  // 数据库列表
  databases: DatabaseEntity[];
  // 表列表
  tables: TableEntity[];
  // 加载状态
  loading: {
    databases: boolean;
    tables: boolean;
    executing: boolean;
  };
  // 错误信息
  error: string | null;
};

const connectionStoreKey = 'connection-state';

// 初始状态
function getDefaultState(): ConnectionState {
  return getInitialState();
}

// 获取初始状态
function getInitialState(): ConnectionState {
  return {
    currentConnection: null,
    databases: [],
    tables: [],
    loading: {
      databases: false,
      tables: false,
      executing: false
    },
    error: null
  };
}

const databaseService = new DatabaseService();
const connectionService = new ConnectionService();

export const useConnectionStore = defineStore('connection', {
  state: (): ConnectionState => getDefaultState(),
  
  getters: {
    // 是否有当前连接
    hasConnection: (state) => !!state.currentConnection,
    
    // 获取当前连接ID
    currentConnectionId: (state) => state.currentConnection?.id || '',
    
    // 获取数据库数量
    databaseCount: (state) => state.databases.length,
    
    // 获取表数量
    tableCount: (state) => state.tables.length,
    
    // 是否正在加载数据库
    isLoadingDatabases: (state) => state.loading.databases,
    
    // 是否正在加载表
    isLoadingTables: (state) => state.loading.tables,
    
    // 是否正在执行操作
    isExecuting: (state) => state.loading.executing,
  },
  
  actions: {
    // 设置当前连接
    setCurrentConnection(connection: ConnectionEntity | null) {
      // 避免重复设置相同的连接
      if (this.currentConnection?.id === connection?.id) return;
      
      this.currentConnection = connection;
      // 重置相关数据
      if (connection) {
        this.loadDatabases();
      } else {
        this.databases = [];
        this.tables = [];
      }
    },
    
    // 加载数据库列表
    async loadDatabases() {
      if (!this.currentConnection) return;
      
      // 防止重复调用
      if (this.loading.databases) return;
      
      try {
        this.loading.databases = true;
        this.error = null;
        
        const connectionId = this.currentConnection.id;
        if (!connectionId) {
          this.error = '连接ID不存在';
          modal.error(this.error);
          return;
        }
        const result = await databaseService.getDatabases(connectionId);
        
        // 处理不同格式的返回数据
        if (result && typeof result === 'object' && 'ret' in result && result.ret === 0) {
          // 处理服务器返回的数据 - 转换字符串数组为对象数组
          const dbList = result.data || [];
          this.databases = dbList.map((db: string) => ({
            name: db,
            size: 0,
            tableCount: 0,
            tables: []
          }));
        } else if (Array.isArray(result)) {
          // 如果直接返回数组
          this.databases = result.map((db: string) => ({
            name: db,
            size: 0,
            tableCount: 0,
            tables: []
          }));
        } else {
          this.error = (result && typeof result === 'object' && 'msg' in result && typeof result.msg === 'string') ? result.msg : '获取数据库列表失败';
          modal.error(this.error);
        }
      } catch (error: any) {
        this.error = error.message || '获取数据库列表失败';
        console.error('获取数据库列表失败:', error);
        modal.error(this.error);
      } finally {
        this.loading.databases = false;
      }
    },
    
    // 加载数据库详细信息
    async loadDatabaseInfo(databaseName: string) {
      if (!this.currentConnection) return;
      
      try {
        this.loading.executing = true;
        this.error = null;
        
        const result = await databaseService.getDatabaseInfo(this.currentConnection.id, databaseName);
        
        if (result.ret === 0) {
          const databaseInfo = result.data;
          // 更新数据库信息
          const index = this.databases.findIndex(db => db.name === databaseName);
          if (index !== -1) {
            this.databases[index] = databaseInfo;
          }
          // 更新表列表
          this.tables = databaseInfo.tables || [];
        } else {
          this.error = result.msg || '获取数据库详细信息失败';
          modal.error(this.error);
        }
      } catch (error: any) {
        this.error = error.message || '获取数据库详细信息失败';
        console.error('获取数据库详细信息失败:', error);
        modal.error(this.error);
      } finally {
        this.loading.executing = false;
      }
    },
    
    // 加载表列表
    async loadTables(databaseName: string) {
      if (!this.currentConnection) return;
      
      try {
        this.loading.tables = true;
        this.error = null;
        
        const result = await databaseService.getTables(this.currentConnection.id, databaseName);
        
        if (result.ret === 0) {
          this.tables = result.data || [];
          // 更新数据库的表数量
          const index = this.databases.findIndex(db => db.name === databaseName);
          if (index !== -1) {
            this.databases[index].tableCount = this.tables.length;
          }
        } else {
          this.error = result.msg || '获取表列表失败';
          modal.error(this.error);
        }
      } catch (error: any) {
        this.error = error.message || '获取表列表失败';
        console.error('获取表列表失败:', error);
        modal.error(this.error);
      } finally {
        this.loading.tables = false;
      }
    },
    
    // 创建数据库
    async createDatabase(databaseName: string, options?: any) {
      if (!this.currentConnection) return;
      
      try {
        this.loading.executing = true;
        this.error = null;
        
        // 过滤掉空的选项
        const filteredOptions = Object.fromEntries(
          Object.entries(options || {}).filter(([_, value]) => value !== '')
        );
        
        await connectionService.createDatabase(this.currentConnection.id, databaseName, filteredOptions);
        
        modal.success('数据库创建成功');
        // 重新加载数据库列表
        this.loadDatabases();
      } catch (error: any) {
        this.error = error.message || '创建数据库失败';
        console.error('创建数据库失败:', error);
        modal.error(this.error);
      } finally {
        this.loading.executing = false;
      }
    },
    
    // 测试连接
    async testConnection(connection: ConnectionEntity) {
      try {
        this.loading.executing = true;
        this.error = null;
        
        const result = await connectionService.testConnection(connection);
        
        if (result.ret === 0) {
          toast.success('连接测试成功');
          return true;
        } else {
          this.error = result.msg || '连接测试失败';
          toast.error(this.error);
          return false;
        }
      } catch (error: any) {
        this.error = error.message || '连接测试失败';
        console.error('连接测试失败:', error);
        toast.error(this.error);
        return false;
      } finally {
        this.loading.executing = false;
      }
    },
    
    // 清除错误信息
    clearError() {
      this.error = null;
    },
    
    // 重置状态
    resetState() {
      Object.assign(this.$state, getInitialState());
    }
  }
});
