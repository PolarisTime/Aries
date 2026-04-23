import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMock =
    env.VITE_USE_MOCK === 'true' ||
    (mode === 'development' && env.VITE_USE_MOCK !== 'false')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3100,
      proxy: !useMock && env.VITE_PROXY_TARGET
        ? {
            '/jshERP-boot': {
              target: env.VITE_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          modifyVars: {
            'primary-color': '#2458e6',
            'border-radius-base': '10px',
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('ag-grid-community') || id.includes('ag-grid-vue3')) {
              return 'grid'
            }

            if (id.includes('ant-design-vue') || id.includes('@ant-design/icons-vue')) {
              return 'antd'
            }

            if (
              id.includes('/vue/') ||
              id.includes('vue-router') ||
              id.includes('pinia') ||
              id.includes('@tanstack/vue-query')
            ) {
              return 'vue'
            }
          },
        },
      },
    },
  }
})
