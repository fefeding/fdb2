#!/usr/bin/env node

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 处理 ES Module 中没有 __dirname 和 __filename 的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志文件路径 - 使用绝对路径
const logFilePath = path.resolve(__dirname, 'server.log');

// 重定向控制台输出到日志文件
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// 保存原始的 console.log 和 console.error
const originalLog = console.log;
const originalError = console.error;

// 重写 console.log
console.log = function(...args) {
  const output = args.join(' ') + '\n';
  logStream.write(output);
  originalLog.apply(console, args);
};

// 重写 console.error
console.error = function(...args) {
  const output = args.join(' ') + '\n';
  logStream.write(output);
  originalError.apply(console, args);
};

// 创建 express 应用
const app = express();

// 静态文件目录
const staticDir = path.join(__dirname, 'dist');

// 解析 JSON 请求体
app.use(express.json());

// 设置 CORS 头
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 处理 API 请求
app.use('/api/', async (req, res, next) => {
  if (req.method === 'POST') {
    try {
      // 使用动态导入，并确保将 CommonJS 模块转换为 ES 模块
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      
      // 使用 require 加载 CommonJS 模块（.cjs 扩展名）
      const serverModule = require('./dist/server/index.cjs');
      const handleDatabaseRoutes = serverModule.handleDatabaseRoutes;
      
      // 调用 handleDatabaseRoutes 函数处理请求
      const result = await handleDatabaseRoutes(req.originalUrl, req.body);
      
      // 返回处理结果
      res.status(200).json({
        ret: 0,
        msg: 'success',
        data: result
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        ret: 500,
        msg: error.message || 'Internal server error'
      });
    }
  } else {
    next();
  }
});

// 配置静态文件目录
app.use(express.static(staticDir));

// 所有未匹配的路由都指向 index.html
app.use((req, res) => {
  const indexPath = path.join(staticDir, 'view', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send('Error loading index.html');
    }
  });
});

// 解析命令行参数获取端口
let portFromArgs;
for (let i = 0; i < process.argv.length; i++) {
  if ((process.argv[i] === '--port' || process.argv[i] === '-p') && process.argv[i + 1]) {
    portFromArgs = parseInt(process.argv[i + 1]);
    break;
  }
}

// 启动服务器
const PORT = portFromArgs || process.env.PORT || 9300;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  
  // 将 PID 写入 PID 文件
  const pidFilePath = path.join(__dirname, 'server.pid');
  fs.writeFileSync(pidFilePath, process.pid.toString());
  console.log(`PID ${process.pid} written to ${pidFilePath}`);
});

// 处理进程退出事件，关闭日志流
process.on('exit', () => {
  logStream.end();
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  logStream.end();
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  logStream.end();
  process.exit(1);
});