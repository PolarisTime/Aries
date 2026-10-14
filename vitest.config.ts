import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

import { resolveBuildMoment } from './src/utils/buildInfo.ts'

export default defineConfig({
  // 与 vite 构建同一条注入口径: 用例据此断言"被注入的编译时刻是真实值、不是占位/哨兵"。
  define: {
    __APP_BUILD_TIME__: JSON.stringify(
      resolveBuildMoment(process.env.VITE_APP_BUILD_TIME),
    ),
  },
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
