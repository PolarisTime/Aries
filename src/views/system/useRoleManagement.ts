import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createRole,
  deleteRole,
  listRoles,
  updateRole,
  updateRolePermissions,
  updateRoleStatus,
} from '@/api/system/roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useRequestError } from '@/hooks/useRequestError'
import type { RoleCreatePayload, RoleResponse } from '@/shared/schemas'
import { message, modal } from '@/utils/antd-app'
import type { RoleWizardSubmit } from '@/views/system/RoleWizardModal'

export function useRoleManagement() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const defaultPageSize = useDefaultPageSize()
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null)
  const [permissionRole, setPermissionRole] = useState<RoleResponse | null>(
    null,
  )

  const roleListQuery = useQuery({
    queryKey: QUERY_KEYS.roles({ keyword, status, page, size: pageSize }),
    queryFn: ({ signal }) =>
      listRoles({ keyword, status, page: page - 1, size: pageSize }, signal),
    placeholderData: keepPreviousData,
  })

  const invalidateRoles = (roleId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['roles'] })
    if (roleId) {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.role(roleId),
      })
    }
  }

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload, permissions }: RoleWizardSubmit) => {
      const saved = id
        ? await updateRole(id, payload)
        : await createRole(payload as RoleCreatePayload)
      await updateRolePermissions(saved.id, permissions)
      return saved
    },
    onSuccess: (_data, variables) => {
      message.success(
        variables.id ? t('common.editSuccess') : t('common.addSuccess'),
      )
      invalidateRoles(variables.id)
      setEditorOpen(false)
      setEditingRole(null)
    },
    onError: (error: Error) => showError(error, t('common.saveFailed')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) =>
      updateRoleStatus(id, nextStatus),
    onSuccess: (role) => {
      message.success(t('system.role.statusUpdated'))
      invalidateRoles(role.id)
    },
    onError: (error: Error) =>
      showError(error, t('system.role.statusUpdateFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      message.success(t('common.deleteSuccess'))
      invalidateRoles()
    },
    onError: (error: Error) => showError(error, t('api.deleteFailed')),
  })

  const permissionMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      updateRolePermissions(id, permissions),
    onSuccess: (_data, variables) => {
      message.success(t('system.role.permissionsSaved'))
      invalidateRoles(variables.id)
      setPermissionRole(null)
    },
    onError: (error: Error) =>
      showError(error, t('system.role.permissionsSaveFailed')),
  })

  const applyKeyword = (value: string) => {
    setKeyword(value.trim())
    setPage(1)
  }

  const openCreate = () => {
    setEditingRole(null)
    setEditorOpen(true)
  }

  const openEdit = (role: RoleResponse) => {
    setEditingRole(role)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingRole(null)
  }

  const toggleStatus = (role: RoleResponse) => {
    const nextStatus = role.status === '正常' ? '禁用' : '正常'
    modal.confirm({
      title:
        nextStatus === '禁用'
          ? t('system.role.disableConfirmTitle')
          : t('system.role.enableConfirmTitle'),
      content: t('system.role.statusConfirmContent', { name: role.name }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => statusMutation.mutateAsync({ id: role.id, nextStatus }),
    })
  }

  const handleDelete = (role: RoleResponse) => {
    modal.confirm({
      title: t('system.role.deleteRole'),
      content: t('system.role.deleteContent', { name: role.name }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(role.id),
    })
  }

  const saveRole = (submit: RoleWizardSubmit) => {
    saveMutation.mutate(submit)
  }

  return {
    applyKeyword,
    closeEditor,
    deletePending: deleteMutation.isPending,
    editingRole,
    editorOpen,
    handleDelete,
    isError: roleListQuery.isError,
    isFetching: roleListQuery.isFetching,
    isLoading: roleListQuery.isPending,
    keywordInput,
    openCreate,
    openEdit,
    page,
    pageSize,
    roles: roleListQuery.data?.content ?? [],
    savePending: saveMutation.isPending,
    saveRole,
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
    openPermissions: (role: RoleResponse) => setPermissionRole(role),
    closePermissions: () => setPermissionRole(null),
    permissionRole,
    permissionPending: permissionMutation.isPending,
    savePermissions: (id: string, permissions: string[]) =>
      permissionMutation.mutate({ id, permissions }),
    status,
    statusPending: statusMutation.isPending,
    toggleStatus,
    total: roleListQuery.data?.totalElements ?? 0,
    refresh: () => {
      void roleListQuery.refetch()
    },
  }
}

export type RoleManagementModel = ReturnType<typeof useRoleManagement>
