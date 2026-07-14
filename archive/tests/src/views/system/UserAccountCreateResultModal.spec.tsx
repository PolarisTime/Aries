import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@ant-design/icons', () => ({
  CopyOutlined: () => <span data-testid="copy-icon" />,
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
        data-footer={footer === null ? 'null' : 'custom'}
        data-testid="form-modal"
        data-width={width}
      >
        <button type="button" onClick={onClose}>
          modal-close
        </button>
        {children}
      </section>
    ) : null,
}))

vi.mock('antd', () => ({
  Button: ({
    children,
    icon,
    onClick,
    type: antdType,
  }: {
    children: ReactNode
    icon?: ReactNode
    onClick?: () => void
    type?: string
  }) => (
    <button
      data-antd-type={antdType ?? 'default'}
      data-has-icon={icon ? 'true' : 'false'}
      type="button"
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  ),
  Typography: {
    Text: ({ children, type }: { children: ReactNode; type?: string }) => (
      <span data-typography-type={type}>{children}</span>
    ),
  },
}))

import { UserAccountCreateResultModal } from '@/views/system/UserAccountCreateResultModal'

describe('UserAccountCreateResultModal', () => {
  const defaultResult = {
    loginName: 'top-level-user',
    password: 'top-level-password',
    initialPassword: 'abc123',
    user: {
      loginName: 'newuser',
      departmentName: '技术部',
      roleNames: ['管理员', '普通用户'],
    },
  }

  const renderModal = (
    props: Partial<
      React.ComponentProps<typeof UserAccountCreateResultModal>
    > = {},
  ) => {
    const onCopy = vi.fn()
    const onClose = vi.fn()

    render(
      <UserAccountCreateResultModal
        open
        result={defaultResult}
        onCopy={onCopy}
        onClose={onClose}
        {...props}
      />,
    )

    return { onClose, onCopy }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the account creation result and modal props when open', () => {
    renderModal()

    const modal = screen.getByTestId('form-modal')
    expect(modal).toHaveAttribute(
      'aria-label',
      'system.userAccount.createSuccess',
    )
    expect(modal).toHaveAttribute('data-footer', 'null')
    expect(modal).toHaveAttribute('data-width', '560')
    expect(screen.getByText('system.userAccount.account')).toBeInTheDocument()
    expect(screen.getByText('newuser')).toBeInTheDocument()
    expect(
      screen.getByText('system.userAccount.initialPassword'),
    ).toBeInTheDocument()
    expect(screen.getByText('abc123')).toBeInTheDocument()
    expect(screen.getByText('技术部')).toBeInTheDocument()
    expect(screen.getByText('管理员、普通用户')).toBeInTheDocument()
    expect(
      screen.getByText('system.userAccount.savePasswordHint'),
    ).toHaveAttribute('data-typography-type', 'warning')
    expect(screen.getAllByTestId('copy-icon')).toHaveLength(2)
  })

  it('does not render modal contents when closed or when result is null', () => {
    const { rerender } = render(
      <UserAccountCreateResultModal
        open={false}
        result={defaultResult}
        onCopy={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()

    rerender(
      <UserAccountCreateResultModal
        open
        result={null}
        onCopy={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
    expect(
      screen.queryByText('system.userAccount.copyAccount'),
    ).not.toBeInTheDocument()
  })

  it('copies account and password values with translated labels', () => {
    const { onCopy } = renderModal()

    fireEvent.click(screen.getByText('system.userAccount.copyAccount'))
    fireEvent.click(screen.getByText('system.userAccount.copyPassword'))

    expect(onCopy).toHaveBeenNthCalledWith(
      1,
      'newuser',
      'system.userAccount.account',
    )
    expect(onCopy).toHaveBeenNthCalledWith(
      2,
      'abc123',
      'system.userAccount.initialPassword',
    )
  })

  it('uses the close callback from both the modal and the ok button', () => {
    const { onClose } = renderModal()

    fireEvent.click(screen.getByText('modal-close'))
    fireEvent.click(screen.getByText('common.ok'))

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('falls back to top-level account fields when nested user values are absent', () => {
    const { onCopy } = renderModal({
      result: {
        loginName: 'fallback-user',
        password: 'fallback-password',
        user: {
          departmentName: '',
          roleNames: [],
        },
      },
    })

    expect(screen.getByText('fallback-user')).toBeInTheDocument()
    expect(screen.getByText('fallback-password')).toBeInTheDocument()
    expect(screen.getAllByText('--')).toHaveLength(2)

    fireEvent.click(screen.getByText('system.userAccount.copyAccount'))
    fireEvent.click(screen.getByText('system.userAccount.copyPassword'))

    expect(onCopy).toHaveBeenNthCalledWith(
      1,
      'fallback-user',
      'system.userAccount.account',
    )
    expect(onCopy).toHaveBeenNthCalledWith(
      2,
      'fallback-password',
      'system.userAccount.initialPassword',
    )
  })

  it('uses empty strings and placeholders when optional result fields are missing', () => {
    const { onCopy } = renderModal({
      result: {},
    })

    const modal = screen.getByTestId('form-modal')
    const accountBlock = within(modal).getByText(
      'system.userAccount.account',
    ).parentElement
    const passwordBlock = within(modal).getByText(
      'system.userAccount.initialPassword',
    ).parentElement

    expect(accountBlock).toHaveTextContent('system.userAccount.account')
    expect(passwordBlock).toHaveTextContent(
      'system.userAccount.initialPassword',
    )
    expect(screen.getAllByText('--')).toHaveLength(2)

    fireEvent.click(screen.getByText('system.userAccount.copyAccount'))
    fireEvent.click(screen.getByText('system.userAccount.copyPassword'))

    expect(onCopy).toHaveBeenNthCalledWith(1, '', 'system.userAccount.account')
    expect(onCopy).toHaveBeenNthCalledWith(
      2,
      '',
      'system.userAccount.initialPassword',
    )
  })
})
