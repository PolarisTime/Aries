import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.brandSubtitle': '测试副标题',
      }
      return map[key] ?? key
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
})
