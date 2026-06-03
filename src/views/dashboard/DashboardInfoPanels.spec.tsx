import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.brandSubtitle': '测试系统',
        'dashboard.fields.serverTime': '服务器时间',
        'dashboard.info.accountInfo': '账户信息',
        'dashboard.info.systemOverview': '系统概览',
        'dashboard.info.activeSessions': '活跃会话',
        'dashboard.fields.visibleMenus': '可见菜单',
        'dashboard.info.actionPermissions': '操作权限',
      }
      return map[key] ?? key
    },
  }),
}))

import { DashboardInfoPanels } from '@/views/dashboard/DashboardInfoPanels'

describe('DashboardInfoPanels', () => {
  const defaultProps = {
    animatedServerTime: '2024-01-01 12:00:00',
    infoItems: [
      {
        key: 'userName',
        label: '用户名',
        value: '测试用户',
        icon: () => <div>图标</div>,
      },
      {
        key: 'loginName',
        label: '登录名',
        value: 'testuser',
        icon: () => <div>图标</div>,
      },
    ],
    summary: {
      companyName: '测试公司',
      userName: '测试用户',
      roleName: '管理员',
      activeSessionCount: 5,
      visibleMenuCount: 10,
      actionCount: 20,
    },
  }

  it('renders hero section with company name', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getByText('测试公司')).toBeTruthy()
  })

  it('renders server time', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getByText(/2024-01-01/)).toBeTruthy()
  })

  it('renders user name and role', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getAllByText('测试用户').length).toBeGreaterThan(0)
    expect(screen.getByText('管理员')).toBeTruthy()
  })

  it('renders account info card', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getByText('账户信息')).toBeTruthy()
  })

  it('renders system overview card', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getByText('系统概览')).toBeTruthy()
  })

  it('renders active sessions count', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('renders visible menus count', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getByText('10')).toBeTruthy()
  })

  it('renders action permissions count', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getByText('20')).toBeTruthy()
  })

  it('renders default values when summary is undefined', () => {
    render(
      <DashboardInfoPanels
        animatedServerTime="2024-01-01 12:00:00"
        infoItems={defaultProps.infoItems}
      />,
    )
    expect(screen.getByText('测试系统')).toBeTruthy()
  })

  it('renders info items labels', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getByText('用户名')).toBeTruthy()
    expect(screen.getByText('登录名')).toBeTruthy()
  })

  it('renders info items values', () => {
    render(<DashboardInfoPanels {...defaultProps} />)
    expect(screen.getAllByText('测试用户').length).toBeGreaterThan(0)
    expect(screen.getByText('testuser')).toBeTruthy()
  })
})
