import process from 'node:process'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockUseParams = vi.fn()
const mockGetApiKeyDetail = vi.fn()
const mockListApiKeyResourceOptions = vi.fn()
const mockListApiKeyActionOptions = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: (...args: unknown[]) => mockUseParams(...args),
}))

vi.mock('@/api/api-keys', () => ({
  getApiKeyDetail: (...args: unknown[]) => mockGetApiKeyDetail(...args),
  listApiKeyResourceOptions: (...args: unknown[]) =>
    mockListApiKeyResourceOptions(...args),
  listApiKeyActionOptions: (...args: unknown[]) =>
    mockListApiKeyActionOptions(...args),
}))

vi.mock('@/components/StatusTag', () => ({
  StatusTag: ({
    status,
    statusMap,
  }: {
    status: string
    statusMap: Record<string, { color: string; label: string }>
  }) => (
    <span data-color={statusMap[status]?.color} data-testid="status-tag">
      {statusMap[status]?.label}
    </span>
  ),
}))

import { ApiKeyDetailView } from '@/views/system/ApiKeyDetailView'

const apiKeyRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'test-id',
  keyName: 'Test Key',
  usageScope: '全部接口',
  allowedResources: ['order', 'unknown-resource'],
  allowedActions: ['read', 'unknown-action'],
  userName: 'Admin',
  loginName: 'admin',
  userId: 'user-1',
  keyPrefix: 'sk-test',
  rawKey: null,
  status: '有效',
  createdAt: '2024-01-01T00:00:00',
  expiresAt: null,
  lastUsedAt: null,
  ...overrides,
})

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, reject, resolve }
}

