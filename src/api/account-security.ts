import { assertApiSuccess, http } from '@/api/client'
import type { ApiResponse, TotpSetupResponse } from '@/types/auth'

export interface ChangeOwnPasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface CurrentUserSecurityState {
  id: number | string
  loginName: string
  userName: string
  totpEnabled: boolean
  forceTotpSetup?: boolean
}

function buildTotpHeaders(totpCode: string) {
  return {
    headers: {
      'X-TOTP-Code': totpCode.trim(),
    },
  }
}

export async function changeOwnPassword(payload: ChangeOwnPasswordPayload) {
  const response = await http.post<ApiResponse<null>, ApiResponse<null>>(
    '/account/security/password',
    payload,
  )
  return assertApiSuccess(response, '修改密码失败')
}

export async function setupOwn2fa() {
  const response = await http.post<ApiResponse<TotpSetupResponse>, ApiResponse<TotpSetupResponse>>(
    '/account/security/2fa/setup',
  )
  return assertApiSuccess(response, '生成 2FA 二维码失败')
}

export async function enableOwn2fa(totpCode: string) {
  const response = await http.post<ApiResponse<CurrentUserSecurityState>, ApiResponse<CurrentUserSecurityState>>(
    '/account/security/2fa/enable',
    { totpCode },
  )
  return assertApiSuccess(response, '启用 2FA 失败')
}

export async function disableOwn2fa(totpCode: string) {
  const response = await http.post<ApiResponse<CurrentUserSecurityState>, ApiResponse<CurrentUserSecurityState>>(
    '/account/security/2fa/disable',
    null,
    buildTotpHeaders(totpCode),
  )
  return assertApiSuccess(response, '关闭 2FA 失败')
}
