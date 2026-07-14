import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateUserAccount = vi.fn()
const mockUpdateUserAccount = vi.fn()
const mockGetUserAccountDetail = vi.fn()
const mockCheckUserAccountLoginName = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockUseMutation = vi.fn()
const mockUseQueryClient = vi.fn()
const mockFormInstance = vi.hoisted(() => ({
  resetFields: vi.fn(),
  setFieldsValue: vi.fn(),
  getFieldValue: vi.fn(),
  getFieldsValue: vi.fn(),
  validateFields: vi.fn(),
}))

const defaultFormValues = {
  loginName: 'testuser',
  password: 'pass123',
  userName: 'Test User',
  mobile: '1234567890',
  roleIds: ['700520000000000001', '700520000000000002'],
  dataScope: '本人',
  status: 'enabled',
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

interface MutationOptions {
  mutationFn: (values: Record<string, unknown>) => Promise<unknown>
  onSuccess: (response: { data?: unknown; message?: string }) => void
  onError: (error: Error) => void
}

const latestMutationOptions = () =>
  mockUseMutation.mock.calls.at(-1)?.[0] as MutationOptions

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/api/user-accounts', () => ({
  createUserAccount: (...args: unknown[]) => mockCreateUserAccount(...args),
  updateUserAccount: (...args: unknown[]) => mockUpdateUserAccount(...args),
  getUserAccountDetail: (...args: unknown[]) =>
    mockGetUserAccountDetail(...args),
  checkUserAccountLoginName: (...args: unknown[]) =>
    mockCheckUserAccountLoginName(...args),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: { userAccountBase: ['userAccount'] },
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: (...args: unknown[]) => mockMessageSuccess(...args),
    warning: (...args: unknown[]) => mockMessageWarning(...args),
  },
}))

vi.mock('@/views/system/user-account-view-utils', () => ({
  buildDefaultUserAccountFormValues: () => ({
    loginName: '',
    password: '',
    userName: '',
    mobile: '',
    departmentId: null,
    roleIds: [],
    dataScope: '本人',
    permissionSummary: '',
    status: 'enabled',
    remark: '',
  }),
}))

vi.mock('@/views/system/useUserAccountEditorCatalogs', () => ({
  useUserAccountEditorCatalogs: () => ({
    departmentOptions: [{ value: '10', label: 'Engineering' }],
    roleOptions: [{ id: '1', roleName: 'Admin', dataScope: '全部数据' }],
  }),
}))

vi.mock('@/views/system/useUserAccountEditorRoleState', () => ({
  useUserAccountEditorRoleState: () => ({
    selectedRoleDataScope: '本人',
    selectedRoleIds: [],
    selectedRoleSummaries: [],
  }),
}))

vi.mock('antd', () => ({
  Form: {
    useForm: vi.fn(() => [mockFormInstance]),
  },
}))

import { useUserAccountEditor } from '@/views/system/useUserAccountEditor'

