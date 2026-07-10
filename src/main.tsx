import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import i18next from 'i18next'
import { createRoot } from 'react-dom/client'
import { ensureApiClientSetup } from '@/api/client'
import { getInitialSetupStatus } from '@/api/setup'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { useSetupStore } from '@/stores/setupStore'
import { installClientAutosaveFlushListeners } from '@/utils/client-autosave-registry'
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

function StartupShell() {
  return (
    <main
      className="app-startup-shell"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {i18next.t('common.loading')}
    </main>
  )
}

installClientAutosaveFlushListeners()

async function bootstrap() {
  const rootElement = document.getElementById('app')
  if (!rootElement) throw new Error('Root element not found')
  const root = createRoot(rootElement)
  root.render(<StartupShell />)

  ensureApiClientSetup()
  initWebVitals()

  void import('dayjs').then(async ({ default: dayjs }) => {
    await import('dayjs/locale/zh-cn')
    dayjs.locale('zh-cn')
  })

  const authStore = useAuthStore.getState()
  authStore.hydrate()
  const hydratedAuthStore = useAuthStore.getState()

  // 并行执行会话恢复和初始化状态检查，减少阻塞时间
  const [, setupResult] = await Promise.allSettled([
    hydratedAuthStore.isAuthenticated
      ? hydratedAuthStore.restoreSession().catch(() => false)
      : Promise.resolve(false),
    getInitialSetupStatus().catch(() => null),
  ])

  // 同步权限
  usePermissionStore.getState().syncFromUser(useAuthStore.getState().user)

  // 缓存 setup 状态
  if (setupResult.status === 'fulfilled' && setupResult.value) {
    useSetupStore.getState().setStatus(setupResult.value.data)
  }

  root.render(<App />)
}

void bootstrap()
