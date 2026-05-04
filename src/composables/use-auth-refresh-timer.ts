import { onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  cancelPreRefresh,
  checkRefreshTokenExpiry,
  schedulePreRefresh,
} from '@/api/auth/auth-state'

export function useAuthRefreshTimer() {
  const authStore = useAuthStore()
  const { token } = storeToRefs(authStore)

  function handleStorageEvent(e: StorageEvent) {
    if (e.key === 'aries-token' || e.key === 'aries-token-expires-at') {
      authStore.hydrate()
      if (authStore.token) {
        schedulePreRefresh()
      }
    }
  }

  watch(token, (newToken) => {
    if (newToken) {
      schedulePreRefresh()
      checkRefreshTokenExpiry()
    } else {
      cancelPreRefresh()
    }
  })

  onMounted(() => {
    if (token.value) {
      schedulePreRefresh()
      checkRefreshTokenExpiry()
    }
    window.addEventListener('storage', handleStorageEvent)
  })

  onBeforeUnmount(() => {
    cancelPreRefresh()
    window.removeEventListener('storage', handleStorageEvent)
  })
}
