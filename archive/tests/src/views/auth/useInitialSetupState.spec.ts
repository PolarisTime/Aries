import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockGetInitialSetupStatus = vi.fn()
const mockSubmitInitialAdmin = vi.fn()
const mockSubmitInitialCompany = vi.fn()
const mockSetupInitialAdmin2fa = vi.fn()
const SETUP_TOKEN = 'A'.repeat(43)

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
        'auth.initialsetup.setupTokenInvalid': '初始化凭证格式无效',
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
  getInitialSetupStatus: (...args: unknown[]) =>
    mockGetInitialSetupStatus(...args),
  setupInitialAdmin2fa: (...args: unknown[]) =>
    mockSetupInitialAdmin2fa(...args),
  submitInitialAdmin: (...args: unknown[]) => mockSubmitInitialAdmin(...args),
  submitInitialCompany: (...args: unknown[]) =>
    mockSubmitInitialCompany(...args),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

import { useSetupStore } from '@/stores/setupStore'
import { message } from '@/utils/antd-app'
import { useInitialSetupState } from '@/views/auth/useInitialSetupState'

describe('useInitialSetupState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    useSetupStore.setState({ status: null })
    useSetupStore.persist.clearStorage()
    mockGetInitialSetupStatus.mockReset()
    mockSubmitInitialAdmin.mockReset()
    mockSubmitInitialCompany.mockReset()
    mockSetupInitialAdmin2fa.mockReset()
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: true,
        adminConfigured: false,
        companyConfigured: false,
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    useSetupStore.setState({ status: null })
    useSetupStore.persist.clearStorage()
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

  it('redirects to login when setup is already completed', async () => {
    vi.useFakeTimers()
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: false,
        adminConfigured: true,
        companyConfigured: true,
      },
    })

    renderHook(() => useInitialSetupState())

    await act(async () => {
      await Promise.resolve()
    })
    expect(message.info).toHaveBeenCalledWith('已完成初始化')

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it('does not redirect after unmounting completed setup state', async () => {
    vi.useFakeTimers()
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: false,
        adminConfigured: true,
        companyConfigured: true,
      },
    })

    const { unmount } = renderHook(() => useInitialSetupState())

    await act(async () => {
      await Promise.resolve()
    })
    expect(message.info).toHaveBeenCalledWith('已完成初始化')
    unmount()
    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('ignores completed setup redirect callback after unmounting', async () => {
    let redirectCallback: (() => void) | undefined
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation(((callback: TimerHandler) => {
        redirectCallback = callback as () => void
        return null as ReturnType<typeof setTimeout>
      }) as typeof setTimeout)
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: false,
        adminConfigured: true,
        companyConfigured: true,
      },
    })

    const { unmount } = renderHook(() => useInitialSetupState())

    await act(async () => {
      await Promise.resolve()
    })
    unmount()
    act(() => {
      redirectCallback?.()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
    setTimeoutSpy.mockRestore()
  })

  it('ignores late initial status success after unmounting', async () => {
    let resolveStatus: (value: unknown) => void = () => {}
    mockGetInitialSetupStatus.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStatus = resolve
      }),
    )

    const { unmount } = renderHook(() => useInitialSetupState())
    unmount()

    await act(async () => {
      resolveStatus({
        data: {
          setupRequired: false,
          adminConfigured: true,
          companyConfigured: true,
        },
      })
      await Promise.resolve()
    })

    expect(message.info).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('ignores late initial status failure after unmounting', async () => {
    let rejectStatus: (error: unknown) => void = () => {}
    mockGetInitialSetupStatus.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectStatus = reject
      }),
    )

    const { unmount } = renderHook(() => useInitialSetupState())
    unmount()

    await act(async () => {
      rejectStatus(new Error('late failure'))
      await Promise.resolve()
    })

    expect(message.error).not.toHaveBeenCalled()
  })

  it('shows error when status load fails', async () => {
    mockGetInitialSetupStatus.mockRejectedValue(new Error('status failed'))

    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    expect(message.error).toHaveBeenCalledWith('加载状态失败')
  })

  it('requires admin login name before generating totp', async () => {
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })

    expect(message.error).toHaveBeenCalledWith('请先输入管理员登录名')
    expect(mockSetupInitialAdmin2fa).not.toHaveBeenCalled()
  })

  it('rejects an invalid setup token before generating totp', async () => {
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: 'invalid-token',
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })

    expect(message.error).toHaveBeenCalledWith('初始化凭证格式无效')
    expect(mockSetupInitialAdmin2fa).not.toHaveBeenCalled()
  })

  it('generates totp with trimmed admin login name', async () => {
    mockSetupInitialAdmin2fa.mockResolvedValue({
      data: {
        secret: 'secret',
        qrCodeDataUri: 'data:image/png;base64,qr',
      },
    })
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: ' admin ',
        setupToken: SETUP_TOKEN,
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })

    expect(mockSetupInitialAdmin2fa).toHaveBeenCalledWith(
      { loginName: 'admin' },
      SETUP_TOKEN,
    )
    expect(result.current.totpSetup).toEqual({
      secret: 'secret',
      qrCodeDataUri: 'data:image/png;base64,qr',
    })
    expect(result.current.loadingTotp).toBe(false)
    expect(message.success).toHaveBeenCalledWith('验证码已生成')
  })

  it('shows backend error when totp generation fails', async () => {
    mockSetupInitialAdmin2fa.mockRejectedValue(new Error('TOTP 服务异常'))
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: SETUP_TOKEN,
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })

    expect(message.error).toHaveBeenCalledWith('TOTP 服务异常')
    expect(result.current.loadingTotp).toBe(false)
  })

  it('uses fallback error when totp generation throws non-error value', async () => {
    mockSetupInitialAdmin2fa.mockRejectedValue('totp failed')
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: SETUP_TOKEN,
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })

    expect(message.error).toHaveBeenCalledWith('操作失败')
    expect(result.current.loadingTotp).toBe(false)
  })

  it('rejects mismatched admin passwords before submitting', async () => {
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: SETUP_TOKEN,
        adminPassword: 'one',
        adminConfirmPassword: 'two',
        adminUserName: 'Admin',
        totpCode: '123456',
      })
    })
    await act(async () => {
      await result.current.handleSubmitAdmin()
    })

    expect(message.error).toHaveBeenCalledWith('密码不匹配')
    expect(mockSubmitInitialAdmin).not.toHaveBeenCalled()
  })

  it('rejects an invalid setup token before submitting admin', async () => {
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        setupToken: `${SETUP_TOKEN}==`,
        adminLoginName: 'admin',
        adminPassword: 'secret',
        adminConfirmPassword: 'secret',
        adminUserName: 'Admin',
        totpCode: '123456',
      })
    })
    await act(async () => {
      await result.current.handleSubmitAdmin()
    })

    expect(message.error).toHaveBeenCalledWith('初始化凭证格式无效')
    expect(mockSubmitInitialAdmin).not.toHaveBeenCalled()
  })

  it('requires generated totp secret before submitting admin', async () => {
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: SETUP_TOKEN,
        adminPassword: 'secret',
        adminConfirmPassword: 'secret',
        adminUserName: 'Admin',
        totpCode: '123456',
      })
    })
    await act(async () => {
      await result.current.handleSubmitAdmin()
    })

    expect(message.error).toHaveBeenCalledWith('需要验证码')
    expect(mockSubmitInitialAdmin).not.toHaveBeenCalled()
  })

  it('submits admin and reloads setup status', async () => {
    mockSetupInitialAdmin2fa.mockResolvedValue({ data: { secret: 'secret' } })
    mockSubmitInitialAdmin.mockResolvedValue({ message: '' })
    mockGetInitialSetupStatus
      .mockResolvedValueOnce({
        data: {
          setupRequired: true,
          adminConfigured: false,
          companyConfigured: false,
        },
      })
      .mockResolvedValueOnce({
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
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: ' admin ',
        setupToken: SETUP_TOKEN,
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: ' admin ',
        adminPassword: 'secret',
        adminConfirmPassword: 'secret',
        adminUserName: '',
        totpCode: ' 123456 ',
      })
    })
    await act(async () => {
      await result.current.handleSubmitAdmin()
    })

    expect(mockSubmitInitialAdmin).toHaveBeenCalledWith(
      {
        admin: {
          loginName: 'admin',
          password: 'secret',
          userName: 'admin',
        },
        totpSecret: 'secret',
        totpCode: '123456',
      },
      SETUP_TOKEN,
    )
    expect(message.success).toHaveBeenCalledWith('管理员创建成功')
    expect(mockGetInitialSetupStatus.mock.calls.length).toBeGreaterThan(1)
    expect(result.current.loadingAdmin).toBe(false)
  })

  it('submits admin with backend message and provided username', async () => {
    mockSetupInitialAdmin2fa.mockResolvedValue({ data: { secret: 'secret' } })
    mockSubmitInitialAdmin.mockResolvedValue({ message: '管理员已保存' })
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: true,
        adminConfigured: true,
        companyConfigured: false,
      },
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: SETUP_TOKEN,
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: ' admin ',
        adminPassword: 'secret',
        adminConfirmPassword: 'secret',
        adminUserName: ' Root ',
        totpCode: ' 654321 ',
      })
    })
    await act(async () => {
      await result.current.handleSubmitAdmin()
    })

    expect(mockSubmitInitialAdmin).toHaveBeenCalledWith(
      {
        admin: {
          loginName: 'admin',
          password: 'secret',
          userName: 'Root',
        },
        totpSecret: 'secret',
        totpCode: '654321',
      },
      SETUP_TOKEN,
    )
    expect(message.success).toHaveBeenCalledWith('管理员已保存')
    expect(result.current.currentStep).toBe('company')
  })

  it('shows fallback error when admin submit throws non-error value', async () => {
    mockSetupInitialAdmin2fa.mockResolvedValue({ data: { secret: 'secret' } })
    mockSubmitInitialAdmin.mockRejectedValue({ code: 'ADMIN_FAILED' })
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: SETUP_TOKEN,
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        adminPassword: 'secret',
        adminConfirmPassword: 'secret',
        adminUserName: 'Admin',
        totpCode: '123456',
      })
    })
    await act(async () => {
      await result.current.handleSubmitAdmin()
    })

    expect(message.error).toHaveBeenCalledWith('操作失败')
    expect(result.current.loadingAdmin).toBe(false)
  })

  it('shows status load error when admin submit reload fails', async () => {
    mockSetupInitialAdmin2fa.mockResolvedValue({ data: { secret: 'secret' } })
    mockSubmitInitialAdmin.mockResolvedValue({ message: '管理员已保存' })
    let statusCallCount = 0
    mockGetInitialSetupStatus.mockImplementation(() => {
      statusCallCount += 1
      if (statusCallCount > 2) {
        return Promise.reject(new Error('reload failed'))
      }
      return Promise.resolve({
        data: {
          setupRequired: true,
          adminConfigured: false,
          companyConfigured: false,
        },
      })
    })
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: SETUP_TOKEN,
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        adminPassword: 'secret',
        adminConfirmPassword: 'secret',
        adminUserName: 'Admin',
        totpCode: '123456',
      })
    })
    await act(async () => {
      await result.current.handleSubmitAdmin()
    })

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('加载状态失败')
    })
    expect(result.current.loadingAdmin).toBe(false)
  })

  it('redirects to login when status reload says setup completed', async () => {
    vi.useFakeTimers()
    mockSetupInitialAdmin2fa.mockResolvedValue({ data: { secret: 'secret' } })
    mockSubmitInitialAdmin.mockResolvedValue({ message: '管理员已保存' })
    const { result } = renderHook(() => useInitialSetupState())

    await act(async () => {
      await Promise.resolve()
    })
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: false,
        adminConfigured: true,
        companyConfigured: true,
      },
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: SETUP_TOKEN,
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        adminPassword: 'secret',
        adminConfirmPassword: 'secret',
        adminUserName: 'Admin',
        totpCode: '123456',
      })
    })
    await act(async () => {
      await result.current.handleSubmitAdmin()
      await Promise.resolve()
    })

    expect(message.info).toHaveBeenCalledWith('已完成初始化')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it('shows backend error when admin submit fails', async () => {
    mockSetupInitialAdmin2fa.mockResolvedValue({ data: { secret: 'secret' } })
    mockSubmitInitialAdmin.mockRejectedValue(new Error('管理员保存失败'))
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        setupToken: SETUP_TOKEN,
      })
    })
    await act(async () => {
      await result.current.handleGenerateTotp()
    })
    act(() => {
      result.current.form.setFieldsValue({
        adminLoginName: 'admin',
        adminPassword: 'secret',
        adminConfirmPassword: 'secret',
        adminUserName: 'Admin',
        totpCode: '123456',
      })
    })
    await act(async () => {
      await result.current.handleSubmitAdmin()
    })

    expect(message.error).toHaveBeenCalledWith('管理员保存失败')
    expect(result.current.loadingAdmin).toBe(false)
  })

  it('keeps the setup token only in form memory', async () => {
    localStorage.clear()
    sessionStorage.clear()
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldValue('setupToken', SETUP_TOKEN)
    })

    const localValues = Array.from(
      { length: localStorage.length },
      (_, index) => localStorage.getItem(localStorage.key(index) ?? ''),
    )
    const sessionValues = Array.from(
      { length: sessionStorage.length },
      (_, index) => sessionStorage.getItem(sessionStorage.key(index) ?? ''),
    )

    expect(result.current.form.getFieldValue('setupToken')).toBe(SETUP_TOKEN)
    expect(useSetupStore.getState()).not.toHaveProperty('setupToken')
    expect([...localValues, ...sessionValues].join('\n')).not.toContain(
      SETUP_TOKEN,
    )
  })

  it('rejects an invalid setup token before submitting company', async () => {
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        setupToken: 'invalid-token',
        companyName: 'Leo',
        taxNo: 'TAX',
        bankName: 'Bank',
        bankAccount: '001',
      })
    })
    await act(async () => {
      await result.current.handleSubmitCompany()
    })

    expect(message.error).toHaveBeenCalledWith('初始化凭证格式无效')
    expect(mockSubmitInitialCompany).not.toHaveBeenCalled()
  })

  it('submits company setup with normalized payload', async () => {
    mockSubmitInitialCompany.mockResolvedValue({ message: '公司已创建' })
    mockGetInitialSetupStatus.mockResolvedValue({
      data: {
        setupRequired: true,
        adminConfigured: true,
        companyConfigured: false,
      },
    })
    useSetupStore.getState().setStatus({ setupRequired: true })
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    expect(result.current.currentStep).toBe('company')
    act(() => {
      result.current.form.setFieldsValue({
        setupToken: SETUP_TOKEN,
        companyName: ' Leo ',
        taxNo: ' TAX ',
        bankName: ' Bank ',
        bankAccount: ' 001 ',
        taxRate: undefined,
        remark: ' 备注 ',
      })
    })
    await act(async () => {
      await result.current.handleSubmitCompany()
    })

    expect(mockSubmitInitialCompany).toHaveBeenCalledWith(
      {
        companyName: 'Leo',
        taxNo: 'TAX',
        bankName: 'Bank',
        bankAccount: '001',
        taxRate: 0.13,
        remark: '',
      },
      SETUP_TOKEN,
    )
    expect(message.success).toHaveBeenCalledWith('公司已创建')
    expect(useSetupStore.getState().status).toEqual({ setupRequired: false })
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
    expect(result.current.loadingCompany).toBe(false)
  })

  it('submits company setup with fallback message and optional fields', async () => {
    mockSubmitInitialCompany.mockResolvedValue({ message: '' })
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldValue('setupToken', SETUP_TOKEN)
    })
    vi.spyOn(result.current.form, 'validateFields').mockResolvedValue({
      setupToken: SETUP_TOKEN,
      companyName: ' Leo ',
      taxNo: ' TAX ',
      bankName: ' Bank ',
      bankAccount: ' 001 ',
      taxRate: 0.07,
      remark: ' 备注 ',
    })

    await act(async () => {
      await result.current.handleSubmitCompany()
    })

    expect(mockSubmitInitialCompany).toHaveBeenCalledWith(
      {
        companyName: 'Leo',
        taxNo: 'TAX',
        bankName: 'Bank',
        bankAccount: '001',
        taxRate: 0.07,
        remark: '备注',
      },
      SETUP_TOKEN,
    )
    expect(message.success).toHaveBeenCalledWith('公司创建成功')
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
    expect(result.current.loadingCompany).toBe(false)
  })

  it('shows backend error when company submit fails', async () => {
    mockSubmitInitialCompany.mockRejectedValue(new Error('公司保存失败'))
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        setupToken: SETUP_TOKEN,
        companyName: 'Leo',
        taxNo: 'TAX',
        bankName: 'Bank',
        bankAccount: '001',
      })
    })
    await act(async () => {
      await result.current.handleSubmitCompany()
    })

    expect(message.error).toHaveBeenCalledWith('公司保存失败')
    expect(result.current.loadingCompany).toBe(false)
  })

  it('shows fallback error when company submit throws non-error value', async () => {
    mockSubmitInitialCompany.mockRejectedValue({ code: 'COMPANY_FAILED' })
    const { result } = renderHook(() => useInitialSetupState())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })
    act(() => {
      result.current.form.setFieldsValue({
        setupToken: SETUP_TOKEN,
        companyName: 'Leo',
        taxNo: 'TAX',
        bankName: 'Bank',
        bankAccount: '001',
      })
    })
    await act(async () => {
      await result.current.handleSubmitCompany()
    })

    expect(message.error).toHaveBeenCalledWith('操作失败')
    expect(result.current.loadingCompany).toBe(false)
  })
})
