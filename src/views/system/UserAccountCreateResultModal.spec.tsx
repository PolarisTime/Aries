import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/FormModal', () => ({
  FormModal: ({ children, title, open }: { children: React.ReactNode; title: string; open: boolean }) =>
    open ? (
      <div data-testid="form-modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  },
}))

import { UserAccountCreateResultModal } from '@/views/system/UserAccountCreateResultModal'

describe('UserAccountCreateResultModal', () => {
  const defaultProps = {
    open: true,
    result: {
      loginName: 'newuser',
      initialPassword: 'abc123',
      user: {
        loginName: 'newuser',
        departmentName: '技术部',
        roleNames: ['管理员', '普通用户'],
      },
    },
    onCopy: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(UserAccountCreateResultModal).toBeDefined()
    expect(typeof UserAccountCreateResultModal).toBe('function')
  })

  it('renders modal when open', () => {
    render(<UserAccountCreateResultModal {...defaultProps} />)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })

  it('renders create success title', () => {
    render(<UserAccountCreateResultModal {...defaultProps} />)
    expect(screen.getByText('system.userAccount.createSuccess')).toBeInTheDocument()
  })

  it('renders login name', () => {
    render(<UserAccountCreateResultModal {...defaultProps} />)
    expect(screen.getByText('newuser')).toBeInTheDocument()
  })

  it('renders initial password', () => {
    render(<UserAccountCreateResultModal {...defaultProps} />)
    expect(screen.getByText('abc123')).toBeInTheDocument()
  })

  it('renders department name', () => {
    render(<UserAccountCreateResultModal {...defaultProps} />)
    expect(screen.getByText('技术部')).toBeInTheDocument()
  })

  it('renders role names', () => {
    render(<UserAccountCreateResultModal {...defaultProps} />)
    expect(screen.getByText('管理员、普通用户')).toBeInTheDocument()
  })

  it('renders copy buttons', () => {
    render(<UserAccountCreateResultModal {...defaultProps} />)
    expect(screen.getByText('system.userAccount.copyAccount')).toBeInTheDocument()
    expect(screen.getByText('system.userAccount.copyPassword')).toBeInTheDocument()
  })

  it('renders ok button', () => {
    render(<UserAccountCreateResultModal {...defaultProps} />)
    expect(screen.getByText('common.ok')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<UserAccountCreateResultModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
  })

  it('renders with null result', () => {
    render(<UserAccountCreateResultModal {...defaultProps} result={null} />)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })
})
