import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { TotpSetupResponse } from '@/types/auth'
import { getApiMessage } from '@/utils/api-messages'

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
  forbidDisable2fa?: boolean
}

function buildTotpHeaders(totpCode: string): {
  headers: { 'X-TOTP-Code': string }
} {
  return {
    headers: {
      'X-TOTP-Code': totpCode.trim(),
    },
  }
}

export async function changeOwnPassword(
  payload: ChangeOwnPasswordPayload,
): Promise<ApiResponse<null>> {
  const response = await http.post<ApiResponse<null>>(
    ENDPOINTS.ACCOUNT_PASSWORD,
    payload,
  )
  return assertApiSuccess(response, getApiMessage('changePasswordFailed'))
}

export async function setupOwn2fa(): Promise<ApiResponse<TotpSetupResponse>> {
  const response = await http.post<ApiResponse<TotpSetupResponse>>(
    ENDPOINTS.ACCOUNT_2FA_SETUP,
  )
  return assertApiSuccess(response, getApiMessage('generate2faQrCodeFailed'))
}

export async function enableOwn2fa(
  totpCode: string,
): Promise<ApiResponse<CurrentUserSecurityState>> {
  const response = await http.post<ApiResponse<CurrentUserSecurityState>>(
    ENDPOINTS.ACCOUNT_2FA_ENABLE,
    { totpCode },
  )
  return assertApiSuccess(response, getApiMessage('enable2faFailed'))
}

export async function disableOwn2fa(
  totpCode: string,
): Promise<ApiResponse<CurrentUserSecurityState>> {
  const response = await http.post<ApiResponse<CurrentUserSecurityState>>(
    ENDPOINTS.ACCOUNT_2FA_DISABLE,
    null,
    buildTotpHeaders(totpCode),
  )
  return assertApiSuccess(response, getApiMessage('disable2faFailed'))
}

export async function fetchAccountSecurityStatus(): Promise<
  ApiResponse<CurrentUserSecurityState>
> {
  const response = await http.get<ApiResponse<CurrentUserSecurityState>>(
    ENDPOINTS.ACCOUNT_SECURITY_STATUS,
  )
  return assertApiSuccess(response, getApiMessage('loadSecurityStatusFailed'))
}
