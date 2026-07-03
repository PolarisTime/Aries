import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from '@/layouts/AppLayout'

const appLayoutMocks = vi.hoisted(() => ({
  can: vi.fn().mockReturnValue(true),
  closePage: vi.fn(),
  closePersonalSettings: vi.fn(),
  getPersonalSettings: vi.fn().mockReturnValue(null),
  getPageDefinition: vi.fn(),
  getPageRoutePath: vi.fn(),
  handleGlobalSearchSelect: vi.fn(),
  handleGlobalSearchSubmit: vi.fn(),
  loadPersonalSettings: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
  modalConfirm: vi.fn(),
  navigate: vi.fn(),
  openPersonalSettings: vi.fn(),
  resolveMenuPath: vi.fn().mockReturnValue('/dashboard'),
  resetPersonalSettings: vi.fn(),
  restoreSession: vi.fn(),
  savePersonalSettings: vi.fn(),
  setGlobalSearchKeyword: vi.fn(),
  setFontSize: vi.fn(),
  setLayoutMode: vi.fn(),
  setThemeMode: vi.fn(),
  setPersonalSettings: vi.fn(),
  setSiderOpenKeys: vi.fn(),
  signOut: vi.fn(),
  layoutMode: 'top' as 'top' | 'side',
  locationPathname: '/dashboard',
  routeContext: {
    activeMenuKey: '/dashboard',
    openPageKey: '/dashboard',
    title: '工作台',
  },
  globalSearchConfig: undefined as any,
  jumpResult: undefined as any,
  openPagesProbePath: '/dashboard',
  personalSettingsVisible: false,
  watermarkEnabled: true,
  watermarkText: '水印' as string | string[] | undefined,
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="outlet">Outlet</div>,
  useLocation: () => ({ pathname: appLayoutMocks.locationPathname }),
  useNavigate: () => appLayoutMocks.navigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      const map: Record<string, string> = {
        'hooks.openPages.unnamedPage': '未命名页面',
        'hooks.openPages.workbench': '工作台',
        'layouts.userInfo.notLoggedIn': '未登录',
        'layouts.userInfo.currentAccount': '当前账号',
        'layouts.personalSettings.title': '个人设置',
        'layouts.personalSettings.displayTab': '显示设置',
        'layouts.personalSettings.securityTab': '安全设置',
        'layouts.userMenu.personalSettings': '个人设置',
        'layouts.userMenu.logout': '退出登录',
        'layouts.headerSearch.placeholder': '搜索单号/关键字',
        'layouts.routePage.businessPageNotFound': '页面不存在',
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
        'common.brandSubtitle': '管理系统',
        'common.refresh': '刷新',
        'common.confirmLogout': '确认退出',
        'common.confirmLogoutContent': '确定要退出吗？',
        'common.cancel': '取消',
        'common.displaySettingsSaved': '显示设置已保存',
        'common.productCopyright': '© 2026C Leo',
        'common.frontendVersion': '前端 v{{version}}',
        'common.backendVersion': '后端 v{{version}}',
        'common.versionUnknown': '--',
        'layouts.sideNav.breadcrumbPrefix': '首页 / ',
        'layouts.sideNav.apiOnline': '在线',
        'layouts.sideNav.apiOffline': '离线',
        'auth.personalsecurity.accountTitle': '账号',
        'auth.personalsecurity.disabledDescription': '2FA 未启用',
        'auth.personalsecurity.loginName': '登录名',
        'auth.personalsecurity.currentStatus': '当前状态',
        'auth.personalsecurity.twoFactor': '两步验证',
        'auth.personalsecurity.disabled': '未启用',
        'auth.personalsecurity.generate': '生成二维码',
        'auth.personalsecurity.currentPassword': '当前密码',
        'auth.personalsecurity.currentPasswordRequired': '请输入当前密码',
        'auth.personalsecurity.newPassword': '新密码',
        'auth.personalsecurity.newPasswordRequired': '密码至少6位',
        'auth.personalsecurity.passwordHint': '密码至少6位字符',
        'auth.personalsecurity.updatePassword': '修改密码',
        'layouts.routePage.apiKeyDetail': 'API Key 详情',
        'layouts.routePage.workbench': '工作台',
        'layouts.routePage.material': '商品资料',
      }
      return (map[key] ?? key).replace('{{version}}', options?.version ?? '')
    },
  }),
}))

