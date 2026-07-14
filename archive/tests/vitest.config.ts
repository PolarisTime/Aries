import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'forks',
    testTimeout: 10000,
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    // TODO: fix missing finance-reports module in excluded tests, then remove from this list
    exclude: [
      'tests/**',
      'src/mock/**',
      'node_modules/**',
      'dist/**',
      'src/config/__tests__/finance-reports-config.spec.ts',
      'src/views/modules/__tests__/module-display-switch-config.spec.ts',
    ],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
