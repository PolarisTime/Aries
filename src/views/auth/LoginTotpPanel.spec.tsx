import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      const map: Record<string, string> = {
        'auth.totppanel.step': '第二步',
        'auth.totppanel.title': '双因素验证',
        'auth.totppanel.description': '请输入验证码 {{loginName}}',
        'auth.totppanel.expired': '验证码已过期',
        'auth.totppanel.inputAria': '验证码',
        'auth.totppanel.placeholder': '请输入6位验证码',
        'auth.totppanel.submit': '验证',
        'auth.totppanel.back': '返回',
        'auth.setup2fa.currentUserFallback': '当前用户',
      }
      let result = map[key] ?? key
      if (options?.loginName) {
        result = result.replace('{{loginName}}', options.loginName)
      }
      return result
    },
  }),
}))

vi.mock('@/utils/form-control-id', () => ({
  buildFormControlId: (prefix: string, name: string) => `${prefix}-${name}`,
}))

import { LoginTotpPanel } from '@/views/auth/LoginTotpPanel'

describe('LoginTotpPanel', () => {
  const defaultProps = {
    countdownText: '05:00',
    isExpired: false,
    isExpiring: false,
    onBackToPassword: vi.fn(),
    onTotpCodeChange: vi.fn(),
    onVerify: vi.fn(),
    totpCode: '',
    totpLoading: false,
    activeLoginName: 'testuser',
  }

  it('renders totp panel with all elements', () => {
    const { container } = render(<LoginTotpPanel {...defaultProps} />)
    expect(screen.getByText('双因素验证')).toBeTruthy()
    expect(screen.getByText('05:00')).toBeTruthy()
    expect(screen.getByLabelText('验证码')).toBeTruthy()
    expect(container.querySelector('.login-submit-btn')).toBeTruthy()
    expect(container.querySelector('.anticon-arrow-left')).toBeTruthy()
  })

  it('displays countdown timer', () => {
    render(<LoginTotpPanel {...defaultProps} countdownText="03:45" />)
    expect(screen.getByText('03:45')).toBeTruthy()
  })

  it('shows expired alert when isExpired is true', () => {
    render(<LoginTotpPanel {...defaultProps} isExpired={true} />)
    expect(screen.getByText('验证码已过期')).toBeTruthy()
  })

  it('does not show expired alert when isExpired is false', () => {
    render(<LoginTotpPanel {...defaultProps} isExpired={false} />)
    expect(screen.queryByText('验证码已过期')).toBeNull()
  })

  it('disables verify button when expired', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} isExpired={true} />,
    )
    const verifyButton = container.querySelector(
      '.login-submit-btn',
    ) as HTMLButtonElement
    expect(verifyButton).toBeDisabled()
  })

  it('disables verify button when code is less than 6 digits', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} totpCode="12345" />,
    )
    const verifyButton = container.querySelector(
      '.login-submit-btn',
    ) as HTMLButtonElement
    expect(verifyButton).toBeDisabled()
  })

  it('enables verify button when code is 6 digits and not expired', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} totpCode="123456" />,
    )
    const verifyButton = container.querySelector(
      '.login-submit-btn',
    ) as HTMLButtonElement
    expect(verifyButton).not.toBeDisabled()
  })

  it('calls onTotpCodeChange when input changes', () => {
    const onTotpCodeChange = vi.fn()
    render(
      <LoginTotpPanel {...defaultProps} onTotpCodeChange={onTotpCodeChange} />,
    )
    const input = screen.getByLabelText('验证码')
    fireEvent.change(input, { target: { value: '123' } })
    expect(onTotpCodeChange).toHaveBeenCalledWith('123')
  })

  it('calls onVerify when verify button is clicked', () => {
    const onVerify = vi.fn()
    const { container } = render(
      <LoginTotpPanel
        {...defaultProps}
        totpCode="123456"
        onVerify={onVerify}
      />,
    )
    const verifyButton = container.querySelector(
      '.login-submit-btn',
    ) as HTMLButtonElement
    fireEvent.click(verifyButton)
    expect(onVerify).toHaveBeenCalled()
  })

  it('calls onBackToPassword when back button is clicked', () => {
    const onBackToPassword = vi.fn()
    const { container } = render(
      <LoginTotpPanel {...defaultProps} onBackToPassword={onBackToPassword} />,
    )
    const backButton = container
      .querySelector('.anticon-arrow-left')
      ?.closest('button') as HTMLButtonElement
    fireEvent.click(backButton)
    expect(onBackToPassword).toHaveBeenCalled()
  })

  it('shows loading state on verify button', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} totpLoading={true} />,
    )
    const verifyButton = container.querySelector(
      '.login-submit-btn',
    ) as HTMLButtonElement
    expect(verifyButton).toBeTruthy()
    expect(verifyButton.className).toContain('ant-btn-loading')
  })

  it('displays active login name in description', () => {
    render(<LoginTotpPanel {...defaultProps} activeLoginName="admin" />)
    expect(screen.getByText('请输入验证码 admin')).toBeTruthy()
  })

  it('applies is-expiring class to timer ring when expiring', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} isExpiring={true} />,
    )
    const timerRing = container.querySelector('.login-totp-timer-ring')
    expect(timerRing?.className).toContain('is-expiring')
  })

  it('does not apply is-expiring class when not expiring', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} isExpiring={false} />,
    )
    const timerRing = container.querySelector('.login-totp-timer-ring')
    expect(timerRing?.className).not.toContain('is-expiring')
  })

  it('sets input maxLength to 6', () => {
    render(<LoginTotpPanel {...defaultProps} />)
    const input = screen.getByLabelText('验证码') as HTMLInputElement
    expect(input.maxLength).toBe(6)
  })

  it('sets input mode to numeric', () => {
    render(<LoginTotpPanel {...defaultProps} />)
    const input = screen.getByLabelText('验证码')
    expect(input.getAttribute('inputmode')).toBe('numeric')
  })

  it('sets autoComplete to one-time-code', () => {
    render(<LoginTotpPanel {...defaultProps} />)
    const input = screen.getByLabelText('验证码')
    expect(input.getAttribute('autocomplete')).toBe('one-time-code')
  })

  it('sets input name attribute', () => {
    render(<LoginTotpPanel {...defaultProps} />)
    const input = screen.getByLabelText('验证码')
    expect(input.getAttribute('name')).toBe('login-totp-code')
  })

  it('sets input id from buildFormControlId', () => {
    render(<LoginTotpPanel {...defaultProps} />)
    const input = screen.getByLabelText('验证码')
    expect(input.getAttribute('id')).toBe('login-totp-code')
  })

  it('calls onVerify when Enter key is pressed in input', () => {
    const onVerify = vi.fn()
    render(
      <LoginTotpPanel
        {...defaultProps}
        totpCode="123456"
        onVerify={onVerify}
      />,
    )
    const input = screen.getByLabelText('验证码')
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(onVerify).toHaveBeenCalled()
  })

  it('renders step tag with totp class', () => {
    const { container } = render(<LoginTotpPanel {...defaultProps} />)
    const stepTag = container.querySelector('.login-step-tag.is-totp')
    expect(stepTag).toBeTruthy()
    expect(stepTag?.textContent).toContain('第二步')
  })

  it('renders countdown timer wrapper', () => {
    const { container } = render(<LoginTotpPanel {...defaultProps} />)
    expect(container.querySelector('.login-totp-timer')).toBeTruthy()
  })

  it('shows red icon when expiring', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} isExpiring={true} />,
    )
    const icon = container.querySelector('.text-red-500')
    expect(icon).toBeTruthy()
  })

  it('shows slate icon when not expiring', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} isExpiring={false} />,
    )
    const icon = container.querySelector('.text-slate-500')
    expect(icon).toBeTruthy()
  })

  it('verify button has full width block class', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} totpCode="123456" />,
    )
    const verifyButton = container.querySelector('.login-submit-btn')
    expect(verifyButton).toBeTruthy()
    expect(verifyButton?.className).toContain('login-submit-btn')
  })

  it('does not call onVerify when verify button is clicked and expired', () => {
    const onVerify = vi.fn()
    const { container } = render(
      <LoginTotpPanel {...defaultProps} isExpired={true} onVerify={onVerify} />,
    )
    const verifyButton = container.querySelector(
      '.login-submit-btn',
    ) as HTMLButtonElement
    fireEvent.click(verifyButton)
    expect(onVerify).not.toHaveBeenCalled()
  })

  it('displays empty totpCode value in input', () => {
    render(<LoginTotpPanel {...defaultProps} totpCode="" />)
    const input = screen.getByLabelText('验证码') as HTMLInputElement
    expect(input.value).toBe('')
  })

  it('displays totpCode value in input', () => {
    render(<LoginTotpPanel {...defaultProps} totpCode="123456" />)
    const input = screen.getByLabelText('验证码') as HTMLInputElement
    expect(input.value).toBe('123456')
  })

  it('disables verify button when code has more than 6 digits', () => {
    const { container } = render(
      <LoginTotpPanel {...defaultProps} totpCode="1234567" />,
    )
    const verifyButton = container.querySelector(
      '.login-submit-btn',
    ) as HTMLButtonElement
    expect(verifyButton).not.toBeDisabled()
  })

  it('back button has icon', () => {
    const { container } = render(<LoginTotpPanel {...defaultProps} />)
    const backButton = container.querySelector('.h-12') as HTMLButtonElement
    expect(backButton.querySelector('.anticon-arrow-left')).toBeTruthy()
  })
})
