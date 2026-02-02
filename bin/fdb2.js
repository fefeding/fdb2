#!/usr/bin/env node

const { exec, spawn, execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

// 启动项目
function startProject() {
  console.log('Starting FDB2 project...');
  
  // 检查 PID 文件是否存在，如果存在则说明服务器已经在运行
  const pidFilePath = path.join(projectRoot, 'server.pid');
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
  
  // 命令和参数
  let cmd, args;
  
  // 直接使用 node 命令启动服务器，传递端口参数
  cmd = 'node';
  args = ['server.js', '-p', port.toString()];
  
  console.log('Executing:', cmd, args);
  
  // 日志文件路径
  const logFilePath = path.join(projectRoot, 'server.log');
  
  // 创建日志文件的写入流
  const out = fs.openSync(logFilePath, 'a');
  const err = fs.openSync(logFilePath, 'a');
  
  // 使用 node 命令启动服务器（异步，后台运行）
  const child = spawn(cmd, args, {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', out, err]
  });
  
  // 解除父子进程关联，让子进程在后台独立运行
  child.unref();
  
  // 保存 PID 到文件
  fs.writeFileSync(pidFilePath, child.pid.toString());
  
  console.log('Logs are written to:', logFilePath);
  console.log('Server started successfully with PID:', child.pid);
  console.log('Server is running in the background');
  console.log(`Server is running at http://localhost:${port}`);
}

// 停止项目
function stopProject() {
  console.log('Stopping FDB2 project...');
  
  // 读取 PID 文件
  const pidFilePath = path.join(projectRoot, 'server.pid');
  
  if (!fs.existsSync(pidFilePath)) {
    console.log('No server process found (PID file not exists)');
    return;
  }
  
  try {
    // 读取 PID
    const pid = parseInt(fs.readFileSync(pidFilePath, 'utf8'));
    console.log(`Stopping server process with PID: ${pid}`);
    
    // 发送终止信号
    process.kill(pid);
    
    // 删除 PID 文件
    fs.unlinkSync(pidFilePath);
    console.log('Server stopped successfully');
  } catch (error) {
    // 如果进程不存在（ESRCH 错误），也删除 PID 文件
    if (error.code === 'ESRCH') {
      console.log('Server process not found, cleaning up PID file');
      if (fs.existsSync(pidFilePath)) {
        fs.unlinkSync(pidFilePath);
      }
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
    const pidFilePath = path.join(projectRoot, 'server.pid');
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
