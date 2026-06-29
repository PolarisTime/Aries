import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
import i18next from 'i18next'
import { useState } from 'react'
import {
  checkUserAccountLoginName,
  createUserAccount,
  getUserAccountDetail,
  updateUserAccount,
} from '@/api/user-accounts'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRequestError } from '@/hooks/useRequestError'
import type {
  UserAccountCreateResult,
  UserAccountFormPayload,
  UserAccountRecord,
} from '@/shared/schemas'
import { message } from '@/utils/antd-app'
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
  enabled?: boolean
}

export function useUserAccountEditor({
  canViewRoleCatalog,
  canViewDepartmentCatalog,
  enabled = true,
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
    enabled: enabled && editorOpen,
  })
  const { selectedRoleDataScope, selectedRoleIds, selectedRoleSummaries } =
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
          (response as { message?: string }).message ||
            i18next.t('system.userAccountEditorHook.saveSuccess'),
        )
      }
      setEditorOpen(false)
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userAccountBase,
      })
    },
    onError: (error: Error) => {
      if (error.message.includes('登录账号已存在')) {
        setLoginNameValidationMessage(
          i18next.t('system.userAccountEditorHook.loginNameExists'),
        )
        return
      }
      showError(error, i18next.t('system.userAccountEditorHook.saveFailed'))
    },
  })

  const resetEditorForm = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue(buildDefaultUserAccountFormValues())
    setLoginNameValidationMessage('')
    setLoginNameChecking(false)
  }

  const defaultValues = buildDefaultUserAccountFormValues()

  const fillEditorForm = (record: UserAccountRecord) => {
    setEditingId(record.id)
    form.setFieldsValue({
      loginName: record.loginName || '',
      password: '',
      userName: record.userName || '',
      mobile: record.mobile || '',
      departmentId: record.departmentId ?? null,
      roleIds: [...(record.roleIds || [])].map(String),
      dataScope: record.dataScope || defaultValues.dataScope,
      permissionSummary: record.permissionSummary || '',
      status: record.status || defaultValues.status,
      remark: record.remark || '',
    })
    setLoginNameValidationMessage('')
    setLoginNameChecking(false)
  }

  const runLoginNameCheck = async (
    loginName: string,
    excludeUserId?: string,
  ) => {
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
        : result.message ||
          i18next.t('system.userAccountEditorHook.loginNameExists')
      setLoginNameValidationMessage(validationMessage)
      setLoginNameChecking(false)
      return { available: result.available, message: validationMessage }
    } catch (error) {
      showError(
        error,
        i18next.t('system.userAccountEditorHook.checkLoginNameFailed'),
      )
      setLoginNameChecking(false)
      return {
        available: true,
        message: '',
      } satisfies LoginNameValidationResult
    }
  }

  const openCreateModal = () => {
    setEditorMode('create')
    resetEditorForm()
    setEditorOpen(true)
  }

  const openEditModal = async (record: UserAccountRecord) => {
    setEditorMode('edit')
    setEditorOpen(true)
    setEditorLoading(true)
    try {
      const detail = await getUserAccountDetail(record.id)
      fillEditorForm(detail)
      setEditorLoading(false)
    } catch (error) {
      showError(
        error,
        i18next.t('system.userAccountEditorHook.loadDetailFailed'),
      )
      setEditorOpen(false)
      setEditorLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const validationResult = await runLoginNameCheck(
        values.loginName,
        editorMode === 'edit' ? (editingId ?? undefined) : undefined,
      )
      if (!validationResult.available) {
        message.warning(
          validationResult.message ||
            i18next.t('system.userAccountEditorHook.loginNameExists'),
        )
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
        roleIds: [...(values.roleIds || [])].map(String),
        dataScope: selectedRoleDataScope,
        permissionSummary: values.permissionSummary?.trim() || '',
        status: values.status,
        remark: values.remark?.trim() || '',
      }
      saveMutation.mutate(payload)
    } catch {
      // validation failed
    }
  }

  const closeEditor = () => {
    setEditorOpen(false)
  }

  const closeCreateResult = () => {
    setCreateResultOpen(false)
    setCreateResult(null)
  }

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
    selectedRoleIds,
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
