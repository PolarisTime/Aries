import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function getNodeModulePackageName(id: string) {
  const normalizedId = id.replace(/\\/g, '/')
  const marker = '/node_modules/'
  const startIndex = normalizedId.lastIndexOf(marker)

  if (startIndex === -1) {
    return null
  }

  const normalized = normalizedId.slice(startIndex + marker.length)
  const segments = normalized.split('/')
  if (segments[0]?.startsWith('@')) {
    return `${segments[0]}/${segments[1]}`
  }

  return segments[0] || null
}

function toChunkName(prefix: string, value: string) {
  return `${prefix}-${value.replace(/^@/, '').replace(/[\\/]/g, '-')}`
}

function resolveAntdChunk(id: string) {
  const match = id.match(/\/antd\/(?:es|lib)\/([^/]+)/)
  const segment = match?.[1]

  if (!segment || segment.endsWith('.js')) {
    return 'antd-shared'
  }

  if (
    segment === '_util' ||
    segment === 'config-provider' ||
    segment === 'locale' ||
    segment === 'style' ||
    segment === 'theme' ||
    segment === 'version'
  ) {
    return 'antd-shared'
  }

  return toChunkName('antd', segment)
}

function resolveVendorChunk(id: string) {
  const normalizedId = id.replace(/\\/g, '/')
  const pkg = getNodeModulePackageName(id)
  if (!pkg) {
    return undefined
  }

  if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') {
    return 'react-core'
  }

  if (pkg.startsWith('@tanstack/')) {
    return 'tanstack'
  }

  if (pkg === 'antd') {
    return resolveAntdChunk(normalizedId)
  }

  if (pkg === '@ant-design/icons' || pkg === '@ant-design/icons-svg') {
    return 'antd-icons'
  }

  if (
    pkg === '@ant-design/cssinjs' ||
    pkg === '@ant-design/colors' ||
    pkg === '@ant-design/fast-color' ||
    pkg === '@ctrl/tinycolor'
  ) {
    return 'antd-style'
  }

  if (pkg.startsWith('@rc-component/') || pkg.startsWith('rc-')) {
    return 'antd-rc'
  }

  if (pkg.startsWith('@ant-design/')) {
    return toChunkName('antd', pkg)
  }

  if (pkg === 'i18next' || pkg === 'react-i18next') {
    return 'i18n'
  }

  if (pkg === 'dayjs') {
    return 'dayjs'
  }

  if (pkg === 'axios') {
    return 'network'
  }

  if (pkg === 'zod') {
    return 'validation'
  }

  if (pkg === 'xlsx') {
    return 'spreadsheet'
  }

  if (
    normalizedId.includes('/src/views/modules/') ||
    normalizedId.includes('/src/views/dashboard/')
  ) {
    return 'business'
  }

  return toChunkName('vendor', pkg)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3100,
      proxy: env.VITE_PROXY_TARGET
        ? {
            '^/api(?:/|$)': {
              target: env.VITE_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: resolveVendorChunk,
        },
      },
    },
  }
})
