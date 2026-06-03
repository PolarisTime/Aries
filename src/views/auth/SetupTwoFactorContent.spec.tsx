import { render, screen, fireEvent } from '@testing-library/react'
import Form from 'antd/es/form'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'auth.setup2fa.content.tag': '安全设置',
        'auth.setup2fa.content.title': '设置双因素认证',
        'auth.setup2fa.content.description': '请为用户 {{userName}} 设置双因素认证',
        'auth.setup2fa.content.loadFailed': '加载失败',
        'auth.setup2fa.content.retry': '重试',
        'auth.setup2fa.content.regenerate': '重新生成',
        'auth.setup2fa.content.secretLabel': '密钥',
        'auth.setup2fa.content.backupHint': '请妥善保管密钥',
        'auth.setup2fa.content.codeLabel': '验证码',
        'auth.setup2fa.content.codeRequired': '请输入6位验证码',
        'auth.setup2fa.content.codePlaceholder': '请输入验证码',
        'auth.setup2fa.content.submit': '启用',
        'auth.setup2fa.steps.scanTitle': '扫描二维码',
        'auth.setup2fa.steps.scanDescription': '使用认证器扫描二维码',
        'auth.setup2fa.steps.secretTitle': '保存密钥',
        'auth.setup2fa.steps.secretDescription': '妥善保管密钥',
        'auth.setup2fa.steps.verifyTitle': '验证',
        'auth.setup2fa.steps.verifyDescription': '输入验证码验证',
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

vi.mock('@/views/auth/setup-two-factor-constants', () => ({
  buildSetupTwoFactorSteps: () => [
    {
      key: 'scan',
      icon: <div>扫描图标</div>,
      title: '扫描二维码',
      description: '使用认证器扫描二维码',
    },
    {
      key: 'secret',
      icon: <div>密钥图标</div>,
      title: '保存密钥',
      description: '妥善保管密钥',
    },
    {
      key: 'verify',
      icon: <div>验证图标</div>,
      title: '验证',
      description: '输入验证码验证',
    },
  ],
}))

import { SetupTwoFactorContent } from '@/views/auth/SetupTwoFactorContent'

function TestWrapper(props: any) {
  const [form] = Form.useForm()
  return <SetupTwoFactorContent form={form} {...props} />
}

describe('SetupTwoFactorContent', () => {
  function setup(overrides = {}) {
    const defaultProps = {
      currentUserName: 'testuser',
      loading: false,
      enabling: false,
      totpData: {
        qrCodeBase64: 'test-base64',
        secret: 'TESTSECRET123',
      },
      onRefresh: vi.fn(),
      onEnable: vi.fn(),
      ...overrides,
    }
    return {
      ...render(<TestWrapper {...defaultProps} />),
      ...defaultProps,
    }
  }

  it('renders loading state', () => {
    setup({ loading: true })
    expect(screen.getByText('设置双因素认证')).toBeTruthy()
  })

  it('renders totp data when available', () => {
    setup()
    expect(screen.getByText('扫描二维码')).toBeTruthy()
    expect(screen.getByText('保存密钥')).toBeTruthy()
    expect(screen.getByText('验证')).toBeTruthy()
    expect(screen.getByText('TESTSECRET123')).toBeTruthy()
  })

  it('renders QR code image', () => {
    setup()
    const img = screen.getByAltText('TOTP QR Code')
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toContain('data:image/png;base64')
  })

  it('renders regenerate button', () => {
    setup()
    expect(screen.getByText('重新生成')).toBeTruthy()
  })

  it('calls onRefresh when regenerate button is clicked', () => {
    const onRefresh = vi.fn()
    setup({ onRefresh })
    fireEvent.click(screen.getByText('重新生成'))
    expect(onRefresh).toHaveBeenCalled()
  })

  it('renders error state when totpData is null', () => {
    setup({ totpData: null })
    expect(screen.getByText('加载失败')).toBeTruthy()
    expect(screen.getByText('重试')).toBeTruthy()
  })

  it('calls onRefresh when retry button is clicked', () => {
    const onRefresh = vi.fn()
    setup({ totpData: null, onRefresh })
    fireEvent.click(screen.getByText('重试'))
    expect(onRefresh).toHaveBeenCalled()
  })

  it('renders submit button', () => {
    setup()
    expect(document.querySelector('[type="submit"]')).toBeTruthy()
  })

  it('shows loading state on submit button when enabling', () => {
    setup({ enabling: true })
    expect(document.querySelector('[type="submit"]')).toBeTruthy()
  })

  it('displays current user name in description', () => {
    setup({ currentUserName: 'admin' })
    expect(screen.getByText('请为用户 admin 设置双因素认证')).toBeTruthy()
  })
})
