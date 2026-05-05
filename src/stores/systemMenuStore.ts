import { create } from 'zustand'

interface MenuNode {
  id: number
  code: string
  title: string
  icon?: string
  parentId?: number
  path?: string
  sortOrder?: number
  children?: MenuNode[]
}

interface SystemMenuState {
  menus: MenuNode[]
  loaded: boolean
  setMenus: (menus: MenuNode[]) => void
  clearMenus: () => void
}

export const useSystemMenuStore = create<SystemMenuState>((set) => ({
  menus: [],
  loaded: false,

  setMenus: (menus) => {
    set({ menus, loaded: true })
  },

  clearMenus: () => {
    set({ menus: [], loaded: false })
  },
}))

export type { MenuNode }
