import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

import { getDashboardSummary } from './dashboard'

describe('dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('getDashboardSummary', () => {
    it('fetches dashboard summary', async () => {
      const mockData = {
        code: 0,
        data: {
          appName: 'Aries',
          companyName: '测试公司',
          userName: 'Admin',
          loginName: 'admin',
          roleName: '超级管理员',
          visibleMenuCount: 10,
          moduleCount: 5,
          actionCount: 20,
          activeSessionCount: 1,
          totpEnabled: false,
          lastLoginAt: '2024-01-01',
          serverTime: '2024-01-02',
          materialCount: 100,
          supplierCount: 50,
          customerCount: 30,
        },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await getDashboardSummary()

      expect(httpGetMock).toHaveBeenCalledWith('/dashboard/summary')
      expect(result).toEqual(mockData.data)
    })

    it('throws on API failure', async () => {
      assertApiSuccessMock.mockImplementation(() => {
        throw new Error('加载工作台摘要失败')
      })
      httpGetMock.mockResolvedValue({ code: -1, message: 'error' })

      await expect(getDashboardSummary()).rejects.toThrow('加载工作台摘要失败')
    })
  })
})
