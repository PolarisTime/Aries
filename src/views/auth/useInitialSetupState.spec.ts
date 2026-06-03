import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { waitFor } from '@testing-library/react'

const mockNavigate = vi.fn()
const mockGetInitialSetupStatus = vi.fn()
const mockSubmitInitialAdmin = vi.fn()
const mockSubmitInitialCompany = vi.fn()
const mockSetupInitialAdmin2fa = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.initialsetup.alreadyCompletedRedirect': '已完成初始化',
        'auth.initialsetup.loadStatusFailed': '加载状态失败',
        'auth.initialsetup.inputAdminLoginFirst': '请先输入管理员登录名',
        'auth.initialsetup.totpGenerated': '验证码已生成',
        'auth.initialsetup.operationFailed': '操作失败',
        'auth.initialsetup.passwordMismatch': '密码不匹配',
        'auth.initialsetup.totpRequired': '需要验证码',
        'auth.initialsetup.adminCreateSuccess': '管理员创建成功',
        'auth.initialsetup.companyCreateSuccess': '公司创建成功',
        'auth.initialsetup.defaultAdminUserName': 'admin',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/api/setup', () => ({
  getInitialSetupStatus: (...args: unknown[]) => mockGetInitialSetupStatus(...args),
  setupInitialAdmin2fa: (...args: unknown[]) => mockSetupInitialAdmin2fa(...args),
  submitInitialAdmin: (...args: unknown[]) => mockSubmitInitialAdmin(...args),
  submitInitialCompany: (...args: unknown[]) => mockSubmitInitialCompany(...args),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

import { useInitialSetupState } from '@/views/auth/useInitialSetupState'

describe('useInitialSetupState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: true,
        adminConfigured: false,
        companyConfigured: false,
      },
    })
  })

  it('returns initial state', async () => {
    const { result } = renderHook(() => useInitialSetupState())
    expect(result.current.checking).toBe(true)
    expect(result.current.currentStep).toBe('admin')
    expect(result.current.adminCompleted).toBe(false)
    expect(result.current.loadingAdmin).toBe(false)
    expect(result.current.loadingCompany).toBe(false)
    expect(result.current.loadingTotp).toBe(false)
    expect(result.current.totpSetup).toBeNull()
  })

  it('loads status on mount', async () => {
    const { result } = renderHook(() => useInitialSetupState())
    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    expect(result.current.status).toEqual({
      setupRequired: true,
      adminConfigured: false,
      companyConfigured: false,
    })
  })

  it('sets admin completed when admin is configured but company is not', async () => {
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: true,
        adminConfigured: true,
        companyConfigured: false,
      },
    })
    const { result } = renderHook(() => useInitialSetupState())
    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    expect(result.current.adminCompleted).toBe(true)
    expect(result.current.currentStep).toBe('company')
  })

  it('sets current step to admin when admin is not configured', async () => {
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: true,
        adminConfigured: false,
        companyConfigured: false,
      },
    })
    const { result } = renderHook(() => useInitialSetupState())
    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    expect(result.current.currentStep).toBe('admin')
  })

  it('returns form instance', () => {
    const { result } = renderHook(() => useInitialSetupState())
    expect(result.current.form).toBeDefined()
  })
})
