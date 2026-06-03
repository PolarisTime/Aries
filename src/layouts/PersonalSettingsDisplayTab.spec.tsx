import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PersonalSettingsDisplayTab } from '@/layouts/PersonalSettingsDisplayTab'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'layouts.settings.systemFont': '系统字体',
        'layouts.settings.systemFontDefault': '默认字体',
        'layouts.settings.fontSize': '字号大小',
        'layouts.settings.navLayout': '导航布局',
        'layouts.settings.themeMode': '主题模式',
        'layouts.settings.resetDefault': '恢复默认',
        'layouts.settings.saveDisplay': '保存设置',
        'layouts.settings.theme.light': '浅色',
        'layouts.settings.theme.dark': '深色',
        'layouts.settings.theme.system': '跟随系统',
        'layouts.settings.layout.sider': '侧边导航',
        'layouts.settings.layout.top': '顶部导航',
        'layouts.settings.layout.siderDesc': '菜单在左侧',
        'layouts.settings.layout.topDesc': '菜单在顶部',
      }
      return map[key] ?? key
    },
  }),
}))

const defaultProps = {
  fontSize: 12,
  layoutMode: 'top' as const,
  themeMode: 'system' as const,
  onFontSizeChange: vi.fn(),
  onLayoutModeChange: vi.fn(),
  onThemeModeChange: vi.fn(),
  onResetDisplay: vi.fn(),
  onSaveDisplay: vi.fn(),
}

describe('PersonalSettingsDisplayTab', () => {
  it('renders font size label', () => {
    render(<PersonalSettingsDisplayTab {...defaultProps} />)
    expect(screen.getByText('字号大小')).toBeDefined()
  })

  it('renders system font label', () => {
    render(<PersonalSettingsDisplayTab {...defaultProps} />)
    expect(screen.getByText('系统字体')).toBeDefined()
  })

  it('renders nav layout label', () => {
    render(<PersonalSettingsDisplayTab {...defaultProps} />)
    expect(screen.getByText('导航布局')).toBeDefined()
  })

  it('renders theme mode label', () => {
    render(<PersonalSettingsDisplayTab {...defaultProps} />)
    expect(screen.getByText('主题模式')).toBeDefined()
  })

  it('renders layout mode options', () => {
    render(<PersonalSettingsDisplayTab {...defaultProps} />)
    expect(screen.getByText('侧边导航')).toBeDefined()
    expect(screen.getByText('顶部导航')).toBeDefined()
  })

  it('renders theme mode options', () => {
    render(<PersonalSettingsDisplayTab {...defaultProps} />)
    expect(screen.getByText('浅色')).toBeDefined()
    expect(screen.getByText('深色')).toBeDefined()
    expect(screen.getByText('跟随系统')).toBeDefined()
  })

  it('renders reset and save buttons', () => {
    render(<PersonalSettingsDisplayTab {...defaultProps} />)
    expect(screen.getByText('恢复默认')).toBeDefined()
    expect(screen.getByText('保存设置')).toBeDefined()
  })

  it('calls onResetDisplay when reset button is clicked', () => {
    const onReset = vi.fn()
    render(<PersonalSettingsDisplayTab {...defaultProps} onResetDisplay={onReset} />)
    fireEvent.click(screen.getByText('恢复默认'))
    expect(onReset).toHaveBeenCalled()
  })

  it('calls onSaveDisplay when save button is clicked', () => {
    const onSave = vi.fn()
    render(<PersonalSettingsDisplayTab {...defaultProps} onSaveDisplay={onSave} />)
    fireEvent.click(screen.getByText('保存设置'))
    expect(onSave).toHaveBeenCalled()
  })

  it('renders layout mode description', () => {
    render(<PersonalSettingsDisplayTab {...defaultProps} layoutMode="top" />)
    expect(screen.getByText('菜单在顶部')).toBeDefined()
  })

  it('renders sider layout description when sider mode is selected', () => {
    render(<PersonalSettingsDisplayTab {...defaultProps} layoutMode="sider" />)
    expect(screen.getByText('菜单在左侧')).toBeDefined()
  })
})
