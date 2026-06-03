import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock, post: httpPostMock },
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    SECURITY_KEYS: '/security-keys',
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import {
  getSecurityKeyOverview,
  rotateJwtSecurityKey,
  rotateTotpSecurityKey,
} from './security-keys'

describe('security-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('getSecurityKeyOverview', () => {
    it('fetches security key overview', async () => {
      const mockResponse = {
        code: 0,
        data: {
          jwt: {
            keyCode: 'jwt',
            keyName: 'JWT签名密钥',
            source: 'generated',
            activeVersion: 1,
            activeFingerprint: 'abc123',
            activatedAt: '2024-01-01',
            retiredVersionCount: 0,
            protectedRecordCount: 100,
            remark: '',
          },
          totp: {
            keyCode: 'totp',
            keyName: 'TOTP密钥',
            source: 'generated',
            activeVersion: 1,
            activeFingerprint: 'def456',
            activatedAt: '2024-01-01',
            retiredVersionCount: 0,
            protectedRecordCount: 50,
            remark: '',
          },
        },
      }
      httpGetMock.mockResolvedValue(mockResponse)

      const result = await getSecurityKeyOverview()

      expect(httpGetMock).toHaveBeenCalledWith('/security-keys')
      expect(result.data.jwt.keyCode).toBe('jwt')
      expect(result.data.totp.keyCode).toBe('totp')
    })
  })

  describe('rotateJwtSecurityKey', () => {
    it('rotates JWT key with TOTP code', async () => {
      const mockResponse = {
        code: 0,
        data: {
          keyCode: 'jwt',
          source: 'generated',
          activeVersion: 2,
          activeFingerprint: 'new-fingerprint',
          rotatedAt: '2024-01-02',
          processedRecordCount: 100,
          retiredVersionCount: 1,
          remark: '',
        },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await rotateJwtSecurityKey('123456')

      expect(httpPostMock).toHaveBeenCalledWith(
        '/security-keys/jwt/rotate',
        null,
        { headers: { 'X-TOTP-Code': '123456' } },
      )
      expect(result.data.activeVersion).toBe(2)
    })

    it('trims TOTP code', async () => {
      httpPostMock.mockResolvedValue({ code: 0, data: {} })

      await rotateJwtSecurityKey('  123456  ')

      expect(httpPostMock).toHaveBeenCalledWith(
        '/security-keys/jwt/rotate',
        null,
        { headers: { 'X-TOTP-Code': '123456' } },
      )
    })
  })

  describe('rotateTotpSecurityKey', () => {
    it('rotates TOTP key with TOTP code', async () => {
      const mockResponse = {
        code: 0,
        data: {
          keyCode: 'totp',
          source: 'generated',
          activeVersion: 2,
          activeFingerprint: 'new-totp-fp',
          rotatedAt: '2024-01-02',
          processedRecordCount: 50,
          retiredVersionCount: 1,
          remark: '',
        },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await rotateTotpSecurityKey('654321')

      expect(httpPostMock).toHaveBeenCalledWith(
        '/security-keys/totp/rotate',
        null,
        { headers: { 'X-TOTP-Code': '654321' } },
      )
      expect(result.data.keyCode).toBe('totp')
    })
  })
})
