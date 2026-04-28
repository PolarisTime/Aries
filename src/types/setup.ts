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

export interface InitialSetupTotpPayload {
  loginName: string
}

export interface InitialSetupTotpResult {
  qrCodeBase64: string
  secret: string
}

export interface InitialSetupAdminSubmitPayload {
  admin: InitialSetupAdminPayload
  totpSecret: string
  totpCode: string
}

export interface InitialSetupCompanyPayload {
  companyName: string
  taxNo: string
  bankName: string
  bankAccount: string
  taxRate: number
  remark?: string
}

export interface InitialSetupPayload {
  admin?: InitialSetupAdminSubmitPayload
  company?: InitialSetupCompanyPayload
}

export interface InitialSetupResult {
  adminLoginName: string
  companyName: string
}
