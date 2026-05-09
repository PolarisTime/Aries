import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, message } from 'antd'
import { useCallback, useState } from 'react'
import {
  checkUserAccountLoginName,
  createUserAccount,
  getUserAccountDetail,
  updateUserAccount,
} from '@/api/user-accounts'
import { useRequestError } from '@/hooks/useRequestError'
import type {
  UserAccountCreateResult,
  UserAccountFormPayload,
  UserAccountRecord,
} from '@/types/user-account'
import type {
  LoginNameValidationResult,
  UserAccountEditorFormValues,
} from '@/views/system/user-account-editor-types'
import {
  buildDefaultUserAccountFormValues,
  type UserAccountEditorMode,
} from '@/views/system/user-account-view-utils'
import { useUserAccountEditorCatalogs } from '@/views/system/useUserAccountEditorCatalogs'
import { useUserAccountEditorRoleState } from '@/views/system/useUserAccountEditorRoleState'

interface UseUserAccountEditorOptions {
  canViewRoleCatalog: boolean
  canViewDepartmentCatalog: boolean
}

export function useUserAccountEditor({
  canViewRoleCatalog,
  canViewDepartmentCatalog,
}: UseUserAccountEditorOptions) {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<UserAccountEditorMode>('create')
  const [editorLoading, setEditorLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loginNameValidationMessage, setLoginNameValidationMessage] =
    useState('')
  const [loginNameChecking, setLoginNameChecking] = useState(false)
  const [createResultOpen, setCreateResultOpen] = useState(false)
  const [createResult, setCreateResult] =
    useState<UserAccountCreateResult | null>(null)
  const [form] = Form.useForm<UserAccountEditorFormValues>()
  const { departmentOptions, roleOptions } = useUserAccountEditorCatalogs({
    canViewRoleCatalog,
    canViewDepartmentCatalog,
  })
  const { selectedRoleDataScope, selectedRoleNames, selectedRoleSummaries } =
    useUserAccountEditorRoleState({ form, roleOptions })

  const saveMutation = useMutation({
    mutationFn: async (values: UserAccountFormPayload) => {
      if (editorMode === 'create') {
        return createUserAccount(values)
      }
      return updateUserAccount(editingId!, values)
    },
    onSuccess: (response) => {
      if (editorMode === 'create' && response.data) {
        setCreateResult(response.data as UserAccountCreateResult)
        setCreateResultOpen(true)
      } else {
        message.success(
          (response as { message?: string }).message || '保存成功',
        )
      }
      setEditorOpen(false)
      queryClient.invalidateQueries({ queryKey: ['user-account'] })
    },
    onError: (error: Error) => {
      if (error.message.includes('登录账号已存在')) {
        setLoginNameValidationMessage('登录账号已存在')
        return
      }
      showError(error, '保存失败')
    },
  })

  const resetEditorForm = useCallback(() => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue(buildDefaultUserAccountFormValues())
    setLoginNameValidationMessage('')
    setLoginNameChecking(false)
  }, [form])

  const defaultValues = buildDefaultUserAccountFormValues()

  const fillEditorForm = useCallback(
    (record: UserAccountRecord) => {
      setEditingId(record.id)
      form.setFieldsValue({
        loginName: record.loginName || '',
        password: '',
        userName: record.userName || '',
        mobile: record.mobile || '',
        departmentId: record.departmentId ?? null,
        roleNames: [...(record.roleNames || [])],
        dataScope: record.dataScope || defaultValues.dataScope,
        permissionSummary: record.permissionSummary || '',
        status: record.status || defaultValues.status,
        remark: record.remark || '',
      })
      setLoginNameValidationMessage('')
      setLoginNameChecking(false)
    },
    [defaultValues.dataScope, defaultValues.status, form],
  )

  const runLoginNameCheck = useCallback(
    async (loginName: string, excludeUserId?: string) => {
      if (!loginName.trim()) {
        setLoginNameValidationMessage('')
        return {
          available: true,
          message: '',
        } satisfies LoginNameValidationResult
      }
      setLoginNameChecking(true)
      try {
        const result = await checkUserAccountLoginName(loginName, excludeUserId)
        const validationMessage = result.available
          ? ''
          : result.message || '登录账号已存在'
        setLoginNameValidationMessage(validationMessage)
        return { available: result.available, message: validationMessage }
      } catch (error) {
        showError(error, '检查登录账号失败')
        return {
          available: true,
          message: '',
        } satisfies LoginNameValidationResult
      } finally {
        setLoginNameChecking(false)
      }
    },
    [showError],
  )

  const openCreateModal = useCallback(() => {
    setEditorMode('create')
    resetEditorForm()
    setEditorOpen(true)
  }, [resetEditorForm])

  const openEditModal = useCallback(
    async (record: UserAccountRecord) => {
      setEditorMode('edit')
      setEditorOpen(true)
      setEditorLoading(true)
      try {
        const detail = await getUserAccountDetail(record.id)
        fillEditorForm(detail)
      } catch (error) {
        showError(error, '加载用户详情失败')
        setEditorOpen(false)
      } finally {
        setEditorLoading(false)
      }
    },
    [fillEditorForm, showError],
  )

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      const validationResult = await runLoginNameCheck(
        values.loginName,
        editorMode === 'edit' ? (editingId ?? undefined) : undefined,
      )
      if (!validationResult.available) {
        message.warning(validationResult.message || '登录账号已存在')
        return
      }
      const payload: UserAccountFormPayload = {
        loginName: values.loginName.trim(),
        ...(editorMode === 'create' && values.password?.trim()
          ? { password: values.password.trim() }
          : {}),
        userName: values.userName.trim(),
        mobile: values.mobile?.trim() || '',
        departmentId: values.departmentId ?? null,
        roleNames: [...(values.roleNames || [])],
        dataScope: selectedRoleDataScope,
        permissionSummary: values.permissionSummary?.trim() || '',
        status: values.status,
        remark: values.remark?.trim() || '',
      }
      saveMutation.mutate(payload)
    } catch {
      // validation failed
    }
  }, [
    editingId,
    editorMode,
    form,
    runLoginNameCheck,
    saveMutation,
    selectedRoleDataScope,
  ])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
  }, [])

  const closeCreateResult = useCallback(() => {
    setCreateResultOpen(false)
    setCreateResult(null)
  }, [])

  return {
    form,
    editorOpen,
    editorMode,
    editorLoading,
    editingId,
    loginNameValidationMessage,
    loginNameChecking,
    departmentOptions,
    roleOptions,
    selectedRoleNames,
    selectedRoleDataScope,
    selectedRoleSummaries,
    createResultOpen,
    createResult,
    savePending: saveMutation.isPending,
    openCreateModal,
    openEditModal,
    runLoginNameCheck,
    handleSave,
    closeEditor,
    closeCreateResult,
  }
}
