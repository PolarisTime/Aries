import { assertApiSuccess, http } from '@/api/client'

export interface SecurityKeyItem {
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

function buildTotpHeaders(totpCode: string) {
  return {
    headers: {
      'X-TOTP-Code': totpCode.trim(),
    },
  }
}

export async function getSecurityKeyOverview() {
  const response = await http.get('/system/security-keys') as unknown as {
    code: number
    message?: string
    data: SecurityKeyOverview
  }
  return assertApiSuccess(response, '加载安全密钥状态失败')
}

export async function rotateJwtSecurityKey(totpCode: string) {
  const response = await http.post('/system/security-keys/jwt/rotate', null, buildTotpHeaders(totpCode)) as unknown as {
    code: number
    message?: string
    data: SecurityKeyRotateResult
  }
  return assertApiSuccess(response, 'JWT 主密钥轮转失败')
}

export async function rotateTotpSecurityKey(totpCode: string) {
  const response = await http.post('/system/security-keys/totp/rotate', null, buildTotpHeaders(totpCode)) as unknown as {
    code: number
    message?: string
    data: SecurityKeyRotateResult
  }
  return assertApiSuccess(response, '2FA 主密钥轮转失败')
}
