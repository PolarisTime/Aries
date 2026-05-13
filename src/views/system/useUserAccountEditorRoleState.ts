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
  const watchedRoleNames = Form.useWatch('roleNames', form)
  const selectedRoleNames = useMemo(
    () => (Array.isArray(watchedRoleNames) ? watchedRoleNames : []),
    [watchedRoleNames],
  )

  const selectedRoleDataScope = useMemo(
    () =>
      buildSelectedRoleDataScope(
        selectedRoleNames,
        roleOptions,
        form.getFieldValue('dataScope'),
      ),
    [selectedRoleNames, roleOptions, form],
  )

  const selectedRoleSummaries = useMemo(
    () => buildSelectedRoleSummaries(selectedRoleNames, roleOptions),
    [selectedRoleNames, roleOptions],
  )

  useEffect(() => {
    form.setFieldValue('dataScope', selectedRoleDataScope)
  }, [selectedRoleDataScope, form])

  useEffect(() => {
    form.setFieldValue('permissionSummary', selectedRoleSummaries.join('；'))
  }, [selectedRoleSummaries, form])

  return {
    selectedRoleDataScope,
    selectedRoleNames,
    selectedRoleSummaries,
  }
}
