import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { getApiMessage } from '@/utils/api-messages'

interface SecurityKeyItem {
  keyCode: string
  keyName: string
  source: string
  activeVersion: number
  activeFingerprint: string
  activatedAt: string | null
  retiredVersionCount: number
  protectedRecordCount: number
  remark: string
}
export interface SecurityKeyOverview {
  jwt: SecurityKeyItem
  totp: SecurityKeyItem
}
export interface SecurityKeyRotateResult {
  keyCode: string
  source: string
  activeVersion: number
  activeFingerprint: string
  rotatedAt: string
  processedRecordCount: number
  retiredVersionCount: number
  remark: string
}

export interface SecurityKeyResponse<T> {
  code: number
  message?: string
  data: T
}

function buildTotpHeaders(totpCode: string): {
  headers: { 'X-TOTP-Code': string }
} {
  return { headers: { 'X-TOTP-Code': totpCode.trim() } }
}

export async function getSecurityKeyOverview(): Promise<
  SecurityKeyResponse<SecurityKeyOverview>
> {
  const response = await http.get<SecurityKeyResponse<SecurityKeyOverview>>(
    ENDPOINTS.SECURITY_KEYS,
  )
  return assertApiSuccess(
    response,
    getApiMessage('loadSecurityKeyStatusFailed'),
  )
}

export async function rotateJwtSecurityKey(
  totpCode: string,
): Promise<SecurityKeyResponse<SecurityKeyRotateResult>> {
  const response = await http.post<
    SecurityKeyResponse<SecurityKeyRotateResult>
  >(`${ENDPOINTS.SECURITY_KEYS}/jwt/rotate`, null, buildTotpHeaders(totpCode))
  return assertApiSuccess(response, getApiMessage('jwtKeyRotationFailed'))
}

export async function rotateTotpSecurityKey(
  totpCode: string,
): Promise<SecurityKeyResponse<SecurityKeyRotateResult>> {
  const response = await http.post<
    SecurityKeyResponse<SecurityKeyRotateResult>
  >(`${ENDPOINTS.SECURITY_KEYS}/totp/rotate`, null, buildTotpHeaders(totpCode))
  return assertApiSuccess(response, getApiMessage('twoFactorKeyRotationFailed'))
}
