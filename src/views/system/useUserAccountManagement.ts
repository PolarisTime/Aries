import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { readRequestError } from '@/api/core/request-errors'
import { updateUserRoles } from '@/api/system/user-roles'
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from '@/api/system/users'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useRequestError } from '@/hooks/useRequestError'
import type { UserAccountResponse, UserCreatePayload } from '@/shared/schemas'
import { useAuthStore } from '@/stores/authStore'
import { message, modal } from '@/utils/antd-app'
import type { UserWizardSubmit } from '@/views/system/UserAccountWizardModal'
import { nextUserStatus } from '@/views/system/user-account-form-utils'

export function useUserAccountManagement() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const defaultPageSize = useDefaultPageSize()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserAccountResponse | null>(
    null,
  )
  const [resetUser, setResetUser] = useState<UserAccountResponse | null>(null)
  const [rolesUser, setRolesUser] = useState<UserAccountResponse | null>(null)

  const userListQuery = useQuery({
    queryKey: QUERY_KEYS.users({ keyword, status, page, size: pageSize }),
    queryFn: ({ signal }) =>
      listUsers({ keyword, status, page: page - 1, size: pageSize }, signal),
    placeholderData: keepPreviousData,
  })

  const invalidateUsers = (userId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['users'] })
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.user(userId) })
    }
  }

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload, roleIds }: UserWizardSubmit) => {
      const saved = id
        ? await updateUser(id, payload)
        : await createUser(payload as UserCreatePayload)
      if (roleIds) {
        await updateUserRoles(saved.id, roleIds)
      }
      return saved
    },
    onSuccess: (_data, variables) => {
      message.success(
        variables.id ? t('common.editSuccess') : t('common.addSuccess'),
      )
      invalidateUsers(variables.id)
      setEditorOpen(false)
      setEditingUser(null)
    },
    onError: (error: Error) => showError(error, t('common.saveFailed')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) =>
      updateUserStatus(id, nextStatus),
    onSuccess: (user) => {
      message.success(t('system.userAccount.statusUpdated'))
      invalidateUsers(user.id)
    },
    onError: (error: Error) =>
      showError(error, t('system.userAccount.statusUpdateFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      message.success(t('common.deleteSuccess'))
      invalidateUsers()
    },
    onError: (error: Error) => {
      if (readRequestError(error).status === 403) {
        message.warning(t('system.userAccount.deleteSelfForbidden'))
        return
      }
      showError(error, t('api.deleteFailed'))
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      resetUserPassword(id, newPassword),
    onSuccess: (_data, variables) => {
      message.success(t('system.userAccount.passwordResetSuccess'))
      invalidateUsers(variables.id)
      setResetUser(null)
    },
    onError: (error: Error) =>
      showError(error, t('system.userAccount.passwordResetFailed')),
  })

  const applyKeyword = (value: string) => {
    setKeyword(value.trim())
    setPage(1)
  }

  const openCreate = () => {
    setEditingUser(null)
    setEditorOpen(true)
  }

  const openEdit = (user: UserAccountResponse) => {
    setEditingUser(user)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingUser(null)
  }

  const toggleStatus = (user: UserAccountResponse) => {
    const nextStatus = nextUserStatus(user.status)
    modal.confirm({
      title:
        nextStatus === 'DISABLED'
          ? t('system.userAccount.disableConfirmTitle')
          : t('system.userAccount.enableConfirmTitle'),
      content: t('system.userAccount.statusConfirmContent', {
        name: user.userName || user.loginName,
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => statusMutation.mutateAsync({ id: user.id, nextStatus }),
    })
  }

  const handleDelete = (user: UserAccountResponse) => {
    const isSelf = Boolean(currentUserId && user.id === currentUserId)
    modal.confirm({
      title: t('system.userAccount.deleteUser'),
      content: isSelf
        ? t('system.userAccount.deleteSelfConfirm')
        : t('system.userAccount.deleteContent', {
            name: user.userName || user.loginName,
          }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(user.id),
    })
  }

  const saveUser = (submit: UserWizardSubmit) => {
    saveMutation.mutate(submit)
  }

  return {
    applyKeyword,
    closeEditor,
    closeReset: () => setResetUser(null),
    closeRoles: () => setRolesUser(null),
    deletePending: deleteMutation.isPending,
    editingUser,
    editorOpen,
    handleDelete,
    isError: userListQuery.isError,
    isFetching: userListQuery.isFetching,
    isLoading: userListQuery.isPending,
    keywordInput,
    openCreate,
    openEdit,
    openReset: (user: UserAccountResponse) => setResetUser(user),
    openRoles: (user: UserAccountResponse) => setRolesUser(user),
    page,
    pageSize,
    resetPassword: (id: string, newPassword: string) =>
      resetPasswordMutation.mutate({ id, newPassword }),
    resetPasswordPending: resetPasswordMutation.isPending,
    resetUser,
    refresh: () => {
      void userListQuery.refetch()
    },
    rolesUser,
    savePending: saveMutation.isPending,
    saveUser,
    setKeywordInput,
    setPage,
    setPageSize: (value: number) => {
      setPageSize(value)
      setPage(1)
    },
    setStatus: (value: string | undefined) => {
      setStatus(value)
      setPage(1)
    },
    status,
    statusPending: statusMutation.isPending,
    toggleStatus,
    total: userListQuery.data?.totalElements ?? 0,
    users: userListQuery.data?.content ?? [],
  }
}

export type UserAccountManagementModel = ReturnType<
  typeof useUserAccountManagement
>
