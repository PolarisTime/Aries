import { create } from 'zustand'
import { listSystemMenus, type MenuNode } from '@/api/system-menus'

interface SystemMenuState {
  menus: MenuNode[]
  loaded: boolean
  setMenus: (menus: MenuNode[]) => void
  loadMenus: (force?: boolean) => Promise<MenuNode[]>
  clearMenus: () => void
}

let pendingLoad: Promise<MenuNode[]> | null = null

export const useSystemMenuStore = create<SystemMenuState>((set, get) => ({
  menus: [],
  loaded: false,

  setMenus: (menus) => {
    set({ menus, loaded: true })
  },

  loadMenus: async (force = false) => {
    if (!force && get().loaded) {
      return get().menus
    }

    if (!force && pendingLoad) {
      return pendingLoad
    }

    pendingLoad = listSystemMenus()
      .then((menus) => {
        get().setMenus(menus)
        return menus
      })
      .finally(() => {
        pendingLoad = null
      })

    return pendingLoad
  },

  clearMenus: () => {
    pendingLoad = null
    set({ menus: [], loaded: false })
  },
}))

export type { MenuNode }
