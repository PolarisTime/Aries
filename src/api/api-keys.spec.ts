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
    API_KEYS: '/api-keys',
    API_KEYS_USER_OPTIONS: '/api-keys/user-options',
    API_KEYS_RESOURCE_OPTIONS: '/api-keys/resource-options',
    API_KEYS_ACTION_OPTIONS: '/api-keys/action-options',
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import {
  buildApiKeyUrl,
  createApiKey,
  getApiKeyDetail,
  listApiKeyActionOptions,
  listApiKeyResourceOptions,
  listApiKeys,
  listApiKeyUserOptions,
  revokeApiKey,
} from './api-keys'

describe('api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('listApiKeys', () => {
    it('fetches paginated API keys', async () => {
      const mockData = {
        code: 0,
        data: {
          content: [{ id: '1', keyName: 'test-key' }],
          totalElements: 1,
          totalPages: 1,
        },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listApiKeys({ page: 0, size: 10 })

      expect(httpGetMock).toHaveBeenCalledWith('/api-keys', {
        params: { page: 0, size: 10 },
      })
      expect(result.records).toEqual([{ id: '1', keyName: 'test-key' }])
    })
  })

  describe('listApiKeyUserOptions', () => {
    it('fetches user options with keyword', async () => {
      const mockData = {
        code: 0,
        data: [{ id: 1, loginName: 'admin', userName: 'Admin', mobile: '123' }],
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listApiKeyUserOptions('admin')

      expect(httpGetMock).toHaveBeenCalledWith('/api-keys/user-options', {
        params: { keyword: 'admin' },
      })
      expect(result[0].id).toBe('1')
      expect(result[0].loginName).toBe('admin')
    })

    it('handles empty keyword', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [] })

      await listApiKeyUserOptions()

      expect(httpGetMock).toHaveBeenCalledWith('/api-keys/user-options', {
        params: { keyword: undefined },
      })
    })
  })

  describe('listApiKeyResourceOptions', () => {
    it('fetches resource options', async () => {
      const mockData = {
        code: 0,
        data: [{ code: 'material', title: '物料', group: '主数据' }],
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listApiKeyResourceOptions()

      expect(result).toEqual([
        { code: 'material', title: '物料', group: '主数据' },
      ])
    })
  })

  describe('listApiKeyActionOptions', () => {
    it('fetches action options', async () => {
      const mockData = {
        code: 0,
        data: [{ code: 'read', title: '读取' }],
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listApiKeyActionOptions()

      expect(result).toEqual([{ code: 'read', title: '读取' }])
    })
  })

  describe('createApiKey', () => {
    it('creates API key with TOTP code', async () => {
      const mockResponse = {
        code: 0,
        data: { id: '1', rawKey: 'sk-abc123' },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const payload = {
        keyName: 'my-key',
        usageScope: 'internal',
        allowedResources: ['material'],
        allowedActions: ['read'],
        expireDays: 90,
      }
      await createApiKey('user-1', payload, '123456')

      expect(httpPostMock).toHaveBeenCalledWith('/api-keys', payload, {
        params: { userId: 'user-1' },
        headers: { 'X-TOTP-Code': '123456' },
      })
    })
  })

  describe('revokeApiKey', () => {
    it('revokes API key by id', async () => {
      httpPostMock.mockResolvedValue({ code: 0, data: null })

      await revokeApiKey('key-1')

      expect(httpPostMock).toHaveBeenCalledWith('/api-keys/key-1/revoke')
    })
  })

  describe('getApiKeyDetail', () => {
    it('fetches detail by id', async () => {
      const mockData = {
        code: 0,
        data: { id: '1', keyName: 'test-key', status: 'active' },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await getApiKeyDetail('1')

      expect(httpGetMock).toHaveBeenCalledWith('/api-keys/1')
      expect(result).toEqual({ id: '1', keyName: 'test-key', status: 'active' })
    })

    it('throws when data is null', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })

      await expect(getApiKeyDetail('1')).rejects.toThrow(
        'loadApiKeyDetailFailed',
      )
    })
  })

  describe('buildApiKeyUrl', () => {
    it('returns base url when id is undefined', () => {
      expect(buildApiKeyUrl()).toBe('/api-keys')
    })

    it('returns url with id when id is provided', () => {
      expect(buildApiKeyUrl('abc')).toBe('/api-keys/abc')
    })
  })

  describe('listApiKeyUserOptions normalization', () => {
    it('returns empty array when data is null', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })

      const result = await listApiKeyUserOptions()
      expect(result).toEqual([])
    })

    it('normalizes mobile null to null', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: [{ id: 1, loginName: 'u', userName: 'U', mobile: null }],
      })

      const result = await listApiKeyUserOptions()
      expect(result[0].mobile).toBeNull()
    })

    it('normalizes empty id to empty string', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: [{ id: null, loginName: null, userName: null, mobile: '123' }],
      })

      const result = await listApiKeyUserOptions()
      expect(result[0].id).toBe('')
      expect(result[0].loginName).toBe('')
      expect(result[0].userName).toBe('')
    })

    it('trims keyword', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [] })

      await listApiKeyUserOptions('  test  ')
      expect(httpGetMock).toHaveBeenCalledWith('/api-keys/user-options', {
        params: { keyword: 'test' },
      })
    })
  })

  describe('listApiKeyResourceOptions fallback', () => {
    it('returns empty array when data is null', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })

      const result = await listApiKeyResourceOptions()
      expect(result).toEqual([])
    })
  })

  describe('listApiKeyActionOptions fallback', () => {
    it('returns empty array when data is null', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })

      const result = await listApiKeyActionOptions()
      expect(result).toEqual([])
    })
  })
})
