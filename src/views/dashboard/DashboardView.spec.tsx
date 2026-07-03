import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockUseQuery = vi.fn()
const mockUseIdleActivation = vi.fn()
const mockUsePageVisibility = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      const map: Record<string, string> = {
        'dashboard.alerts.loadFailed': '加载失败',
        'dashboard.fields.serverTime': '服务器时间',
        'dashboard.info.accountInfo': '账户信息',
        'dashboard.info.systemOverview': '系统概览',
        'dashboard.info.activeSessions': '活跃会话',
        'dashboard.fields.visibleMenus': '可见菜单',
        'dashboard.info.actionPermissions': '操作权限',
        'common.brandSubtitle': '测试系统',
        'dashboard.info.userName': '用户名',
        'dashboard.info.loginName': '登录名',
        'dashboard.info.roleName': '角色',
        'dashboard.info.companyName': '公司',
        'dashboard.info.mfaStatus': 'MFA状态',
        'dashboard.info.lastLogin': '最后登录',
        'dashboard.info.unassigned': '未分配',
        'dashboard.values.unconfigured': '未配置',
        'dashboard.values.enabled': '已启用',
        'dashboard.values.disabled': '已禁用',
        'common.productCopyright': '© 2026C Leo',
        'common.frontendVersion': '前端 v{{version}}',
        'common.backendVersion': '后端 v{{version}}',
        'common.versionUnknown': '--',
      }
      return (map[key] ?? key).replace('{{version}}', options?.version ?? '')
    },
  }),
}))

vi.mock('@/api/dashboard', () => ({
  getDashboardSummary: vi.fn(),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    dashboardSummary: ['dashboardSummary'],
    dashboardBackendHealth: ['dashboardBackendHealth'],
  },
}))

vi.mock('@/api/auth', () => ({
  fetchBackendHealth: vi.fn(),
}))

vi.mock('@/hooks/useIdleActivation', () => ({
  useIdleActivation: (...args: unknown[]) => mockUseIdleActivation(...args),
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => mockUsePageVisibility(),
}))

vi.mock('@/views/dashboard/DashboardInfoPanels', () => ({
  DashboardInfoPanels: () => <div data-testid="info-panels">Info Panels</div>,
  DashboardSidebarPanels: () => (
    <div data-testid="sidebar-panels">Sidebar Panels</div>
  ),
  DashboardWorkplaceHeader: () => (
    <div data-testid="workplace-header">Workplace Header</div>
  ),
}))

vi.mock('@/views/dashboard/dashboard-info-utils', () => ({
  buildDashboardInfoItems: () => [],
}))

vi.mock('@/views/dashboard/useDashboardServerTime', () => ({
  useDashboardServerTime: () => '2024-01-01 12:00:00',
}))

vi.mock('@/views/dashboard/DashboardFlowCard', () => ({
  DashboardFlowCard: () => <div data-testid="flow-card">Flow Card</div>,
}))

vi.mock('@/utils/env', () => ({
  frontendVersion: '0.2.0',
}))

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock

import { DashboardView } from '@/views/dashboard/DashboardView'

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseIdleActivation.mockReturnValue(true)
    mockUsePageVisibility.mockReturnValue(true)
    mockUseQuery.mockImplementation((options) => {
      if (options.queryKey?.[0] === 'dashboardBackendHealth') {
        return {
          data: { version: '0.1.0' },
          isLoading: false,
          isError: false,
        }
      }
      return {
        data: {
          companyName: '测试公司',
          userName: '测试用户',
          roleName: '管理员',
          serverTime: '2024-01-01 12:00:00',
          activeSessionCount: 5,
          visibleMenuCount: 10,
          actionCount: 20,
        },
        isLoading: false,
        isError: false,
      }
    })
  })

  it('renders dashboard view', () => {
    render(<DashboardView />)
    expect(screen.getByTestId('workplace-header')).toBeTruthy()
    expect(screen.getByTestId('sidebar-panels')).toBeTruthy()
    expect(document.querySelector('.dashboard-workplace-layout')).toBeTruthy()
  })

  it('renders error alert when query fails', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
    })
    render(<DashboardView />)
    expect(screen.getByText('加载失败')).toBeTruthy()
  })

  it('renders flow card when mounted', () => {
    render(<DashboardView />)
    expect(screen.getByTestId('flow-card')).toBeTruthy()
  })

  it('renders placeholder before flow card activation', () => {
    mockUseIdleActivation.mockReturnValue(false)
    render(<DashboardView />)

    expect(screen.queryByTestId('flow-card')).toBeNull()
    expect(
      document.querySelector('.dashboard-flow-card-placeholder'),
    ).toBeTruthy()
  })

  it('disables polling while page is hidden', () => {
    mockUsePageVisibility.mockReturnValue(false)
    render(<DashboardView />)

    expect(mockUseIdleActivation).toHaveBeenCalledWith(false, 1400)
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['dashboardSummary'],
        refetchInterval: false,
      }),
    )
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['dashboardBackendHealth'],
        refetchInterval: false,
      }),
    )
  })

  it('renders version footer on dashboard only', () => {
    render(<DashboardView />)
    expect(screen.getByText('© 2026C Leo')).toBeTruthy()
    expect(screen.getByText('前端 v0.2.0')).toBeTruthy()
    expect(screen.getByText('后端 v0.1.0')).toBeTruthy()
  })

  it('does not render error alert when query is successful', () => {
    render(<DashboardView />)
    expect(screen.queryByText('加载失败')).toBeNull()
  })
})
