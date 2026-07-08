import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock, post: httpPostMock },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import {
  getInitialSetupStatus,
  setupInitialAdmin2fa,
  submitInitialAdmin,
  submitInitialCompany,
} from './setup'

describe('setup API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('getInitialSetupStatus', () => {
    it('calls GET /setup/status', async () => {
      const mockResponse = { code: 0, data: { initialized: false } }
      httpGetMock.mockResolvedValue(mockResponse)

      const result = await getInitialSetupStatus()

      expect(httpGetMock).toHaveBeenCalledWith('/setup/status')
      expect(assertApiSuccessMock).toHaveBeenCalledWith(
        mockResponse,
        'getInitStatusFailed',
      )
      expect(result).toEqual(mockResponse)
    })

    it('throws when assertApiSuccess fails', async () => {
      const mockResponse = { code: 5000, message: 'error' }
      httpGetMock.mockResolvedValue(mockResponse)
      assertApiSuccessMock.mockImplementation(() => {
        throw new Error('getInitStatusFailed')
      })

      await expect(getInitialSetupStatus()).rejects.toThrow(
        'getInitStatusFailed',
      )
    })
  })

  describe('setupInitialAdmin2fa', () => {
    it('calls POST /setup/admin/2fa/setup with payload', async () => {
      const payload = { loginName: 'admin' }
      const mockResponse = {
        code: 0,
        data: { secret: 'abc', otpauthUrl: 'otp://xxx' },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await setupInitialAdmin2fa(payload)

      expect(httpPostMock).toHaveBeenCalledWith(
        '/setup/admin/2fa/setup',
        payload,
      )
      expect(assertApiSuccessMock).toHaveBeenCalledWith(
        mockResponse,
        'generateAdmin2faFailed',
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('submitInitialAdmin', () => {
    it('calls POST /setup/admin with payload', async () => {
      const payload = {
        admin: { loginName: 'admin', password: 'pass123' },
        totpSecret: 'secret',
        totpCode: '123456',
      }
      const mockResponse = {
        code: 0,
        data: { adminLoginName: 'admin', companyName: '' },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await submitInitialAdmin(payload)

      expect(httpPostMock).toHaveBeenCalledWith('/setup/admin', payload)
      expect(assertApiSuccessMock).toHaveBeenCalledWith(
        mockResponse,
        'adminAccountInitFailed',
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('submitInitialCompany', () => {
    it('calls POST /setup/company with payload', async () => {
      const payload = { name: 'Test Company' }
      const mockResponse = {
        code: 0,
        data: { adminLoginName: 'admin', companyName: 'Test Company' },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await submitInitialCompany(payload)

      expect(httpPostMock).toHaveBeenCalledWith('/setup/company', payload)
      expect(assertApiSuccessMock).toHaveBeenCalledWith(
        mockResponse,
        'companyInitFailed',
      )
      expect(result).toEqual(mockResponse)
    })
  })
})
