import { describe, expect, it, vi } from 'vitest'
import {
  buildAppLayoutStyles,
  buildAppLayoutUserInfo,
  buildClockText,
} from '@/layouts/app-layout-utils'

vi.mock('@/utils/env', () => ({
  appTitle: 'LEO 管理系统',
}))

const mockT = ((key: string) => {
  const map: Record<string, string> = {
    'layouts.userInfo.notLoggedIn': '未登录',
    'layouts.userInfo.currentAccount': '当前账号',
  }
  return map[key] ?? key
}) as Parameters<typeof buildAppLayoutUserInfo>[0]

describe('buildAppLayoutUserInfo', () => {
  it('returns user name when available', () => {
    expect(
      buildAppLayoutUserInfo(mockT, {
        userName: '张三',
        loginName: 'zhangsan',
      }),
    ).toEqual({
      currentUserName: '张三',
      currentUserLoginName: 'zhangsan',
    })
  })

  it('falls back to loginName when userName is empty', () => {
    expect(buildAppLayoutUserInfo(mockT, { loginName: 'zhangsan' })).toEqual({
      currentUserName: 'zhangsan',
      currentUserLoginName: 'zhangsan',
    })
  })

  it('returns fallback labels when user is null', () => {
    expect(buildAppLayoutUserInfo(mockT, null)).toEqual({
      currentUserName: '未登录',
      currentUserLoginName: '当前账号',
    })
  })

  it('returns fallback labels when user is undefined', () => {
    expect(buildAppLayoutUserInfo(mockT, undefined)).toEqual({
      currentUserName: '未登录',
      currentUserLoginName: '当前账号',
    })
  })
})

describe('buildClockText', () => {
  it('formats time as HH:mm:ss', () => {
    const clock = { format: vi.fn().mockReturnValue('14:30:00') }
    expect(buildClockText(clock)).toBe('14:30:00')
    expect(clock.format).toHaveBeenCalledWith('HH:mm:ss')
  })
})

describe('buildAppLayoutStyles', () => {
  it('returns side-nav styles when not top layout and not collapsed', () => {
    const result = buildAppLayoutStyles({
      appliedFontSize: 14,
      collapsed: false,
      isTopNavigationLayout: false,
    })

    expect(result.rootClassName).toContain('app-shell-side-nav')
    expect(result.headerClassName).toContain('app-side-opened')
    expect(result.mainStyle).toEqual({ paddingLeft: '180px' })
    expect(result.fixedWidthStyle).toEqual({ width: 'calc(100% - 180px)' })
    expect(result.shellFontStyle).toEqual({ fontSize: '14px' })
  })

  it('returns side-nav styles when collapsed', () => {
    const result = buildAppLayoutStyles({
      appliedFontSize: 12,
      collapsed: true,
      isTopNavigationLayout: false,
    })

    expect(result.headerClassName).toContain('app-side-closed')
    expect(result.mainStyle).toEqual({ paddingLeft: '60px' })
    expect(result.fixedWidthStyle).toEqual({ width: 'calc(100% - 60px)' })
  })

  it('returns top-nav styles when isTopNavigationLayout', () => {
    const result = buildAppLayoutStyles({
      appliedFontSize: 16,
      collapsed: false,
      isTopNavigationLayout: true,
    })

    expect(result.rootClassName).toContain('app-shell-top-nav')
    expect(result.headerClassName).toContain('app-top-header')
    expect(result.mainStyle).toBeUndefined()
    expect(result.fixedWidthStyle).toEqual({ width: '100%' })
  })

  it('returns top brand mark from appTitle first character', () => {
    const result = buildAppLayoutStyles({
      appliedFontSize: 12,
      collapsed: false,
      isTopNavigationLayout: true,
    })

    expect(result.topBrandMark).toBe('L')
  })
})
