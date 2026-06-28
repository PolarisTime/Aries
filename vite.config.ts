import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version?: string }
const appVersion = packageJson.version || '0.0.0'

const INITIAL_HTML_ANTD_PRELOAD_ALLOWLIST = new Set([
  'antd-button',
  'antd-avatar',
  'antd-dropdown',
  'antd-menu',
  'antd-tag',
])

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

function resolveAntdChunkName(id: string) {
  const normalizedId = id.replace(/\\/g, '/')
  const match = normalizedId.match(/\/antd\/(?:es|lib)\/([^/]+)/)
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

function shouldKeepInitialHtmlPreload(dep: string) {
  if (
    dep.includes('/react-core-') ||
    dep.includes('/tanstack-') ||
    dep.includes('/i18n-') ||
    dep.includes('/vendor-zustand-') ||
    dep.includes('/storage-') ||
    dep.includes('/preload-helper-') ||
    dep.includes('/rolldown-runtime-')
  ) {
    return true
  }

  const antdChunk = dep.match(/\/(antd-[^/]+)-[^/]+\.js$/)?.[1]
  if (antdChunk) {
    return INITIAL_HTML_ANTD_PRELOAD_ALLOWLIST.has(antdChunk)
  }

  return false
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler', { target: '19' }]],
        },
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    server: {
      host: '0.0.0.0',
      port: 3100,
      warmup: {
        clientFiles: [
          'src/main.tsx',
          'src/router/index.ts',
          'src/api/client.ts',
        ],
      },
      proxy: env.VITE_PROXY_TARGET
        ? {
            '^/api(?:/|$)': {
              target: env.VITE_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    preview: {
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
      target: 'esnext',
      cssMinify: 'lightningcss',
      chunkSizeWarningLimit: 900,
      modulePreload: {
        resolveDependencies(_filename, deps, context) {
          if (context.hostType !== 'html') {
            return deps
          }

          return deps.filter(shouldKeepInitialHtmlPreload)
        },
      },
      rolldownOptions: {
        output: {
          codeSplitting: {
            minSize: 20_000,
            groups: [
              {
                name: 'react-core',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 100,
              },
              {
                name: 'tanstack',
                test: /node_modules[\\/]@tanstack[\\/]/,
                priority: 90,
              },
              {
                name: 'i18n',
                test: /node_modules[\\/](i18next|react-i18next)[\\/]/,
                priority: 80,
              },
              {
                name: 'dayjs',
                test: /node_modules[\\/]dayjs[\\/]/,
                priority: 70,
              },
              {
                name: 'network',
                test: /node_modules[\\/]axios[\\/]/,
                priority: 60,
              },
              {
                name: 'validation',
                test: /node_modules[\\/]zod[\\/]/,
                priority: 60,
              },
              {
                name: 'spreadsheet',
                test: /node_modules[\\/]xlsx[\\/]/,
                priority: 60,
              },
              {
                name: 'vendor-zustand',
                test: /node_modules[\\/]zustand[\\/]/,
                priority: 50,
              },
              {
                name: (moduleId) => {
                  const pkg = getNodeModulePackageName(moduleId)
                  if (
                    pkg === '@ant-design/icons' ||
                    pkg === '@ant-design/icons-svg'
                  ) {
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

                  if (
                    pkg?.startsWith('@rc-component/') ||
                    pkg?.startsWith('rc-')
                  ) {
                    return 'antd-rc'
                  }

                  if (pkg === 'antd') {
                    return resolveAntdChunkName(moduleId)
                  }

                  if (pkg?.startsWith('@ant-design/')) {
                    return toChunkName('antd', pkg)
                  }

                  return null
                },
                minSize: 8_000,
                priority: 40,
              },
              {
                name: 'dashboard-flow',
                test: /src[\\/]views[\\/]dashboard[\\/](DashboardFlowCard|dashboard-flow-utils)\.tsx$/,
                minSize: 4_000,
                priority: 18,
              },
              {
                name: 'dashboard',
                test: /src[\\/]views[\\/]dashboard[\\/]/,
                minSize: 12_000,
                priority: 15,
              },
            ],
          },
        },
      },
    },
  }
})
