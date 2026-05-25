import Form from 'antd/es/form'
import { useEffect, useMemo } from 'react'
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
  const selectedRoleIds = useMemo(
    () => (Array.isArray(watchedRoleIds) ? watchedRoleIds.map(Number) : []),
    [watchedRoleIds],
  )

  const selectedRoleDataScope = useMemo(
    () =>
      buildSelectedRoleDataScope(
        selectedRoleIds,
        roleOptions,
        form.getFieldValue('dataScope'),
      ),
    [selectedRoleIds, roleOptions, form],
  )

  const selectedRoleSummaries = useMemo(
    () => buildSelectedRoleSummaries(selectedRoleIds, roleOptions),
    [selectedRoleIds, roleOptions],
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
