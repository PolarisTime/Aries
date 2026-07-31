import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import i18next from 'i18next'
import { createRoot, type Root } from 'react-dom/client'
import { ensureApiClientSetup } from '@/api/core/client'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { QUERY_KEYS } from '@/constants/query-keys'
import { queryClient } from '@/lib/query-client'
import { initializeErrorMonitoring } from '@/observability/sentry'
import { router } from '@/router'
import { useAuthStore } from '@/stores/authStore'
import { useSetupStore } from '@/stores/setupStore'
import { logger } from '@/utils/logger'
import { clearLegacyModuleEditorDraftStorage } from '@/utils/storage'
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

type AppRootCache = {
  element: HTMLElement
  root: Root
}

type RuntimeGlobals = typeof globalThis & {
  __leoAppRoot?: AppRootCache
}

function getAppRoot(element: HTMLElement): Root {
  const runtime = globalThis as RuntimeGlobals
  const cached = runtime.__leoAppRoot

  if (cached?.element === element) {
    return cached.root
  }

  cached?.root.unmount()
  const root = createRoot(element)
  runtime.__leoAppRoot = { element, root }
  return root
}

clearLegacyModuleEditorDraftStorage()
initializeErrorMonitoring()

async function bootstrap() {
  const rootElement = document.getElementById('app')
  if (!rootElement) throw new Error('Root element not found')
  const root = getAppRoot(rootElement)
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
  const [, runtimeConfigResult] = await Promise.allSettled([
    hydratedAuthStore.isAuthenticated
      ? hydratedAuthStore.restoreSession().catch(() => false)
      : Promise.resolve(false),
    queryClient.ensureQueryData({
      queryKey: QUERY_KEYS.runtimeConfig,
      queryFn: getRuntimeConfig,
      staleTime: 30_000,
    }),
  ])

  if (runtimeConfigResult.status === 'fulfilled') {
    useSetupStore.getState().setStatus(runtimeConfigResult.value.setup)
  }

  root.render(<App />)
}

void bootstrap().catch((error: unknown) => {
  logger.error('Application bootstrap failed', error)
})
