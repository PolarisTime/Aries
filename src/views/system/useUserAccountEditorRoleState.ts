import { Form } from 'antd'
import type { RoleOptionRecord } from '@/shared/schemas'
import type { UserAccountEditorFormValues } from '@/views/system/user-account-editor-types'
import { buildSelectedRoleSummaries } from '@/views/system/user-account-view-utils'

interface Props {
  form: ReturnType<typeof Form.useForm<UserAccountEditorFormValues>>[0]
  roleOptions: RoleOptionRecord[]
}

export function useUserAccountEditorRoleState({ form, roleOptions }: Props) {
  const watchedRoleIds = Form.useWatch('roleIds', form)
  const selectedRoleIds = Array.isArray(watchedRoleIds)
    ? watchedRoleIds.map(String)
    : []

  const selectedRoleSummaries = buildSelectedRoleSummaries(
    selectedRoleIds,
    roleOptions,
  )

  return {
    selectedRoleIds,
    selectedRoleSummaries,
  }
}
