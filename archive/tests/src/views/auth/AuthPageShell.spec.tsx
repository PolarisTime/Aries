import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      const map: Record<string, string> = {
        'common.brandSubtitle': '测试副标题',
        'common.productCopyright': '© {{year}} Leo',
        'common.frontendVersion':
          '前端 v{{version}} · 编译时间 {{buildTime}} · 构建 SHA-1 {{gitCommit}}',
        'common.backendVersion':
          '后端 v{{version}} · 编译时间 {{buildTime}} · 构建 SHA-1 {{gitCommit}}',
        'common.versionUnknown': '--',
      }
      return (map[key] ?? key).replace('{{version}}', options?.version ?? '')
    },
  }),
}))

vi.mock('@/components/AppAntdProvider', () => ({
  AppAntdProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="antd-provider">{children}</div>
  ),
}))

vi.mock('@/utils/env', () => ({
  appTitle: '测试应用',
  frontendVersion: '0.2.0',
}))

import { AuthPageShell } from '@/views/auth/AuthPageShell'

describe('AuthPageShell', () => {
  it('renders children correctly', () => {
    render(
      <AuthPageShell>
        <div data-testid="child">子内容</div>
      </AuthPageShell>,
    )
    expect(screen.getByTestId('child')).toBeTruthy()
  })

  it('renders default hero when hero prop is not provided', () => {
    render(
      <AuthPageShell>
        <div>内容</div>
      </AuthPageShell>,
    )
    expect(screen.getByText('测试应用')).toBeTruthy()
    expect(screen.getByText('测试副标题')).toBeTruthy()
  })

  it('renders custom hero when hero prop is provided', () => {
    const customHero = <div data-testid="custom-hero">自定义英雄区</div>
    render(
      <AuthPageShell hero={customHero}>
        <div>内容</div>
      </AuthPageShell>,
    )
    expect(screen.getByTestId('custom-hero')).toBeTruthy()
    expect(screen.queryByText('测试应用')).toBeNull()
  })

  it('wraps content with AppAntdProvider', () => {
    render(
      <AuthPageShell>
        <div>内容</div>
      </AuthPageShell>,
    )
    expect(screen.getByTestId('antd-provider')).toBeTruthy()
  })

  it('separates brand context from the primary authentication task', () => {
    const { container } = render(
      <AuthPageShell>
        <div>登录表单</div>
      </AuthPageShell>,
    )

    expect(container.querySelector('.auth-page-visual')).toBeTruthy()
    expect(container.querySelector('main.auth-page-main')).toBeTruthy()
    expect(container.querySelector('.auth-page-panel')).toBeTruthy()
  })

  it('marks custom hero as the visual context without duplicating the brand', () => {
    const { container } = render(
      <AuthPageShell hero={<div>初始化说明</div>}>
        <div>初始化表单</div>
      </AuthPageShell>,
    )

    expect(container.querySelector('.auth-page-visual')).toHaveTextContent(
      '初始化说明',
    )
    expect(container.querySelector('.auth-page-panel')).toHaveTextContent(
      '初始化表单',
    )
  })

  it('does not render version footer', () => {
    render(
      <AuthPageShell>
        <div>内容</div>
      </AuthPageShell>,
    )
    expect(screen.queryByText(/© \d{4} Leo/)).toBeNull()
    expect(screen.queryByText(/前端 v0\.2\.0/)).toBeNull()
    expect(screen.queryByText(/后端 v--/)).toBeNull()
  })
})
