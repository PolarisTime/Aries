import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const getApiMessageMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: <T extends { code?: number }>(response: T, fallback?: string) => {
    if (Number(response?.code) !== 0) {
      throw new Error(fallback || '请求失败')
    }
    return response
  },
  http: {
    get: httpGetMock,
    put: httpPutMock,
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: getApiMessageMock,
}))

import { getUserColumnSettings, saveUserColumnSettings } from './user-preferences'

describe('user-preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getApiMessageMock.mockReturnValue('操作失败')
  })

  describe('getUserColumnSettings', () => {
    it('returns data on success', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { orderedKeys: ['id', 'name'], hiddenKeys: [] },
      })

      const result = await getUserColumnSettings()

      expect(result).toEqual({
        orderedKeys: ['id', 'name'],
        hiddenKeys: [],
      })
    })

    it('throws on failure', async () => {
      httpGetMock.mockResolvedValue({ code: 4000 })
      getApiMessageMock.mockReturnValue('加载栏目设置失败')

      await expect(getUserColumnSettings()).rejects.toThrow('加载栏目设置失败')
    })
  })

  describe('saveUserColumnSettings', () => {
    it('saves and returns data on success', async () => {
      const payload = { orderedKeys: ['id'], hiddenKeys: ['name'] }
      httpPutMock.mockResolvedValue({
        code: 0,
        data: payload,
      })

      const result = await saveUserColumnSettings(payload)

      expect(result).toEqual(payload)
      expect(httpPutMock).toHaveBeenCalledWith(
        '/user-accounts/preference',
        payload,
      )
    })

    it('throws on save failure', async () => {
      httpPutMock.mockResolvedValue({ code: 4000 })
      getApiMessageMock.mockReturnValue('保存栏目设置失败')

      await expect(
        saveUserColumnSettings({ orderedKeys: [], hiddenKeys: [] }),
      ).rejects.toThrow('保存栏目设置失败')
    })
  })
})
