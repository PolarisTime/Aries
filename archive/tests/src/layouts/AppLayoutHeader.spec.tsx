import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppLayoutHeader } from '@/layouts/AppLayoutHeader'

const topHeaderSpy = vi.fn()
const sideHeaderSpy = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'layouts.userMenu.personalSettings': '个人设置',
        'layouts.userMenu.logout': '退出登录',
        'layouts.sideNav.breadcrumbPrefix': '首页 / ',
        'layouts.sideNav.apiOnline': '在线',
        'layouts.sideNav.apiOffline': '离线',
        'common.refresh': '刷新',
        'layouts.headerSearch.placeholder': '搜索单号/关键字',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/layouts/LazyAppHeaderSearch', () => ({
  LazyAppHeaderSearch: (props: any) => (
    <div data-testid="mock-search" className={props.className} />
  ),
}))

vi.mock('@/layouts/AppTopNavigationHeader', () => ({
  AppTopNavigationHeader: (props: any) => {
    topHeaderSpy(props)
    return <div data-testid="top-header">top:{props.currentUserName}</div>
  },
}))

vi.mock('@/layouts/AppSideNavigationHeader', () => ({
  AppSideNavigationHeader: (props: any) => {
    sideHeaderSpy(props)
    return <div data-testid="side-header">side:{props.currentUserName}</div>
  },
}))

const sharedProps = {
  currentUserName: '张三',
  onOpenPersonalSettings: vi.fn(),
  onSignOut: vi.fn(),
  search: {
    keyword: '',
    options: [],
    open: false,
    loading: false,
    onBlur: vi.fn(),
    onKeywordChange: vi.fn(),
    onOpen: vi.fn(),
    onOpenChange: vi.fn(),
    onSearch: vi.fn(),
    onSelect: vi.fn(),
    onSubmit: vi.fn(),
  },
  shellFontStyle: {},
}

describe('AppLayoutHeader', () => {
  it('renders top navigation header when kind is top', () => {
    render(
      <AppLayoutHeader
        {...sharedProps}
        kind="top"
        clockDisplay={{ dateText: '2026年07月01日', timeText: '14时30分00秒' }}
        currentUserLoginName="zhangsan"
        onDashboardClick={vi.fn()}
        onMenuClick={vi.fn()}
        selectedKeys={[]}
        topBrandMark="L"
        topMenuItems={[]}
      />,
    )

    expect(screen.getByTestId('top-header')).toBeDefined()
    expect(screen.getByText('top:张三')).toBeDefined()
    expect(topHeaderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userMenu: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ key: 'settings', label: '个人设置' }),
            expect.objectContaining({
              key: 'logout',
              label: '退出登录',
              danger: true,
            }),
          ]),
        }),
      }),
    )
  })

  it('renders side navigation header when kind is side', () => {
    render(
      <AppLayoutHeader
        {...sharedProps}
        kind="side"
        backendOnline={true}
        clockDisplay={{ dateText: '2026年07月01日', timeText: '14时30分00秒' }}
        collapsed={false}
        onToggleCollapsed={vi.fn()}
        title="工作台"
      />,
    )

    expect(screen.getByTestId('side-header')).toBeDefined()
    expect(screen.getByText('side:张三')).toBeDefined()
  })

  it('routes user menu actions to personal settings and sign out callbacks', () => {
    const onOpenPersonalSettings = vi.fn()
    const onSignOut = vi.fn()
    render(
      <AppLayoutHeader
        {...sharedProps}
        onOpenPersonalSettings={onOpenPersonalSettings}
        onSignOut={onSignOut}
        kind="side"
        backendOnline={true}
        clockDisplay={{ dateText: '2026年07月01日', timeText: '14时30分00秒' }}
        collapsed={false}
        onToggleCollapsed={vi.fn()}
        title="工作台"
      />,
    )
    const menu = sideHeaderSpy.mock.calls.at(-1)?.[0].userMenu

    menu.onClick({ key: 'settings' })
    menu.onClick({ key: 'logout' })
    menu.onClick({ key: 'unknown' })

    expect(onOpenPersonalSettings).toHaveBeenCalledTimes(1)
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
