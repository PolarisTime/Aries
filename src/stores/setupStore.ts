import { create } from 'zustand'

interface SetupStatus {
  setupRequired: boolean
}

interface SetupState {
  status: SetupStatus | null
  setStatus: (status: SetupStatus) => void
  clearStatus: () => void
}

export const useSetupStore = create<SetupState>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
  clearStatus: () => set({ status: null }),
}))
