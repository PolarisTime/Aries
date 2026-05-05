import { create } from 'zustand'
import {
  normalizeAction,
  resolveMenuResource,
  resolveResourceKey,
} from '@/constants/resource-permissions'
import type { LoginUser, ResourcePermission } from '@/types/auth'

const READ_ACTION = 'read'

function normalizePermissionKey(value: string | null | undefined) {
  return String(value || '').replace(/^\/+/, '').trim().toLowerCase()
}

function buildPermissionMap(items: ResourcePermission[] | null | undefined) {
  const permissionMap: Record<string, Set<string>> = {}

  const register = (resource: string, actions: string[]) => {
    const normalizedResource = normalizePermissionKey(resource)
    if (!normalizedResource) {
      return
    }

    const nextActions = permissionMap[normalizedResource] || new Set<string>()
    actions
      .map((action) => normalizeAction(action))
      .filter(Boolean)
      .forEach((action) => nextActions.add(action))
    permissionMap[normalizedResource] = nextActions
  }

  for (const item of items || []) {
    const rawResource = normalizePermissionKey(item.resource)
    const resolvedResource = normalizePermissionKey(resolveResourceKey(item.resource))
    const actions = Array.isArray(item.actions) ? item.actions.map(String) : []

    register(rawResource, actions)
    if (resolvedResource && resolvedResource !== rawResource) {
      register(resolvedResource, actions)
    }
  }

  return permissionMap
}

function hasReadPermission(actions: Set<string> | undefined) {
  return Boolean(actions?.has(READ_ACTION) || actions?.has('*'))
}

interface PermissionState {
  permissionMap: Record<string, Set<string>>
  dataScopes: Record<string, string>
  setPermissions: (items: ResourcePermission[], dataScopes?: Record<string, string>) => void
  syncFromUser: (user: LoginUser | null | undefined) => void
  can: (resource: string, action: string) => boolean
  canAny: (resource: string, actions: string[]) => boolean
  canAll: (resource: string, actions: string[]) => boolean
  canAccessMenuKey: (menuCode: string) => boolean
  clearPermissions: () => void
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissionMap: {},
  dataScopes: {},

  setPermissions: (items, dataScopes = {}) => {
    set({
      permissionMap: buildPermissionMap(items),
      dataScopes: Object.fromEntries(
        Object.entries(dataScopes).map(([resource, scope]) => [
          normalizePermissionKey(resolveResourceKey(resource) || resource),
          scope,
        ]),
      ),
    })
  },

  syncFromUser: (user) => {
    if (user && Array.isArray(user.permissions)) {
      get().setPermissions(user.permissions, user.dataScopes || {})
      return
    }
    get().clearPermissions()
  },

  can: (resource, action) => {
    const normalizedAction = normalizeAction(action)
    const candidates = [
      normalizePermissionKey(resource),
      normalizePermissionKey(resolveResourceKey(resource)),
    ].filter(Boolean)

    return candidates.some((candidate) => {
      const actions = get().permissionMap[candidate]
      if (!actions) return false
      if (actions.has('*')) return true
      return actions.has(normalizedAction)
    })
  },

  canAny: (resource, actions) => {
    return actions.some((action) => get().can(resource, action))
  },

  canAll: (resource, actions) => {
    return actions.every((action) => get().can(resource, action))
  },

  canAccessMenuKey: (menuCode) => {
    const candidates = [
      normalizePermissionKey(menuCode),
      normalizePermissionKey(resolveMenuResource(menuCode)),
      normalizePermissionKey(resolveResourceKey(menuCode)),
    ].filter(Boolean)

    return candidates.some((candidate) =>
      hasReadPermission(get().permissionMap[candidate]),
    )
  },

  clearPermissions: () => {
    set({ permissionMap: {}, dataScopes: {} })
  },
}))
