import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/constants/storage'

interface SetupStatus {
  setupRequired: boolean
}

interface SetupState {
  status: SetupStatus | null
  setStatus: (status: SetupStatus) => void
  clearStatus: () => void
}

function normalizeStatus(value: unknown): SetupStatus | null {
  if (
    value &&
    typeof value === 'object' &&
    'setupRequired' in value &&
    typeof value.setupRequired === 'boolean'
  ) {
    return { setupRequired: value.setupRequired }
  }

  return null
}

function mergePersistedState(
  persistedState: unknown,
  currentState: SetupState,
) {
  if (!persistedState || typeof persistedState !== 'object') {
    return currentState
  }

  return {
    ...currentState,
    status: normalizeStatus((persistedState as Partial<SetupState>).status),
  }
}

export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      status: null,
      setStatus: (status) => set({ status: normalizeStatus(status) }),
      clearStatus: () => set({ status: null }),
    }),
    {
      name: STORAGE_KEYS.setupStatus,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ status: state.status }),
      merge: mergePersistedState,
    },
  ),
)
