import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock, post: httpPostMock, put: httpPutMock },
}))

vi.mock('@/api/page-contract', () => ({
  pageContent: vi.fn((data: { content?: unknown[] }) => data.content || []),
}))

vi.mock('@/api/system-menus', () => ({
  MenuNode: {},
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    ROLE_PERMISSION_OPTIONS: '/roles/permission-options',
    ROLE_SETTINGS: '/roles',
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import {
  createRole,
  getRoleActions,
  listRoleSettingsPage,
  listSystemMenus,
  updateRole,
  updateRoleActions,
} from './role-actions'

describe('role-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('listSystemMenus', () => {
    it('fetches permission menu options', async () => {
      const mockData = {
        code: 0,
        data: [{ menuCode: 'dashboard', menuName: '工作台', children: [] }],
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listSystemMenus()

      expect(httpGetMock).toHaveBeenCalledWith('/roles/permission-options')
      expect(result).toEqual([
        { menuCode: 'dashboard', menuName: '工作台', children: [] },
      ])
    })

    it('returns empty array when data is null', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })

      const result = await listSystemMenus()

      expect(result).toEqual([])
    })
  })

  describe('listRoleSettingsPage', () => {
    it('fetches paginated roles', async () => {
      const mockData = {
        code: 0,
        data: {
          content: [{ id: '1', roleCode: 'admin', roleName: '管理员' }],
          totalPages: 1,
        },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listRoleSettingsPage(0, 10)

      expect(httpGetMock).toHaveBeenCalledWith('/roles', {
        params: { page: 0, size: 10 },
      })
      expect(result.records).toEqual([
        { id: '1', roleCode: 'admin', roleName: '管理员' },
      ])
    })
  })

  describe('getRoleActions', () => {
    it('fetches role permissions by id', async () => {
      const mockData = {
        code: 0,
        data: [{ resource: 'material', action: 'read' }],
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await getRoleActions('1')

      expect(httpGetMock).toHaveBeenCalledWith('/roles/1/permission')
      expect(result).toEqual([{ resource: 'material', action: 'read' }])
    })
  })

  describe('updateRoleActions', () => {
    it('updates role permissions', async () => {
      httpPutMock.mockResolvedValue({ code: 0, data: null })

      const actions = [{ resource: 'material', action: 'write' }]
      await updateRoleActions('1', actions)

      expect(httpPutMock).toHaveBeenCalledWith('/roles/1/permission', actions)
    })
  })

  describe('updateRole', () => {
    it('updates role info', async () => {
      httpPutMock.mockResolvedValue({ code: 0, data: null })

      await updateRole('1', { roleName: '新角色' })

      expect(httpPutMock).toHaveBeenCalledWith('/roles/1', {
        roleName: '新角色',
      })
    })
  })

  describe('createRole', () => {
    it('creates new role', async () => {
      const mockResponse = {
        code: 0,
        data: { id: '2', roleCode: 'new', roleName: '新角色' },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await createRole({ roleCode: 'new', roleName: '新角色' })

      expect(httpPostMock).toHaveBeenCalledWith('/roles', {
        roleCode: 'new',
        roleName: '新角色',
      })
      expect(result).toEqual(mockResponse)
    })
  })
})
