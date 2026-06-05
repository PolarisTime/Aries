import { describe, expect, it } from 'vitest'
import {
  fontSizeOptions,
  getLayoutModeOptions,
  getThemeModeOptions,
} from '@/layouts/personal-settings-constants'

const mockT = ((key: string) => {
  const map: Record<string, string> = {
    'layouts.settings.theme.light': '浅色',
    'layouts.settings.theme.dark': '深色',
    'layouts.settings.theme.system': '跟随系统',
    'layouts.settings.layout.sider': '侧边导航',
    'layouts.settings.layout.top': '顶部导航',
    'layouts.settings.layout.siderDesc': '菜单在左侧',
    'layouts.settings.layout.topDesc': '菜单在顶部',
  }
  return map[key] ?? key
}) as Parameters<typeof getThemeModeOptions>[0]

describe('fontSizeOptions', () => {
  it('contains expected font sizes', () => {
    expect(fontSizeOptions).toEqual([11, 12, 13, 14, 16, 18])
  })
})

describe('getThemeModeOptions', () => {
  it('returns all theme mode options', () => {
    const options = getThemeModeOptions(mockT)
    expect(options).toHaveLength(3)
    expect(options).toEqual([
      { value: 'light', label: '浅色' },
      { value: 'dark', label: '深色' },
      { value: 'system', label: '跟随系统' },
    ])
  })
})

describe('getLayoutModeOptions', () => {
  it('returns all layout mode options with descriptions', () => {
    const options = getLayoutModeOptions(mockT)
    expect(options).toHaveLength(2)
    expect(options).toEqual([
      { value: 'sider', label: '侧边导航', description: '菜单在左侧' },
      { value: 'top', label: '顶部导航', description: '菜单在顶部' },
    ])
  })
})
