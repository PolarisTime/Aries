import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import { AppAntdProvider } from './AppAntdProvider'

const useThemeModeMock = vi.hoisted(() =>
  vi.fn(() => ({ resolvedTheme: 'light' })),
)

vi.mock('@/hooks/useThemeMode', () => ({
  useThemeMode: useThemeModeMock,
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

import { buildAntdTheme } from '@/styles/antd-theme'

describe('AppAntdProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useUiSettingsStore.setState({ settings: { fontSize: 14 } })
    useUiSettingsStore.persist.clearStorage()
    useThemeModeMock.mockReturnValue({ resolvedTheme: 'light' })
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

  it('updates theme config when personal font size changes', () => {
    render(
      <AppAntdProvider>
        <div>设置变更测试</div>
      </AppAntdProvider>,
    )

    act(() => {
      useUiSettingsStore.getState().setSettings({ fontSize: 18 })
    })

    expect(screen.getByText('设置变更测试')).toBeTruthy()
    expect(buildAntdTheme).toHaveBeenCalledWith(
      expect.objectContaining({
        fontSize: 18,
      }),
    )
  })

  it('uses default font size when personal settings not available', () => {
    useUiSettingsStore.setState({ settings: null })

    render(
      <AppAntdProvider>
        <div>默认字体测试</div>
      </AppAntdProvider>,
    )
    expect(screen.getByText('默认字体测试')).toBeTruthy()
    expect(buildAntdTheme).toHaveBeenCalledWith(
      expect.objectContaining({
        borderRadius: 6,
        fontSize: 14,
      }),
    )
  })
})
