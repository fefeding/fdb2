import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    minify: false,
    sourcemap: true,
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
    'process.env.NODE_ENV': '"production"'
  }
});
