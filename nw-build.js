const nwbuilder = require('nw-builder');
    const { resolve, join } = require('path');
    const { copyFileSync, existsSync, rmSync, readdirSync } = require('fs');

async function build() {
  try {
    console.log('开始构建 NW.js 应用...');
    
    // 首先构建 Vue 应用
    console.log('1. 构建 Vue 应用...');
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('2. 复制 package.json 到 dist 目录...');
    const srcPackageJson = join(__dirname, 'package.json');
    const destPackageJson = join(__dirname, 'dist', 'package.json');
    if (existsSync(srcPackageJson)) {
      copyFileSync(srcPackageJson, destPackageJson);
      console.log('package.json 复制成功');
    } else {
      throw new Error('未找到 package.json 文件');
    }

    console.log('3. 安装 npm 依赖到 dist 目录...');
    // 使用绝对路径执行 npm install 命令
    const distPath = resolve(__dirname, 'dist');
    console.log('Dist 路径:', distPath);
    
    // 执行 npm install 命令
    execSync('pnpm install --only=production', { 
      stdio: 'inherit', 
      cwd: distPath 
    });
    
    // 检查 node_modules 目录是否创建成功
    const nodeModulesPath = join(distPath, 'node_modules');
    if (existsSync(nodeModulesPath)) {
      console.log('npm 依赖安装成功');
      console.log('node_modules 目录大小:', readdirSync(nodeModulesPath).length, '个包');
    } else {
      throw new Error('npm install 失败，node_modules 目录未创建');
    }

    console.log('4. 配置 NW.js 构建参数...');
    
    nwbuilder.default({
      mode: 'build',
      srcDir: distPath, // 指向构建后的 Vue 应用
      version: '0.78.1', // 稳定的 NW.js 版本
      flavor: 'normal', // 标准版本，包含 Node.js
      platform: 'win', // 目标平台
      arch: 'x64', // 架构
      outDir: resolve(__dirname, 'nw-build'), // 输出目录
      cacheDir: resolve(__dirname, 'nw-cache'), // 缓存目录
      zip: false, // 不创建 ZIP 文件
      downloadUrl: 'https://dl.nwjs.io', // 下载源
      logLevel: 'info',
      glob: false, // 禁用 glob，直接查找 srcDir 下的 package.json
      app: {
        icon: resolve(__dirname, 'public', 'favicon.ico') // 添加应用图标配置
      }
    });

    console.log('5. 打包完成！');
    console.log(`应用已生成在: ${resolve(__dirname, 'nw-build')}`);
    
    // 验证打包后的应用程序是否包含 node_modules 目录
    const packagedNodeModulesPath = join(__dirname, 'nw-build', 'package.nw', 'node_modules');
    if (existsSync(packagedNodeModulesPath)) {
      console.log('✅ 应用程序已包含 node_modules 目录');
      console.log('✅ 依赖包数量:', readdirSync(packagedNodeModulesPath).length, '个');
    } else {
      console.warn('⚠️  应用程序不包含 node_modules 目录');
    }

  } catch (error) {
    console.error('构建过程中出错:', error);
    process.exit(1);
  }
}

// 开始构建
build();
