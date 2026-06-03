import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PersonalSettingsSecurityTab } from '@/layouts/PersonalSettingsSecurityTab'
import Form from 'antd/es/form'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'auth.personalsecurity.accountTitle': '账号: {{displayName}} ({{loginName}})',
        'auth.personalsecurity.enabledDescription': '2FA 已启用',
        'auth.personalsecurity.disabledDescription': '2FA 未启用',
        'auth.personalsecurity.loginName': '登录名',
        'auth.personalsecurity.currentStatus': '当前状态',
        'auth.personalsecurity.twoFactor': '两步验证',
        'auth.personalsecurity.enabled': '已启用',
        'auth.personalsecurity.disabled': '未启用',
        'auth.personalsecurity.alreadyEnabled': '已启用两步验证',
        'auth.personalsecurity.codeAria': '验证码',
        'auth.personalsecurity.codePlaceholder': '输入6位验证码',
        'auth.personalsecurity.enable': '启用',
        'auth.personalsecurity.generate': '生成二维码',
        'auth.personalsecurity.currentPassword': '当前密码',
        'auth.personalsecurity.currentPasswordRequired': '请输入当前密码',
        'auth.personalsecurity.newPassword': '新密码',
        'auth.personalsecurity.newPasswordRequired': '密码至少6位',
        'auth.personalsecurity.passwordHint': '密码至少6位字符',
        'auth.personalsecurity.updatePassword': '修改密码',
      }
      let result = map[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{{${k}}}`, v)
        }
      }
      return result
    },
  }),
}))

vi.mock('@/utils/data-url', () => ({
  toDataImageUrl: (base64: string) => `data:image/png;base64,${base64}`,
}))

vi.mock('@/utils/form-control-id', () => ({
  buildFormControlId: (...parts: string[]) => parts.join('-'),
}))

function Wrapper() {
  const [form] = Form.useForm()
  return (
    <PersonalSettingsSecurityTab
      user={{ userName: '张三', loginName: 'zhangsan', totpEnabled: false }}
      pwForm={form}
      pwSaving={false}
      totpLoading={false}
      totpSetup={null}
      totpCode=""
      totpEnabling={false}
      onChangePassword={vi.fn()}
      onSetupTotp={vi.fn()}
      onSetTotpCode={vi.fn()}
      onEnableTotp={vi.fn()}
    />
  )
}

describe('PersonalSettingsSecurityTab', () => {
  it('renders account info alert', () => {
    render(<Wrapper />)
    expect(screen.getByText(/张三/)).toBeDefined()
  })

  it('renders login name', () => {
    render(<Wrapper />)
    expect(screen.getByText('zhangsan')).toBeDefined()
  })

  it('shows disabled status when totp is not enabled', () => {
    render(<Wrapper />)
    expect(screen.getByText('未启用')).toBeDefined()
  })

  it('shows enabled status when totp is enabled', () => {
    function EnabledWrapper() {
      const [form] = Form.useForm()
      return (
        <PersonalSettingsSecurityTab
          user={{ userName: '张三', loginName: 'zhangsan', totpEnabled: true }}
          pwForm={form}
          pwSaving={false}
          totpLoading={false}
          totpSetup={null}
          totpCode=""
          totpEnabling={false}
          onChangePassword={vi.fn()}
          onSetupTotp={vi.fn()}
          onSetTotpCode={vi.fn()}
          onEnableTotp={vi.fn()}
        />
      )
    }
    render(<EnabledWrapper />)
    expect(screen.getByText('已启用')).toBeDefined()
  })

  it('renders generate button when totp is not set up', () => {
    render(<Wrapper />)
    expect(screen.getByText('生成二维码')).toBeDefined()
  })

  it('calls onSetupTotp when generate button is clicked', () => {
    const onSetup = vi.fn()
    function SetupWrapper() {
      const [form] = Form.useForm()
      return (
        <PersonalSettingsSecurityTab
          user={{ userName: '张三', loginName: 'zhangsan', totpEnabled: false }}
          pwForm={form}
          pwSaving={false}
          totpLoading={false}
          totpSetup={null}
          totpCode=""
          totpEnabling={false}
          onChangePassword={vi.fn()}
          onSetupTotp={onSetup}
          onSetTotpCode={vi.fn()}
          onEnableTotp={vi.fn()}
        />
      )
    }
    render(<SetupWrapper />)
    fireEvent.click(screen.getByText('生成二维码'))
    expect(onSetup).toHaveBeenCalled()
  })

  it('renders QR code and code input when totpSetup is provided', () => {
    function SetupProvidedWrapper() {
      const [form] = Form.useForm()
      return (
        <PersonalSettingsSecurityTab
          user={{ userName: '张三', loginName: 'zhangsan', totpEnabled: false }}
          pwForm={form}
          pwSaving={false}
          totpLoading={false}
          totpSetup={{ qrCodeBase64: 'abc123', secret: 'JBSWY3DPEHPK3PXP' }}
          totpCode=""
          totpEnabling={false}
          onChangePassword={vi.fn()}
          onSetupTotp={vi.fn()}
          onSetTotpCode={vi.fn()}
          onEnableTotp={vi.fn()}
        />
      )
    }
    const { container } = render(<SetupProvidedWrapper />)
    expect(document.querySelector('.two-factor-qr-image')).toBeDefined()
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeDefined()
    expect(screen.getByPlaceholderText('输入6位验证码')).toBeDefined()
    expect(container.querySelector('.ant-btn-primary')).toBeDefined()
  })

  it('renders password form fields', () => {
    render(<Wrapper />)
    expect(screen.getByText('当前密码')).toBeDefined()
    expect(screen.getByText('新密码')).toBeDefined()
    expect(screen.getByText('修改密码')).toBeDefined()
  })

  it('handles null user gracefully', () => {
    function NullUserWrapper() {
      const [form] = Form.useForm()
      return (
        <PersonalSettingsSecurityTab
          user={null}
          pwForm={form}
          pwSaving={false}
          totpLoading={false}
          totpSetup={null}
          totpCode=""
          totpEnabling={false}
          onChangePassword={vi.fn()}
          onSetupTotp={vi.fn()}
          onSetTotpCode={vi.fn()}
          onEnableTotp={vi.fn()}
        />
      )
    }
    render(<NullUserWrapper />)
    expect(screen.getByText('--')).toBeDefined()
  })
})
