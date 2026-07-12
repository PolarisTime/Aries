import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockLocation = {
  searchStr: '',
}

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'error.retry': '重试',
        'error.serverError.title': '服务器异常',
        'error.serverError.subTitle': '服务暂时不可用',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/components/AppResult', () => ({
  AppResult: ({
    className,
    extra,
    status,
    subTitle,
    title,
  }: {
    className?: string
    extra?: React.ReactNode
    status?: string
    subTitle?: React.ReactNode
    title?: React.ReactNode
  }) => (
    <section
      className={className}
      data-status={status}
      data-testid="app-result"
    >
      <div>{title}</div>
      <div>{subTitle}</div>
      {extra}
    </section>
  ),
}))

import { ServerErrorView } from '@/views/error/ServerErrorView'

describe('ServerErrorView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.searchStr = ''
  })

  it('renders server error content', () => {
    render(<ServerErrorView />)
    expect(screen.getByTestId('app-result')).toHaveClass('server-error-result')
    expect(screen.getByTestId('app-result')).toHaveAttribute(
      'data-status',
      'warning',
    )
    expect(screen.getByText('服务器异常')).toBeTruthy()
    expect(screen.getByRole('button', { name: /重\s*试/ })).toBeTruthy()
  })

  it('navigates to return path on retry', () => {
    mockLocation.searchStr = '?from=%2Faccess-control%3Ftab%3Droles'
    render(<ServerErrorView />)

    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/access-control?tab=roles',
    })
  })

  it('navigates to fallback route when return path is unavailable', () => {
    render(<ServerErrorView />)

    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }))

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
  })
})
