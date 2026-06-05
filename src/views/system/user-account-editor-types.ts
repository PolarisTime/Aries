export interface UserAccountEditorFormValues {
  loginName: string
  password: string
  userName: string
  mobile: string
  departmentId: string | null
  roleNames: string[]
  dataScope: string
  permissionSummary: string
  status: string
  remark: string
}

export interface LoginNameValidationResult {
  available: boolean
  message: string
}
