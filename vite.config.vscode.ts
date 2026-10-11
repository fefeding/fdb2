import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 与 vite.config.ts 一致：从 package.json 注入版本号（layout.vue 等组件直接读取 __APP_VERSION__）
const appVersion = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')).version;

// 开发调试保留未压缩 + sourcemap；发布（vsce package）前用 `vite build --config vite.config.vscode.ts --minify`
const minify = process.argv.includes('--minify') || process.env.VSCODE_WEBVIEW_MINIFY === '1';

/**
 * VSCode WebView 构建配置（单入口 IIFE）。
 * 所有面板（连接 / 查询 / 浏览器 / 表数据 / 表结构）打包为同一份 main.js，
 * 由宿主注入的 window.__PANEL_TYPE__ 决定挂载哪个 Vue 组件。
 */
export default defineConfig({
  plugins: [vue()],

  // 不把根目录 public/（Electron 资源）拷贝进 WebView 产物
  publicDir: false,

  build: {
    outDir: 'packages/vscode/resources/webview',
    emptyOutDir: true,
    target: 'es2020',
    minify,
    sourcemap: !minify,
    // 把字体等静态资源内联为 data URI，避免 VSCode webview 下外部资源路径无法解析（图标 404）
    assetsInlineLimit: 100000000,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'src/platform/vscode/entry/index.ts')
      },
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: 'main.[hash].js',
        assetFileNames: 'main.[ext]',
        format: 'iife'
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },

  define: {
    __VS_CODE_ENV__: 'true',
    __APP_VERSION__: JSON.stringify(appVersion),
    'process.env.NODE_ENV': '"production"'
  }
});
