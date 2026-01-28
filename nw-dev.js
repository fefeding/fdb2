const { exec } = require('child_process');
const { createServer } = require('http');
const { join, resolve } = require('path');

// 启动 Vite 开发服务器
const viteProcess = exec('npm run dev', (error, stdout, stderr) => {
  if (error) {
    console.error(`执行 npm run dev 时出错: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});

viteProcess.stdout.on('data', (data) => {
  console.log(data);
  // 当 Vite 服务器启动成功后，启动 NW.js
  if (data.includes('ready')) {
    setTimeout(() => {
      console.log('starting NW.js...', 'npx nw . --url=http://localhost:9300');
      const nwProcess = exec('npx nw . --url=http://localhost:9300', (error, stdout, stderr) => {
        if (error) {
          console.error(`启动 NW.js 时出错: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      });

      nwProcess.stdout.on('data', (data) => {
        console.log(data);
      });

      nwProcess.stderr.on('data', (data) => {
        console.error(data);
      });

      nwProcess.on('close', (code) => {
        console.log(`NW.js 进程退出，代码: ${code}`);
        viteProcess.kill();
      });

      // 处理退出信号
      process.on('SIGINT', () => {
        nwProcess.kill();
        viteProcess.kill();
        process.exit();
      });

      process.on('SIGTERM', () => {
        nwProcess.kill();
        viteProcess.kill();
        process.exit();
      });
    }, 2000);
  }
});

viteProcess.stderr.on('data', (data) => {
  console.error(data);
});

viteProcess.on('close', (code) => {
  console.log(`Vite 进程退出，代码: ${code}`);
});
