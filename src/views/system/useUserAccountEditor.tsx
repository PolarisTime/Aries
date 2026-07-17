import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
import i18next from 'i18next'
import { useEffect, useRef, useState } from 'react'
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
  enabled?: boolean
}

interface EditorSession {
  version: number
  targetId: string | null
}

export function useUserAccountEditor({
  enabled = true,
}: UseUserAccountEditorOptions) {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const editorSessionRef = useRef<EditorSession>({
    version: 0,
    targetId: null,
  })
  const detailAbortControllerRef = useRef<AbortController | null>(null)
  const initialRoleIdsRef = useRef<string[]>([])
  const loginNameRequestVersionRef = useRef(0)
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
    enabled: enabled && editorOpen,
  })
  const { selectedRoleIds, selectedRoleSummaries } =
    useUserAccountEditorRoleState({ form, roleOptions })

  const startEditorSession = (targetId: string | null): EditorSession => {
    detailAbortControllerRef.current?.abort()
    detailAbortControllerRef.current = null
    const session = {
      version: editorSessionRef.current.version + 1,
      targetId,
    }
    editorSessionRef.current = session
    loginNameRequestVersionRef.current += 1
    return session
  }

  const invalidateEditorSession = () => {
    detailAbortControllerRef.current?.abort()
    detailAbortControllerRef.current = null
    editorSessionRef.current = {
      version: editorSessionRef.current.version + 1,
      targetId: null,
    }
    loginNameRequestVersionRef.current += 1
  }

  const isCurrentEditorSession = (session: EditorSession) =>
    editorSessionRef.current.version === session.version &&
    editorSessionRef.current.targetId === session.targetId

  useEffect(
    () => () => {
      detailAbortControllerRef.current?.abort()
      detailAbortControllerRef.current = null
      editorSessionRef.current = {
        version: editorSessionRef.current.version + 1,
        targetId: null,
      }
      loginNameRequestVersionRef.current += 1
    },
    [],
  )

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
    initialRoleIdsRef.current = []
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue(buildDefaultUserAccountFormValues())
    setLoginNameValidationMessage('')
    setLoginNameChecking(false)
  }

  const defaultValues = buildDefaultUserAccountFormValues()

  const fillEditorForm = (record: UserAccountRecord) => {
    const roleIds = [...(record.roleIds || [])].map(String)
    initialRoleIdsRef.current = [...new Set(roleIds)].sort()
    setEditingId(record.id)
    form.setFieldsValue({
      loginName: record.loginName || '',
      password: '',
      userName: record.userName || '',
      mobile: record.mobile || '',
      departmentId: record.departmentId ?? null,
      roleIds,
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
    const normalizedLoginName = loginName.trim()
    const session = { ...editorSessionRef.current }
    const requestVersion = loginNameRequestVersionRef.current + 1
    loginNameRequestVersionRef.current = requestVersion
    const isCurrentRequest = () =>
      loginNameRequestVersionRef.current === requestVersion &&
      isCurrentEditorSession(session)

    if (!normalizedLoginName) {
      setLoginNameValidationMessage('')
      setLoginNameChecking(false)
      return {
        available: true,
        message: '',
      } satisfies LoginNameValidationResult
    }
    setLoginNameChecking(true)
    try {
      const result = await checkUserAccountLoginName(
        normalizedLoginName,
        excludeUserId,
      )
      const validationMessage = result.available
        ? ''
        : result.message ||
          i18next.t('system.userAccountEditorHook.loginNameExists')
      if (isCurrentRequest()) {
        setLoginNameValidationMessage(validationMessage)
        setLoginNameChecking(false)
      }
      return { available: result.available, message: validationMessage }
    } catch (error) {
      if (isCurrentRequest()) {
        showError(
          error,
          i18next.t('system.userAccountEditorHook.checkLoginNameFailed'),
        )
        setLoginNameChecking(false)
      }
      return {
        available: true,
        message: '',
      } satisfies LoginNameValidationResult
    }
  }

  const openCreateModal = () => {
    startEditorSession(null)
    setEditorMode('create')
    setEditorLoading(false)
    resetEditorForm()
    setEditorOpen(true)
  }

  const openEditModal = async (record: UserAccountRecord) => {
    const targetId = String(record.id)
    const session = startEditorSession(targetId)
    const abortController = new AbortController()
    detailAbortControllerRef.current = abortController
    setEditorMode('edit')
    setEditorOpen(true)
    setEditorLoading(true)
    setEditingId(null)
    setLoginNameValidationMessage('')
    setLoginNameChecking(false)
    try {
      const detail = await getUserAccountDetail(
        targetId,
        abortController.signal,
      )
      if (!isCurrentEditorSession(session) || String(detail.id) !== targetId) {
        return
      }
      fillEditorForm(detail)
      setEditorLoading(false)
      if (detailAbortControllerRef.current === abortController) {
        detailAbortControllerRef.current = null
      }
    } catch (error) {
      if (!isCurrentEditorSession(session)) return
      showError(
        error,
        i18next.t('system.userAccountEditorHook.loadDetailFailed'),
      )
      invalidateEditorSession()
      setEditorOpen(false)
      setEditorLoading(false)
      setEditingId(null)
      setLoginNameChecking(false)
      if (detailAbortControllerRef.current === abortController) {
        detailAbortControllerRef.current = null
      }
    }
  }

  const handleSave = async () => {
    const session = { ...editorSessionRef.current }
    const mode = editorMode
    const targetId = mode === 'edit' ? editingId : null
    if (
      mode === 'edit' &&
      (!targetId || session.targetId !== String(targetId))
    ) {
      return
    }
    if (!isCurrentEditorSession(session)) return
    try {
      const values = await form.validateFields()
      if (isCurrentEditorSession(session)) {
        const validationPromise = runLoginNameCheck(
          values.loginName,
          targetId ?? undefined,
        )
        const validationRequestVersion = loginNameRequestVersionRef.current
        const validationResult = await validationPromise
        const validationIsCurrent =
          isCurrentEditorSession(session) &&
          loginNameRequestVersionRef.current === validationRequestVersion
        if (validationIsCurrent && !validationResult.available) {
          message.warning(validationResult.message)
        }
        if (validationIsCurrent && validationResult.available) {
          const roleIds = [
            ...new Set((values.roleIds || []).map(String)),
          ].sort()
          const roleIdsChanged =
            mode === 'create' ||
            roleIds.length !== initialRoleIdsRef.current.length ||
            roleIds.some(
              (roleId, index) => roleId !== initialRoleIdsRef.current[index],
            )
          const includesUnassignableRole = roleIds.some(
            (roleId) =>
              roleOptions.find((role) => String(role.id) === roleId)
                ?.assignable === false,
          )
          if (roleIdsChanged && includesUnassignableRole) {
            message.warning(
              i18next.t(
                'system.userAccountEditorHook.roleSelectionOutOfBounds',
              ),
            )
            return
          }
          const payload: UserAccountFormPayload = {
            loginName: values.loginName.trim(),
            ...(mode === 'create' && values.password?.trim()
              ? { password: values.password.trim() }
              : {}),
            userName: values.userName.trim(),
            mobile: values.mobile?.trim() || '',
            departmentId: String(values.departmentId),
            ...(roleIdsChanged ? { roleIds } : {}),
            status: values.status,
            remark: values.remark?.trim() || '',
          }
          saveMutation.mutate(payload)
        }
      }
    } catch {
      // validation failed
    }
  }

  const closeEditor = () => {
    invalidateEditorSession()
    setEditorOpen(false)
    setEditorLoading(false)
    setEditingId(null)
    setLoginNameChecking(false)
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
