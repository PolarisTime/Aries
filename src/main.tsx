import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'
import { ensureApiClientSetup } from '@/api/client'
import { getInitialSetupStatus } from '@/api/setup'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { useSetupStore } from '@/stores/setupStore'
import { initWebVitals } from '@/utils/web-vitals'
import '@/i18n'
import '@/styles/variables.css'
import '@/styles/utilities.css'
import '@/styles/global.css'
import '@/styles/layout-shell.css'
import '@/styles/module-table.css'
import '@/styles/pages.css'
import '@/styles/layout.css'
import '@/styles/workspace-overlay.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

async function bootstrap() {
  ensureApiClientSetup()
  initWebVitals()

  void import('dayjs').then(async ({ default: dayjs }) => {
    await import('dayjs/locale/zh-cn')
    dayjs.locale('zh-cn')
  })

  const authStore = useAuthStore.getState()
  authStore.hydrate()

  // 并行执行会话恢复和初始化状态检查，减少阻塞时间
  const [, setupResult] = await Promise.allSettled([
    authStore.isAuthenticated
      ? authStore.restoreSession().catch(() => false)
      : Promise.resolve(false),
    getInitialSetupStatus().catch(() => null),
  ])

  // 同步权限
  usePermissionStore.getState().syncFromUser(useAuthStore.getState().user)

  // 缓存 setup 状态
  if (setupResult.status === 'fulfilled' && setupResult.value) {
    useSetupStore.getState().setStatus(setupResult.value.data)
  }

  const root = document.getElementById('app')
  if (!root) throw new Error('Root element not found')

  createRoot(root).render(<App />)
}

void bootstrap()