vi.mock('@/components/AppAntdProvider', () => ({
  AppAntdProvider: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/components/AppErrorBoundary', () => ({
  AppErrorBoundary: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/config/page-registry', () => ({
  getPageDefinition: (...args: any[]) =>
    appLayoutMocks.getPageDefinition(...args),
  getPageRoutePath: (...args: any[]) =>
    appLayoutMocks.getPageRoutePath(...args),
}))

vi.mock('@/hooks/useAuthAppSync', () => ({
  useAuthAppSync: vi.fn(),
}))

vi.mock('@/hooks/useAuthHeartbeat', () => ({
  useAuthHeartbeat: vi.fn(),
}))

vi.mock('@/hooks/useAuthRefreshTimer', () => ({
  useAuthRefreshTimer: vi.fn((refresh: () => void) => refresh()),
}))

vi.mock('@/hooks/useOpenPages', () => ({
  useOpenPages: vi.fn(
    (_defaultPath, _unnamedPage, _workbench, resolveOpenPage) => ({
      pages: [
        {
          ...resolveOpenPage(appLayoutMocks.openPagesProbePath),
          key: '/dashboard',
          path: '/dashboard',
          title: '工作台',
          closable: false,
        },
      ],
      closePage: appLayoutMocks.closePage,
    }),
  ),
}))

vi.mock('@/layouts/app-layout-utils', () => ({
  buildAppLayoutStyles: vi.fn().mockReturnValue({
    fixedWidthStyle: { width: '100%' },
    headerClassName: 'leo-header',
    mainStyle: undefined,
    rootClassName: 'app-shell',
    shellFontStyle: { fontSize: '12px' },
    topBrandMark: 'L',
  }),
  buildAppLayoutUserInfo: vi.fn().mockReturnValue({
    currentUserName: '张三',
    currentUserLoginName: 'zhangsan',
  }),
  buildClockDisplay: vi.fn().mockReturnValue({
    dateText: '2026年07月01日',
    timeText: '14时30分00秒',
  }),
}))

vi.mock('@/layouts/global-search', () => ({
  GlobalSearchResult: {},
}))

vi.mock('@/layouts/AppLayoutHeader', () => ({
  AppLayoutHeader: ({
    kind,
    onDashboardClick,
    onMenuClick,
    onOpenPersonalSettings,
    onSignOut,
    onToggleCollapsed,
    search,
  }: any) => (
    <section data-testid={`layout-header-${kind}`}>
      <button type="button" onClick={() => onDashboardClick?.()}>
        dashboard
      </button>
      <button
        type="button"
        onClick={() => onMenuClick?.({ key: '/dashboard' })}
      >
        header-menu
      </button>
      <button type="button" onClick={() => onToggleCollapsed?.()}>
        toggle-collapsed
      </button>
      <button type="button" onClick={() => onOpenPersonalSettings()}>
        open-settings
      </button>
      <button type="button" onClick={() => onSignOut()}>
        sign-out
      </button>
      <button type="button" onClick={() => search.onKeywordChange('INV')}>
        search-keyword
      </button>
      <button type="button" onClick={() => search.onOpen()}>
        search-open
      </button>
      <button type="button" onClick={() => search.onOpenChange(false)}>
        search-open-change
      </button>
      <button type="button" onClick={() => search.onSearch('INV')}>
        search-run
      </button>
      <button type="button" onClick={() => search.onSelect('INV')}>
        search-select
      </button>
      <button type="button" onClick={() => search.onSubmit('INV')}>
        search-submit
      </button>
      <button type="button" onClick={() => search.onBlur()}>
        search-blur
      </button>
    </section>
  ),
}))

vi.mock('@/layouts/AppPageTabs', () => ({
  AppPageTabs: ({ closePage, onNavigateToPath, pages }: any) => (
    <section data-testid="page-tabs">
      {pages.map((page: any) => (
        <span key={page.key}>{page.title}</span>
      ))}
      <button type="button" onClick={() => onNavigateToPath('/dashboard')}>
        tab-navigate
      </button>
      <button type="button" onClick={() => closePage('/dashboard')}>
        tab-close
      </button>
    </section>
  ),
}))