describe('ApiKeyDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'test-id' })
    mockGetApiKeyDetail.mockResolvedValue(apiKeyRecord())
    mockListApiKeyResourceOptions.mockResolvedValue([
      { code: 'order', title: '订单', group: 'business' },
    ])
    mockListApiKeyActionOptions.mockResolvedValue([
      { code: 'read', title: '读取' },
    ])
  })

  it('renders without crashing', () => {
    expect(ApiKeyDetailView).toBeDefined()
    expect(typeof ApiKeyDetailView).toBe('function')
  })

  it('renders the back button and page title', () => {
    render(<ApiKeyDetailView />)

    expect(screen.getByText('system.apiKeyDetail.back')).toBeInTheDocument()
    expect(screen.getByText('system.apiKeyDetail.title')).toBeInTheDocument()
  })

  it('does not request detail when route id is missing', () => {
    mockUseParams.mockReturnValue({})

    render(<ApiKeyDetailView />)

    expect(mockUseParams).toHaveBeenCalledWith({ strict: false })
    expect(mockGetApiKeyDetail).not.toHaveBeenCalled()
    expect(mockListApiKeyResourceOptions).not.toHaveBeenCalled()
    expect(mockListApiKeyActionOptions).not.toHaveBeenCalled()
    expect(screen.getByText('system.apiKeyDetail.notFound')).toBeInTheDocument()
  })

  it('renders loading state while detail request is pending', async () => {
    const detail = deferred<ReturnType<typeof apiKeyRecord>>()
    mockGetApiKeyDetail.mockReturnValue(detail.promise)

    const { container } = render(<ApiKeyDetailView />)

    await waitFor(() => {
      expect(container.querySelector('.ant-spin-spinning')).toBeInTheDocument()
    })

    detail.resolve(apiKeyRecord())
    await screen.findByText('Test Key')
  })

  it('ignores resolved request after unmount', async () => {
    const detail = deferred<ReturnType<typeof apiKeyRecord>>()
    mockGetApiKeyDetail.mockReturnValue(detail.promise)

    const { unmount } = render(<ApiKeyDetailView />)
    unmount()
    detail.resolve(apiKeyRecord({ keyName: 'Late Key' }))

    await Promise.resolve()

    expect(mockGetApiKeyDetail).toHaveBeenCalledWith('test-id')
    expect(screen.queryByText('Late Key')).not.toBeInTheDocument()
  })

  it('ignores rejected request after unmount', async () => {
    const error = new Error('late load failed')
    const detail = deferred<ReturnType<typeof apiKeyRecord>>()
    const originalListeners = process.listeners('unhandledRejection')
    const observedRejection = new Promise<unknown>((resolve) => {
      process.removeAllListeners('unhandledRejection')
      process.once('unhandledRejection', resolve)
    })
    mockGetApiKeyDetail.mockReturnValue(detail.promise)

    try {
      const { unmount } = render(<ApiKeyDetailView />)
      unmount()
      detail.reject(error)

      await expect(observedRejection).resolves.toBe(error)
    } finally {
      process.removeAllListeners('unhandledRejection')
      originalListeners.forEach((listener) => {
        process.on('unhandledRejection', listener)
      })
    }

    expect(mockGetApiKeyDetail).toHaveBeenCalledWith('test-id')
  })

  it('keeps empty state when detail request fails', async () => {
    const error = new Error('load failed')
    const originalListeners = process.listeners('unhandledRejection')
    const observedRejection = new Promise<unknown>((resolve) => {
      process.removeAllListeners('unhandledRejection')
      process.once('unhandledRejection', resolve)
    })
    mockGetApiKeyDetail.mockRejectedValue(error)

    try {
      render(<ApiKeyDetailView />)

      await waitFor(() => {
        expect(
          screen.getByText('system.apiKeyDetail.notFound'),
        ).toBeInTheDocument()
      })
      await expect(observedRejection).resolves.toBe(error)
    } finally {
      process.removeAllListeners('unhandledRejection')
      originalListeners.forEach((listener) => {
        process.on('unhandledRejection', listener)
      })
    }

    expect(mockGetApiKeyDetail).toHaveBeenCalledWith('test-id')
  })

  it('falls back to empty option lists when option requests fail', async () => {
    mockListApiKeyResourceOptions.mockRejectedValue(
      new Error('resources failed'),
    )
    mockListApiKeyActionOptions.mockRejectedValue(new Error('actions failed'))

    render(<ApiKeyDetailView />)

    expect(await screen.findByText('Test Key')).toBeInTheDocument()
    expect(screen.getByText('order、unknown-resource')).toBeInTheDocument()
    expect(screen.getByText('read、unknown-action')).toBeInTheDocument()
  })

  it('renders detail card with mapped codes and empty code fallbacks', async () => {
    mockGetApiKeyDetail.mockResolvedValue(
      apiKeyRecord({
        allowedResources: [],
        allowedActions: [],
        createdAt: '20240101080910',
        expiresAt: '',
        lastUsedAt: '',
      }),
    )

    render(<ApiKeyDetailView />)

    expect(await screen.findByText('Test Key')).toBeInTheDocument()
    expect(screen.getByText('全部接口')).toBeInTheDocument()
    expect(
      screen.getByText('system.apiKeyDetail.fallbackByUsageScope'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.apiKeyDetail.fallbackUnset'),
    ).toBeInTheDocument()
    expect(screen.getByText('Admin（admin）')).toBeInTheDocument()
    expect(screen.getByText('user-1')).toBeInTheDocument()
    expect(screen.getByText('sk-test')).toBeInTheDocument()
    expect(screen.getByText('2024-01-01 08:09:10')).toBeInTheDocument()
    expect(
      screen.getByText('system.apiKeyDetail.neverExpires'),
    ).toBeInTheDocument()
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  it('renders mapped resources, actions, fallback owner, and formatted expiry dates', async () => {
    mockGetApiKeyDetail.mockResolvedValue(
      apiKeyRecord({
        userName: '',
        expiresAt: '2024-02-01T00:00:00',
        lastUsedAt: '2024-03-01T00:00:00',
      }),
    )

    render(<ApiKeyDetailView />)

    expect(
      await screen.findByText('订单、unknown-resource'),
    ).toBeInTheDocument()
    expect(screen.getByText('读取、unknown-action')).toBeInTheDocument()
    expect(screen.getByText('admin（admin）')).toBeInTheDocument()
    expect(screen.getByText('2024-02-01 00:00:00')).toBeInTheDocument()
    expect(screen.getByText('2024-03-01 00:00:00')).toBeInTheDocument()
  })

  it.each([
    ['active', 'green'],
    ['expired', 'orange'],
    ['revoked', 'red'],
    ['inactive', 'red'],
    ['unknown', 'default'],
  ])('maps %s status to %s tag color', async (status, color) => {
    mockGetApiKeyDetail.mockResolvedValue(apiKeyRecord({ status }))

    render(<ApiKeyDetailView />)

    expect(await screen.findByTestId('status-tag')).toHaveAttribute(
      'data-color',
      color,
    )
  })

  it('navigates back to API key list', () => {
    render(<ApiKeyDetailView />)

    fireEvent.click(
      screen.getByRole('button', { name: /system.apiKeyDetail.back/ }),
    )

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/api-key' })
  })

  it('skips final success loading reset when cleanup runs before the guard', async () => {
    let cleanup: (() => void) | undefined
    const setLoading = vi.fn()
    const setRecord = vi.fn(() => {
      cleanup?.()
    })
    const setResourceOptions = vi.fn()
    const setActionOptions = vi.fn()

    vi.resetModules()
    vi.doMock('react', async () => {
      const actual = await vi.importActual<typeof import('react')>('react')
      let stateIndex = 0
      return {
        ...actual,
        useEffect: (effect: () => undefined | (() => void)) => {
          const effectCleanup = effect()
          if (typeof effectCleanup === 'function') {
            cleanup = effectCleanup
          }
        },
        useState: (initialValue: unknown) => {
          stateIndex += 1
          if (stateIndex === 1) return [initialValue, setLoading]
          if (stateIndex === 2) return [initialValue, setRecord]
          if (stateIndex === 3) return [initialValue, setResourceOptions]
          return [initialValue, setActionOptions]
        },
      }
    })

    try {
      const { ApiKeyDetailView: IsolatedApiKeyDetailView } = await import(
        '@/views/system/ApiKeyDetailView'
      )
      IsolatedApiKeyDetailView()

      await waitFor(() => {
        expect(setRecord).toHaveBeenCalledWith(apiKeyRecord())
      })
    } finally {
      vi.doUnmock('react')
      vi.resetModules()
    }

    expect(setResourceOptions).toHaveBeenCalledWith([
      { code: 'order', title: '订单', group: 'business' },
    ])
    expect(setActionOptions).toHaveBeenCalledWith([
      { code: 'read', title: '读取' },
    ])
    expect(setLoading).toHaveBeenCalledTimes(1)
    expect(setLoading).toHaveBeenCalledWith(true)
  })
})
