import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Modal, message } from 'antd'
import { useCallback, useState } from 'react'
import { createRole, type RoleRecord, updateRole } from '@/api/role-actions'
import {
  enabledStatusValues,
  roleDataScopeValues,
  roleTypeValues,
} from '@/constants/module-options'
import { useRequestError } from '@/hooks/useRequestError'

interface UseRoleEditorOptions {
  canCreateRole: boolean
  canEditRole: boolean
  onCreatedRoleSelect: (role: RoleRecord) => void
}

export function useRoleEditor({
  canCreateRole,
  canEditRole,
  onCreatedRoleSelect,
}: UseRoleEditorOptions) {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null)
  const [roleForm] = Form.useForm()

  const openRoleForm = useCallback(
    (mode: 'create' | 'edit', role?: RoleRecord) => {
      if (mode === 'edit' && role) {
        if (!canEditRole) {
          message.warning('暂无编辑角色权限')
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
          message.warning('暂无新增角色权限')
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
      values: Record<string, unknown>,
    ): Promise<{ mode: 'edit' } | { mode: 'create'; data: RoleRecord }> => {
      const payload = {
        ...values,
        remark: values.remark || null,
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
      await queryClient.invalidateQueries({ queryKey: ['role-settings'] })

      if (result.mode === 'create' && result.data) {
        message.success('角色创建成功')
        Modal.confirm({
          title: '角色创建成功',
          content: '角色已创建完成，是否立即为此角色配置权限？',
          okText: '去配置',
          cancelText: '稍后配置',
          onOk: () => {
            onCreatedRoleSelect(result.data)
          },
        })
        return
      }

      message.success('角色更新成功')
    },
    onError: (error: Error) => showError(error, '保存失败'),
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
