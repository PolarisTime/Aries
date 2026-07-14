import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'

vi.mock('@/components/AppResult', () => ({
  AppResult: ({
    status,
    subTitle,
    traceId,
    extra,
  }: {
    status: string
    subTitle?: string
    traceId?: string
    extra?: React.ReactNode
  }) => (
    <div data-testid="app-result">
      <span data-testid="status">{status}</span>
      <span data-testid="subTitle">{subTitle}</span>
      {traceId && <span data-testid="traceId">{traceId}</span>}
      {extra}
    </div>
  ),
}))

vi.mock('i18next', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'errorBoundary.retry': '重试',
        'errorBoundary.noPermission': '没有权限',
        'errorBoundary.serverBusy': '服务器繁忙',
        'errorBoundary.networkError': '网络错误',
        'errorBoundary.timeout': '请求超时',
        'errorBoundary.serverError': '服务器错误',
      }
      return translations[key] || key
    },
  },
}))

function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>正常内容</div>
}

describe('AppErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <AppErrorBoundary>
        <div>测试内容</div>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('测试内容')).toBeTruthy()
  })

  it('renders error fallback when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AppErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('app-result')).toBeTruthy()
    expect(screen.getByTestId('status')).toHaveTextContent('error')
    expect(screen.getByTestId('subTitle')).toHaveTextContent('Test error')
    expect(screen.getByText(/重\s*试/)).toBeTruthy()
    consoleSpy.mockRestore()
  })

  it('renders custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AppErrorBoundary fallback={<div>自定义错误页面</div>}>
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('自定义错误页面')).toBeTruthy()
    expect(screen.queryByTestId('app-result')).toBeNull()

    consoleSpy.mockRestore()
  })

  it('extracts traceId from error when present', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const errorWithTrace = new Error('Test error')
    const errorWithTraceId = Object.assign(errorWithTrace, {
      traceId: 'trace-123',
    })

    function ThrowErrorWithTrace() {
      throw errorWithTraceId
    }

    render(
      <AppErrorBoundary>
        <ThrowErrorWithTrace />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('traceId')).toHaveTextContent('trace-123')
    consoleSpy.mockRestore()
  })

  it('handles 403 error status', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Throw403Error() {
      throw new Error('403 Forbidden')
    }

    render(
      <AppErrorBoundary>
        <Throw403Error />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('status')).toHaveTextContent('403')
    expect(screen.getByTestId('subTitle')).toHaveTextContent('没有权限')
    consoleSpy.mockRestore()
  })

  it('handles 500 error status', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Throw500Error() {
      throw new Error('500 Internal Server Error')
    }

    render(
      <AppErrorBoundary>
        <Throw500Error />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('status')).toHaveTextContent('500')
    expect(screen.getByTestId('subTitle')).toHaveTextContent('服务器繁忙')
    consoleSpy.mockRestore()
  })

  it('handles network error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function ThrowNetworkError() {
      throw new Error('Failed to fetch')
    }

    render(
      <AppErrorBoundary>
        <ThrowNetworkError />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('subTitle')).toHaveTextContent('网络错误')
    consoleSpy.mockRestore()
  })

  it('handles timeout error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function ThrowTimeoutError() {
      throw new Error('timeout')
    }

    render(
      <AppErrorBoundary>
        <ThrowTimeoutError />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('subTitle')).toHaveTextContent('请求超时')
    consoleSpy.mockRestore()
  })

  it('resets error state when retry button clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AppErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('app-result')).toBeTruthy()
    fireEvent.click(screen.getByText(/重\s*试/))
    consoleSpy.mockRestore()
  })

  it('resets error state when the route reset key changes', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <AppErrorBoundary resetKey="/first-page">
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('app-result')).toBeTruthy()

    rerender(
      <AppErrorBoundary resetKey="/second-page">
        <ThrowError shouldThrow={false} />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('正常内容')).toBeTruthy()
    expect(screen.queryByTestId('app-result')).toBeNull()
    consoleSpy.mockRestore()
  })

  it('handles long error messages with generic server error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function ThrowLongError() {
      throw new Error('x'.repeat(100))
    }

    render(
      <AppErrorBoundary>
        <ThrowLongError />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('subTitle')).toHaveTextContent('服务器错误')
    consoleSpy.mockRestore()
  })
})
