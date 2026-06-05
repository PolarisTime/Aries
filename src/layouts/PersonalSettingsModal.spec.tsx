import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PersonalSettingsModal } from '@/layouts/PersonalSettingsModal'

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

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn().mockReturnValue({
    userName: '张三',
    loginName: 'zhangsan',
    totpEnabled: false,
  }),
}))

vi.mock('@/api/account-security', () => ({
  changeOwnPassword: vi.fn(),
  enableOwn2fa: vi.fn(),
  setupOwn2fa: vi.fn(),
}))

vi.mock('@/stores/auth-user-sync', () => ({
  syncCurrentUserTotpState: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), error: vi.fn() },
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
  it('renders when open is true', () => {
    render(<PersonalSettingsModal {...defaultProps} />)
    expect(screen.getByText('个人设置')).toBeDefined()
  })

  it('renders display tab by default', () => {
    render(<PersonalSettingsModal {...defaultProps} />)
    expect(screen.getByText('字号大小')).toBeDefined()
  })

  it('renders tab options', () => {
    render(<PersonalSettingsModal {...defaultProps} />)
    expect(screen.getByText('显示设置')).toBeDefined()
    expect(screen.getByText('安全设置')).toBeDefined()
  })

  it('calls onClose when cancel is triggered', () => {
    const onClose = vi.fn()
    render(<PersonalSettingsModal {...defaultProps} onClose={onClose} />)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not render when open is false', () => {
    render(<PersonalSettingsModal {...defaultProps} open={false} />)
    expect(screen.queryByText('个人设置')).toBeNull()
  })
})
