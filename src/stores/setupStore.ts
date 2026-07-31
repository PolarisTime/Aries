import { create } from 'zustand'
import type { InitialSetupStatus } from '@/shared/schemas/setup'

interface SetupState {
  status: InitialSetupStatus | null
  setStatus: (status: InitialSetupStatus) => void
  clearStatus: () => void
}

export const useSetupStore = create<SetupState>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
  clearStatus: () => set({ status: null }),
}))
