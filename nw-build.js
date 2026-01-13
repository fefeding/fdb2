import nwbuild from 'nw-builder';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

async function build() {
  try {
    console.log('开始构建 NW.js 应用...');
    
    // 首先构建 Vue 应用
    console.log('1. 构建 Vue 应用...');
    const { execSync } = await import('child_process');
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

    console.log('3. 配置 NW.js 构建参数...');
    
    await nwbuild({
      mode: 'build',
      srcDir: resolve(__dirname, 'dist'), // 指向构建后的 Vue 应用
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

    console.log('4. 打包完成！');
    console.log(`应用已生成在: ${resolve(__dirname, 'nw-build')}`);

  } catch (error) {
    console.error('构建过程中出错:', error);
    process.exit(1);
  }
}

// 开始构建
build();
