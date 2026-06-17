import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LoginUser } from '@/types/auth'

const ensureApiClientSetupMock = vi.hoisted(() => vi.fn())
const initWebVitalsMock = vi.hoisted(() => vi.fn())
const hydrateMock = vi.hoisted(() => vi.fn())
const restoreSessionMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const syncFromUserMock = vi.hoisted(() => vi.fn())
const renderMock = vi.hoisted(() => vi.fn())

let mockIsAuthenticated = false
let mockUser: LoginUser | null = null

vi.mock('@/api/client', () => ({
  ensureApiClientSetup: ensureApiClientSetupMock,
}))

vi.mock('@/utils/web-vitals', () => ({
  initWebVitals: initWebVitalsMock,
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      hydrate: hydrateMock,
      isAuthenticated: mockIsAuthenticated,
      restoreSession: restoreSessionMock,
      user: mockUser,
    }),
  },
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: {
    getState: () => ({
      syncFromUser: syncFromUserMock,
    }),
  },
}))

vi.mock('@/lib/query-client', () => ({
  queryClient: {},
}))

vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}))

vi.mock('@tanstack/react-router', () => ({
  RouterProvider: () => null,
}))

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: renderMock })),
}))

vi.mock('@/router', () => ({
  router: {},
}))

vi.mock('@/i18n', () => ({}))

describe('main.tsx bootstrap', () => {
  let rootEl: HTMLDivElement

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockIsAuthenticated = false
    mockUser = null
    restoreSessionMock.mockResolvedValue(true)

    rootEl = document.createElement('div')
    rootEl.id = 'app'
    document.body.appendChild(rootEl)
  })

  afterEach(() => {
    document.body.removeChild(rootEl)
  })

  it('calls ensureApiClientSetup and initWebVitals on bootstrap', async () => {
    await import('./main')

    await vi.waitFor(() => {
      expect(ensureApiClientSetupMock).toHaveBeenCalled()
      expect(initWebVitalsMock).toHaveBeenCalled()
    })
  })

  it('calls hydrate on auth store', async () => {
    await import('./main')

    await vi.waitFor(() => {
      expect(hydrateMock).toHaveBeenCalled()
    })
  })

  it('restores session when authenticated', async () => {
    mockIsAuthenticated = true

    await import('./main')

    await vi.waitFor(() => {
      expect(restoreSessionMock).toHaveBeenCalled()
    })
  })

  it('skips session restore when not authenticated', async () => {
    mockIsAuthenticated = false

    await import('./main')

    await vi.waitFor(() => {
      expect(ensureApiClientSetupMock).toHaveBeenCalled()
    })

    expect(restoreSessionMock).not.toHaveBeenCalled()
  })

  it('syncs permissions from user', async () => {
    await import('./main')

    await vi.waitFor(() => {
      expect(syncFromUserMock).toHaveBeenCalled()
    })
  })
})
