export interface LoginPayload {
  loginName: string
  password: string
  remember?: boolean
}

export interface Login2faPayload {
  tempToken: string
  totpCode: string
  remember?: boolean
}

export interface LoginUser {
  id: number | string
  loginName: string
  userName?: string
  roleName?: string
  totpEnabled?: boolean
  forceTotpSetup?: boolean
  permissions?: ResourcePermission[]
  dataScopes?: Record<string, DataScope>
}

export interface ResourcePermission {
  resource: string
  actions: string[]
}

export type DataScope = 'all' | 'department' | 'self' | 'custom' | string

export interface LoginResponseData {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: LoginUser
}

export interface LoginStep1Response {
  requires2fa: boolean
  tempToken: string
}

export type LoginResult = LoginResponseData | LoginStep1Response

export interface TotpSetupResponse {
  qrCodeBase64: string
  secret: string
}

