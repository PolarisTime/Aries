import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    SYSTEM_MENUS_TREE: '/system-menus/tree',
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import { listSystemMenus } from './system-menus'

describe('system-menus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('listSystemMenus', () => {
    it('fetches and normalizes menu tree', async () => {
      const rawMenus = [
        {
          menuCode: 'dashboard',
          menuName: '工作台',
          parentCode: null,
          routePath: '/dashboard',
          icon: 'home',
          sortOrder: 1,
          menuType: 'MENU',
          resourceCode: null,
          actions: ['view'],
          children: [
            {
              menuCode: 'dashboard-summary',
              menuName: '摘要',
              parentCode: 'dashboard',
              routePath: '/dashboard/summary',
              icon: null,
              sortOrder: 1,
              menuType: 'MENU',
              resourceCode: null,
              actions: [],
              children: [],
            },
          ],
        },
      ]
      httpGetMock.mockResolvedValue({ code: 0, data: rawMenus })

      const result = await listSystemMenus()

      expect(httpGetMock).toHaveBeenCalledWith('/system-menus/tree')
      expect(result).toHaveLength(1)
      expect(result[0].menuCode).toBe('dashboard')
      expect(result[0].menuName).toBe('工作台')
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].parentCode).toBe('dashboard')
    })

    it('normalizes raw fields (code/title)', async () => {
      const rawMenus = [
        {
          code: 'sys',
          title: '系统管理',
          parentId: null,
          path: '/system',
        },
      ]
      httpGetMock.mockResolvedValue({ code: 0, data: rawMenus })

      const result = await listSystemMenus()

      expect(result[0].menuCode).toBe('sys')
      expect(result[0].menuName).toBe('系统管理')
      expect(result[0].parentCode).toBeNull()
      expect(result[0].routePath).toBe('/system')
    })

    it('returns empty array when data is null', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })

      const result = await listSystemMenus()

      expect(result).toEqual([])
    })

    it('returns empty array when data is not array', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: 'invalid' })

      const result = await listSystemMenus()

      expect(result).toEqual([])
    })

    it('defaults missing fields', async () => {
      const rawMenus = [{}]
      httpGetMock.mockResolvedValue({ code: 0, data: rawMenus })

      const result = await listSystemMenus()

      expect(result[0].menuCode).toBe('')
      expect(result[0].menuType).toBe('MENU')
      expect(result[0].sortOrder).toBe(0)
      expect(result[0].actions).toEqual([])
      expect(result[0].children).toEqual([])
      expect(result[0].icon).toBeNull()
      expect(result[0].resourceCode).toBeNull()
    })
  })
})
