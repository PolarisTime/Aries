import { act, renderHook } from '@testing-library/react'
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type MutationOptions = {
  mutationFn: (values: Record<string, unknown>) => Promise<unknown>
  onSuccess: (result: unknown) => Promise<void> | void
  onError: (error: Error) => void
}

const mockCreateRole = vi.fn()
const mockUpdateRole = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockModalConfirm = vi.fn()
const mockInvalidateQueries = vi.fn()
const mockMutate = vi.fn()
const mockUseMutation = vi.fn()
const mockGetFieldsValue = vi.fn()
const mockResetFields = vi.fn()
const mockSetFieldsValue = vi.fn()
const mockValidateFields = vi.fn()

const formInstance = {
  resetFields: mockResetFields,
  setFieldsValue: mockSetFieldsValue,
  getFieldsValue: mockGetFieldsValue,
  validateFields: mockValidateFields,
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

vi.mock('@/api/role-actions', () => ({
  createRole: (...args: unknown[]) => mockCreateRole(...args),
  updateRole: (...args: unknown[]) => mockUpdateRole(...args),
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusValues: ['enabled', 'disabled'],
  roleDataScopeValues: ['全部数据', '本部门', '本人'],
  roleTypeValues: ['system', 'custom'],
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: { roleSettings: ['roleSettings'] },
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: (...args: unknown[]) => mockMessageSuccess(...args),
    warning: (...args: unknown[]) => mockMessageWarning(...args),
  },
  modal: { confirm: (...args: unknown[]) => mockModalConfirm(...args) },
}))

vi.mock('antd', () => ({
  Form: {
    useForm: () => [formInstance],
  },
}))

vi.mock('i18next', () => ({
  default: {
    t: (key: string) => key,
  },
}))

import { useRoleEditor } from '@/views/system/useRoleEditor'

const role = {
  id: 'role-1',
  roleName: '管理员',
  roleCode: 'admin',
  roleType: 'system',
  dataScope: '全部数据',
  status: 'disabled',
  userCount: 3,
  remark: '已有备注',
}

function renderEditor(options?: {
  canCreateRole?: boolean
  canEditRole?: boolean
  onCreatedRoleSelect?: Mock
}) {
  return renderHook(() =>
    useRoleEditor({
      canCreateRole: options?.canCreateRole ?? true,
      canEditRole: options?.canEditRole ?? true,
      onCreatedRoleSelect: options?.onCreatedRoleSelect ?? vi.fn(),
    }),
  )
}

