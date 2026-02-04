const nwbuilder = require('nw-builder');
const { resolve, join } = require('path');
const { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } = require('fs');

// 解析命令行参数
const args = process.argv.slice(2);
const targetPlatform = args.find(arg => arg.startsWith('--platform='))?.split('=')[1];

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

    // 根据命令行参数或当前操作系统确定要构建的平台
    let platform;
    if (targetPlatform) {
      platform = targetPlatform;
      console.log(`使用命令行指定的平台: ${platform}`);
    } else {
      platform = process.platform === 'darwin' ? 'osx' :
                process.platform === 'linux' ? 'linux' : 'win';
      console.log(`使用当前操作系统平台: ${platform}`);
    }

    // 为每个平台使用不同的输出目录
    const outDir = resolve(__dirname, `nw-build-${platform}`);
    console.log(`输出目录: ${outDir}`);

    console.log(`\n正在构建 ${platform} 平台...`);

    const buildOptions = {
      mode: 'build',
      srcDir: distPath,
      version: '0.78.1',
      flavor: 'normal',
      platform: platform,
      arch: 'x64',
      outDir: outDir,
      cacheDir: resolve(__dirname, 'nw-cache'),
      downloadUrl: 'https://dl.nwjs.io',
      zip: false,
      logLevel: 'info',
      glob: false,
      app: {
        icon: resolve(__dirname, 'public', 'favicon.ico')
      }
    };

    // macOS 平台需要额外的配置
    if (platform === 'osx') {
      buildOptions.app.LSApplicationCategoryType = 'public.app-category.productivity';
      buildOptions.app.NSHumanReadableCopyright = 'Copyright © 2025';
      buildOptions.app.NSLocalNetworkUsageDescription = '需要网络访问以连接数据库';
      buildOptions.app.CFBundleIdentifier = 'com.fdb.database';
      buildOptions.app.CFBundleName = '数据库管理工具';
      buildOptions.app.CFBundleDisplayName = '数据库管理工具';
      buildOptions.app.CFBundleShortVersionString = '1.0.0';
      buildOptions.app.CFBundleVersion = '1.0.0';
    }

    await nwbuilder.default(buildOptions);

    console.log(`✅ ${platform} 平台构建完成`);

    console.log('\n5. 打包完成！');
    console.log(`应用已生成在: ${outDir}`);

    // 验证打包后的应用程序
    const packagedNodeModulesPath = join(outDir, platform, 'x64', 'package.nw', 'node_modules');
    if (existsSync(packagedNodeModulesPath)) {
      console.log(`✅ ${platform} 应用程序已包含 node_modules 目录`);
      console.log(`✅ ${platform} 依赖包数量:`, readdirSync(packagedNodeModulesPath).length, '个');
    } else {
      console.warn(`⚠️  ${platform} 应用程序不包含 node_modules 目录`);
    }

  } catch (error) {
    console.error('构建过程中出错:', error);
    process.exit(1);
  }
}

// 开始构建
build();
