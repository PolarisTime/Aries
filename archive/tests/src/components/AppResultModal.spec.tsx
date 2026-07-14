import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppResultModal } from './AppResultModal'

vi.mock('@/components/AppResult', () => ({
  AppResult: ({
    status,
    title,
    subTitle,
    traceId,
  }: {
    status: string
    title?: string
    subTitle?: string
    traceId?: string
  }) => (
    <div data-testid="app-result">
      <span data-testid="status">{status}</span>
      {title && <span data-testid="title">{title}</span>}
      {subTitle && <span data-testid="subTitle">{subTitle}</span>}
      {traceId && <span data-testid="traceId">{traceId}</span>}
    </div>
  ),
}))

describe('AppResultModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    status: 'success' as const,
  }

  it('renders modal with AppResult when open', () => {
    render(<AppResultModal {...defaultProps} />)
    expect(screen.getByTestId('app-result')).toBeTruthy()
    expect(screen.getByTestId('status')).toHaveTextContent('success')
  })

  it('renders with title and subTitle', () => {
    render(
      <AppResultModal
        {...defaultProps}
        title="操作成功"
        subTitle="数据已保存"
      />,
    )
    expect(screen.getByTestId('title')).toHaveTextContent('操作成功')
    expect(screen.getByTestId('subTitle')).toHaveTextContent('数据已保存')
  })

  it('renders with traceId', () => {
    render(<AppResultModal {...defaultProps} traceId="trace-123" />)
    expect(screen.getByTestId('traceId')).toHaveTextContent('trace-123')
  })

  it('renders with custom footer', () => {
    render(<AppResultModal {...defaultProps} footer={<div>自定义底部</div>} />)
    expect(screen.getByText('自定义底部')).toBeTruthy()
  })

  it('renders with error status', () => {
    render(<AppResultModal {...defaultProps} status="error" />)
    expect(screen.getByTestId('status')).toHaveTextContent('error')
  })

  it('renders with warning status', () => {
    render(<AppResultModal {...defaultProps} status="warning" />)
    expect(screen.getByTestId('status')).toHaveTextContent('warning')
  })

  it('renders with info status', () => {
    render(<AppResultModal {...defaultProps} status="info" />)
    expect(screen.getByTestId('status')).toHaveTextContent('info')
  })

  it('renders with 404 status', () => {
    render(<AppResultModal {...defaultProps} status="404" />)
    expect(screen.getByTestId('status')).toHaveTextContent('404')
  })

  it('renders with 403 status', () => {
    render(<AppResultModal {...defaultProps} status="403" />)
    expect(screen.getByTestId('status')).toHaveTextContent('403')
  })

  it('renders with 500 status', () => {
    render(<AppResultModal {...defaultProps} status="500" />)
    expect(screen.getByTestId('status')).toHaveTextContent('500')
  })
})
