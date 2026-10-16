import { defineConfig } from 'vitest/config';

/**
 * 单元/属性测试配置（Node 侧纯逻辑：schema 引擎、query-builder 等）。
 * 独立于 vite.config.ts（web 构建），避免引入 vue 插件与浏览器环境。
 */
export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    environment: 'node',
    reporters: ['default']
  }
});
