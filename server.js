#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');

// 预加载 sqlite3 模块，确保原生绑定文件能够正确加载
// 并将其缓存到全局模块缓存中，以便 dist/server/index.js 可以使用
try {
  const sqlite3 = require('sqlite3');
  console.log('SQLite3 module preloaded successfully');
  
  // 将 sqlite3 模块添加到全局 require.cache 中
  const Module = require('module');
  const sqlite3Path = require.resolve('sqlite3');
  
  // 修改模块解析函数，确保 sqlite3 从正确的路径加载
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function(request, parent) {
    if (request === 'sqlite3') {
      return sqlite3Path;
    }
    return originalResolveFilename.call(this, request, parent);
  };
} catch (error) {
  console.error('Warning: Failed to preload sqlite3 module:', error.message);
}

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
      const serverModule = require('./dist/server/index.js');
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

// 配置静态文件目录 - 只有 /public 请求指向 public 目录
app.use('/public', express.static(path.join(staticDir, 'public')));

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
const PORT = portFromArgs || process.env.PORT || 9800;
app.listen(PORT, () => {
  
  // 将 PID 写入 PID 文件
  const pidFilePath = path.join(__dirname, 'server.pid');
  fs.writeFileSync(pidFilePath, process.pid.toString());
  console.log(`PID ${process.pid} written to ${pidFilePath}`);
  
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
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