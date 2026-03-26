#!/usr/bin/env node

const { exec, spawn, execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'help';
const commandArgs = args.slice(1); // 获取除了命令之外的所有参数

// 处理不同的命令
switch (command) {
  case 'start':
    startProject();
    break;
  case 'stop':
    stopProject();
    break;
  case 'restart':
    restartProject();
    break;
  default:
    showHelp();
    break;
}

// 检查端口是否可用
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// 查找可用端口
async function findAvailablePort(startPort) {
  let port = startPort;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    attempts++;
    port++;
  }
  
  throw new Error(`无法找到可用端口，已尝试 ${maxAttempts} 次`);
}

// 启动项目
async function startProject() {
  console.log('Starting FDB2 project...');
  
  // 检查 PID 文件是否存在，如果存在则说明服务器已经在运行
  const pidFilePath = path.join(projectRoot, 'fdb2.server.pid');
  if (fs.existsSync(pidFilePath)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFilePath, 'utf8'));
      process.kill(pid, 0);
      console.log('Server is already running with PID:', pid);
      return;
    } catch (error) {
      if (error.code === 'ESRCH') {
        console.log('Cleaning up stale PID file...');
        fs.unlinkSync(pidFilePath);
      }
    }
  }
  
  // 解析端口参数
  let port = 9800;
  const portIndex = commandArgs.findIndex(arg => arg === '-p' || arg === '--port');
  if (portIndex !== -1 && commandArgs[portIndex + 1]) {
    port = parseInt(commandArgs[portIndex + 1]);
  }
  
  // 查找可用端口
  console.log(`Checking port ${port} availability...`);
  try {
    port = await findAvailablePort(port);
    if (port !== parseInt(commandArgs[portIndex + 1] || 9800)) {
      console.log(`Port ${commandArgs[portIndex + 1] || 9800} is in use, using port ${port} instead`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  
  // 命令和参数
  let cmd, args;
  
  // 直接使用 node 命令启动服务器，传递端口参数
  cmd = 'node';
  args = ['server.js', '-p', port.toString()];
  
  console.log('Executing:', cmd, args);
  
  // 日志文件路径
  const logFilePath = path.join(projectRoot, 'server.log');
  
  // 安全地创建日志文件写入流，忽略错误
  function createLogFileStream(logFilePath) {
    try {
      const fd = fs.openSync(logFilePath, 'a');
      console.log(`Log file created: ${logFilePath}`);
      return fd;
    } catch (error) {
      console.warn(`Failed to create log file ${logFilePath}: ${error.message}`);
      console.warn('Logs will only be written to console.');
      return null;
    }
  }
  
  // 创建日志文件流
  const logFileFd = createLogFileStream(logFilePath);
  
  // 使用 node 命令启动服务器（异步，后台运行）
  const child = spawn(cmd, args, {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', logFileFd || 'inherit', logFileFd || 'inherit']
  });
  
  // 解除父子进程关联，让子进程在后台独立运行
  child.unref();
  
  // 保存 PID 到文件
  try {
    fs.writeFileSync(pidFilePath, child.pid.toString());
  } catch (error) {
    console.warn(`Failed to write PID file ${pidFilePath}: ${error.message}`);
  }
  
  if (logFileFd) {
    console.log('Logs are written to:', logFilePath);
  } else {
    console.log('Logs are written to console only');
  }
  console.log('Server started successfully with PID:', child.pid);
  console.log('Server is running in the background');
  console.log(`Server is running at http://localhost:${port}`);
}

// 停止项目
function stopProject() {
  console.log('Stopping FDB2 project...');
  
  // 读取 PID 文件
  const pidFilePath = path.join(projectRoot, 'fdb2.server.pid');
  
  if (!fs.existsSync(pidFilePath)) {
    console.log('No server process found (PID file not exists)');
    return;
  }
  
  try {
    // 读取 PID
    const pid = parseInt(fs.readFileSync(pidFilePath, 'utf8'));
    console.log(`Stopping server process with PID: ${pid}`);
    
    // 发送终止信号 - 尝试不同的信号
    try {
      // 首先尝试 SIGTERM (15) - 正常终止
      process.kill(pid, 'SIGTERM');
      console.log('SIGTERM signal sent');
      
      // 等待一段时间（2秒）
      const startTime = Date.now();
      const maxWaitTime = 2000; // 2秒
      let processExists = true;
      
      while (Date.now() - startTime < maxWaitTime) {
        try {
          // 检查进程是否还存在
          process.kill(pid, 0);
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100); // 等待100ms
        } catch (err) {
          if (err.code === 'ESRCH') {
            processExists = false;
            break;
          }
        }
      }
      
      // 如果进程仍然存在，尝试 SIGKILL (9) - 强制终止
      if (processExists) {
        console.log('Process still exists, sending SIGKILL...');
        try {
          process.kill(pid, 'SIGKILL');
          console.log('SIGKILL signal sent');
          
          // 再等待500ms
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
        } catch (killErr) {
          // SIGKILL 失败可能表示我们没有权限
          if (killErr.code === 'EPERM') {
            console.error('Insufficient permissions to kill process');
            console.error('Try running with sudo or manually kill the process:');
            console.error(`  sudo kill -9 ${pid}`);
          }
          throw killErr;
        }
      }
    } catch (killError) {
      // 如果 kill 操作失败，检查错误类型
      if (killError.code === 'EPERM') {
        // 权限不足
        console.error('Insufficient permissions to kill process');
        console.error('Try running with sudo or manually kill the process:');
        console.error(`  sudo kill -9 ${pid}`);
        throw killError;
      } else if (killError.code === 'ESRCH') {
        // 进程不存在
        console.log('Process not found');
      } else {
        throw killError;
      }
    }
    
    // 删除 PID 文件
    try {
      fs.unlinkSync(pidFilePath);
      console.log('PID file removed');
    } catch (unlinkError) {
      console.warn(`Failed to remove PID file: ${unlinkError.message}`);
    }
    
    console.log('Server stopped successfully');
  } catch (error) {
    // 如果进程不存在（ESRCH 错误），也删除 PID 文件
    if (error.code === 'ESRCH') {
      console.log('Server process not found, cleaning up PID file');
      if (fs.existsSync(pidFilePath)) {
        try {
          fs.unlinkSync(pidFilePath);
        } catch (e) {
          // 忽略删除失败
        }
      }
    } else if (error.code === 'EPERM') {
      // 权限不足的错误已经在上面处理过
      console.error('Cannot stop server due to insufficient permissions');
    } else {
      console.error('Failed to stop server:', error.message);
    }
  }
}

// 重启项目
function restartProject() {
  console.log('Restarting FDB2 project...');
  
  // 先停止当前运行的进程
  try {
    stopProject();
  } catch (error) {
    // 即使停止失败，也继续尝试启动新的进程
    console.log('Continuing to start new server process...');
  }
  
  // 等待一段时间，确保进程已经停止
  // 使用同步的方式等待
  console.log('Waiting for server process to stop...');
  for (let i = 0; i < 10; i++) {
    // 检查 PID 文件是否存在
    const pidFilePath = path.join(projectRoot, 'fdb2.server.pid');
    if (!fs.existsSync(pidFilePath)) {
      break;
    }
    // 等待 100 毫秒
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  
  // 启动新的进程
  startProject();
}

// 显示帮助信息
function showHelp() {
  console.log('FDB2 Database Tool');
  console.log('');
  console.log('Usage:');
  console.log('  fdb2 start    Start the project');
  console.log('  fdb2 stop     Stop the project');
  console.log('  fdb2 restart  Restart the project');
  console.log('');
}
