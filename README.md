# 数据库管理工具

基于 TypeORM + Vue3 + Bootstrap5 构建的现代化数据库管理工具，仿 Navicat Premium 功能设计。

## 功能特性

### 🔗 连接管理
- 支持多种数据库类型：MySQL、PostgreSQL、SQLite、SQL Server、Oracle
- 可视化连接配置界面
- 连接测试和状态监控
- 连接信息本地JSON存储

### 🏗️ 数据库结构
- 数据库信息概览
- 表结构详细查看
- 列信息、索引、外键关系展示
- 数据库大小和统计信息

### 📊 数据操作
- 表数据查看和分页
- 条件查询和排序
- 数据插入、编辑、删除
- 数据导出（JSON、CSV格式）

### 💻 SQL查询
- 代码编辑器风格SQL输入框
- SQL语法格式化
- 查询历史记录
- 批量查询结果展示

## 项目结构

### 后端（MidwayJS + TypeORM）
```
src/
├── model/                          # 数据模型定义
│   ├── connection.entity.ts         # 连接配置实体
│   └── database.entity.ts          # 数据库信息实体
├── service/                        # 业务服务层
│   ├── connection.service.ts        # 连接管理服务
│   └── database.service.ts         # 数据库操作服务
└── controller/                     # API控制器
    └── database.controller.ts       # 数据库管理API
```

### 前端（Vue3 + Bootstrap5）
```
web/src/platform/database/          # 数据库管理模块
├── layout.vue                     # 主布局组件
├── index.vue                      # 首页仪表板
├── connections.vue                 # 连接管理页面
├── schemas.vue                    # 数据库结构页面
├── query.vue                      # SQL查询页面
├── table.vue                      # 表数据查看页面
└── router.ts                      # 路由配置

web/src/
├── service/database.ts             # 前端API服务
├── typings/database.ts            # TypeScript类型定义
└── assets/database.css            # 专用样式文件
```

## 快速开始

### 1. 启动后端服务
```bash
npm run dev:midway
```

### 2. 启动前端开发服务器
```bash
npm run dev:vue
```

### 3. 访问应用
打开浏览器访问：`http://localhost:3000/database`

## 使用指南

### 添加数据库连接

1. 进入"连接管理"页面
2. 点击"新增连接"按钮
3. 填写连接信息：
   - 连接名称：自定义名称，便于识别
   - 数据库类型：选择对应的数据库类型
   - 主机地址：数据库服务器地址
   - 端口：数据库服务端口（会自动填充默认端口）
   - 数据库名称：要连接的数据库名
   - 用户名/密码：数据库认证信息
4. 点击"测试连接"验证配置
5. 保存连接配置

### 查看数据库结构

1. 进入"数据库结构"页面
2. 选择已配置的数据库连接
3. 选择要查看的数据库
4. 浏览表列表和详细信息：
   - 表基本信息（行数、大小等）
   - 列定义（数据类型、约束等）
   - 索引信息
   - 外键关系

### 数据操作

1. 在表列表中点击"数据"按钮
2. 设置查询条件：
   - WHERE条件：过滤数据
   - 排序字段：指定排序方式
   - 每页显示：调整分页大小
3. 执行查询查看数据
4. 支持的操作：
   - 查看数据详情
   - 编辑记录
   - 删除记录
   - 插入新数据
   - 导出数据

### SQL查询

1. 进入"SQL查询"页面
2. 选择数据库连接
3. 在编辑器中输入SQL语句
4. 功能特性：
   - Ctrl/Cmd + Enter 快速执行
   - SQL格式化美化
   - 查询历史记录
   - 结果导出功能

## 数据存储

### 连接配置存储
- 位置：`data/connections.json`
- 格式：JSON数组
- 安全：密码明文存储（生产环境建议加密）

### 查询历史存储
- 位置：浏览器LocalStorage
- 键名：`db-query-history`
- 数量限制：最多保存50条记录

## API接口

### 连接管理
- `GET /api/database/connections` - 获取所有连接
- `POST /api/database/connections` - 添加连接
- `PUT /api/database/connections/:id` - 更新连接
- `DELETE /api/database/connections/:id` - 删除连接
- `POST /api/database/connections/test` - 测试连接

### 数据库操作
- `GET /api/database/connections/:id/databases` - 获取数据库列表
- `GET /api/database/connections/:id/databases/:name` - 获取数据库信息
- `GET /api/database/connections/:id/databases/:name/tables` - 获取表列表
- `GET /api/database/connections/:id/databases/:name/tables/:table` - 获取表信息
- `GET /api/database/connections/:id/databases/:name/tables/:table/data` - 获取表数据
- `POST /api/database/connections/:id/query` - 执行SQL查询
- `GET /api/database/connections/:id/databases/:name/tables/:table/export` - 导出数据

## 技术栈

### 后端
- **框架**: MidwayJS
- **ORM**: TypeORM
- **数据库**: 支持多种数据库类型
- **语言**: TypeScript

### 前端
- **框架**: Vue 3
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **UI框架**: Bootstrap 5
- **图标**: Bootstrap Icons
- **HTTP客户端**: Axios
- **语言**: TypeScript

## 开发注意事项

### 后端开发
- 服务类继承自`BaseService`
- 使用`@Inject`和`@Provide`装饰器
- 统一的错误处理机制
- 数据库连接池管理

### 前端开发
- 组件化设计，保持代码解耦
- 使用TypeScript类型检查
- 响应式设计，支持移动端
- 统一的样式规范

### 安全考虑
- SQL注入防护（使用参数化查询）
- 连接信息安全存储
- 权限验证（需要登录）
- 敏感信息脱敏显示

## 扩展功能

### 计划中的功能
- [ ] 数据库备份和恢复
- [ ] 数据同步功能
- [ ] 可视化查询构建器
- [ ] 数据导入功能
- [ ] 用户权限管理
- [ ] 操作日志记录
- [ ] 性能监控
- [ ] 查询优化建议

### 自定义扩展
- 可以通过添加新的数据库驱动支持更多数据库类型
- 可以扩展前端组件添加更多数据可视化功能
- 可以集成定时任务实现数据备份自动化

## 故障排除

### 常见问题

1. **连接失败**
   - 检查数据库服务是否运行
   - 验证网络连接和端口
   - 确认用户名密码正确

2. **查询超时**
   - 检查SQL语句是否正确
   - 考虑添加索引优化查询
   - 调整查询超时设置

3. **数据显示异常**
   - 确认数据编码设置
   - 检查字段类型映射
   - 验证数据完整性

### 日志查看
- 后端日志：`logs/`目录下
- 前端控制台：浏览器开发者工具
- 网络请求：浏览器Network面板

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交代码变更
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：
- 创建Issue
- 发送邮件
- 提交反馈

---

*本项目基于template脚手架构建，提供类似Navicat Premium的数据库管理体验。*