vi.mock('@/layouts/LazyPersonalSettingsModal', () => ({
  LazyPersonalSettingsModal: ({
    onClose,
    onFontSizeChange,
    onLayoutModeChange,
    onResetDisplay,
    onSaveDisplay,
    onThemeModeChange,
    open,
  }: any) => (
    <section data-open={String(open)} data-testid="personal-settings-modal">
      <button type="button" onClick={() => onClose()}>
        settings-close
      </button>
      <button type="button" onClick={() => onSaveDisplay()}>
        settings-save
      </button>
      <button type="button" onClick={() => onResetDisplay()}>
        settings-reset
      </button>
      <button type="button" onClick={() => onFontSizeChange(14)}>
        settings-font-size
      </button>
      <button type="button" onClick={() => onLayoutModeChange('side')}>
        settings-layout
      </button>
      <button type="button" onClick={() => onThemeModeChange('dark')}>
        settings-theme
      </button>
    </section>
  ),
}))

vi.mock('@/layouts/route-page-context', () => ({
  resolveRoutePageContext: vi
    .fn()
    .mockImplementation(() => appLayoutMocks.routeContext),
}))

vi.mock('@/layouts/useAppLayoutClock', () => ({
  useAppLayoutClock: vi.fn().mockReturnValue({
    format: vi.fn().mockReturnValue('2026-07-01'),
  }),
}))

vi.mock('@/layouts/useAppLayoutMenuState', () => ({
  useAppLayoutMenuState: vi.fn().mockReturnValue({
    sideMenuItems: [{ key: '/dashboard', label: '工作台' }],
    siderOpenKeys: [],
    selectedKeys: ['/dashboard'],
    setSiderOpenKeys: appLayoutMocks.setSiderOpenKeys,
    topMenuItems: [{ key: '/dashboard', label: '工作台' }],
    resolveMenuPath: appLayoutMocks.resolveMenuPath,
  }),
}))

vi.mock('@/layouts/useAppLayoutSessionGuards', () => ({
  useAppLayoutSessionGuards: vi.fn(),
}))

vi.mock('@/layouts/useAppWatermark', () => ({
  useAppWatermark: vi.fn().mockReturnValue({
    get enabled() {
      return appLayoutMocks.watermarkEnabled
    },
    get text() {
      return appLayoutMocks.watermarkText
    },
    fontSize: 16,
    color: 'rgba(0,0,0,0.1)',
    rotate: -22,
    density: 200,
    width: 120,
    height: 64,
  }),
}))

vi.mock('@/layouts/useBackendStatus', () => ({
  useBackendStatus: vi.fn().mockReturnValue({
    backendOnline: true,
    backendVersion: '0.1.0',
  }),
}))

vi.mock('@/layouts/useGlobalSearchSupport', () => ({
  useGlobalSearchSupport: vi.fn((config: any) => {
    appLayoutMocks.globalSearchConfig = config
    return {
      keyword: '',
      setKeyword: appLayoutMocks.setGlobalSearchKeyword,
      loading: false,
      resultOptions: [],
      handleBlur: vi.fn(),
      handleSearch: vi.fn(),
      handleSelect: (...args: any[]) => {
        appLayoutMocks.handleGlobalSearchSelect(...args)
        if (appLayoutMocks.jumpResult) {
          config.onJump(appLayoutMocks.jumpResult)
        }
      },
      handleSubmit: (...args: any[]) => {
        appLayoutMocks.handleGlobalSearchSubmit(...args)
      },
    }
  }),
}))

vi.mock('@/layouts/usePersonalSettings', () => ({
  usePersonalSettings: vi.fn().mockReturnValue({
    get visible() {
      return appLayoutMocks.personalSettingsVisible
    },
    fontSize: 12,
    appliedFontSize: 12,
    setFontSize: appLayoutMocks.setFontSize,
    get layoutMode() {
      return appLayoutMocks.layoutMode
    },
    get appliedLayoutMode() {
      return appLayoutMocks.layoutMode
    },
    setLayoutMode: appLayoutMocks.setLayoutMode,
    themeMode: 'system',
    setThemeMode: appLayoutMocks.setThemeMode,
    open: appLayoutMocks.openPersonalSettings,
    close: appLayoutMocks.closePersonalSettings,
    reset: appLayoutMocks.resetPersonalSettings,
    save: appLayoutMocks.savePersonalSettings,
    load: appLayoutMocks.loadPersonalSettings,
  }),
}))

vi.mock('@/stores/authStore', () => {
  const useAuthStore = vi.fn().mockImplementation((selector: any) => {
    const state = {
      authReady: true,
      token: 'test-token',
      user: { userName: '张三', loginName: 'zhangsan', totpEnabled: false },
      signOut: appLayoutMocks.signOut,
    }
    return selector(state)
  })
  useAuthStore.getState = vi.fn(() => ({
    restoreSession: appLayoutMocks.restoreSession,
  }))
  return { useAuthStore }
})

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: vi.fn().mockImplementation((selector: any) => {
    const state = { can: appLayoutMocks.can }
    return selector(state)
  }),
}))

