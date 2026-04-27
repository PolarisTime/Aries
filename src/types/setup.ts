export interface InitialSetupStatus {
  setupRequired: boolean
  adminConfigured: boolean
  companyConfigured: boolean
}

export interface InitialSetupAdminPayload {
  loginName: string
  password: string
  userName: string
  mobile?: string
}

export interface InitialSetupCompanyPayload {
  companyName: string
  taxNo: string
  bankName: string
  bankAccount: string
  taxRate: number
  status: string
  remark?: string
}

export interface InitialSetupPayload {
  admin?: InitialSetupAdminPayload
  company?: InitialSetupCompanyPayload
}

export interface InitialSetupResult {
  adminLoginName: string
  companyName: string
}
