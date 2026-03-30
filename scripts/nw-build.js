const nwbuilder = require('nw-builder');
const { resolve, join } = require('path');
const { copyFileSync, existsSync, readdirSync } = require('fs');

const projectRoot = resolve(__dirname, '..');

const args = process.argv.slice(2);
const targetPlatform = args.find(arg => arg.startsWith('--platform='))?.split('=')[1];

const supportedPlatforms = ['win', 'osx', 'linux'];

function getCurrentPlatform() {
  const platform = process.platform;
  if (platform === 'darwin') return ['osx'];
  if (platform === 'linux') return ['linux'];
  return ['win', 'linux'];
}

function getAppConfig(platform) {
  const config = {
    icon: resolve(projectRoot, 'public', 'favicon.ico')
  };

  if (platform === 'osx') {
    config.LSApplicationCategoryType = 'public.app-category.productivity';
    config.NSHumanReadableCopyright = 'Copyright © 2025';
    config.NSLocalNetworkUsageDescription = '需要网络访问以连接数据库';
    config.CFBundleIdentifier = 'com.fdb.database';
    config.CFBundleName = '数据库管理工具';
    config.CFBundleDisplayName = '数据库管理工具';
    config.CFBundleShortVersionString = '1.0.1';
    config.CFBundleVersion = '1.0.1';
  }

  return config;
}

async function buildPlatform(platform) {
  const outDir = resolve(projectRoot, `release/fdb2-${platform}`);
  console.log(`\n========================================`);
  console.log(`开始构建 ${platform} 平台...`);
  console.log(`========================================`);

  const buildOptions = {
    mode: 'build',
    srcDir: resolve(projectRoot, 'dist'),
    version: '0.78.1',
    flavor: 'normal',
    platform: platform,
    arch: 'x64',
    outDir: outDir,
    cacheDir: resolve(projectRoot, 'nw-cache'),
    downloadUrl: 'https://github.com/nwjs/nw.js/releases/download/v0.78.1',
    zip: false,
    logLevel: 'info',
    glob: false,
    app: getAppConfig(platform)
  };

  await nwbuilder.default(buildOptions);

  const packagedPath = join(outDir, platform, 'x64', 'package.nw', 'node_modules');
  if (existsSync(packagedPath)) {
    console.log(`✅ ${platform} 应用程序已包含 node_modules 目录 (${readdirSync(packagedPath).length} 个包)`);
  } else {
    console.log(`⚠️  ${platform} 应用程序不包含 node_modules 目录`);
  }

  console.log(`✅ ${platform} 平台构建完成 -> ${outDir}`);
}

async function build() {
  try {
    console.log('开始构建 NW.js 应用...\n');

    console.log('1. 构建 Vue 应用...');
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });

    console.log('\n2. 复制 package.json 到 dist 目录...');
    copyFileSync(
      join(projectRoot, 'package.json'),
      join(projectRoot, 'dist', 'package.json')
    );

    console.log('\n3. 安装 npm 依赖到 dist 目录...');
    const distPath = resolve(projectRoot, 'dist');
    execSync('pnpm install --only=production', {
      stdio: 'inherit',
      cwd: distPath
    });

    if (!existsSync(join(distPath, 'node_modules'))) {
      throw new Error('npm install 失败');
    }
    console.log('npm 依赖安装成功\n');

    console.log('4. 配置 NW.js 构建参数...');

    let platformsToBuild = [];

    if (targetPlatform) {
      if (targetPlatform === 'all') {
        platformsToBuild = supportedPlatforms;
        console.log(`构建所有支持平台: ${supportedPlatforms.join(', ')}`);
      } else if (supportedPlatforms.includes(targetPlatform)) {
        platformsToBuild = [targetPlatform];
        console.log(`构建指定平台: ${targetPlatform}`);
      } else {
        console.error(`不支持的平台: ${targetPlatform}`);
        console.log(`支持的平台: ${supportedPlatforms.join(', ')} 或 all`);
        process.exit(1);
      }
    } else {
      platformsToBuild = getCurrentPlatform();
      console.log(`未指定平台，自动使用当前平台: ${platformsToBuild}`);
    }

    console.log(`输出目录: ${resolve(projectRoot, 'release')}`);

    for (const platform of platformsToBuild) {
      await buildPlatform(platform);
    }

    console.log('\n========================================');
    console.log('🎉 所有平台构建完成！');
    console.log('========================================');
    console.log(`输出目录: ${resolve(projectRoot, 'release')}`);

  } catch (error) {
    console.error('构建过程中出错:', error);
    process.exit(1);
  }
}

build();