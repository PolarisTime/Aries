import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { setupAuthInterceptors } from '@/api/auth/auth-interceptor'
import { http } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { router } from '@/router'
import '@/i18n'
import '@/styles/variables.css'
import '@/styles/global.css'

dayjs.locale('zh-cn')
setupAuthInterceptors(http.instance)

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
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              colorPrimary: '#2458e6',
              borderRadius: 10,
              fontSize: 12,
              fontFamily: '"PingFang Intranet", "PingFang SC", "Microsoft YaHei", sans-serif',
            },
          }}
        >
          <AntdApp>
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

  const root = document.getElementById('app')
  if (!root) throw new Error('Root element not found')

  createRoot(root).render(<App />)
}

bootstrap()
