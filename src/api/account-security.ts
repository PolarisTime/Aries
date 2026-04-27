import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { TotpSetupResponse } from '@/types/auth'

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
  const response = await http.post<ApiResponse<null>>(ENDPOINTS.ACCOUNT_PASSWORD, payload)
  return assertApiSuccess(response, '修改密码失败')
}

export async function setupOwn2fa() {
  const response = await http.post<ApiResponse<TotpSetupResponse>>(ENDPOINTS.ACCOUNT_2FA_SETUP)
  return assertApiSuccess(response, '生成 2FA 二维码失败')
}

export async function enableOwn2fa(totpCode: string) {
  const response = await http.post<ApiResponse<CurrentUserSecurityState>>(ENDPOINTS.ACCOUNT_2FA_ENABLE, { totpCode })
  return assertApiSuccess(response, '启用 2FA 失败')
}

export async function disableOwn2fa(totpCode: string) {
  const response = await http.post<ApiResponse<CurrentUserSecurityState>>(
    ENDPOINTS.ACCOUNT_2FA_DISABLE,
    null,
    buildTotpHeaders(totpCode),
  )
  return assertApiSuccess(response, '关闭 2FA 失败')
}
