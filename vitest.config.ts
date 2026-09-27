import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    // 显式固定为 test: 若外层环境带 NODE_ENV=production(部分容器/CI/agent 沙箱),
    // React 会解析到 production 构建(其中不导出 act), 导致所有渲染型测试报
    // "act is not a function" 而整体失败。
    env: {
      NODE_ENV: 'test',
    },
  },
})
