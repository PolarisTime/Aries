import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { clearToken, setStoredUser } from '@/utils/storage'

const mockUser = {
  id: 1,
  loginName: 'admin',
  userName: 'Admin',
  roleName: '管理员',
  permissions: [],
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  clearToken()
  useAuthStore.setState({
    token: '',
    user: null,
    isAuthenticated: false,
    authReady: false,
  })
})

describe('authStore hydration', () => {
  it('keeps a stored user authenticated while access token is restored', () => {
    setStoredUser(mockUser)

    useAuthStore.getState().hydrate()

    const state = useAuthStore.getState()
    expect(state.token).toBe('')
    expect(state.user?.loginName).toBe('admin')
    expect(state.isAuthenticated).toBe(true)
    expect(state.authReady).toBe(false)
  })
})
