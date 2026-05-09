import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'dayjs/locale/zh-cn'
import { useAuthAppSync } from '@/hooks/useAuthAppSync'
import { router } from '@/router'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { buildAntdTheme } from '@/styles/antd-theme'
import { AntdAppBridge } from '@/utils/antd-app'
import '@/i18n'
import '@/styles/variables.css'
import '@/styles/global.css'

dayjs.locale('zh-cn')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})

function App() {
  useAuthAppSync()

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={zhCN}
          theme={buildAntdTheme({
            cssVarKey: 'aries',
            borderRadius: 8,
            fontSize: 12,
          })}
        >
          <AntdApp>
            <AntdAppBridge />
            <RouterProvider router={router} />
          </AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

async function bootstrap() {
  try {
    await useAuthStore.getState().restoreSession()
  } catch {
    // session restore failed, proceed to login
  }

  // Route guards run before React effects. Prime permissions from the
  // restored auth user here so deep links are not redirected incorrectly.
  usePermissionStore.getState().syncFromUser(useAuthStore.getState().user)

  const root = document.getElementById('app')
  if (!root) throw new Error('Root element not found')

  createRoot(root).render(<App />)
}

bootstrap()
