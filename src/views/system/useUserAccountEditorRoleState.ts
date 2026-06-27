import { Form } from 'antd'
import { useEffect } from 'react'
import type { RoleOptionRecord } from '@/types/user-account'
import type { UserAccountEditorFormValues } from '@/views/system/user-account-editor-types'
import {
  buildSelectedRoleDataScope,
  buildSelectedRoleSummaries,
} from '@/views/system/user-account-view-utils'

interface Props {
  form: ReturnType<typeof Form.useForm<UserAccountEditorFormValues>>[0]
  roleOptions: RoleOptionRecord[]
}

export function useUserAccountEditorRoleState({ form, roleOptions }: Props) {
  const watchedRoleIds = Form.useWatch('roleIds', form)
  const selectedRoleIds = Array.isArray(watchedRoleIds)
    ? watchedRoleIds.map(String)
    : []

  const selectedRoleDataScope = buildSelectedRoleDataScope(
    selectedRoleIds,
    roleOptions,
    form.getFieldValue('dataScope'),
  )

  const selectedRoleSummaries = buildSelectedRoleSummaries(
    selectedRoleIds,
    roleOptions,
  )

  useEffect(() => {
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- Antd Form 是外部状态容器，需要把角色推导的数据权限写回提交字段。
    form.setFieldValue('dataScope', selectedRoleDataScope)
  }, [selectedRoleDataScope, form])

  useEffect(() => {
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- Antd Form 是外部状态容器，需要把角色说明写回只读提交字段。
    form.setFieldValue('permissionSummary', selectedRoleSummaries.join('；'))
  }, [selectedRoleSummaries, form])

  return {
    selectedRoleDataScope,
    selectedRoleIds,
    selectedRoleSummaries,
  }
}
