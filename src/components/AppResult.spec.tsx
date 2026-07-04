import '@/i18n'
import { fireEvent, render, screen } from '@testing-library/react'
import type * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppResult } from './AppResult'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('antd', () => ({
  Button: ({
    children,
    onClick,
    type,
  }: {
    children?: React.ReactNode
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    type?: string
  }) => (
    <button
      data-button-type={type ?? 'default'}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
  Result: ({
    status,
    title,
    subTitle,
    extra,
  }: {
    status?: React.ReactNode
    title?: React.ReactNode
    subTitle?: React.ReactNode
    extra?: React.ReactNode
  }) => (
    <section data-status={String(status)} data-testid="result">
      <div data-testid="title">{title}</div>
      {subTitle ? <div data-testid="subtitle">{subTitle}</div> : null}
      {extra ? <div data-testid="extra">{extra}</div> : null}
    </section>
  ),
  Typography: {
    Text: ({
      children,
      className,
      copyable,
      type,
    }: {
      children?: React.ReactNode
      className?: string
      copyable?: { text?: string }
      type?: string
    }) => (
      <span
        className={className}
        data-copyable-text={copyable?.text}
        data-testid="trace-id"
        data-type={type}
      >
        {children}
      </span>
    ),
  },
}))

describe('AppResult', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it.each([
    ['403', '403', '抱歉，您没有权限访问此页面'],
    ['404', '404', '抱歉，您访问的页面不存在'],
    ['500', '500', '抱歉，服务器出错了'],
    ['success', '操作成功', null],
    ['error', '操作失败', '请稍后重试'],
    ['info', '提示', null],
    ['warning', '警告', null],
  ] as const)('renders fallback copy for %s status', (status, title, subTitle) => {
    render(<AppResult status={status} />)

    expect(screen.getByTestId('result')).toHaveAttribute('data-status', status)
    expect(screen.getByTestId('title')).toHaveTextContent(title)
    if (subTitle) {
      expect(screen.getByTestId('subtitle')).toHaveTextContent(subTitle)
    } else {
      expect(screen.queryByTestId('subtitle')).toBeNull()
    }
  })

  it('falls back to the runtime status value when no preset copy exists', () => {
    render(<AppResult status={'418' as never} />)

    expect(screen.getByTestId('result')).toHaveAttribute('data-status', '418')
    expect(screen.getByTestId('title')).toHaveTextContent('418')
    expect(screen.queryByTestId('subtitle')).toBeNull()
  })

  it('prefers custom title and subtitle over preset copy', () => {
    render(
      <AppResult
        status="500"
        subTitle="请联系系统管理员"
        title={<span>自定义结果标题</span>}
      />,
    )

    expect(screen.getByTestId('title')).toHaveTextContent('自定义结果标题')
    expect(screen.getByTestId('subtitle')).toHaveTextContent('请联系系统管理员')
  })

  it('renders a copyable trace id when provided', () => {
    render(
      <AppResult
        status="error"
        subTitle="保存失败"
        traceId=" trace-20260602 "
      />,
    )

    expect(screen.getByText('保存失败')).toBeTruthy()
    expect(screen.getByText('Trace ID: trace-20260602')).toBeTruthy()
    expect(screen.getByTestId('trace-id')).toHaveAttribute(
      'data-copyable-text',
      'trace-20260602',
    )
  })

  it('renders trace id without an empty subtitle container', () => {
    render(<AppResult status="info" traceId="trace-only" />)

    expect(screen.getByText('Trace ID: trace-only')).toBeTruthy()
    expect(screen.queryByText('提示')).toBeTruthy()
  })

  it('does not render an empty trace id', () => {
    render(<AppResult status="error" traceId="   " />)

    expect(screen.queryByText(/Trace ID:/)).toBeNull()
  })

  it('renders extra actions and invokes the default navigation buttons', () => {
    const backSpy = vi
      .spyOn(window.history, 'back')
      .mockImplementation(() => undefined)

    render(
      <AppResult
        extra={<span data-testid="extra-action">导出结果</span>}
        showBackButton
        showHomeButton
      />,
    )

    expect(screen.getByTestId('extra-action')).toHaveTextContent('导出结果')

    fireEvent.click(screen.getByRole('button', { name: '返回上页' }))
    fireEvent.click(screen.getByRole('button', { name: '返回首页' }))

    expect(backSpy).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith({ to: '/dashboard' })

    backSpy.mockRestore()
  })

  it('renders custom home and back button text', () => {
    render(
      <AppResult
        backButtonText="回到列表"
        homeButtonText="进入工作台"
        showBackButton
        showHomeButton
      />,
    )

    expect(screen.getByRole('button', { name: '回到列表' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '进入工作台' })).toHaveAttribute(
      'data-button-type',
      'primary',
    )
  })
})
