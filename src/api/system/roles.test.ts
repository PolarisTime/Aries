import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  apiDeleteNoContentMock,
  apiGetMock,
  apiPatchMock,
  apiPostMock,
  apiPutMock,
  apiPutNoContentMock,
} = vi.hoisted(() => ({
  apiDeleteNoContentMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPutNoContentMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiDeleteNoContent: apiDeleteNoContentMock,
  apiGet: apiGetMock,
  apiPatch: apiPatchMock,
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  apiPutNoContent: apiPutNoContentMock,
}))

import {
  createRole,
  deleteRole,
  getRole,
  listRoles,
  updateRole,
  updateRolePermissions,
  updateRoleStatus,
} from './roles'

const role = {
  id: '1844674407370955161',
  code: 'admin',
  name: '管理员',
  description: '系统管理员',
  builtin: true,
  status: '正常',
  permissionCount: 12,
  userCount: 1,
}

function rolePage() {
  return {
    content: [role],
    totalElements: 1,
    totalPages: 1,
    currentPage: 0,
    pageSize: 20,
    hasMore: false,
  }
}

describe('roles api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listRoles 传递分页、keyword 与 status，并解析响应', async () => {
    apiGetMock.mockResolvedValue(rolePage())

    const result = await listRoles({
      keyword: '管理',
      status: '正常',
      page: 1,
      size: 20,
    })

    expect(apiGetMock.mock.calls[0][0]).toBe('/roles')
    expect(apiGetMock.mock.calls[0][2]).toMatchObject({
      params: { page: 1, size: 20, keyword: '管理', status: '正常' },
    })
    expect(result.content[0]).toMatchObject({
      id: '1844674407370955161',
      code: 'admin',
      builtin: true,
    })
  })

  it('listRoles 将空 keyword/status 归一化为 undefined', async () => {
    apiGetMock.mockResolvedValue(rolePage())

    await listRoles({ keyword: '', status: '', page: 0, size: 20 })

    expect(apiGetMock.mock.calls[0][2]).toMatchObject({
      params: { page: 0, size: 20, keyword: undefined, status: undefined },
    })
  })

  it('getRole 解析详情与权限码数组', async () => {
    apiGetMock.mockResolvedValue({
      ...role,
      permissions: ['sales-orders:read', 'sales-orders:audit'],
    })

    const result = await getRole('1844674407370955161')

    expect(apiGetMock.mock.calls[0][0]).toBe('/roles/1844674407370955161')
    expect(result.permissions).toEqual([
      'sales-orders:read',
      'sales-orders:audit',
    ])
  })

  it('createRole 校验并提交 code/name/description', async () => {
    apiPostMock.mockResolvedValue({ ...role, builtin: false })

    await createRole({ code: 'sales', name: '销售', description: '销售角色' })

    expect(apiPostMock.mock.calls[0][0]).toBe('/roles')
    expect(apiPostMock.mock.calls[0][2]).toEqual({
      code: 'sales',
      name: '销售',
      description: '销售角色',
    })
  })

  it('createRole 拒绝空名称', () => {
    expect(() => createRole({ code: 'sales', name: '' })).toThrow()
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('updateRole 提交 PUT /roles/{id}', async () => {
    apiPutMock.mockResolvedValue({ ...role, builtin: false })

    await updateRole('9', { code: 'sales', name: '销售' })

    expect(apiPutMock.mock.calls[0][0]).toBe('/roles/9')
    expect(apiPutMock.mock.calls[0][2]).toEqual({ code: 'sales', name: '销售' })
  })

  it('updateRoleStatus 以 PATCH 提交状态', async () => {
    apiPatchMock.mockResolvedValue({ ...role, status: '禁用' })

    await updateRoleStatus('9', '禁用')

    expect(apiPatchMock.mock.calls[0][0]).toBe('/roles/9/status')
    expect(apiPatchMock.mock.calls[0][2]).toEqual({ status: '禁用' })
  })

  it('updateRoleStatus 拒绝非法状态', () => {
    expect(() => updateRoleStatus('9', '未知')).toThrow()
    expect(apiPatchMock).not.toHaveBeenCalled()
  })

  it('deleteRole 使用 DELETE 且无响应体', async () => {
    apiDeleteNoContentMock.mockResolvedValue(undefined)

    await deleteRole('9')

    expect(apiDeleteNoContentMock.mock.calls[0][0]).toBe('/roles/9')
  })

  it('updateRolePermissions 整体替换权限码', async () => {
    apiPutNoContentMock.mockResolvedValue(undefined)

    await updateRolePermissions('9', ['materials:read'])

    expect(apiPutNoContentMock.mock.calls[0][0]).toBe('/roles/9/permissions')
    expect(apiPutNoContentMock.mock.calls[0][1]).toEqual({
      permissions: ['materials:read'],
    })
  })
})