describe('useRoleEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFieldsValue.mockReturnValue({})
    mockValidateFields.mockResolvedValue({})
    mockMutate.mockImplementation(async (values: Record<string, unknown>) => {
      const options = mockUseMutation.mock.calls.at(-1)?.[0] as MutationOptions
      try {
        const result = await options.mutationFn(values)
        await options.onSuccess(result)
      } catch (error) {
        options.onError(error as Error)
      }
    })
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    })
  })

  it('返回初始状态和表单实例', () => {
    const { result } = renderEditor()

    expect(result.current).toMatchObject({
      roleModalOpen: false,
      editingRole: null,
      roleForm: formInstance,
      savePending: false,
    })
    expect(typeof result.current.openRoleForm).toBe('function')
    expect(typeof result.current.handleSaveRole).toBe('function')
    expect(typeof result.current.closeRoleModal).toBe('function')
  })

  it('创建模式会重置表单、写入默认值并打开弹窗', () => {
    const { result } = renderEditor()

    act(() => {
      result.current.openRoleForm('create')
    })

    expect(mockResetFields).toHaveBeenCalledTimes(1)
    expect(mockSetFieldsValue).toHaveBeenCalledWith({
      roleType: 'custom',
      dataScope: '全部数据',
    })
    expect(result.current.roleModalOpen).toBe(true)
    expect(result.current.editingRole).toBeNull()
  })

  it('无创建权限时提示并保持弹窗关闭', () => {
    const { result } = renderEditor({ canCreateRole: false })

    act(() => {
      result.current.openRoleForm('create')
    })

    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(mockResetFields).not.toHaveBeenCalled()
    expect(result.current.roleModalOpen).toBe(false)
  })

  it('编辑模式会回填角色数据，空备注回填为空字符串', () => {
    const { result } = renderEditor()

    act(() => {
      result.current.openRoleForm('edit', { ...role, remark: null })
    })

    expect(mockSetFieldsValue).toHaveBeenCalledWith({
      roleName: '管理员',
      roleCode: 'admin',
      roleType: 'system',
      dataScope: '全部数据',
      remark: '',
    })
    expect(result.current.roleModalOpen).toBe(true)
    expect(result.current.editingRole).toMatchObject({ id: 'role-1' })
  })

  it('无编辑权限时提示并保持弹窗关闭', () => {
    const { result } = renderEditor({ canEditRole: false })

    act(() => {
      result.current.openRoleForm('edit', role)
    })

    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(mockSetFieldsValue).not.toHaveBeenCalled()
    expect(result.current.roleModalOpen).toBe(false)
  })

  it('edit 模式缺少 role 时按创建模式处理', () => {
    const { result } = renderEditor()

    act(() => {
      result.current.openRoleForm('edit')
    })

    expect(mockResetFields).toHaveBeenCalledTimes(1)
    expect(mockSetFieldsValue).toHaveBeenCalledWith({
      roleType: 'custom',
      dataScope: '全部数据',
    })
    expect(result.current.roleModalOpen).toBe(true)
  })

  it('closeRoleModal 会关闭弹窗', () => {
    const { result } = renderEditor()

    act(() => {
      result.current.openRoleForm('create')
    })
    act(() => {
      result.current.closeRoleModal()
    })

    expect(result.current.roleModalOpen).toBe(false)
  })

  it('名称或编码为空白时阻止保存并提示', async () => {
    const { result } = renderEditor()
    mockGetFieldsValue.mockReturnValue({ roleName: '  ', roleCode: 'admin' })

    await act(async () => {
      await result.current.handleSaveRole()
    })

    expect(mockMessageWarning).toHaveBeenCalledWith(
      'system.roleEditorHook.fillNameAndCode',
    )
    expect(mockValidateFields).not.toHaveBeenCalled()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('表单校验失败时吞掉异常且不提交 mutation', async () => {
    const { result } = renderEditor()
    mockGetFieldsValue.mockReturnValue({
      roleName: '管理员',
      roleCode: 'admin',
    })
    mockValidateFields.mockRejectedValue(new Error('invalid'))

    await act(async () => {
      await result.current.handleSaveRole()
    })

    expect(mockValidateFields).toHaveBeenCalledTimes(1)
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('创建角色成功后关闭弹窗、刷新列表、弹出配置确认并可选择新角色', async () => {
    const onCreatedRoleSelect = vi.fn()
    const createdRole = { ...role, id: 'created-role', roleCode: 'operator' }
    const { result } = renderEditor({ onCreatedRoleSelect })
    mockCreateRole.mockResolvedValue({ data: createdRole })
    mockGetFieldsValue.mockReturnValue({
      roleName: '操作员',
      roleCode: 'operator',
    })
    mockValidateFields.mockResolvedValue({
      roleName: '操作员',
      roleCode: 'operator',
      roleType: 'custom',
      dataScope: '全部数据',
      remark: '',
    })

    await act(async () => {
      await result.current.openRoleForm('create')
      await result.current.handleSaveRole()
    })

    expect(mockCreateRole).toHaveBeenCalledWith({
      roleName: '操作员',
      roleCode: 'operator',
      roleType: 'custom',
      dataScope: '全部数据',
      remark: undefined,
      status: 'enabled',
    })
    expect(mockUpdateRole).not.toHaveBeenCalled()
    expect(result.current.roleModalOpen).toBe(false)
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['roleSettings'],
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.addSuccess')
    expect(mockModalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'common.addSuccess',
        content: 'system.roleEditorHook.createConfirmContent',
        okText: 'system.roleEditorHook.goConfigure',
        cancelText: 'system.roleEditorHook.configureLater',
      }),
    )

    const confirmOptions = mockModalConfirm.mock.calls[0][0]
    confirmOptions.onOk()
    expect(onCreatedRoleSelect).toHaveBeenCalledWith(createdRole)
  })

  it('编辑角色成功后使用原状态保存、关闭弹窗并刷新列表', async () => {
    const { result } = renderEditor()
    mockGetFieldsValue.mockReturnValue({
      roleName: '管理员',
      roleCode: 'admin',
    })
    mockValidateFields.mockResolvedValue({
      roleName: '管理员',
      roleCode: 'admin',
      remark: '更新备注',
    })

    await act(async () => {
      result.current.openRoleForm('edit', role)
    })
    await act(async () => {
      await result.current.handleSaveRole()
    })

    expect(mockUpdateRole).toHaveBeenCalledWith('role-1', {
      roleName: '管理员',
      roleCode: 'admin',
      remark: '更新备注',
      status: 'disabled',
    })
    expect(mockCreateRole).not.toHaveBeenCalled()
    expect(result.current.roleModalOpen).toBe(false)
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['roleSettings'],
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.editSuccess')
  })

  it('保存失败时交给 useRequestError 处理并保留弹窗', async () => {
    const error = new Error('boom')
    const { result } = renderEditor()
    mockCreateRole.mockRejectedValue(error)
    mockGetFieldsValue.mockReturnValue({
      roleName: '操作员',
      roleCode: 'operator',
    })
    mockValidateFields.mockResolvedValue({
      roleName: '操作员',
      roleCode: 'operator',
      remark: null,
    })

    await act(async () => {
      result.current.openRoleForm('create')
    })
    await act(async () => {
      await result.current.handleSaveRole()
    })

    expect(mockShowError).toHaveBeenCalledWith(error, 'common.saveFailed')
    expect(result.current.roleModalOpen).toBe(true)
    expect(mockMessageSuccess).not.toHaveBeenCalled()
  })
})
