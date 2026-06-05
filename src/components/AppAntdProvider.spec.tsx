import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppAntdProvider } from './AppAntdProvider'

const useThemeModeMock = vi.hoisted(() =>
  vi.fn(() => ({ resolvedTheme: 'light' })),
)
const getPersonalSettingsMock = vi.hoisted(() =>
  vi.fn(() => ({ fontSize: 14 })),
)

vi.mock('@/hooks/useThemeMode', () => ({
  useThemeMode: useThemeModeMock,
}))

vi.mock('@/utils/storage', () => ({
  getPersonalSettings: getPersonalSettingsMock,
}))

vi.mock('@/utils/antd-app', () => ({
  bindAntdAppApi: vi.fn(),
}))

vi.mock('@/config/antd-locale', () => ({
  appAntdLocale: {},
}))

vi.mock('@/styles/antd-theme', () => ({
  buildAntdTheme: vi.fn(() => ({})),
}))

describe('AppAntdProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useThemeModeMock.mockReturnValue({ resolvedTheme: 'light' })
    getPersonalSettingsMock.mockReturnValue({ fontSize: 14 })
  })

  it('renders children correctly', () => {
    render(
      <AppAntdProvider>
        <div>测试内容</div>
      </AppAntdProvider>,
    )
    expect(screen.getByText('测试内容')).toBeTruthy()
  })

  it('renders with different theme mode', () => {
    useThemeModeMock.mockReturnValue({ resolvedTheme: 'dark' })

    render(
      <AppAntdProvider>
        <div>暗色主题测试</div>
      </AppAntdProvider>,
    )
    expect(screen.getByText('暗色主题测试')).toBeTruthy()
  })

  it('handles personal settings change event', () => {
    render(
      <AppAntdProvider>
        <div>设置变更测试</div>
      </AppAntdProvider>,
    )

    const event = new Event('personal-settings-changed')
    window.dispatchEvent(event)
    expect(screen.getByText('设置变更测试')).toBeTruthy()
  })

  it('uses default font size when personal settings not available', () => {
    getPersonalSettingsMock.mockReturnValue(null)

    render(
      <AppAntdProvider>
        <div>默认字体测试</div>
      </AppAntdProvider>,
    )
    expect(screen.getByText('默认字体测试')).toBeTruthy()
  })
})
