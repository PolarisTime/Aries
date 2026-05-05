import { create } from 'zustand'

interface PermissionState {
  permissionMap: Record<string, Set<string>>
  dataScopes: Record<string, string>
  setPermissions: (permissionMap: Record<string, Set<string>>, dataScopes: Record<string, string>) => void
  can: (resource: string, action: string) => boolean
  canAny: (resource: string, actions: string[]) => boolean
  canAll: (resource: string, actions: string[]) => boolean
  canAccessMenuKey: (menuCode: string) => boolean
  clearPermissions: () => void
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissionMap: {},
  dataScopes: {},

  setPermissions: (permissionMap, dataScopes) => {
    set({ permissionMap, dataScopes })
  },

  can: (resource, action) => {
    const actions = get().permissionMap[resource]
    if (!actions) return false
    if (actions.has('*')) return true
    return actions.has(action)
  },

  canAny: (resource, actions) => {
    return actions.some((action) => get().can(resource, action))
  },

  canAll: (resource, actions) => {
    return actions.every((action) => get().can(resource, action))
  },

  canAccessMenuKey: (menuCode) => {
    // Menu codes map to resources; by default check for 'read' action
    return get().can(menuCode, 'read')
  },

  clearPermissions: () => {
    set({ permissionMap: {}, dataScopes: {} })
  },
}))
