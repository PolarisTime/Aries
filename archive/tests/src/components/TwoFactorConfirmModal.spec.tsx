import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TwoFactorConfirmModal } from './TwoFactorConfirmModal'

const messageErrorMock = vi.hoisted(() => vi.fn())

vi.mock('@/utils/antd-app', () => ({
  message: {
    error: messageErrorMock,
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.twofactormodal.title': '双因素认证',
        'auth.twofactormodal.description': '请输入验证码',
        'auth.twofactormodal.placeholder': '请输入6位验证码',
        'auth.twofactormodal.codeRequired': '请输入完整的验证码',
        'auth.twofactormodal.verifyFailed': '验证失败',
        'common.confirm': '确认',
        'common.cancel': '取消',
      }
      return translations[key] || key
    },
  }),
}))

describe('TwoFactorConfirmModal', () => {
  const defaultProps = {
    open: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with title and description', () => {
    render(<TwoFactorConfirmModal {...defaultProps} />)
    expect(screen.getByText('双因素认证')).toBeTruthy()
    expect(screen.getByText('请输入验证码')).toBeTruthy()
  })

  it('renders input field with placeholder', () => {
    render(<TwoFactorConfirmModal {...defaultProps} />)
    expect(screen.getByPlaceholderText('请输入6位验证码')).toBeTruthy()
  })

  it('renders confirm and cancel buttons', () => {
    render(<TwoFactorConfirmModal {...defaultProps} />)
    expect(screen.getByText(/确\s*认/)).toBeTruthy()
    expect(screen.getByText(/取\s*消/)).toBeTruthy()
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(<TwoFactorConfirmModal {...defaultProps} onCancel={onCancel} />)

    fireEvent.click(screen.getByText(/取\s*消/))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows error when code is less than 6 digits', async () => {
    render(<TwoFactorConfirmModal {...defaultProps} />)

    const input = screen.getByPlaceholderText('请输入6位验证码')
    fireEvent.change(input, { target: { value: '123' } })
    fireEvent.click(screen.getByText(/确\s*认/))

    await waitFor(() => {
      expect(messageErrorMock).toHaveBeenCalledWith('请输入完整的验证码')
    })
  })

  it('calls onConfirm when valid 6-digit code submitted', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<TwoFactorConfirmModal {...defaultProps} onConfirm={onConfirm} />)

    const input = screen.getByPlaceholderText('请输入6位验证码')
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(screen.getByText(/确\s*认/))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('123456')
    })
  })

  it('shows error when onConfirm rejects', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('验证失败'))
    render(<TwoFactorConfirmModal {...defaultProps} onConfirm={onConfirm} />)

    const input = screen.getByPlaceholderText('请输入6位验证码')
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(screen.getByText(/确\s*认/))

    await waitFor(() => {
      expect(messageErrorMock).toHaveBeenCalledWith('验证失败')
    })
  })

  it('shows generic error when onConfirm rejects with non-Error', async () => {
    const onConfirm = vi.fn().mockRejectedValue('unknown error')
    render(<TwoFactorConfirmModal {...defaultProps} onConfirm={onConfirm} />)

    const input = screen.getByPlaceholderText('请输入6位验证码')
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(screen.getByText(/确\s*认/))

    await waitFor(() => {
      expect(messageErrorMock).toHaveBeenCalledWith('验证失败')
    })
  })

  it('clears input after successful confirmation', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<TwoFactorConfirmModal {...defaultProps} onConfirm={onConfirm} />)

    const input = screen.getByPlaceholderText('请输入6位验证码')
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(screen.getByText(/确\s*认/))

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('clears input when cancel clicked', () => {
    render(<TwoFactorConfirmModal {...defaultProps} />)

    const input = screen.getByPlaceholderText('请输入6位验证码')
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(screen.getByText(/取\s*消/))

    expect(input).toHaveValue('')
  })

  it('renders with custom title', () => {
    render(<TwoFactorConfirmModal {...defaultProps} title="自定义标题" />)
    expect(screen.getByText('自定义标题')).toBeTruthy()
  })

  it('handles enter key press', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<TwoFactorConfirmModal {...defaultProps} onConfirm={onConfirm} />)

    const input = screen.getByPlaceholderText('请输入6位验证码')
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('123456')
    })
  })

  it('limits input to 6 characters', () => {
    render(<TwoFactorConfirmModal {...defaultProps} />)

    const input = screen.getByPlaceholderText('请输入6位验证码')
    expect(input).toHaveAttribute('maxlength', '6')
  })
})