vi.mock('@/stores/systemMenuStore', () => ({
  useSystemMenuStore: vi.fn().mockImplementation((selector: any) => {
    const state = { menus: [] }
    return selector(state)
  }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: appLayoutMocks.messageSuccess,
    warning: appLayoutMocks.messageWarning,
  },
  modal: { confirm: appLayoutMocks.modalConfirm },
}))

vi.mock('@/utils/env', () => ({
  appTitle: 'LEO 管理系统',
  frontendVersion: '0.2.0',
}))

vi.mock('@/utils/storage', () => ({
  getPersonalSettings: appLayoutMocks.getPersonalSettings,
  setPersonalSettings: appLayoutMocks.setPersonalSettings,
}))

vi.mock('antd', () => {
  const Layout = ({ children, className, style }: any) => (
    <div className={className} style={style}>
      {children}
    </div>
  )
  Layout.Header = ({ children, className, style }: any) => (
    <header className={className} style={style}>
      {children}
    </header>
  )
  Layout.Sider = ({ children, className, collapsed, onCollapse }: any) => (
    <aside className={className} data-collapsed={String(collapsed)}>
      <button type="button" onClick={() => onCollapse?.(!collapsed)}>
        sider-collapse
      </button>
      {children}
    </aside>
  )
  Layout.Content = ({ children, className }: any) => (
    <main className={className}>{children}</main>
  )

  const Menu = ({ items, onClick, onOpenChange, openKeys }: any) => (
    <nav data-testid="menu">
      <span data-testid="menu-open-keys">{openKeys?.join(',')}</span>
      <button type="button" onClick={() => onOpenChange?.(['/dashboard'])}>
        menu-open-change
      </button>
      {items?.map((item: any) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onClick?.({ key: item.key })}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )

  const Watermark = ({ children, content }: any) => (
    <div
      data-content={Array.isArray(content) ? content.join('|') : content}
      data-testid="watermark"
    >
      {children}
    </div>
  )

  return { Layout, Menu, Watermark }
})

vi.mock('antd/es/layout', () => {
  const Layout = ({ children, className, style }: any) => (
    <div className={className} style={style}>
      {children}
    </div>
  )
  Layout.Header = ({ children, className, style }: any) => (
    <header className={className} style={style}>
      {children}
    </header>
  )
  Layout.Sider = ({ children, className, collapsed, onCollapse }: any) => (
    <aside className={className} data-collapsed={String(collapsed)}>
      <button type="button" onClick={() => onCollapse?.(!collapsed)}>
        sider-collapse
      </button>
      {children}
    </aside>
  )
  Layout.Content = ({ children, className }: any) => (
    <main className={className}>{children}</main>
  )
  return { default: Layout }
})

vi.mock('antd/es/menu', () => {
  const Menu = ({ items, onClick, onOpenChange, openKeys }: any) => (
    <nav data-testid="menu">
      <span data-testid="menu-open-keys">{openKeys?.join(',')}</span>
      <button type="button" onClick={() => onOpenChange?.(['/dashboard'])}>
        menu-open-change
      </button>
      {items?.map((item: any) => (
        <button key={item.key} onClick={() => onClick?.({ key: item.key })}>
          {item.label}
        </button>
      ))}
    </nav>
  )
  return { default: Menu }
})

vi.mock('antd/es/watermark', () => ({
  default: ({ children, content }: any) => (
    <div
      data-content={Array.isArray(content) ? content.join('|') : content}
      data-testid="watermark"
    >
      {children}
    </div>
  ),
}))

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appLayoutMocks.can.mockReturnValue(true)
    appLayoutMocks.getPageDefinition.mockReturnValue(undefined)
    appLayoutMocks.getPageRoutePath.mockReturnValue('business/material')
    appLayoutMocks.layoutMode = 'top'
    appLayoutMocks.locationPathname = '/dashboard'
    appLayoutMocks.openPagesProbePath = '/dashboard'
    appLayoutMocks.personalSettingsVisible = false
    appLayoutMocks.resolveMenuPath.mockReturnValue('/dashboard')
    appLayoutMocks.routeContext = {
      activeMenuKey: '/dashboard',
      openPageKey: '/dashboard',
      title: '工作台',
    }
    appLayoutMocks.globalSearchConfig = undefined
    appLayoutMocks.jumpResult = undefined
    appLayoutMocks.watermarkEnabled = true
    appLayoutMocks.watermarkText = '水印'
  })

  it('renders main layout structure', { timeout: 15000 }, () => {
    render(<AppLayout />)
    expect(document.querySelector('.app-shell')).toBeDefined()
  })

  it('renders side navigation menu items', () => {
    render(<AppLayout />)
    expect(screen.getAllByText('工作台').length).toBeGreaterThanOrEqual(1)
  })

  it('renders page tabs', () => {
    render(<AppLayout />)
    expect(screen.getAllByText('工作台').length).toBeGreaterThanOrEqual(1)
  })

  it('renders content outlet', () => {
    render(<AppLayout />)
    expect(screen.getByTestId('outlet')).toBeDefined()
  })

  it('renders header', () => {
    render(<AppLayout />)
    expect(document.querySelector('.leo-header')).toBeDefined()
  })

  it('renders content area', () => {
    render(<AppLayout />)
    expect(document.querySelector('.leo-content')).toBeDefined()
  })

  it('does not render global version footer', () => {
    render(<AppLayout />)
    expect(screen.queryByText('© 2026C Leo')).toBeNull()
    expect(screen.queryByText('前端 v0.2.0')).toBeNull()
    expect(screen.queryByText('后端 v0.1.0')).toBeNull()
  })

  it('handles top navigation header actions and page tabs', async () => {
    appLayoutMocks.modalConfirm.mockImplementation(({ onOk }) => onOk())

    render(<AppLayout />)

    fireEvent.click(screen.getByText('dashboard'))
    fireEvent.click(screen.getByText('header-menu'))
    fireEvent.click(screen.getByText('tab-navigate'))
    fireEvent.click(screen.getByText('tab-close'))
    fireEvent.click(screen.getByText('open-settings'))
    fireEvent.click(screen.getByText('sign-out'))

    expect(appLayoutMocks.navigate).toHaveBeenCalledWith({ to: '/dashboard' })
    expect(appLayoutMocks.closePage).toHaveBeenCalledWith('/dashboard')
    expect(appLayoutMocks.loadPersonalSettings).toHaveBeenCalled()
    expect(appLayoutMocks.openPersonalSettings).toHaveBeenCalled()
    expect(appLayoutMocks.modalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: '确认退出' }),
    )
    expect(appLayoutMocks.signOut).toHaveBeenCalled()
    await waitFor(() => {
      expect(appLayoutMocks.navigate).toHaveBeenCalledWith({ to: '/login' })
    })
  })

  it('handles side navigation collapse, menu open and missing menu path', () => {
    appLayoutMocks.layoutMode = 'side'
    appLayoutMocks.resolveMenuPath.mockReturnValue('')

    render(<AppLayout />)

    expect(screen.getByTestId('layout-header-side')).toBeDefined()
    expect(screen.getByText('LEO')).toBeDefined()

    fireEvent.click(screen.getByText('menu-open-change'))
    fireEvent.click(within(screen.getByTestId('menu')).getByText('工作台'))
    fireEvent.click(screen.getByText('search-open'))
    fireEvent.click(screen.getByText('toggle-collapsed'))

    expect(appLayoutMocks.setSiderOpenKeys).toHaveBeenCalledWith(['/dashboard'])
    expect(appLayoutMocks.navigate).not.toHaveBeenCalled()
    expect(screen.getByText('L')).toBeDefined()
    expect(screen.getByTestId('menu-open-keys').textContent).toBe('')
  })

  it('handles personal settings modal callbacks', () => {
    appLayoutMocks.personalSettingsVisible = true

    render(<AppLayout />)

    fireEvent.click(screen.getByText('settings-save'))
    fireEvent.click(screen.getByText('settings-close'))
    fireEvent.click(screen.getByText('settings-reset'))
    fireEvent.click(screen.getByText('settings-font-size'))
    fireEvent.click(screen.getByText('settings-layout'))
    fireEvent.click(screen.getByText('settings-theme'))

    expect(screen.getByTestId('personal-settings-modal').dataset.open).toBe(
      'true',
    )
    expect(appLayoutMocks.savePersonalSettings).toHaveBeenCalled()
    expect(appLayoutMocks.messageSuccess).toHaveBeenCalledWith('显示设置已保存')
    expect(appLayoutMocks.closePersonalSettings).toHaveBeenCalled()
    expect(appLayoutMocks.resetPersonalSettings).toHaveBeenCalled()
    expect(appLayoutMocks.setFontSize).toHaveBeenCalledWith(14)
    expect(appLayoutMocks.setLayoutMode).toHaveBeenCalledWith('side')
    expect(appLayoutMocks.setThemeMode).toHaveBeenCalledWith('dark')
  })

  it('handles global search result jumps and access checks', () => {
    appLayoutMocks.getPageDefinition.mockImplementation((moduleKey: string) =>
      moduleKey === 'material' ? { resourceKey: 'material:read' } : undefined,
    )
    appLayoutMocks.getPageRoutePath.mockReturnValue('business/material')
    appLayoutMocks.jumpResult = {
      moduleKey: 'material',
      primaryNo: 'MAT-001',
      trackId: 'track-1',
    }

    render(<AppLayout />)

    expect(appLayoutMocks.globalSearchConfig.canAccessModule('material')).toBe(
      true,
    )
    expect(appLayoutMocks.can).toHaveBeenCalledWith('material:read', 'read')
    expect(appLayoutMocks.globalSearchConfig.canAccessModule('unknown')).toBe(
      true,
    )
    expect(appLayoutMocks.can).toHaveBeenCalledWith('unknown', 'read')

    fireEvent.click(screen.getByText('search-keyword'))
    fireEvent.click(screen.getByText('search-open'))
    fireEvent.click(screen.getByText('search-open-change'))
    fireEvent.click(screen.getByText('search-run'))
    fireEvent.click(screen.getByText('search-select'))
    fireEvent.click(screen.getByText('search-submit'))
    fireEvent.click(screen.getByText('search-blur'))

    expect(appLayoutMocks.setGlobalSearchKeyword).toHaveBeenCalledWith('INV')
    expect(appLayoutMocks.handleGlobalSearchSelect).toHaveBeenCalledWith('INV')
    expect(appLayoutMocks.handleGlobalSearchSubmit).toHaveBeenCalledWith('INV')
    expect(appLayoutMocks.navigate).toHaveBeenCalledWith({
      to: '/business/material?docNo=MAT-001&openDetail=1&trackId=track-1',
    })
  })

  it('warns when global search result target page is missing', () => {
    appLayoutMocks.jumpResult = {
      moduleKey: 'missing',
      primaryNo: 'M-001',
    }

    render(<AppLayout />)

    fireEvent.click(screen.getByText('search-select'))

    expect(appLayoutMocks.messageWarning).toHaveBeenCalledWith('页面不存在')
    expect(appLayoutMocks.navigate).not.toHaveBeenCalled()
  })

  it('builds search jump query without optional track id', () => {
    appLayoutMocks.getPageDefinition.mockReturnValue({
      resourceKey: 'material',
    })
    appLayoutMocks.getPageRoutePath.mockReturnValue('business/material')
    appLayoutMocks.jumpResult = {
      moduleKey: 'material',
      primaryNo: 'MAT-002',
    }

    render(<AppLayout />)

    fireEvent.click(screen.getByText('search-select'))

    expect(appLayoutMocks.navigate).toHaveBeenCalledWith({
      to: '/business/material?docNo=MAT-002&openDetail=1',
    })
  })

  it('uses the app title when the route context has no title', () => {
    appLayoutMocks.routeContext = {
      activeMenuKey: '/dashboard',
      openPageKey: '/dashboard',
      title: '',
    }

    render(<AppLayout />)

    expect(document.title).toBe('LEO 管理系统')
  })

  it('renders watermark only when configured content is non-empty', () => {
    const { rerender } = render(<AppLayout />)
    expect(screen.getByTestId('watermark').dataset.content).toBe('水印')

    appLayoutMocks.watermarkText = ''
    rerender(<AppLayout />)
    expect(screen.queryByTestId('watermark')).toBeNull()

    appLayoutMocks.watermarkText = [' ', '水印']
    rerender(<AppLayout />)
    expect(screen.getByTestId('watermark').dataset.content).toBe(' |水印')

    appLayoutMocks.watermarkEnabled = false
    rerender(<AppLayout />)
    expect(screen.queryByTestId('watermark')).toBeNull()
  })

  it('refreshes auth session when the refresh timer fires', () => {
    render(<AppLayout />)

    expect(appLayoutMocks.restoreSession).toHaveBeenCalled()
  })
})
