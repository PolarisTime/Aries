import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockRouterState = {
  location: { pathname: '/test' },
  error: null,
}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({
    state: mockRouterState,
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'error.retry': '重试',
        'error.noPermission': '无权限访问',
        'error.serverBusy': '服务器繁忙',
        'error.networkError': '网络错误',
        'error.requestTimeout': '请求超时',
        'error.serverResponseError': '服务器响应错误',
        'error.unknownError': '未知错误',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/components/AppResult', () => ({
  AppResult: ({
    status,
    subTitle,
    traceId,
    showHomeButton,
    showBackButton,
    extra,
  }: {
    status: string
    subTitle?: string
    traceId?: string
    showHomeButton?: boolean
    showBackButton?: boolean
    extra?: React.ReactNode
  }) => (
    <div data-testid="app-result">
      <span data-testid="status">{status}</span>
      {subTitle && <span data-testid="sub-title">{subTitle}</span>}
      {traceId && <span data-testid="trace-id">{traceId}</span>}
      {showHomeButton && <button>首页</button>}
      {showBackButton && <button>返回</button>}
      {extra}
    </div>
  ),
}))

import { ErrorView } from '@/views/error/ErrorView'

describe('ErrorView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterState.error = null
  })

  it('renders error view', () => {
    render(<ErrorView />)
    expect(screen.getByTestId('app-result')).toBeTruthy()
  })

  it('renders retry button', () => {
    render(<ErrorView />)
    expect(screen.getByRole('button', { name: /重\s*试/ })).toBeTruthy()
  })

  it('renders home button', () => {
    render(<ErrorView />)
    expect(screen.getByRole('button', { name: /首页/ })).toBeTruthy()
  })

  it('renders back button', () => {
    render(<ErrorView />)
    expect(screen.getByRole('button', { name: /返回/ })).toBeTruthy()
  })

  it('shows error status for 403 error', () => {
    mockRouterState.error = new Error('403 Forbidden')
    render(<ErrorView />)
    expect(screen.getByTestId('status').textContent).toBe('403')
  })

  it('shows error status for 500 error', () => {
    mockRouterState.error = new Error('500 Internal Server Error')
    render(<ErrorView />)
    expect(screen.getByTestId('status').textContent).toBe('500')
  })

  it('shows error status for unauthorized errors', () => {
    mockRouterState.error = new Error('Unauthorized access')
    render(<ErrorView />)
    expect(screen.getByTestId('status').textContent).toBe('403')
  })

  it('shows error status for forbidden errors without status code', () => {
    mockRouterState.error = new Error('Forbidden')
    render(<ErrorView />)
    expect(screen.getByTestId('status').textContent).toBe('403')
  })

  it('shows error status for internal server errors without status code', () => {
    mockRouterState.error = new Error('Internal server unavailable')
    render(<ErrorView />)
    expect(screen.getByTestId('status').textContent).toBe('500')
  })

  it('shows generic error status for other errors', () => {
    mockRouterState.error = new Error('Something went wrong')
    render(<ErrorView />)
    expect(screen.getByTestId('status').textContent).toBe('error')
  })

  it('shows no permission message for 403 error', () => {
    mockRouterState.error = new Error('403 Forbidden')
    render(<ErrorView />)
    expect(screen.getByTestId('sub-title').textContent).toBe('无权限访问')
  })

  it('shows server busy message for 500 error', () => {
    mockRouterState.error = new Error('500 Internal Server Error')
    render(<ErrorView />)
    expect(screen.getByTestId('sub-title').textContent).toBe('服务器繁忙')
  })

  it('shows network error message for network errors', () => {
    mockRouterState.error = new Error('Failed to fetch')
    render(<ErrorView />)
    expect(screen.getByTestId('sub-title').textContent).toBe('网络错误')
  })

  it('shows server busy message for timeout errors', () => {
    mockRouterState.error = new Error('Connection timeout occurred')
    render(<ErrorView />)
    expect(screen.getByTestId('sub-title').textContent).toBe('服务器繁忙')
  })

  it('shows server response error for long error messages', () => {
    mockRouterState.error = new Error('x'.repeat(100))
    render(<ErrorView />)
    expect(screen.getByTestId('sub-title').textContent).toBe('服务器响应错误')
  })

  it('shows unknown error for non-error values', () => {
    mockRouterState.error = 'plain error'
    render(<ErrorView />)
    expect(screen.getByTestId('sub-title').textContent).toBe('未知错误')
  })

  it('extracts traceId from error object', () => {
    mockRouterState.error = { traceId: 'trace-123', message: 'Error' }
    render(<ErrorView />)
    expect(screen.getByTestId('trace-id').textContent).toBe('trace-123')
  })

  it('extracts trace_id from error object', () => {
    mockRouterState.error = { trace_id: 'trace-456', message: 'Error' }
    render(<ErrorView />)
    expect(screen.getByTestId('trace-id').textContent).toBe('trace-456')
  })

  it('extracts requestId from error object', () => {
    mockRouterState.error = { requestId: 'req-789', message: 'Error' }
    render(<ErrorView />)
    expect(screen.getByTestId('trace-id').textContent).toBe('req-789')
  })

  it('extracts request_id from error object', () => {
    mockRouterState.error = { request_id: 'req-012', message: 'Error' }
    render(<ErrorView />)
    expect(screen.getByTestId('trace-id').textContent).toBe('req-012')
  })

  it('navigates to current path on retry', () => {
    render(<ErrorView />)
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }))
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/test' })
  })

  it('handles null error', () => {
    mockRouterState.error = null
    render(<ErrorView />)
    expect(screen.getByTestId('app-result')).toBeTruthy()
  })

  it('handles undefined error', () => {
    mockRouterState.error = undefined
    render(<ErrorView />)
    expect(screen.getByTestId('app-result')).toBeTruthy()
  })
})
