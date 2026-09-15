import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  apiDeleteNoContentMock,
  apiGetMock,
  apiPatchMock,
  apiPostMock,
  apiPostNoContentMock,
  apiPutMock,
} = vi.hoisted(() => ({
  apiDeleteNoContentMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPostNoContentMock: vi.fn(),
  apiPutMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiDeleteNoContent: apiDeleteNoContentMock,
  apiGet: apiGetMock,
  apiPatch: apiPatchMock,
  apiPost: apiPostMock,
  apiPostNoContent: apiPostNoContentMock,
  apiPut: apiPutMock,
}))

import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from './users'

const user = {
  id: '332601640831950848',
  loginName: 'temp_user',
  userName: '临时用户',
  mobile: '13800138000',
  status: 'NORMAL',
  lastLoginDate: null,
  remark: null,
}

function userPage() {
  return {
    content: [user],
    totalElements: '1',
    totalPages: 1,
    currentPage: 0,
    pageSize: 20,
    hasMore: false,
  }
}

describe('users api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listUsers 传递分页与筛选参数', async () => {
    apiGetMock.mockResolvedValue(userPage())

    const result = await listUsers({
      keyword: 'temp',
      status: 'NORMAL',
      page: 0,
      size: 20,
    })

    expect(apiGetMock.mock.calls[0][0]).toBe('/users')
    expect(apiGetMock.mock.calls[0][1]).toBeDefined()
    expect(apiGetMock.mock.calls[0][2]).toMatchObject({
      params: { page: 0, size: 20, keyword: 'temp', status: 'NORMAL' },
    })
    expect(result.content).toHaveLength(1)
  })

  it('listUsers 空筛选不追加 keyword/status', async () => {
    apiGetMock.mockResolvedValue(userPage())

    await listUsers({ page: 0, size: 20 })

    expect(apiGetMock.mock.calls[0][2].params).toEqual({
      page: 0,
      size: 20,
      keyword: undefined,
      status: undefined,
    })
  })

  it('listUsers 透传 AbortSignal', async () => {
    apiGetMock.mockResolvedValue(userPage())
    const controller = new AbortController()

    await listUsers({ page: 0, size: 20 }, controller.signal)

    expect(apiGetMock.mock.calls[0][2]).toMatchObject({
      signal: controller.signal,
    })
  })

  it('getUser 请求单个账号详情', async () => {
    apiGetMock.mockResolvedValue(user)

    await getUser('332601640831950848')

    expect(apiGetMock.mock.calls[0][0]).toBe('/users/332601640831950848')
  })

  it('createUser 校验并提交合法载荷', async () => {
    apiPostMock.mockResolvedValue(user)

    await createUser({
      loginName: 'temp_user',
      userName: '临时用户',
      password: 'Abcd1234',
      mobile: '13800138000',
      status: 'NORMAL',
    })

    expect(apiPostMock.mock.calls[0][0]).toBe('/users')
    expect(apiPostMock.mock.calls[0][2]).toEqual({
      loginName: 'temp_user',
      userName: '临时用户',
      password: 'Abcd1234',
      mobile: '13800138000',
      status: 'NORMAL',
    })
    expect(
      apiPostMock.mock.calls[0][3].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('createUser 拒绝弱密码', () => {
    expect(() =>
      createUser({
        loginName: 'temp_user',
        userName: '临时用户',
        password: '12345678',
      }),
    ).toThrow()
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('updateUser 提交编辑载荷', async () => {
    apiPutMock.mockResolvedValue(user)

    await updateUser('332601640831950848', {
      userName: '改名',
      mobile: '',
      status: 'DISABLED',
    })

    expect(apiPutMock.mock.calls[0][0]).toBe('/users/332601640831950848')
    expect(apiPutMock.mock.calls[0][2]).toEqual({
      userName: '改名',
      mobile: '',
      status: 'DISABLED',
    })
  })

  it('updateUserStatus 走状态子资源', async () => {
    apiPatchMock.mockResolvedValue(user)

    await updateUserStatus('332601640831950848', 'DISABLED')

    expect(apiPatchMock.mock.calls[0][0]).toBe(
      '/users/332601640831950848/status',
    )
    expect(apiPatchMock.mock.calls[0][2]).toEqual({ status: 'DISABLED' })
  })

  it('resetUserPassword 提交 newPassword', async () => {
    apiPostNoContentMock.mockResolvedValue(undefined)

    await resetUserPassword('332601640831950848', 'Abcd1234')

    expect(apiPostNoContentMock.mock.calls[0][0]).toBe(
      '/users/332601640831950848/password-resets',
    )
    expect(apiPostNoContentMock.mock.calls[0][1]).toEqual({
      newPassword: 'Abcd1234',
    })
  })

  it('resetUserPassword 拒绝弱密码', () => {
    expect(() => resetUserPassword('332601640831950848', 'short')).toThrow()
    expect(apiPostNoContentMock).not.toHaveBeenCalled()
  })

  it('deleteUser 抑制 403 全局错误以便页内友好提示', async () => {
    apiDeleteNoContentMock.mockResolvedValue(undefined)

    await deleteUser('332601640831950848')

    expect(apiDeleteNoContentMock.mock.calls[0][0]).toBe(
      '/users/332601640831950848',
    )
    expect(
      apiDeleteNoContentMock.mock.calls[0][1].suppressGlobalErrorStatuses,
    ).toEqual([403])
  })
})
