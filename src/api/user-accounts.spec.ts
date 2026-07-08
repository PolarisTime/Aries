import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const httpDeleteMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('./client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: {
    get: httpGetMock,
    post: httpPostMock,
    put: httpPutMock,
    delete: httpDeleteMock,
  },
}))

vi.mock('@/api/page-contract', () => ({
  pageContent: vi.fn((data: { content?: unknown[] }) => data.content || []),
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import {
  buildUserAccountUrl,
  checkUserAccountLoginName,
  createUserAccount,
  deleteUserAccount,
  disableUserAccount2fa,
  enableUserAccount2fa,
  getUserAccountDetail,
  listDepartmentOptions,
  listRoleOptions,
  listUserAccounts,
  setupUserAccount2fa,
  updateUserAccount,
} from './user-accounts'

describe('user-accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('listUserAccounts', () => {
    it('fetches paginated user accounts', async () => {
      const mockData = {
        code: 0,
        data: {
          content: [{ id: '1', loginName: 'admin', userName: 'Admin' }],
          totalElements: 1,
          totalPages: 1,
        },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listUserAccounts({ page: 0, size: 10 })

      expect(httpGetMock).toHaveBeenCalledWith('/user-accounts', {
        params: { page: 0, size: 10 },
      })
      expect(result.records).toHaveLength(1)
    })
  })

  describe('getUserAccountDetail', () => {
    it('fetches user detail by id', async () => {
      const mockData = {
        code: 0,
        data: { id: '1', loginName: 'admin', userName: 'Admin' },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await getUserAccountDetail('1')

      expect(httpGetMock).toHaveBeenCalledWith('/user-accounts/1')
      expect(result).toEqual({ id: '1', loginName: 'admin', userName: 'Admin' })
    })
  })

  describe('checkUserAccountLoginName', () => {
    it('checks login name availability', async () => {
      const mockData = {
        code: 0,
        data: { available: true },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await checkUserAccountLoginName('newuser')

      expect(httpGetMock).toHaveBeenCalledWith(
        '/user-accounts/login-name-availability',
        {
          params: { loginName: 'newuser', excludeUserId: undefined },
        },
      )
      expect(result).toEqual({ available: true })
    })

    it('passes excludeUserId', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: { available: true } })

      await checkUserAccountLoginName('admin', 'user-1')

      expect(httpGetMock).toHaveBeenCalledWith(
        '/user-accounts/login-name-availability',
        {
          params: { loginName: 'admin', excludeUserId: 'user-1' },
        },
      )
    })
  })

  describe('createUserAccount', () => {
    it('creates new user', async () => {
      const mockResponse = {
        code: 0,
        data: { id: '2', loginName: 'newuser' },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const payload = { loginName: 'newuser', userName: '新用户' } as never
      const result = await createUserAccount(payload)

      expect(httpPostMock).toHaveBeenCalledWith('/user-accounts', payload)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateUserAccount', () => {
    it('updates existing user', async () => {
      httpPutMock.mockResolvedValue({ code: 0, data: { id: '1' } })

      const payload = { loginName: 'admin', userName: '更新用户' } as never
      await updateUserAccount('1', payload)

      expect(httpPutMock).toHaveBeenCalledWith('/user-accounts/1', payload)
    })
  })

  describe('deleteUserAccount', () => {
    it('deletes user by id', async () => {
      httpDeleteMock.mockResolvedValue({ code: 0, data: null })

      await deleteUserAccount('1')

      expect(httpDeleteMock).toHaveBeenCalledWith('/user-accounts/1')
    })
  })

  describe('setupUserAccount2fa', () => {
    it('sends 2fa setup request', async () => {
      const mockResponse = {
        code: 0,
        data: { qrCodeUrl: 'otpauth://...' },
      }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await setupUserAccount2fa('1')

      expect(httpPostMock).toHaveBeenCalledWith('/user-accounts/1/2fa/setup')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('enableUserAccount2fa', () => {
    it('enables 2fa with TOTP code', async () => {
      httpPostMock.mockResolvedValue({
        code: 0,
        data: { id: '1', totpEnabled: true },
      })

      const result = await enableUserAccount2fa('1', '123456')

      expect(httpPostMock).toHaveBeenCalledWith('/user-accounts/1/2fa/enable', {
        totpCode: '123456',
      })
      expect(result.data.totpEnabled).toBe(true)
    })
  })

  describe('disableUserAccount2fa', () => {
    it('disables 2fa', async () => {
      httpPostMock.mockResolvedValue({
        code: 0,
        data: { id: '1', totpEnabled: false },
      })

      const result = await disableUserAccount2fa('1')

      expect(httpPostMock).toHaveBeenCalledWith('/user-accounts/1/2fa/disable')
      expect(result.data.totpEnabled).toBe(false)
    })
  })

  describe('listRoleOptions', () => {
    it('fetches role options', async () => {
      const mockData = {
        code: 0,
        data: {
          content: [{ id: '1', roleCode: 'admin', roleName: '管理员' }],
        },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listRoleOptions()

      expect(httpGetMock).toHaveBeenCalledWith('/role-settings', {
        params: { page: 0, size: 200 },
      })
      expect(result).toEqual([
        { id: '1', roleCode: 'admin', roleName: '管理员' },
      ])
    })
  })

  describe('listDepartmentOptions', () => {
    it('fetches and normalizes department options', async () => {
      const mockData = {
        code: 0,
        data: [{ id: 1, departmentCode: 'D001', departmentName: '技术部' }],
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await listDepartmentOptions()

      expect(httpGetMock).toHaveBeenCalledWith('/departments/options')
      expect(result[0].id).toBe('1')
      expect(result[0].departmentCode).toBe('D001')
      expect(result[0].departmentName).toBe('技术部')
    })

    it('returns empty array when data is null', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })

      const result = await listDepartmentOptions()

      expect(result).toEqual([])
    })
  })

  describe('buildUserAccountUrl', () => {
    it('returns base url when id is undefined', () => {
      expect(buildUserAccountUrl()).toBe('/user-accounts')
    })

    it('returns url with id when provided', () => {
      expect(buildUserAccountUrl('user-5')).toBe('/user-accounts/user-5')
    })
  })

  describe('listDepartmentOptions normalization', () => {
    it('normalizes null id to empty string', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: [{ id: null, departmentCode: null, departmentName: null }],
      })

      const result = await listDepartmentOptions()
      expect(result[0].id).toBe('')
      expect(result[0].departmentCode).toBe('')
      expect(result[0].departmentName).toBe('')
    })

    it('converts numeric values to strings', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: [{ id: 42, departmentCode: 100, departmentName: '技术部' }],
      })

      const result = await listDepartmentOptions()
      expect(result[0].id).toBe('42')
      expect(result[0].departmentCode).toBe('100')
      expect(result[0].departmentName).toBe('技术部')
    })
  })
})
