import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/FormModal', () => ({
  FormModal: ({
    children,
    title,
    open,
  }: {
    children: React.ReactNode
    title: string
    open: boolean
  }) =>
    open ? (
      <div data-testid="form-modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('antd/es/form', () => {
  const Form = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  Form.Item = ({
    children,
    label,
  }: {
    children: React.ReactNode
    label: string
  }) => (
    <div>
      {label && <span>{label}</span>}
      {children}
    </div>
  )
  return { default: Form }
})

vi.mock('antd/es/input', () => ({
  default: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('antd/es/image', () => ({
  default: (props: Record<string, unknown>) => <img alt={props.alt || ''} />,
}))

vi.mock('antd/es/spin', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('antd/es/tag', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Title: ({ children }: { children: React.ReactNode }) => <h5>{children}</h5>,
    Paragraph: ({ children }: { children: React.ReactNode }) => (
      <p>{children}</p>
    ),
    Text: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
}))

vi.mock('@/utils/data-url', () => ({
  toDataImageUrl: (base64: string) => `data:image/png;base64,${base64}`,
}))

vi.mock('@/utils/form-control-a11y', () => ({
  buildLabeledFormItemProps: (opts: Record<string, unknown>) => opts,
}))

vi.mock('@/utils/form-control-id', () => ({
  buildFormControlId: (...parts: string[]) => parts.join('-'),
}))

import { UserAccountTwoFactorModal } from '@/views/system/UserAccountTwoFactorModal'

describe('UserAccountTwoFactorModal', () => {
  const defaultProps = {
    open: true,
    loading: false,
    record: {
      id: '1',
      loginName: 'admin',
      userName: 'Admin',
      totpEnabled: false,
    },
    setup: null,
    code: '',
    setupLoading: false,
    enableLoading: false,
    disableLoading: false,
    onCodeChange: vi.fn(),
    onGenerate: vi.fn(),
    onEnable: vi.fn(),
    onDisable: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(UserAccountTwoFactorModal).toBeDefined()
    expect(typeof UserAccountTwoFactorModal).toBe('function')
  })

  it('renders modal when open', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} />)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })

  it('renders modal title', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} />)
    expect(screen.getByText('auth.user2fa.title')).toBeInTheDocument()
  })

  it('renders disabled tag when TOTP is disabled', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} />)
    expect(screen.getByText('auth.user2fa.disabledTag')).toBeInTheDocument()
  })

  it('renders enabled tag when TOTP is enabled', () => {
    render(
      <UserAccountTwoFactorModal
        {...defaultProps}
        record={{ ...defaultProps.record, totpEnabled: true } as never}
      />,
    )
    expect(screen.getByText('auth.user2fa.enabledTag')).toBeInTheDocument()
  })

  it('renders user label', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} />)
    expect(
      screen.getByText('auth.user2fa.userLabel', { exact: false }),
    ).toBeInTheDocument()
  })

  it('renders setup title when TOTP disabled', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} />)
    expect(screen.getByText('auth.user2fa.setupTitle')).toBeInTheDocument()
  })

  it('renders generate button when TOTP disabled', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} />)
    expect(screen.getByText('auth.user2fa.generate')).toBeInTheDocument()
  })

  it('renders status title when TOTP enabled', () => {
    render(
      <UserAccountTwoFactorModal
        {...defaultProps}
        record={{ ...defaultProps.record, totpEnabled: true } as never}
      />,
    )
    expect(screen.getByText('auth.user2fa.statusTitle')).toBeInTheDocument()
  })

  it('renders disable button when TOTP enabled', () => {
    render(
      <UserAccountTwoFactorModal
        {...defaultProps}
        record={{ ...defaultProps.record, totpEnabled: true } as never}
      />,
    )
    expect(screen.getByText('auth.user2fa.disable')).toBeInTheDocument()
  })

  it('renders setup details when setup data exists', () => {
    render(
      <UserAccountTwoFactorModal
        {...defaultProps}
        setup={{ secret: 'JBSWY3DPEHPK3PXP', qrCodeBase64: 'abc123' } as never}
      />,
    )
    expect(screen.getByText('auth.user2fa.secretLabel')).toBeInTheDocument()
    expect(screen.getByText('auth.user2fa.verifyLabel')).toBeInTheDocument()
    expect(screen.getByText('auth.user2fa.regenerate')).toBeInTheDocument()
    expect(screen.getByText('auth.user2fa.enable')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
  })

  it('renders with null record', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} record={null} />)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })
})
