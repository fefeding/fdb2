// 构建脚本：将扩展宿主（含 db_tool/server 后端）打包为 CJS，供 VSCode 扩展宿主加载。
//
// 用法：
//   node esbuild.js              单次构建（npm run compile）
//   node esbuild.js --watch      持续构建（npm run watch）
//   node esbuild.js --production 生产构建（npm run vscode:prepublish）
//
// 说明：
//  - 后端 server/（TypeORM + 各数据库方言服务）直接被宿主打包复用，无需起 HTTP 服务。
//  - 纯 JS 依赖（typeorm / mysql2 / pg / mongodb 等）一并打包进 dist/extension.js。
//  - 原生模块（oracledb / better-sqlite3 / sqlite3 / @sap/hana-client）保持 external，
//    运行时从本扩展的 node_modules 加载，并需针对 VSCode 宿主 Node ABI 编译。
const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

async function build() {
  const base = {
    bundle: true,
    sourcemap: !production,
    minify: production,
    logLevel: 'info',
    legalComments: 'none'
  };

  const ctx = await esbuild.context({
    ...base,
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    outfile: path.join(__dirname, 'dist', 'extension.js'),
    external: [
      'vscode',
      // 原生模块：运行时从 node_modules 加载，不能打包
      'oracledb',
      'better-sqlite3',
      'sqlite3',
      '@sap/hana-client'
    ],
    banner: {
      js: "try { require('reflect-metadata'); } catch (e) {}"
    },
    format: 'cjs',
    platform: 'node',
    target: 'node16'
  });

  if (watch) {
    await ctx.watch();
    console.log('[esbuild] watching for changes… (press Ctrl+C to stop)');
    console.log('[esbuild] 调试：在 VSCode 中按 F5 选择 "Run Extension (watch)"；');
    console.log('[esbuild] 改代码后在扩展开发宿主窗口按 Ctrl/Cmd+R 刷新即可生效。');
    return;
  }

  await ctx.rebuild();
  await ctx.dispose();
  console.log('[esbuild] build complete.');
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
