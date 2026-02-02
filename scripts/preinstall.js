const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('Checking for running fdb2 instances...');

try {
  let pid = null;

  // 检查当前目录的 PID 文件
  const currentDirPidPath = path.join(process.cwd(), 'fdb2.server.pid');
  if (fs.existsSync(currentDirPidPath)) {
    try {
      pid = parseInt(fs.readFileSync(currentDirPidPath, 'utf8'));
      process.kill(pid, 0);
      console.log('Found running fdb2 instance with PID:', pid);
    } catch (error) {
      if (error.code !== 'ESRCH') {
        throw error;
      }
    }
  }

  // 如果没有找到，尝试从全局安装目录查找
  if (!pid) {
    try {
      const globalPath = execSync('npm root -g', { encoding: 'utf8' }).trim();
      const globalPidPath = path.join(globalPath, 'fdb2', 'fdb2.server.pid');
      
      if (fs.existsSync(globalPidPath)) {
        try {
          pid = parseInt(fs.readFileSync(globalPidPath, 'utf8'));
          process.kill(pid, 0);
          console.log('Found running fdb2 instance with PID:', pid);
        } catch (error) {
          if (error.code !== 'ESRCH') {
            throw error;
          }
        }
      }
    } catch (error) {
      // 忽略全局路径查找失败
    }
  }

  // 如果找到了运行中的进程，尝试停止它
  if (pid) {
    console.log('Stopping fdb2...');
    
    try {
      if (os.platform() === 'win32') {
        // Windows: 使用 taskkill
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
      } else {
        // Unix-like: 使用 kill
        process.kill(pid, 'SIGTERM');
        
        // 等待进程结束
        let attempts = 0;
        while (attempts < 10) {
          try {
            process.kill(pid, 0);
            attempts++;
            // 等待 100ms
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
          } catch (error) {
            if (error.code === 'ESRCH') {
              // 进程已结束
              break;
            }
          }
        }
        
        // 如果进程还在运行，强制终止
        try {
          process.kill(pid, 0);
          process.kill(pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') {
            throw error;
          }
        }
      }
      
      console.log('fdb2 stopped successfully');
    } catch (stopError) {
      console.warn('Failed to stop fdb2:', stopError.message);
      console.warn('Please manually stop the fdb2 process before installation');
    }
  } else {
    console.log('No running fdb2 instance found');
  }

  // 清理 PID 文件
  if (fs.existsSync(currentDirPidPath)) {
    fs.unlinkSync(currentDirPidPath);
  }
  
  try {
    const globalPath = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const globalPidPath = path.join(globalPath, 'fdb2', 'fdb2.server.pid');
    if (fs.existsSync(globalPidPath)) {
      fs.unlinkSync(globalPidPath);
    }
  } catch (error) {
    // 忽略全局路径清理失败
  }

} catch (error) {
  console.warn('Pre-install check failed:', error.message);
}
