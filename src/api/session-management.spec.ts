import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock, post: httpPostMock },
}))

vi.mock('@/api/page-contract', () => ({
  pageContent: vi.fn((data: { content?: unknown[] }) => data.content || []),
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    REFRESH_TOKENS: '/refresh-tokens',
    REFRESH_TOKENS_SUMMARY: '/refresh-tokens/summary',
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import {
  listRefreshTokens,
  getRefreshTokenSummary,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from './session-management'

describe('session-management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('listRefreshTokens', () => {
    it('fetches paginated refresh tokens', async () => {
      const mockData = {
        code: 0,
        data: {
          content: [
            {
              id: '1',
              userId: 'user-1',
              loginName: 'admin',
              userName: 'Admin',
              tokenId: 'token-1',
              loginIp: '127.0.0.1',
              deviceInfo: 'Chrome',
              createdAt: '2024-01-01',
              expiresAt: '2024-02-01',
              revokedAt: null,
              status: 'active',
              lastActiveAt: '2024-01-02',
              online: true,
            },
          ],
          totalElements: 1,
          totalPages: 1,
        },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listRefreshTokens({ page: 0, size: 10 })

      expect(httpGetMock).toHaveBeenCalledWith('/refresh-tokens', {
        params: { page: 0, size: 10 },
      })
      expect(result.records).toHaveLength(1)
      expect(result.totalElements).toBe(1)
    })

    it('passes keyword filter', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: { content: [], totalElements: 0, totalPages: 0 } })

      await listRefreshTokens({ page: 0, size: 10, keyword: 'admin' })

      expect(httpGetMock).toHaveBeenCalledWith('/refresh-tokens', {
        params: { page: 0, size: 10, keyword: 'admin' },
      })
    })
  })

  describe('getRefreshTokenSummary', () => {
    it('fetches session summary', async () => {
      const mockData = {
        code: 0,
        data: {
          onlineUsers: 5,
          onlineSessions: 8,
          activeSessions: 10,
        },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await getRefreshTokenSummary()

      expect(httpGetMock).toHaveBeenCalledWith('/refresh-tokens/summary')
      expect(result.onlineUsers).toBe(5)
      expect(result.onlineSessions).toBe(8)
    })
  })

  describe('revokeRefreshToken', () => {
    it('revokes a specific token', async () => {
      httpPostMock.mockResolvedValue({ code: 0, data: null })

      await revokeRefreshToken('token-1')

      expect(httpPostMock).toHaveBeenCalledWith('/refresh-tokens/token-1/revoke')
    })
  })

  describe('revokeAllRefreshTokens', () => {
    it('revokes all tokens', async () => {
      httpPostMock.mockResolvedValue({ code: 0, data: null })

      await revokeAllRefreshTokens()

      expect(httpPostMock).toHaveBeenCalledWith('/refresh-tokens/revoke-all')
    })
  })
})
