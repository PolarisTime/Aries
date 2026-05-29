import Form from 'antd/es/form'
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
    ? watchedRoleIds.map(Number)
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
    form.setFieldValue('dataScope', selectedRoleDataScope)
  }, [selectedRoleDataScope, form])

  useEffect(() => {
    form.setFieldValue('permissionSummary', selectedRoleSummaries.join('；'))
  }, [selectedRoleSummaries, form])

  return {
    selectedRoleDataScope,
    selectedRoleIds,
    selectedRoleSummaries,
  }
}
