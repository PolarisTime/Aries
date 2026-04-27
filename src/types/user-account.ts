export interface UserAccountRecord {
  id: string
  loginName: string
  userName: string
  mobile: string | null
  departmentId: string | number | null
  departmentName: string | null
  roleNames: string[]
  dataScope: string | null
  permissionSummary: string | null
  lastLoginDate: string | null
  status: string
  remark: string | null
  totpEnabled: boolean
}

export interface UserAccountFormPayload {
  loginName: string
  password?: string
  userName: string
  mobile: string
  departmentId?: string | number | null
  roleNames: string[]
  dataScope: string
  permissionSummary: string
  status: string
  remark: string
}

export interface UserAccountCreateResult {
  user: UserAccountRecord
  initialPassword: string
}

export interface UserAccountLoginNameAvailability {
  available: boolean
  message: string | null
}

export interface RoleOptionRecord {
  id: string
  roleCode: string
  roleName: string
  roleType: string
  dataScope: string
  permissionSummary: string
  status: string
}

export interface DepartmentOptionRecord {
  id: string | number
  departmentCode: string
  departmentName: string
}
