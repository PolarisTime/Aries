import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  syncCurrentUserTotpState,
  syncCurrentUserTotpStateById,
} from '@/stores/auth-user-sync'
import { useAuthStore } from '@/stores/authStore'
import { setStoredUser } from '@/utils/storage'

vi.mock('@/utils/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/storage')>()
  return {
    ...actual,
    setStoredUser: vi.fn(),
  }
})

const mockUser = {
  id: 1,
  loginName: 'admin',
  userName: 'Admin',
  roleName: '管理员',
  permissions: [],
  totpEnabled: false,
  forceTotpSetup: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    token: 'test-token',
    user: { ...mockUser },
    isAuthenticated: true,
    authReady: true,
  })
})

describe('syncCurrentUserTotpState', () => {
  it('当用户存在时，应更新 totpEnabled 和 forceTotpSetup', () => {
    syncCurrentUserTotpState(true)

    const state = useAuthStore.getState()
    expect(state.user?.totpEnabled).toBe(true)
    expect(state.user?.forceTotpSetup).toBe(false)
    expect(setStoredUser).toHaveBeenCalledWith(
      expect.objectContaining({
        totpEnabled: true,
        forceTotpSetup: false,
      }),
    )
  })

  it('当用户不存在时，不应更新状态', () => {
    useAuthStore.setState({ user: null })

    syncCurrentUserTotpState(true)

    expect(setStoredUser).not.toHaveBeenCalled()
  })

  it('当 updater 返回同一引用时，不应调用 setStoredUser', () => {
    // syncCurrentUserTotpState 总创建新对象，此场景通过 syncCurrentUserTotpStateById
    // 当 userId 不匹配时 updater 返回原 user 引用
    syncCurrentUserTotpStateById(999, true)

    expect(setStoredUser).not.toHaveBeenCalled()
  })
})

describe('syncCurrentUserTotpStateById', () => {
  it('当用户 ID 匹配时，应更新 totpEnabled', () => {
    syncCurrentUserTotpStateById(1, true)

    const state = useAuthStore.getState()
    expect(state.user?.totpEnabled).toBe(true)
    expect(setStoredUser).toHaveBeenCalledWith(
      expect.objectContaining({
        totpEnabled: true,
      }),
    )
  })

  it('当用户 ID 不匹配时，不应更新状态', () => {
    syncCurrentUserTotpStateById(999, true)

    const state = useAuthStore.getState()
    expect(state.user?.totpEnabled).toBe(false)
    expect(setStoredUser).not.toHaveBeenCalled()
  })

  it('应正确处理字符串类型的用户 ID', () => {
    syncCurrentUserTotpStateById('1', true)

    const state = useAuthStore.getState()
    expect(state.user?.totpEnabled).toBe(true)
    expect(setStoredUser).toHaveBeenCalled()
  })

  it('当用户不存在时，不应更新状态', () => {
    useAuthStore.setState({ user: null })

    syncCurrentUserTotpStateById(1, true)

    expect(setStoredUser).not.toHaveBeenCalled()
  })
})
