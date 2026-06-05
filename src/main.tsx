import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'
import { ensureApiClientSetup } from '@/api/client'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'
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

  // Route guards depend on the permission store. Refresh the session before
  // mounting so permission changes from RBAC migrations are reflected on first
  // route resolution instead of briefly using stale localStorage snapshots.
  if (authStore.isAuthenticated) {
    await authStore.restoreSession().catch(() => false)
  }

  // Route guards run before React effects. Prime permissions from the
  // restored auth user here so deep links are not redirected incorrectly.
  usePermissionStore.getState().syncFromUser(useAuthStore.getState().user)

  const root = document.getElementById('app')
  if (!root) throw new Error('Root element not found')

  createRoot(root).render(<App />)
}

void bootstrap()
