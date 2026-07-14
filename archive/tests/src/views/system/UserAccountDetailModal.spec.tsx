import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/utils/formatters', () => ({
  formatDateTime: (v: unknown, fallback: string) => (v ? String(v) : fallback),
}))

import { UserAccountDetailModal } from '@/views/system/UserAccountDetailModal'

describe('UserAccountDetailModal', () => {
  const defaultProps = {
    open: true,
    loading: false,
    record: {
      id: '1',
      loginName: 'admin',
      userName: 'Admin',
      mobile: '13800138000',
      departmentName: '技术部',
      dataScope: '全部数据',
      roleNames: ['管理员', '普通用户'],
      permissionSummary: '全部权限',
      status: '正常',
      totpEnabled: true,
      lastLoginDate: '2024-01-01T12:00:00',
      remark: '系统管理员',
    },
    getStatusColor: vi.fn(() => 'green'),
    getTotpColor: vi.fn(() => 'processing'),
    onClose: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(UserAccountDetailModal).toBeDefined()
    expect(typeof UserAccountDetailModal).toBe('function')
  })

  it('renders modal title', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountDetail.title'),
    ).toBeInTheDocument()
  })

  it('renders login name', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('renders user name', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders mobile', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(screen.getByText('13800138000')).toBeInTheDocument()
  })

  it('renders department', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(screen.getByText('技术部')).toBeInTheDocument()
  })

  it('renders data scope', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(screen.getByText('全部数据')).toBeInTheDocument()
  })

  it('renders roles', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(screen.getByText('管理员、普通用户')).toBeInTheDocument()
  })

  it('renders permission summary', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(screen.getByText('全部权限')).toBeInTheDocument()
  })

  it('renders status', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(screen.getByText('正常')).toBeInTheDocument()
  })

  it('renders remark', () => {
    render(<UserAccountDetailModal {...defaultProps} />)
    expect(screen.getByText('系统管理员')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    const { container } = render(
      <UserAccountDetailModal {...defaultProps} loading={true} />,
    )
    expect(container).toBeInTheDocument()
  })

  it('renders null record gracefully', () => {
    render(<UserAccountDetailModal {...defaultProps} record={null} />)
    expect(
      screen.getByText('system.userAccountDetail.title'),
    ).toBeInTheDocument()
  })

  it('renders missing optional fields as --', () => {
    render(
      <UserAccountDetailModal
        {...defaultProps}
        record={
          {
            ...defaultProps.record,
            mobile: '',
            departmentName: '',
            remark: '',
          } as never
        }
      />,
    )
    expect(screen.getAllByText('--').length).toBeGreaterThan(0)
  })

  it('renders empty access fields and disabled totp status', () => {
    const getTotpColor = vi.fn(() => 'default')

    render(
      <UserAccountDetailModal
        {...defaultProps}
        getTotpColor={getTotpColor}
        record={
          {
            ...defaultProps.record,
            dataScope: '',
            roleNames: [],
            permissionSummary: '',
            totpEnabled: false,
          } as never
        }
      />,
    )

    expect(screen.getAllByText('--')).toHaveLength(3)
    expect(
      screen.getByText('system.userAccountDetail.totpDisabled'),
    ).toBeInTheDocument()
    expect(getTotpColor).toHaveBeenCalledWith(false)
  })
})