describe('useUserAccountEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormInstance.getFieldsValue.mockReturnValue(defaultFormValues)
    mockFormInstance.validateFields.mockResolvedValue(defaultFormValues)
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    })
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
    mockCheckUserAccountLoginName.mockResolvedValue({
      available: true,
      message: '',
    })
  })

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    expect(result.current.editorOpen).toBe(false)
    expect(result.current.editorMode).toBe('create')
    expect(result.current.editorLoading).toBe(false)
    expect(result.current.editingId).toBeNull()
    expect(result.current.createResultOpen).toBe(false)
    expect(result.current.createResult).toBeNull()
  })

  it('returns form and options', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    expect(result.current.form).toBeDefined()
    expect(result.current.departmentOptions).toBeDefined()
    expect(result.current.roleOptions).toBeDefined()
  })

  it('openCreateModal sets mode to create and opens editor', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    act(() => {
      result.current.openCreateModal()
    })
    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editorMode).toBe('create')
  })

  it('openEditModal fetches detail and opens editor', async () => {
    const detail = {
      id: '1',
      loginName: 'admin',
      userName: 'Admin',
      mobile: '123',
      roleNames: ['Admin'],
      roleIds: ['700520000000000001'],
      dataScope: '全部数据',
      status: 'enabled',
    }
    mockGetUserAccountDetail.mockResolvedValue(detail)
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    await act(async () => {
      await result.current.openEditModal({ id: '1' } as never)
    })
    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editorMode).toBe('edit')
    expect(mockGetUserAccountDetail).toHaveBeenCalledWith(
      '1',
      expect.any(AbortSignal),
    )
    await waitFor(() => {
      expect(result.current.editorLoading).toBe(false)
    })
  })

  it('openEditModal handles error', async () => {
    mockGetUserAccountDetail.mockRejectedValue(new Error('Load failed'))
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    await act(async () => {
      await result.current.openEditModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.editorOpen).toBe(false)
    })
    expect(mockShowError).toHaveBeenCalled()
  })

  it('keeps the latest edit target when detail responses resolve out of order', async () => {
    const firstDetail = createDeferred<Record<string, unknown>>()
    const secondDetail = createDeferred<Record<string, unknown>>()
    mockGetUserAccountDetail.mockImplementation((id: string) =>
      id === '1' ? firstDetail.promise : secondDetail.promise,
    )
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    let firstOpen!: Promise<void>
    let secondOpen!: Promise<void>

    act(() => {
      firstOpen = result.current.openEditModal({ id: '1' } as never)
    })
    act(() => {
      secondOpen = result.current.openEditModal({ id: '2' } as never)
    })

    await act(async () => {
      secondDetail.resolve({
        id: '2',
        loginName: 'latest-user',
        userName: 'Latest User',
        roleIds: [],
        status: 'enabled',
      })
      await secondOpen
    })
    await act(async () => {
      firstDetail.resolve({
        id: '1',
        loginName: 'stale-user',
        userName: 'Stale User',
        roleIds: [],
        status: 'enabled',
      })
      await firstOpen
    })

    expect(result.current.editingId).toBe('2')
    expect(mockFormInstance.setFieldsValue).toHaveBeenLastCalledWith(
      expect.objectContaining({ loginName: 'latest-user' }),
    )
    expect(result.current.editorLoading).toBe(false)
  })

  it('ignores an edit detail response after the editor is closed', async () => {
    const detail = createDeferred<Record<string, unknown>>()
    mockGetUserAccountDetail.mockReturnValue(detail.promise)
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    let openPromise!: Promise<void>

    act(() => {
      openPromise = result.current.openEditModal({ id: '1' } as never)
    })
    act(() => {
      result.current.closeEditor()
    })
    const signal = mockGetUserAccountDetail.mock.calls[0][1] as AbortSignal
    expect(signal.aborted).toBe(true)
    await act(async () => {
      detail.resolve({
        id: '1',
        loginName: 'stale-user',
        userName: 'Stale User',
        roleIds: [],
        status: 'enabled',
      })
      await openPromise
    })

    expect(result.current.editorOpen).toBe(false)
    expect(result.current.editingId).toBeNull()
    expect(mockFormInstance.setFieldsValue).not.toHaveBeenCalled()
  })

  it('keeps create form values when an earlier edit detail resolves', async () => {
    const detail = createDeferred<Record<string, unknown>>()
    mockGetUserAccountDetail.mockReturnValue(detail.promise)
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    let openPromise!: Promise<void>

    act(() => {
      openPromise = result.current.openEditModal({ id: '1' } as never)
    })
    act(() => {
      result.current.openCreateModal()
    })
    await act(async () => {
      detail.resolve({
        id: '1',
        loginName: 'stale-user',
        userName: 'Stale User',
        roleIds: [],
        status: 'enabled',
      })
      await openPromise
    })

    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editorMode).toBe('create')
    expect(result.current.editingId).toBeNull()
    expect(mockFormInstance.setFieldsValue).toHaveBeenLastCalledWith(
      expect.objectContaining({ loginName: '' }),
    )
  })

  it('closeEditor closes the editor', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    act(() => {
      result.current.openCreateModal()
    })
    expect(result.current.editorOpen).toBe(true)
    act(() => {
      result.current.closeEditor()
    })
    expect(result.current.editorOpen).toBe(false)
  })

  it('closeCreateResult closes the result modal', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    act(() => {
      result.current.closeCreateResult()
    })
    expect(result.current.createResultOpen).toBe(false)
    expect(result.current.createResult).toBeNull()
  })

  it('runLoginNameCheck returns available for empty name', async () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    const checkResult = await act(async () => {
      return result.current.runLoginNameCheck('')
    })
    expect(checkResult.available).toBe(true)
    expect(mockCheckUserAccountLoginName).not.toHaveBeenCalled()
  })

  it('runLoginNameCheck calls API for non-empty name', async () => {
    mockCheckUserAccountLoginName.mockResolvedValue({
      available: true,
      message: '',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    const checkResult = await act(async () => {
      return result.current.runLoginNameCheck('testuser')
    })
    expect(checkResult.available).toBe(true)
    expect(mockCheckUserAccountLoginName).toHaveBeenCalledWith(
      'testuser',
      undefined,
    )
  })

  it('runLoginNameCheck handles unavailable name', async () => {
    mockCheckUserAccountLoginName.mockResolvedValue({
      available: false,
      message: 'Name exists',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    const checkResult = await act(async () => {
      return result.current.runLoginNameCheck('admin')
    })
    expect(checkResult.available).toBe(false)
    expect(result.current.loginNameValidationMessage).toBe('Name exists')
  })

  it('uses default message when unavailable login-name check has no message', async () => {
    mockCheckUserAccountLoginName.mockResolvedValue({
      available: false,
      message: '',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    const checkResult = await act(async () => {
      return result.current.runLoginNameCheck('admin')
    })

    expect(checkResult).toEqual({
      available: false,
      message: '登录账号已存在',
    })
    expect(result.current.loginNameValidationMessage).toBe('登录账号已存在')
  })

  it('runLoginNameCheck handles error', async () => {
    mockCheckUserAccountLoginName.mockRejectedValue(new Error('Check failed'))
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    const checkResult = await act(async () => {
      return result.current.runLoginNameCheck('testuser')
    })
    expect(checkResult.available).toBe(true)
    expect(mockShowError).toHaveBeenCalled()
  })

  it('keeps the latest login-name validation result when checks resolve out of order', async () => {
    const firstCheck = createDeferred<{
      available: boolean
      message: string
    }>()
    const secondCheck = createDeferred<{
      available: boolean
      message: string
    }>()
    mockCheckUserAccountLoginName.mockImplementation((loginName: string) =>
      loginName === 'first-user' ? firstCheck.promise : secondCheck.promise,
    )
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    let firstPromise!: Promise<unknown>
    let secondPromise!: Promise<unknown>

    act(() => {
      firstPromise = result.current.runLoginNameCheck('first-user')
    })
    act(() => {
      secondPromise = result.current.runLoginNameCheck('second-user')
    })
    await act(async () => {
      secondCheck.resolve({ available: true, message: '' })
      await secondPromise
    })
    await act(async () => {
      firstCheck.resolve({ available: false, message: 'Stale result' })
      await firstPromise
    })

    expect(result.current.loginNameValidationMessage).toBe('')
    expect(result.current.loginNameChecking).toBe(false)
  })

  it('does not save after the editor session changes during login-name validation', async () => {
    const mutate = vi.fn()
    const loginNameCheck = createDeferred<{
      available: boolean
      message: string
    }>()
    mockUseMutation.mockReturnValue({ mutate, isPending: false })
    mockCheckUserAccountLoginName.mockReturnValue(loginNameCheck.promise)
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    let savePromise!: Promise<void>

    act(() => {
      result.current.openCreateModal()
    })
    act(() => {
      savePromise = result.current.handleSave()
    })
    await waitFor(() => {
      expect(mockCheckUserAccountLoginName).toHaveBeenCalled()
    })
    act(() => {
      result.current.closeEditor()
    })
    await act(async () => {
      loginNameCheck.resolve({ available: true, message: '' })
      await savePromise
    })

    expect(mutate).not.toHaveBeenCalled()
  })

  it('saves selected role ids in payload', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate,
      isPending: false,
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        roleIds: ['700520000000000001', '700520000000000002'],
      }),
    )
    expect(mutate.mock.calls[0][0]).not.toHaveProperty('roleNames')
  })

  it('keeps snowflake role ids as strings when filling edit form', async () => {
    const detail = {
      id: '1',
      loginName: 'admin',
      userName: 'Admin',
      mobile: '123',
      roleNames: ['Admin'],
      roleIds: ['700520000000000001', '700520000000000002'],
      dataScope: '全部数据',
      status: 'enabled',
    }
    mockGetUserAccountDetail.mockResolvedValue(detail)
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    await act(async () => {
      await result.current.openEditModal({ id: '1' } as never)
    })

    const form = result.current.form as unknown as {
      setFieldsValue: ReturnType<typeof vi.fn>
    }
    expect(form.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        roleIds: ['700520000000000001', '700520000000000002'],
      }),
    )
  })

  it('fills edit form with defaults when detail omits optional fields', async () => {
    mockGetUserAccountDetail.mockResolvedValue({ id: 'empty' })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    await act(async () => {
      await result.current.openEditModal({ id: 'empty' } as never)
    })

    expect(mockFormInstance.setFieldsValue).toHaveBeenLastCalledWith({
      loginName: '',
      password: '',
      userName: '',
      mobile: '',
      departmentId: null,
      roleIds: [],
      dataScope: '本人',
      permissionSummary: '',
      status: 'enabled',
      remark: '',
    })
  })

  it('calls create API from mutation function in create mode', async () => {
    const payload = { loginName: 'new-user' }
    const response = { data: { id: 'created' } }
    mockCreateUserAccount.mockResolvedValue(response)

    renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    await expect(latestMutationOptions().mutationFn(payload)).resolves.toBe(
      response,
    )
    expect(mockCreateUserAccount).toHaveBeenCalledWith(payload)
    expect(mockUpdateUserAccount).not.toHaveBeenCalled()
  })

  it('calls update API from mutation function in edit mode', async () => {
    const payload = { loginName: 'updated-user' }
    const response = { message: 'updated' }
    mockGetUserAccountDetail.mockResolvedValue({
      id: '42',
      loginName: 'editor',
      userName: 'Editor',
      roleIds: [],
      status: 'enabled',
    })
    mockUpdateUserAccount.mockResolvedValue(response)
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    await act(async () => {
      await result.current.openEditModal({ id: '42' } as never)
    })

    await expect(latestMutationOptions().mutationFn(payload)).resolves.toBe(
      response,
    )
    expect(mockUpdateUserAccount).toHaveBeenCalledWith('42', payload)
    expect(mockCreateUserAccount).not.toHaveBeenCalled()
  })

  it('opens create result and invalidates account queries after create success', () => {
    const invalidateQueries = vi.fn()
    mockUseQueryClient.mockReturnValue({ invalidateQueries })
    const createResult = {
      loginName: 'created',
      initialPassword: 'generated-password',
    }
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    act(() => {
      result.current.openCreateModal()
    })

    act(() => {
      latestMutationOptions().onSuccess({ data: createResult })
    })

    expect(result.current.editorOpen).toBe(false)
    expect(result.current.createResultOpen).toBe(true)
    expect(result.current.createResult).toBe(createResult)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['userAccount'],
    })
    expect(mockMessageSuccess).not.toHaveBeenCalled()
  })

  it('shows response message after edit success', async () => {
    const invalidateQueries = vi.fn()
    mockUseQueryClient.mockReturnValue({ invalidateQueries })
    mockGetUserAccountDetail.mockResolvedValue({
      id: '42',
      loginName: 'editor',
      userName: 'Editor',
      roleIds: [],
      status: 'enabled',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    await act(async () => {
      await result.current.openEditModal({ id: '42' } as never)
    })

    act(() => {
      latestMutationOptions().onSuccess({ message: '保存完成' })
    })

    expect(result.current.editorOpen).toBe(false)
    expect(mockMessageSuccess).toHaveBeenCalledWith('保存完成')
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['userAccount'],
    })
  })

  it('falls back to default success message when response has no message', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    act(() => {
      result.current.openCreateModal()
    })

    act(() => {
      latestMutationOptions().onSuccess({})
    })

    expect(mockMessageSuccess).toHaveBeenCalledWith('保存成功')
    expect(result.current.createResultOpen).toBe(false)
  })

  it('sets login-name validation message when save error reports duplicate login name', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    act(() => {
      latestMutationOptions().onError(new Error('登录账号已存在'))
    })

    expect(result.current.loginNameValidationMessage).toBe('登录账号已存在')
    expect(mockShowError).not.toHaveBeenCalled()
  })

  it('delegates non-duplicate save errors to request error handler', () => {
    const error = new Error('server unavailable')
    renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    act(() => {
      latestMutationOptions().onError(error)
    })

    expect(mockShowError).toHaveBeenCalledWith(error, '保存失败')
  })

  it('warns and skips mutation when login name is unavailable during save', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate,
      isPending: false,
    })
    mockCheckUserAccountLoginName.mockResolvedValue({
      available: false,
      message: 'Name exists',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockMessageWarning).toHaveBeenCalledWith('Name exists')
    expect(mutate).not.toHaveBeenCalled()
  })

  it('uses default warning when save-time login name check has no message', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate,
      isPending: false,
    })
    mockCheckUserAccountLoginName.mockResolvedValue({
      available: false,
      message: '',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockMessageWarning).toHaveBeenCalledWith('登录账号已存在')
    expect(mutate).not.toHaveBeenCalled()
  })

  it('passes editing id to login-name check while saving edit form', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate,
      isPending: false,
    })
    mockGetUserAccountDetail.mockResolvedValue({
      id: '42',
      loginName: 'editor',
      userName: 'Editor',
      roleIds: [],
      status: 'enabled',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    await act(async () => {
      await result.current.openEditModal({ id: '42' } as never)
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockCheckUserAccountLoginName).toHaveBeenCalledWith('testuser', '42')
    expect(mutate.mock.calls[0][0]).not.toHaveProperty('password')
  })

  it('skips save when edit detail failed', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate,
      isPending: false,
    })
    mockGetUserAccountDetail.mockRejectedValue(new Error('Load failed'))
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    await act(async () => {
      await result.current.openEditModal({ id: 'missing' } as never)
    })
    mockShowError.mockClear()

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockCheckUserAccountLoginName).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('builds payload defaults from optional form fields before saving', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate,
      isPending: false,
    })
    mockFormInstance.validateFields.mockResolvedValue({
      loginName: '  no-password  ',
      password: '   ',
      userName: '  No Password  ',
      status: 'disabled',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mutate).toHaveBeenCalledWith({
      loginName: 'no-password',
      userName: 'No Password',
      mobile: '',
      departmentId: null,
      roleIds: [],
      dataScope: '本人',
      permissionSummary: '',
      status: 'disabled',
      remark: '',
    })
  })

  it('skips save when form validation rejects', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate,
      isPending: false,
    })
    mockFormInstance.validateFields.mockRejectedValue(new Error('invalid form'))
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockCheckUserAccountLoginName).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('returns all expected properties', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    expect(result.current).toHaveProperty('form')
    expect(result.current).toHaveProperty('editorOpen')
    expect(result.current).toHaveProperty('editorMode')
    expect(result.current).toHaveProperty('editorLoading')
    expect(result.current).toHaveProperty('editingId')
    expect(result.current).toHaveProperty('loginNameValidationMessage')
    expect(result.current).toHaveProperty('loginNameChecking')
    expect(result.current).toHaveProperty('departmentOptions')
    expect(result.current).toHaveProperty('roleOptions')
    expect(result.current).toHaveProperty('selectedRoleIds')
    expect(result.current).toHaveProperty('selectedRoleDataScope')
    expect(result.current).toHaveProperty('selectedRoleSummaries')
    expect(result.current).toHaveProperty('createResultOpen')
    expect(result.current).toHaveProperty('createResult')
    expect(result.current).toHaveProperty('savePending')
    expect(result.current).toHaveProperty('openCreateModal')
    expect(result.current).toHaveProperty('openEditModal')
    expect(result.current).toHaveProperty('runLoginNameCheck')
    expect(result.current).toHaveProperty('handleSave')
    expect(result.current).toHaveProperty('closeEditor')
    expect(result.current).toHaveProperty('closeCreateResult')
  })
})
