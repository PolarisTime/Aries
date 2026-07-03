import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LoginUser } from '@/shared/schemas'

const ensureApiClientSetupMock = vi.hoisted(() => vi.fn())
const initWebVitalsMock = vi.hoisted(() => vi.fn())
const hydrateMock = vi.hoisted(() => vi.fn())
const restoreSessionMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const syncFromUserMock = vi.hoisted(() => vi.fn())
const setSetupStatusMock = vi.hoisted(() => vi.fn())
const getInitialSetupStatusMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { setupRequired: false } }),
)
const renderMock = vi.hoisted(() => vi.fn())
const dayjsLocaleMock = vi.hoisted(() => vi.fn())

let mockIsAuthenticated = false
let mockUser: LoginUser | null = null

vi.mock('@/api/client', () => ({
  ensureApiClientSetup: ensureApiClientSetupMock,
}))

vi.mock('@/utils/web-vitals', () => ({
  initWebVitals: initWebVitalsMock,
}))

vi.mock('@/api/setup', () => ({
  getInitialSetupStatus: getInitialSetupStatusMock,
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

vi.mock('@/stores/setupStore', () => ({
  useSetupStore: {
    getState: () => ({
      setStatus: setSetupStatusMock,
    }),
  },
}))

vi.mock('@/lib/query-client', () => ({
  queryClient: {},
}))

vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({
    children,
    client,
  }: {
    children: unknown
    client: unknown
  }) =>
    Object.assign(Object.create(null), {
      type: 'QueryClientProviderMock',
      props: { children, client },
    }),
}))

vi.mock('@tanstack/react-router', () => ({
  RouterProvider: ({ router }: { router: unknown }) =>
    Object.assign(Object.create(null), {
      type: 'RouterProviderMock',
      props: { router },
    }),
}))

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: (element: { type?: unknown; props?: unknown }) => {
      renderMock(element)
      if (typeof element.type === 'function') {
        return element.type(element.props)
      }
      return null
    },
  })),
}))

vi.mock('@/router', () => ({
  router: {},
}))

vi.mock('@/i18n', () => ({}))

vi.mock('dayjs', () => ({
  default: {
    locale: dayjsLocaleMock,
  },
}))

vi.mock('dayjs/locale/zh-cn', () => ({}))

describe('main.tsx bootstrap', () => {
  let rootEl: HTMLDivElement | null

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockIsAuthenticated = false
    mockUser = null
    restoreSessionMock.mockResolvedValue(true)
    getInitialSetupStatusMock.mockResolvedValue({
      data: { setupRequired: false },
    })

    rootEl = document.createElement('div')
    rootEl.id = 'app'
    document.body.appendChild(rootEl)
  })

  afterEach(() => {
    rootEl?.remove()
    rootEl = null
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

  it('continues bootstrap when session restore fails', async () => {
    mockIsAuthenticated = true
    restoreSessionMock.mockRejectedValue(new Error('expired'))

    await import('./main')

    await vi.waitFor(() => {
      expect(restoreSessionMock).toHaveBeenCalled()
      expect(syncFromUserMock).toHaveBeenCalled()
      expect(renderMock).toHaveBeenCalled()
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

  it('sets initial setup status and initializes dayjs locale', async () => {
    const setupStatus = { setupRequired: true }
    getInitialSetupStatusMock.mockResolvedValue({ data: setupStatus })

    await import('./main')

    await vi.waitFor(() => {
      expect(setSetupStatusMock).toHaveBeenCalledWith(setupStatus)
      expect(dayjsLocaleMock).toHaveBeenCalledWith('zh-cn')
    })
  })

  it('continues bootstrap when initial setup status request fails', async () => {
    getInitialSetupStatusMock.mockRejectedValue(new Error('network'))

    await import('./main')

    await vi.waitFor(() => {
      expect(getInitialSetupStatusMock).toHaveBeenCalled()
      expect(renderMock).toHaveBeenCalled()
    })
    expect(setSetupStatusMock).not.toHaveBeenCalled()
  })

  it('renders App through the React root', async () => {
    await import('./main')

    await vi.waitFor(() => {
      expect(renderMock).toHaveBeenCalledWith(expect.any(Object))
    })
  })

  it('reports a missing root element during bootstrap', async () => {
    rootEl?.remove()
    rootEl = null
    const rejection = new Promise<unknown>((resolve) => {
      process.once('unhandledRejection', resolve)
    })

    await import('./main')
    const error = await rejection

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Root element not found')
  })
})
