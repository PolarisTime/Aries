import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout } from '@/layouts/AppLayout'

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="outlet">Outlet</div>,
  useLocation: () => ({ pathname: '/dashboard' }),
  useNavigate: () => vi.fn(),
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
        'layouts.topNav.serverTime': '服务器时间',
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
  getPageDefinition: vi.fn(),
  getPageRoutePath: vi.fn(),
}))

vi.mock('@/hooks/useAuthAppSync', () => ({
  useAuthAppSync: vi.fn(),
}))

vi.mock('@/hooks/useAuthHeartbeat', () => ({
  useAuthHeartbeat: vi.fn(),
}))

vi.mock('@/hooks/useAuthRefreshTimer', () => ({
  useAuthRefreshTimer: vi.fn(),
}))

vi.mock('@/hooks/useOpenPages', () => ({
  useOpenPages: vi.fn().mockReturnValue({
    pages: [
      {
        key: '/dashboard',
        path: '/dashboard',
        title: '工作台',
        closable: false,
      },
    ],
    closePage: vi.fn(),
  }),
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
  buildClockText: vi.fn().mockReturnValue('14:30:00'),
}))

vi.mock('@/layouts/global-search', () => ({
  GlobalSearchResult: {},
}))

vi.mock('@/layouts/route-page-context', () => ({
  resolveRoutePageContext: vi.fn().mockReturnValue({
    activeMenuKey: '/dashboard',
    openPageKey: '/dashboard',
    title: '工作台',
  }),
}))

vi.mock('@/layouts/useAppLayoutClock', () => ({
  useAppLayoutClock: vi.fn().mockReturnValue({
    format: vi.fn().mockReturnValue('14:30:00'),
  }),
}))

vi.mock('@/layouts/useAppLayoutMenuState', () => ({
  useAppLayoutMenuState: vi.fn().mockReturnValue({
    sideMenuItems: [{ key: '/dashboard', label: '工作台' }],
    siderOpenKeys: [],
    selectedKeys: ['/dashboard'],
    setSiderOpenKeys: vi.fn(),
    topMenuItems: [{ key: '/dashboard', label: '工作台' }],
    resolveMenuPath: vi.fn().mockReturnValue('/dashboard'),
  }),
}))

vi.mock('@/layouts/useAppLayoutSessionGuards', () => ({
  useAppLayoutSessionGuards: vi.fn(),
}))

vi.mock('@/layouts/useAppWatermark', () => ({
  useAppWatermark: vi.fn().mockReturnValue({
    text: '水印',
    fontSize: 16,
    color: 'rgba(0,0,0,0.1)',
    rotate: -22,
    density: 200,
  }),
}))

vi.mock('@/layouts/useBackendStatus', () => ({
  useBackendStatus: vi.fn().mockReturnValue({
    backendOnline: true,
    backendVersion: '0.1.0',
  }),
}))

vi.mock('@/layouts/useGlobalSearchSupport', () => ({
  useGlobalSearchSupport: vi.fn().mockReturnValue({
    keyword: '',
    setKeyword: vi.fn(),
    loading: false,
    resultOptions: [],
    handleBlur: vi.fn(),
    handleSearch: vi.fn(),
    handleSelect: vi.fn(),
    handleSubmit: vi.fn(),
  }),
}))

vi.mock('@/layouts/usePersonalSettings', () => ({
  usePersonalSettings: vi.fn().mockReturnValue({
    visible: false,
    fontSize: 12,
    appliedFontSize: 12,
    setFontSize: vi.fn(),
    layoutMode: 'top',
    appliedLayoutMode: 'top',
    setLayoutMode: vi.fn(),
    themeMode: 'system',
    setThemeMode: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    reset: vi.fn(),
    save: vi.fn(),
    load: vi.fn(),
  }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn().mockImplementation((selector: any) => {
    const state = {
      authReady: true,
      token: 'test-token',
      user: { userName: '张三', loginName: 'zhangsan', totpEnabled: false },
      signOut: vi.fn(),
    }
    return selector(state)
  }),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: vi.fn().mockImplementation((selector: any) => {
    const state = { can: vi.fn().mockReturnValue(true) }
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
  message: { success: vi.fn(), warning: vi.fn() },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/utils/env', () => ({
  appTitle: 'LEO 管理系统',
  frontendVersion: '0.2.0',
}))

vi.mock('@/utils/storage', () => ({
  getPersonalSettings: vi.fn().mockReturnValue(null),
  setPersonalSettings: vi.fn(),
}))

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
  Layout.Sider = ({ children, className }: any) => (
    <aside className={className}>{children}</aside>
  )
  Layout.Content = ({ children, className }: any) => (
    <main className={className}>{children}</main>
  )
  return { default: Layout }
})

vi.mock('antd/es/menu', () => {
  const Menu = ({ items, onClick }: any) => (
    <nav data-testid="menu">
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
  default: ({ children }: any) => <>{children}</>,
}))

describe('AppLayout', () => {
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

  it('renders version footer', () => {
    render(<AppLayout />)
    expect(screen.getByText('© 2026C Leo')).toBeDefined()
    expect(screen.getByText('前端 v0.2.0')).toBeDefined()
    expect(screen.getByText('后端 v0.1.0')).toBeDefined()
  })
})
