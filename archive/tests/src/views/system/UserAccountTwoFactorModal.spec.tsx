import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}))

vi.mock('@/components/FormModal', () => ({
  FormModal: ({
    children,
    title,
    open,
    onClose,
    footer,
    width,
  }: {
    children: ReactNode
    title: string
    open: boolean
    onClose: () => void
    footer: ReactNode
    width: number
  }) =>
    open ? (
      <section
        aria-label={title}
        data-footer={footer === null ? 'none' : 'custom'}
        data-testid="form-modal"
        data-width={width}
      >
        <h2>{title}</h2>
        <button type="button" onClick={onClose}>
          close modal
        </button>
        {children}
      </section>
    ) : null,
}))

vi.mock('@/components/StatusTag', () => ({
  StatusTag: ({
    status,
    statusMap,
    className,
  }: {
    status: string
    statusMap: Record<string, { label: string }>
    className?: string
  }) => (
    <span className={className} data-testid="status-tag" data-status={status}>
      {statusMap[status]?.label}
    </span>
  ),
}))

vi.mock('antd', () => {
  const Form = ({
    children,
    layout,
  }: {
    children: ReactNode
    layout?: string
  }) => <form data-layout={layout}>{children}</form>

  Form.Item = ({
    children,
    htmlFor,
    label,
  }: {
    children: ReactNode
    htmlFor?: string
    label?: ReactNode
  }) => (
    <label htmlFor={htmlFor}>
      {label}
      {children}
    </label>
  )

  const Typography = {
    Title: ({ children, level }: { children: ReactNode; level?: number }) => (
      <h3 data-level={level}>{children}</h3>
    ),
    Paragraph: ({ children, type }: { children: ReactNode; type?: string }) => (
      <p data-type={type}>{children}</p>
    ),
    Text: ({
      children,
      className,
      type,
    }: {
      children: ReactNode
      className?: string
      type?: string
    }) => (
      <span className={className} data-type={type}>
        {children}
      </span>
    ),
  }

  return {
    Button: ({
      children,
      danger,
      loading,
      onClick,
      type,
    }: {
      children: ReactNode
      danger?: boolean
      loading?: boolean
      onClick?: () => void
      type?: string
    }) => (
      <button
        data-danger={danger ? 'true' : 'false'}
        data-loading={loading ? 'true' : 'false'}
        data-type={type ?? 'default'}
        disabled={loading}
        type="button"
        onClick={onClick}
      >
        {children}
      </button>
    ),
    Form,
    Image: ({
      alt,
      preview,
      src,
      width,
    }: {
      alt: string
      preview?: boolean
      src?: string
      width?: number
    }) => (
      <img
        alt={alt}
        data-preview={preview ? 'true' : 'false'}
        data-width={width}
        src={src}
      />
    ),
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input {...props} />
    ),
    Spin: ({
      children,
      spinning,
    }: {
      children: ReactNode
      spinning?: boolean
    }) => (
      <div data-spinning={spinning ? 'true' : 'false'} data-testid="spin">
        {children}
      </div>
    ),
    Typography,
  }
})

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
  const handlers = {
    onCodeChange: vi.fn(),
    onGenerate: vi.fn(),
    onEnable: vi.fn(),
    onDisable: vi.fn(),
    onClose: vi.fn(),
  }

  const disabledRecord = {
    id: '1',
    loginName: 'admin',
    userName: 'Admin',
    totpEnabled: false,
  }

  const defaultProps = {
    open: true,
    loading: false,
    record: disabledRecord,
    setup: null,
    code: '',
    setupLoading: false,
    enableLoading: false,
    disableLoading: false,
    ...handlers,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render modal content when closed', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} open={false} />)

    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
    expect(screen.queryByText('auth.user2fa.title')).not.toBeInTheDocument()
  })

  it('renders the modal shell with loading state and no record body', () => {
    render(
      <UserAccountTwoFactorModal {...defaultProps} loading record={null} />,
    )

    const modal = screen.getByTestId('form-modal')
    expect(modal).toHaveAttribute('data-width', '720')
    expect(modal).toHaveAttribute('data-footer', 'none')
    expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'true')
    expect(screen.queryByTestId('status-tag')).not.toBeInTheDocument()
  })

  it('closes through FormModal onClose', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'close modal' }))

    expect(handlers.onClose).toHaveBeenCalledTimes(1)
  })

  it('renders disabled TOTP setup state and keeps generate disabled while loading', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} setupLoading />)

    expect(screen.getByText('auth.user2fa.title')).toBeInTheDocument()
    expect(screen.getByTestId('status-tag')).toHaveAttribute(
      'data-status',
      'disabled',
    )
    expect(screen.getByText('auth.user2fa.disabledTag')).toBeInTheDocument()
    expect(
      screen.getByText('auth.user2fa.userLabel:{"loginName":"admin"}'),
    ).toBeInTheDocument()
    expect(screen.getByText('auth.user2fa.setupTitle')).toBeInTheDocument()
    expect(
      screen.getByText('auth.user2fa.setupDescription'),
    ).toBeInTheDocument()

    const generateButton = screen.getByRole('button', {
      name: 'auth.user2fa.generate',
    })
    expect(generateButton).toHaveAttribute('data-type', 'primary')
    expect(generateButton).toHaveAttribute('data-loading', 'true')
    expect(generateButton).toBeDisabled()
    fireEvent.click(generateButton)
    expect(handlers.onGenerate).not.toHaveBeenCalled()
  })

  it('generates setup data when the generate button is not loading', () => {
    render(<UserAccountTwoFactorModal {...defaultProps} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'auth.user2fa.generate' }),
    )

    expect(handlers.onGenerate).toHaveBeenCalledTimes(1)
  })

  it('renders setup details and handles verification interactions', () => {
    render(
      <UserAccountTwoFactorModal
        {...defaultProps}
        code="123456"
        enableLoading
        setup={{
          secret: 'JBSWY3DPEHPK3PXP',
          qrCodeBase64: 'abc123',
        }}
      />,
    )

    const qrCode = screen.getByRole('img', { name: 'TOTP QR Code' })
    expect(qrCode).toHaveAttribute('src', 'data:image/png;base64,abc123')
    expect(qrCode).toHaveAttribute('data-preview', 'false')
    expect(qrCode).toHaveAttribute('data-width', '200')

    const secretInput = screen.getByLabelText('auth.user2fa.secretLabel')
    expect(secretInput).toHaveAttribute('id', 'user-account-2fa-setup-secret')
    expect(secretInput).toHaveAttribute('name', 'two-factor-secret')
    expect(secretInput).toHaveValue('JBSWY3DPEHPK3PXP')
    expect(secretInput).toHaveAttribute('readonly')

    const verifyInput = screen.getByLabelText('auth.user2fa.verifyLabel')
    expect(verifyInput).toHaveAttribute('id', 'user-account-2fa-verify-code')
    expect(verifyInput).toHaveAttribute('name', 'two-factor-verify-code')
    expect(verifyInput).toHaveAttribute(
      'placeholder',
      'auth.user2fa.verifyPlaceholder',
    )
    expect(verifyInput).toHaveAttribute('maxlength', '6')
    expect(verifyInput).toHaveValue('123456')

    fireEvent.change(verifyInput, { target: { value: '654321' } })
    expect(handlers.onCodeChange).toHaveBeenCalledTimes(1)
    expect(handlers.onCodeChange).toHaveBeenCalledWith('654321')

    fireEvent.click(
      screen.getByRole('button', { name: 'auth.user2fa.regenerate' }),
    )
    expect(handlers.onGenerate).toHaveBeenCalledTimes(1)

    const enableButton = screen.getByRole('button', {
      name: 'auth.user2fa.enable',
    })
    expect(enableButton).toHaveAttribute('data-type', 'primary')
    expect(enableButton).toHaveAttribute('data-loading', 'true')
    expect(enableButton).toBeDisabled()
    fireEvent.click(enableButton)
    expect(handlers.onEnable).not.toHaveBeenCalled()
  })

  it('enables two factor setup when the enable button is not loading', () => {
    render(
      <UserAccountTwoFactorModal
        {...defaultProps}
        setup={{
          secret: 'JBSWY3DPEHPK3PXP',
          qrCodeBase64: 'abc123',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'auth.user2fa.enable' }))

    expect(handlers.onEnable).toHaveBeenCalledTimes(1)
  })

  it('renders an operator TOTP input before disabling enabled 2FA', () => {
    render(
      <UserAccountTwoFactorModal
        {...defaultProps}
        code="123456"
        disableLoading={false}
        record={{ ...disabledRecord, totpEnabled: true }}
      />,
    )

    expect(screen.getByTestId('status-tag')).toHaveAttribute(
      'data-status',
      'enabled',
    )
    expect(screen.getByText('auth.user2fa.enabledTag')).toBeInTheDocument()
    expect(screen.getByText('auth.user2fa.statusTitle')).toBeInTheDocument()
    expect(
      screen.getByText('auth.user2fa.statusDescription'),
    ).toBeInTheDocument()

    const disableCodeInput = screen.getByLabelText(
      'auth.user2fa.disableCodeLabel',
    )
    expect(disableCodeInput).toHaveAttribute(
      'id',
      'user-account-2fa-disable-code',
    )
    expect(disableCodeInput).toHaveAttribute('name', 'two-factor-disable-code')
    expect(disableCodeInput).toHaveAttribute(
      'placeholder',
      'auth.user2fa.disableCodePlaceholder',
    )
    expect(disableCodeInput).toHaveAttribute('maxlength', '6')
    expect(disableCodeInput).toHaveAttribute('inputmode', 'numeric')
    expect(disableCodeInput).toHaveAttribute('autocomplete', 'one-time-code')
    expect(disableCodeInput).toBeRequired()
    expect(disableCodeInput).toHaveValue('123456')

    fireEvent.change(disableCodeInput, { target: { value: '654321' } })
    expect(handlers.onCodeChange).toHaveBeenCalledWith('654321')

    const disableButton = screen.getByRole('button', {
      name: 'auth.user2fa.disable',
    })
    expect(disableButton).toHaveAttribute('data-danger', 'true')
    expect(disableButton).toHaveAttribute('data-loading', 'false')
    fireEvent.click(disableButton)

    expect(handlers.onDisable).toHaveBeenCalledTimes(1)
  })

  it('keeps disable action disabled while disable loading is active', () => {
    render(
      <UserAccountTwoFactorModal
        {...defaultProps}
        disableLoading
        record={{ ...disabledRecord, totpEnabled: true }}
      />,
    )

    const disableButton = screen.getByRole('button', {
      name: 'auth.user2fa.disable',
    })
    expect(
      screen.getByLabelText('auth.user2fa.disableCodeLabel'),
    ).toBeDisabled()
    expect(disableButton).toHaveAttribute('data-loading', 'true')
    expect(disableButton).toBeDisabled()
    fireEvent.click(disableButton)

    expect(handlers.onDisable).not.toHaveBeenCalled()
  })
})
