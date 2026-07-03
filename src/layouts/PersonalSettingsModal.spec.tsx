import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonalSettingsModal } from '@/layouts/PersonalSettingsModal'

const personalSettingsMocks = vi.hoisted(() => ({
  handleChangePassword: vi.fn(),
  handleEnableTotp: vi.fn(),
  handleSetupTotp: vi.fn(),
  setTotpCode: vi.fn(),
  usePersonalSecuritySettingsArgs: undefined as any,
  user: {
    userName: '张三',
    loginName: 'zhangsan',
    totpEnabled: false,
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'layouts.personalSettings.title': '个人设置',
        'layouts.personalSettings.displayTab': '显示设置',
        'layouts.personalSettings.securityTab': '安全设置',
        'layouts.settings.systemFont': '系统字体',
        'layouts.settings.systemFontDefault': '默认字体',
        'layouts.settings.fontSize': '字号大小',
        'layouts.settings.navLayout': '导航布局',
        'layouts.settings.themeMode': '主题模式',
        'layouts.settings.resetDefault': '恢复默认',
        'layouts.settings.saveDisplay': '保存设置',
        'layouts.settings.theme.light': '浅色',
        'layouts.settings.theme.dark': '深色',
        'layouts.settings.theme.system': '跟随系统',
        'layouts.settings.layout.sider': '侧边导航',
        'layouts.settings.layout.top': '顶部导航',
        'layouts.settings.layout.siderDesc': '菜单在左侧',
        'layouts.settings.layout.topDesc': '菜单在顶部',
        'auth.personalsecurity.accountTitle': '账号',
        'auth.personalsecurity.disabledDescription': '2FA 未启用',
        'auth.personalsecurity.loginName': '登录名',
        'auth.personalsecurity.currentStatus': '当前状态',
        'auth.personalsecurity.twoFactor': '两步验证',
        'auth.personalsecurity.disabled': '未启用',
        'auth.personalsecurity.generate': '生成二维码',
        'auth.personalsecurity.currentPassword': '当前密码',
        'auth.personalsecurity.currentPasswordRequired': '请输入当前密码',
        'auth.personalsecurity.newPassword': '新密码',
        'auth.personalsecurity.newPasswordRequired': '密码至少6位',
        'auth.personalsecurity.passwordHint': '密码至少6位字符',
        'auth.personalsecurity.updatePassword': '修改密码',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('antd', () => ({
  Modal: ({ children, mask, onCancel, open, title, width }: any) =>
    open ? (
      <section data-mask-closable={String(mask?.closable)} data-width={width}>
        <h1>{title}</h1>
        <button type="button" onClick={onCancel}>
          modal-cancel
        </button>
        {children}
      </section>
    ) : null,
  Tabs: ({ activeKey, items, onChange }: any) => (
    <nav data-active-key={activeKey} data-testid="tabs">
      {items.map((item: any) => (
        <button key={item.key} type="button" onClick={() => onChange(item.key)}>
          {item.label}
        </button>
      ))}
    </nav>
  ),
}))

vi.mock('@/layouts/PersonalSettingsDisplayTab', () => ({
  PersonalSettingsDisplayTab: ({
    fontSize,
    layoutMode,
    onFontSizeChange,
    onLayoutModeChange,
    onResetDisplay,
    onSaveDisplay,
    onThemeModeChange,
    themeMode,
  }: any) => (
    <section data-testid="display-tab">
      <span data-testid="font-size">{fontSize}</span>
      <span data-testid="layout-mode">{layoutMode}</span>
      <span data-testid="theme-mode">{themeMode}</span>
      <button type="button" onClick={() => onFontSizeChange(14)}>
        font-size-change
      </button>
      <button type="button" onClick={() => onLayoutModeChange('side')}>
        layout-change
      </button>
      <button type="button" onClick={() => onThemeModeChange('dark')}>
        theme-change
      </button>
      <button type="button" onClick={onResetDisplay}>
        reset-display
      </button>
      <button type="button" onClick={onSaveDisplay}>
        save-display
      </button>
    </section>
  ),
}))

vi.mock('@/layouts/PersonalSettingsSecurityTab', () => ({
  PersonalSettingsSecurityTab: ({
    onChangePassword,
    onEnableTotp,
    onSetTotpCode,
    onSetupTotp,
    pwSaving,
    totpCode,
    totpEnabling,
    totpLoading,
    totpSetup,
    user,
  }: any) => (
    <section data-testid="security-tab">
      <span data-testid="security-user">{user?.loginName}</span>
      <span data-testid="pw-saving">{String(pwSaving)}</span>
      <span data-testid="totp-loading">{String(totpLoading)}</span>
      <span data-testid="totp-setup">{totpSetup?.secret}</span>
      <span data-testid="totp-code">{totpCode}</span>
      <span data-testid="totp-enabling">{String(totpEnabling)}</span>
      <button
        type="button"
        onClick={() =>
          onChangePassword({
            oldPassword: 'old-password',
            newPassword: 'new-password',
          })
        }
      >
        change-password
      </button>
      <button type="button" onClick={onSetupTotp}>
        setup-totp
      </button>
      <button type="button" onClick={() => onSetTotpCode('123456')}>
        set-totp-code
      </button>
      <button type="button" onClick={onEnableTotp}>
        enable-totp
      </button>
    </section>
  ),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn().mockImplementation((selector: any) => {
    const state = { user: personalSettingsMocks.user }
    return selector(state)
  }),
}))

vi.mock('@/layouts/usePersonalSecuritySettings', () => ({
  usePersonalSecuritySettings: vi.fn((args: any) => {
    personalSettingsMocks.usePersonalSecuritySettingsArgs = args
    return {
      handleChangePassword: personalSettingsMocks.handleChangePassword,
      handleEnableTotp: personalSettingsMocks.handleEnableTotp,
      handleSetupTotp: personalSettingsMocks.handleSetupTotp,
      pwForm: { form: 'pw-form' },
      pwSaving: true,
      totpCode: '654321',
      totpEnabling: true,
      totpLoading: true,
      totpSetup: { qrCodeBase64: 'qr-code', secret: 'totp-secret' },
      setTotpCode: personalSettingsMocks.setTotpCode,
    }
  }),
}))

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSaveDisplay: vi.fn(),
  onResetDisplay: vi.fn(),
  fontSize: 12,
  onFontSizeChange: vi.fn(),
  layoutMode: 'top' as const,
  onLayoutModeChange: vi.fn(),
  themeMode: 'system' as const,
  onThemeModeChange: vi.fn(),
}

describe('PersonalSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    personalSettingsMocks.user = {
      userName: '张三',
      loginName: 'zhangsan',
      totpEnabled: false,
    }
    personalSettingsMocks.usePersonalSecuritySettingsArgs = undefined
  })

  it('renders when open is true', () => {
    render(<PersonalSettingsModal {...defaultProps} />)
    expect(screen.getByText('个人设置')).toBeDefined()
    expect(screen.getByText('modal-cancel').closest('section')).toHaveAttribute(
      'data-mask-closable',
      'false',
    )
    expect(screen.getByText('modal-cancel').closest('section')).toHaveAttribute(
      'data-width',
      '720',
    )
  })

  it('renders display tab by default', () => {
    render(<PersonalSettingsModal {...defaultProps} />)
    expect(screen.getByTestId('display-tab')).toBeDefined()
    expect(screen.getByTestId('font-size')).toHaveTextContent('12')
    expect(screen.getByTestId('layout-mode')).toHaveTextContent('top')
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('system')
    expect(personalSettingsMocks.usePersonalSecuritySettingsArgs).toEqual({
      open: true,
      tab: 'display',
    })
  })

  it('renders tab options', () => {
    render(<PersonalSettingsModal {...defaultProps} />)
    expect(screen.getByText('显示设置')).toBeDefined()
    expect(screen.getByText('安全设置')).toBeDefined()
  })

  it('calls onClose when cancel is triggered', () => {
    const onClose = vi.fn()
    render(<PersonalSettingsModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('modal-cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not render when open is false', () => {
    render(<PersonalSettingsModal {...defaultProps} open={false} />)
    expect(screen.queryByText('个人设置')).toBeNull()
    expect(personalSettingsMocks.usePersonalSecuritySettingsArgs).toEqual({
      open: false,
      tab: 'display',
    })
  })

  it('forwards display tab callbacks', () => {
    const onFontSizeChange = vi.fn()
    const onLayoutModeChange = vi.fn()
    const onThemeModeChange = vi.fn()
    const onResetDisplay = vi.fn()
    const onSaveDisplay = vi.fn()

    render(
      <PersonalSettingsModal
        {...defaultProps}
        onFontSizeChange={onFontSizeChange}
        onLayoutModeChange={onLayoutModeChange}
        onResetDisplay={onResetDisplay}
        onSaveDisplay={onSaveDisplay}
        onThemeModeChange={onThemeModeChange}
      />,
    )

    fireEvent.click(screen.getByText('font-size-change'))
    fireEvent.click(screen.getByText('layout-change'))
    fireEvent.click(screen.getByText('theme-change'))
    fireEvent.click(screen.getByText('reset-display'))
    fireEvent.click(screen.getByText('save-display'))

    expect(onFontSizeChange).toHaveBeenCalledWith(14)
    expect(onLayoutModeChange).toHaveBeenCalledWith('side')
    expect(onThemeModeChange).toHaveBeenCalledWith('dark')
    expect(onResetDisplay).toHaveBeenCalled()
    expect(onSaveDisplay).toHaveBeenCalled()
  })

  it('switches to security tab and forwards security callbacks', () => {
    render(<PersonalSettingsModal {...defaultProps} />)

    fireEvent.click(screen.getByText('安全设置'))

    expect(screen.getByTestId('security-tab')).toBeDefined()
    expect(screen.getByTestId('tabs')).toHaveAttribute(
      'data-active-key',
      'security',
    )
    expect(screen.getByTestId('security-user')).toHaveTextContent('zhangsan')
    expect(screen.getByTestId('pw-saving')).toHaveTextContent('true')
    expect(screen.getByTestId('totp-loading')).toHaveTextContent('true')
    expect(screen.getByTestId('totp-setup')).toHaveTextContent('totp-secret')
    expect(screen.getByTestId('totp-code')).toHaveTextContent('654321')
    expect(screen.getByTestId('totp-enabling')).toHaveTextContent('true')
    expect(personalSettingsMocks.usePersonalSecuritySettingsArgs).toEqual({
      open: true,
      tab: 'security',
    })

    fireEvent.click(screen.getByText('change-password'))
    fireEvent.click(screen.getByText('setup-totp'))
    fireEvent.click(screen.getByText('set-totp-code'))
    fireEvent.click(screen.getByText('enable-totp'))

    expect(personalSettingsMocks.handleChangePassword).toHaveBeenCalledWith({
      oldPassword: 'old-password',
      newPassword: 'new-password',
    })
    expect(personalSettingsMocks.handleSetupTotp).toHaveBeenCalled()
    expect(personalSettingsMocks.setTotpCode).toHaveBeenCalledWith('123456')
    expect(personalSettingsMocks.handleEnableTotp).toHaveBeenCalled()
  })
})
