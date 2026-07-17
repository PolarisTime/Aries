import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
import i18next from 'i18next'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createRole,
  deleteRole,
  type RolePayload,
  type RoleRecord,
  updateRole,
} from '@/api/role-actions'
import { enabledStatusValues, roleTypeValues } from '@/constants/module-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRequestError } from '@/hooks/useRequestError'
import { message, modal } from '@/utils/antd-app'

type UseRoleEditorOptions = {
  canCreateRole: boolean
  canEditRole: boolean
  canDeleteRole: boolean
  canManagePermissions: boolean
  onCreatedRoleSelect: (role: RoleRecord) => void
}

type RoleFormValues = {
  roleCode: string
  roleName: string
  roleType: string
  status: string
  remark?: string | null
}

export function useRoleEditor({
  canCreateRole,
  canEditRole,
  canDeleteRole,
  canManagePermissions,
  onCreatedRoleSelect,
}: UseRoleEditorOptions) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null)
  const [roleForm] = Form.useForm<RoleFormValues>()

  const openRoleForm = (mode: 'create' | 'edit', role?: RoleRecord) => {
    if (mode === 'edit' && role) {
      if (!canEditRole) {
        message.warning(t('common.noPermission'))
        return
      }
      setEditingRole(role)
      roleForm.setFieldsValue({
        roleName: role.roleName,
        roleCode: role.roleCode,
        roleType: role.roleType,
        status: role.status,
        remark: role.remark || '',
      })
    } else {
      if (!canCreateRole) {
        message.warning(t('common.noPermission'))
        return
      }
      setEditingRole(null)
      roleForm.resetFields()
      roleForm.setFieldsValue({
        roleType: roleTypeValues[1],
        status: enabledStatusValues[0],
      })
    }
    setRoleModalOpen(true)
  }

  const saveRoleMutation = useMutation({
    mutationFn: async (
      values: RoleFormValues,
    ): Promise<{ mode: 'edit' } | { mode: 'create'; data: RoleRecord }> => {
      const payload: RolePayload = {
        ...values,
        remark: values.remark || undefined,
      }
      if (editingRole) {
        await updateRole(editingRole.id, payload)
        return { mode: 'edit' }
      }
      const response = await createRole(payload)
      return { mode: 'create', data: response.data }
    },
    onSuccess: (result) => {
      setRoleModalOpen(false)
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roleSettings }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roleOptions }),
      ])

      if (result.mode === 'create' && result.data) {
        message.success(t('common.addSuccess'))
        if (!canManagePermissions) {
          return
        }
        modal.confirm({
          title: t('common.addSuccess'),
          content: i18next.t('system.roleEditorHook.createConfirmContent'),
          okText: i18next.t('system.roleEditorHook.goConfigure'),
          cancelText: i18next.t('system.roleEditorHook.configureLater'),
          onOk: () => {
            onCreatedRoleSelect(result.data)
          },
        })
        return
      }

      message.success(t('common.editSuccess'))
    },
    onError: (error: Error) => showError(error, t('common.saveFailed')),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roleSettings }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roleOptions }),
      ])
      message.success(t('common.deleteSuccess'))
    },
    onError: (error: Error) => showError(error, t('api.deleteFailed')),
  })

  const requestDeleteRole = (role: RoleRecord) => {
    if (!canDeleteRole) {
      message.warning(t('common.noPermission'))
      return
    }
    if (role.roleCode.trim().toUpperCase() === 'ADMIN') {
      message.warning(i18next.t('system.roleEditorHook.adminRoleProtected'))
      return
    }
    modal.confirm({
      title: t('common.delete'),
      content: i18next.t('system.roleEditorHook.deleteConfirm', {
        roleName: role.roleName,
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteRoleMutation.mutateAsync(role.id),
    })
  }

  const handleSaveRole = async () => {
    const rawValues = roleForm.getFieldsValue()
    if (!rawValues.roleName?.trim() || !rawValues.roleCode?.trim()) {
      message.warning(i18next.t('system.roleEditorHook.fillNameAndCode'))
      return
    }
    try {
      const values = await roleForm.validateFields()
      saveRoleMutation.mutate(values)
    } catch {
      // validation failed
    }
  }

  return {
    roleModalOpen,
    editingRole,
    roleForm,
    savePending: saveRoleMutation.isPending,
    deletingRoleId: deleteRoleMutation.isPending
      ? String(deleteRoleMutation.variables)
      : null,
    openRoleForm,
    requestDeleteRole,
    handleSaveRole,
    closeRoleModal: () => setRoleModalOpen(false),
  }
}
