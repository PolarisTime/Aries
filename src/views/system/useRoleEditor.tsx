import { useMutation, useQueryClient } from '@tanstack/react-query'
import Form from 'antd/es/form'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createRole, type RoleRecord, updateRole } from '@/api/role-actions'
import {
  enabledStatusValues,
  roleDataScopeValues,
  roleTypeValues,
} from '@/constants/module-options'
import { useRequestError } from '@/hooks/useRequestError'
import { QUERY_KEYS } from '@/constants/query-keys'
import { message, modal } from '@/utils/antd-app'

type UseRoleEditorOptions = {
  canCreateRole: boolean
  canEditRole: boolean
  onCreatedRoleSelect: (role: RoleRecord) => void
}

type RoleFormValues = {
  roleCode?: string
  roleName?: string
  roleType?: string
  dataScope?: string
  remark?: string | null
}

export function useRoleEditor({
  canCreateRole,
  canEditRole,
  onCreatedRoleSelect,
}: UseRoleEditorOptions) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null)
  const [roleForm] = Form.useForm()

  const openRoleForm = useCallback(
    (mode: 'create' | 'edit', role?: RoleRecord) => {
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
          dataScope: role.dataScope,
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
          dataScope: roleDataScopeValues[0],
        })
      }
      setRoleModalOpen(true)
    },
    [canCreateRole, canEditRole, roleForm],
  )

  const saveRoleMutation = useMutation({
    mutationFn: async (
      values: RoleFormValues,
    ): Promise<{ mode: 'edit' } | { mode: 'create'; data: RoleRecord }> => {
      const payload = {
        ...values,
        remark: values.remark || undefined,
        status: editingRole?.status || enabledStatusValues[0],
      }
      if (editingRole) {
        await updateRole(editingRole.id, payload)
        return { mode: 'edit' }
      }
      const response = await createRole(payload)
      return { mode: 'create', data: response.data }
    },
    onSuccess: async (result) => {
      setRoleModalOpen(false)
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roleSettings })

      if (result.mode === 'create' && result.data) {
        message.success(t('common.addSuccess'))
        modal.confirm({
          title: t('common.addSuccess'),
          content: '角色已创建完成，是否立即为此角色配置权限？',
          okText: '去配置',
          cancelText: '稍后配置',
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

  const handleSaveRole = useCallback(async () => {
    try {
      const values = await roleForm.validateFields()
      if (!values.roleName?.trim() || !values.roleCode?.trim()) {
        message.warning('请填写角色名称和编码')
        return
      }
      saveRoleMutation.mutate(values)
    } catch {
      // validation failed
    }
  }, [roleForm, saveRoleMutation])

  return {
    roleModalOpen,
    editingRole,
    roleForm,
    savePending: saveRoleMutation.isPending,
    openRoleForm,
    handleSaveRole,
    closeRoleModal: () => setRoleModalOpen(false),
  }
}
