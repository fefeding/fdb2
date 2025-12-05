// 数据库平台通用类型定义

// 数据库连接状态
export type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'error';

// SQL查询类型
export type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP' | 'TRUNCATE' | 'OTHER';

// 查询执行状态
export type QueryStatus = 'success' | 'failed' | 'running';

// 数据库类型
export type DatabaseType = 'mysql' | 'postgres' | 'sqlite' | 'mssql' | 'oracle' | 'mongodb';

// 导入模式
export type ImportMode = 'insert' | 'replace' | 'update' | 'append';

// 导出格式
export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'sql';

// 文件类型
export type FileType = 'csv' | 'xlsx' | 'json' | 'sql';

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

// 查询历史记录
export interface QueryHistory {
  id: string;
  type: QueryType;
  sql: string;
  timestamp: Date;
  executionTime: number;
  status: QueryStatus;
  connectionId: string;
  connectionName: string;
  isFavorite: boolean;
  affectedRows?: number;
  returnedRows?: number;
  errorMessage?: string;
  resultPreview?: {
    columns: string[];
    data: any[];
  };
  executionPlan?: string;
}

// 慢查询记录
export interface SlowQuery {
  id: string;
  timestamp: Date;
  executionTime: number;
  type: QueryType;
  sql: string;
  connectionId: string;
  connectionName: string;
  analysis?: string;
}

// 连接状态信息
export interface ConnectionStatusInfo {
  status: ConnectionStatus;
  uptime?: string;
  responseTime?: number;
  activeQueries?: number;
  totalQueries?: number;
  storageUsed?: number;
  storageTotal?: number;
  lastError?: string;
}

// 资源使用情况
export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: Date;
}

// 数据表信息
export interface TableInfo {
  name: string;
  type: string;
  engine?: string;
  rows?: number;
  size?: number;
  comment?: string;
  columns?: ColumnInfo[];
  indexes?: IndexInfo[];
}

// 列信息
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: any;
  comment?: string;
  length?: number;
  precision?: number;
  scale?: number;
}

// 索引信息
export interface IndexInfo {
  name: string;
  type: string;
  columns: string[];
  unique: boolean;
  cardinality?: number;
}

// 导入配置
export interface ImportConfig {
  connectionId: string;
  tableName: string;
  mode: ImportMode;
  encoding: string;
  delimiter: string;
  hasHeader: boolean;
  mapping?: Record<string, string>;
}

// 导出配置
export interface ExportConfig {
  connectionId: string;
  tableName: string;
  format: ExportFormat;
  encoding: string;
  whereCondition?: string;
  limit?: number;
  orderBy?: string;
  columns?: string[];
}

// 导入进度
export interface ImportProgress {
  current: number;
  total: number;
  message: string;
  stage: 'preparing' | 'validating' | 'importing' | 'completed' | 'error';
}

// 导出进度
export interface ExportProgress {
  current: number;
  total: number;
  message: string;
  stage: 'preparing' | 'querying' | 'formatting' | 'saving' | 'completed' | 'error';
}

// 查询结果
export interface QueryResult {
  columns: string[];
  data: any[];
  rowCount: number;
  affectedRows?: number;
  executionTime: number;
  status: QueryStatus;
  message?: string;
}

// 图表数据点
export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

// 图表配置
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  xAxis?: {
    label: string;
    type: 'time' | 'category' | 'value';
  };
  yAxis?: {
    label: string;
    min?: number;
    max?: number;
  };
  colors?: string[];
}

// 通知类型
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 通知配置
export interface NotificationConfig {
  message: string;
  type: NotificationType;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

// 表单验证规则
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

// 表单字段配置
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'textarea' | 'checkbox' | 'radio';
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: ValidationRule;
  defaultValue?: any;
  description?: string;
  disabled?: boolean;
  hidden?: boolean;
}

// 表单配置
export interface FormConfig {
  fields: FormField[];
  layout?: 'horizontal' | 'vertical';
  columns?: number;
  submitText?: string;
  cancelText?: string;
  onSubmit?: (data: any) => void | Promise<void>;
  onCancel?: () => void;
}

// 模态框配置
export interface ModalConfig {
  title: string;
  content?: string;
  component?: any;
  componentProps?: any;
  width?: string;
  height?: string;
  closable?: boolean;
  maskClosable?: boolean;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
}

// 表格列配置
export interface TableColumn {
  key: string;
  title: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: any, index: number) => any;
  fixed?: 'left' | 'right';
}

// 表格配置
export interface TableConfig {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  pagination?: PaginationParams | false;
  selection?: {
    type: 'checkbox' | 'radio';
    onChange?: (selectedRows: any[]) => void;
  };
  rowKey?: string;
  striped?: boolean;
  bordered?: boolean;
  size?: 'small' | 'middle' | 'large';
}

// 菜单项
export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
  disabled?: boolean;
  badge?: number;
}

// 面包屑项
export interface BreadcrumbItem {
  title: string;
  path?: string;
}

// 步骤项
export interface StepItem {
  title: string;
  description?: string;
  status?: 'wait' | 'process' | 'finish' | 'error';
  icon?: string;
}

// 标签页配置
export interface TabConfig {
  key: string;
  title: string;
  content?: any;
  component?: any;
  componentProps?: any;
  closable?: boolean;
  disabled?: boolean;
}

// 搜索配置
export interface SearchConfig {
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'daterange';
    placeholder?: string;
    options?: Array<{ label: string; value: any }>;
  }>;
  onSearch?: (params: any) => void;
  onReset?: () => void;
}

// 过滤器配置
export interface FilterConfig {
  key: string;
  label: string;
  type: 'checkbox' | 'radio' | 'select' | 'daterange';
  options?: Array<{ label: string; value: any }>;
  multiple?: boolean;
  defaultValue?: any;
}

// 排序配置
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// 下载选项
export interface DownloadOptions {
  filename: string;
  format: ExportFormat;
  encoding?: string;
  withHeader?: boolean;
  delimiter?: string;
}

// 上传选项
export interface UploadOptions {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  beforeUpload?: (file: File) => boolean | Promise<boolean>;
  onProgress?: (progress: number) => void;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

// 键盘快捷键配置
export interface ShortcutConfig {
  key: string;
  description: string;
  handler: () => void;
  prevent?: boolean;
}

// 主题配置
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compact?: boolean;
}

// 语言配置
export interface LocaleConfig {
  code: string;
  name: string;
  messages: Record<string, string>;
}

// 用户偏好设置
export interface UserPreferences {
  theme: ThemeConfig;
  locale: LocaleConfig;
  shortcuts: ShortcutConfig[];
  notifications: {
    enabled: boolean;
    types: NotificationType[];
  };
  autoSave: boolean;
  pageSize: number;
}

// 性能指标
export interface PerformanceMetrics {
  queryTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  errorRate: number;
  throughput: number;
}

// 健康检查结果
export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration?: number;
  }>;
  summary: string;
  timestamp: Date;
}