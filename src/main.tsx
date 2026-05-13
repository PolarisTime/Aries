import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ensureApiClientSetup } from '@/api/client'
import { router } from '@/router'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'
import '@/i18n'
import '@/styles/variables.css'
import '@/styles/global.css'

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
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  )
}

function bootstrap() {
  ensureApiClientSetup()

  void import('dayjs').then(async ({ default: dayjs }) => {
    await import('dayjs/locale/zh-cn')
    dayjs.locale('zh-cn')
  })

  const authStore = useAuthStore.getState()
  authStore.hydrate()

  // Route guards run before React effects. Prime permissions from the
  // restored auth user here so deep links are not redirected incorrectly.
  usePermissionStore.getState().syncFromUser(authStore.user)

  const root = document.getElementById('app')
  if (!root) throw new Error('Root element not found')

  createRoot(root).render(<App />)

  // Do not block first paint on refresh-token exchange. Stored auth state is
  // enough for initial route resolution; session refresh can complete after
  // the app shell is visible.
  void authStore.restoreSession().catch(() => {
    // session restore failed, app-level guards will handle fallback state
  })
}

void bootstrap()
