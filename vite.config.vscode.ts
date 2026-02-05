import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * VSCode WebView 构建配置
 */
export default defineConfig({
  plugins: [vue()],

  build: {
    outDir: 'packages/vscode/resources/webview',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        connection: path.resolve(__dirname, 'src/platform/vscode/entry/connection.ts'),
        query: path.resolve(__dirname, 'src/platform/vscode/entry/query.ts'),
        database: path.resolve(__dirname, 'src/platform/vscode/entry/database.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        formats: ['iife']
      }
    },
    target: 'es2020',
    minify: false, // 不压缩以便调试
    sourcemap: true
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },

  // 环境变量
  define: {
    __VS_CODE_ENV__: 'true',
    'process.env.NODE_ENV': '"production"'
  }
});
