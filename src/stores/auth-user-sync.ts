import { useAuthStore } from '@/stores/authStore'
import type { LoginUser } from '@/types/auth'
import { setStoredUser } from '@/utils/storage'

function patchCurrentAuthUser(updater: (user: LoginUser) => LoginUser) {
  useAuthStore.setState((state) => {
    if (!state.user) {
      return state
    }

    const nextUser = updater(state.user)
    if (nextUser === state.user) {
      return state
    }

    setStoredUser(nextUser)
    return { ...state, user: nextUser }
  })
}

export function syncCurrentUserTotpState(enabled: boolean) {
  patchCurrentAuthUser((user) => ({
    ...user,
    totpEnabled: enabled,
    forceTotpSetup: false,
  }))
}

export function syncCurrentUserTotpStateById(
  userId: number | string,
  enabled: boolean,
) {
  patchCurrentAuthUser((user) => {
    if (String(user.id) !== String(userId)) {
      return user
    }

    return {
      ...user,
      totpEnabled: enabled,
    }
  })
}
