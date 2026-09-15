import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPutNoContentMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutNoContentMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPutNoContent: apiPutNoContentMock,
}))

import { getUserRoles, updateUserRoles } from './user-roles'

describe('user-roles api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getUserRoles 读取角色 id 字符串数组', async () => {
    apiGetMock.mockResolvedValue(['1', '1844674407370955161'])

    const result = await getUserRoles('7')

    expect(apiGetMock.mock.calls[0][0]).toBe('/users/7/roles')
    expect(result).toEqual(['1', '1844674407370955161'])
  })

  it('getUserRoles 透传 AbortSignal', async () => {
    apiGetMock.mockResolvedValue([])
    const controller = new AbortController()

    await getUserRoles('7', controller.signal)

    expect(apiGetMock.mock.calls[0][2]).toMatchObject({
      signal: controller.signal,
    })
  })

  it('updateUserRoles 校验 roleIds 为十进制字符串并整体替换', async () => {
    apiPutNoContentMock.mockResolvedValue(undefined)

    await updateUserRoles('7', ['1', '2'])

    expect(apiPutNoContentMock.mock.calls[0][0]).toBe('/users/7/roles')
    expect(apiPutNoContentMock.mock.calls[0][1]).toEqual({
      roleIds: ['1', '2'],
    })
  })

  it('updateUserRoles 拒绝非数字字符串', () => {
    expect(() => updateUserRoles('7', ['abc'])).toThrow()
    expect(apiPutNoContentMock).not.toHaveBeenCalled()
  })
})
