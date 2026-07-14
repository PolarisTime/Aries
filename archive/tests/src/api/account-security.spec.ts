import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpPostMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { post: httpPostMock },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import {
  changeOwnPassword,
  enableOwn2fa,
  setupOwn2fa,
} from './account-security'

describe('account-security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('changeOwnPassword', () => {
    it('sends POST with password payload', async () => {
      const mockResponse = { code: 0, data: null }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await changeOwnPassword({
        currentPassword: 'old',
        newPassword: 'new',
      })

      expect(httpPostMock).toHaveBeenCalledWith('/account/security/password', {
        currentPassword: 'old',
        newPassword: 'new',
      })
      expect(result).toEqual(mockResponse)
    })

    it('throws on API failure', async () => {
      assertApiSuccessMock.mockImplementation(() => {
        throw new Error('changePasswordFailed')
      })
      httpPostMock.mockResolvedValue({ code: -1 })

      await expect(
        changeOwnPassword({ currentPassword: 'old', newPassword: 'new' }),
      ).rejects.toThrow('changePasswordFailed')
    })
  })

  describe('setupOwn2fa', () => {
    it('sends POST to setup endpoint', async () => {
      const mockResponse = { code: 0, data: { qrCodeUrl: 'otpauth://...' } }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await setupOwn2fa()

      expect(httpPostMock).toHaveBeenCalledWith('/account/security/2fa/setup')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('enableOwn2fa', () => {
    it('sends POST with TOTP code', async () => {
      const mockResponse = {
        code: 0,
        data: { id: 1, loginName: 'admin', totpEnabled: true },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await enableOwn2fa('123456')

      expect(httpPostMock).toHaveBeenCalledWith(
        '/account/security/2fa/enable',
        {
          totpCode: '123456',
        },
      )
      expect(result).toEqual(mockResponse)
    })
  })
})
