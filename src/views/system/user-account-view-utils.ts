import { enabledStatusValues } from '@/constants/module-options'

export type UserAccountEditorMode = 'create' | 'edit'

export function getUserAccountStatusColor(value: string) {
  return value === enabledStatusValues[0] ? 'green' : 'red'
}

export function buildDefaultUserAccountFormValues() {
  return {
    loginName: '',
    password: '',
    userName: '',
    mobile: '',
    departmentId: null,
    status: enabledStatusValues[0],
    remark: '',
  }
}
