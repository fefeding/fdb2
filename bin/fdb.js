#!/usr/bin/env node

import { exec, spawn, execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 获取当前文件的路径和目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'help';

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
  console.log('Starting FDB project...');
  
  // 命令和参数
  let cmd, args;
  
  // 根据不同的操作系统选择不同的命令
  if (process.platform === 'win32') {
    // Windows 系统
    cmd = 'cmd.exe';
    args = ['/c', 'npm', 'start'];
  } else {
    // Linux/macOS 系统
    cmd = 'npm';
    args = ['start'];
  }
  
  // 使用 npm start 命令启动服务器
  const result = spawnSync(cmd, args, {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  
  if (result.error) {
    console.error('Failed to start server:', result.error.message);
    process.exit(1);
  } else if (result.status === 0) {
    console.log('Server started successfully');
  } else {
    console.error('Failed to start server with code', result.status);
    process.exit(1);
  }
}

// 停止项目
function stopProject() {
  console.log('Stopping FDB project...');
  
  // 命令和参数
  let cmd, args;
  
  // 根据不同的操作系统选择不同的命令
  if (process.platform === 'win32') {
    // Windows 系统
    cmd = 'cmd.exe';
    args = ['/c', 'npm', 'stop'];
  } else {
    // Linux/macOS 系统
    cmd = 'npm';
    args = ['stop'];
  }
  
  // 使用 npm stop 命令停止服务器
  const result = spawnSync(cmd, args, {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  
  if (result.error) {
    console.error('Failed to stop server:', result.error.message);
    process.exit(1);
  } else if (result.status === 0) {
    console.log('Server stopped successfully');
  } else {
    console.log('No server processes found or failed to stop server with code', result.status);
    process.exit(0); // 即使没有找到进程，也认为操作成功
  }
}

// 重启项目
function restartProject() {
  console.log('Restarting FDB project...');
  
  // 命令和参数
  let cmd, args;
  
  // 根据不同的操作系统选择不同的命令
  if (process.platform === 'win32') {
    // Windows 系统
    cmd = 'cmd.exe';
    args = ['/c', 'npm', 'restart'];
  } else {
    // Linux/macOS 系统
    cmd = 'npm';
    args = ['restart'];
  }
  
  // 使用 npm restart 命令重启服务器
  const result = spawnSync(cmd, args, {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  
  if (result.error) {
    console.error('Failed to restart server:', result.error.message);
    process.exit(1);
  } else if (result.status === 0) {
    console.log('Server restarted successfully');
  } else {
    console.error('Failed to restart server with code', result.status);
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  console.log('FDB Database Tool');
  console.log('');
  console.log('Usage:');
  console.log('  fdb start    Start the project');
  console.log('  fdb stop     Stop the project');
  console.log('  fdb restart  Restart the project');
  console.log('');
}
