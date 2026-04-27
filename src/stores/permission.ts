import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  normalizeAction,
  normalizeResource,
  resolveMenuResource,
  resolveResourceKey,
} from '@/constants/resource-permissions'
import type { LoginUser, ResourcePermission } from '@/types/auth'
import { useAuthStore } from './auth'

const READ_ACTION = 'read'

function hasPermissionPayload(user: LoginUser | null | undefined) {
  return Boolean(user && Array.isArray(user.permissions))
}

function buildPermissionMap(items: ResourcePermission[] | null | undefined) {
  const map: Record<string, Set<string>> = {}
  for (const item of items || []) {
    const resource = normalizeResource(item.resource)
    if (!resource) {
      continue
    }
    map[resource] = new Set((item.actions || []).map((action) => normalizeAction(action)).filter(Boolean))
  }
  return map
}

function hasReadPermission(actions: Set<string> | undefined) {
  return Boolean(actions?.has(READ_ACTION))
}

function buildLegacyPermissionMap(codes: string[], actions: Record<string, string[]>) {
  const resources = new Set(codes.map((code) => resolveResourceKey(code)).filter(Boolean))
  const items: ResourcePermission[] = []
  for (const [menuOrResource, actionList] of Object.entries(actions)) {
    const resource = resolveResourceKey(menuOrResource)
    if (!resource) {
      continue
    }
    resources.add(resource)
    items.push({ resource, actions: actionList })
  }
  for (const resource of resources) {
    if (!items.some((item) => item.resource === resource)) {
      items.push({ resource, actions: ['read'] })
    }
  }
  return buildPermissionMap(items)
}

export const usePermissionStore = defineStore('permission', () => {
  const permissionMap = ref<Record<string, Set<string>>>({})
  const dataScopes = ref<Record<string, string>>({})

  function setPermissions(
    itemsOrCodes: ResourcePermission[] | string[],
    legacyActions?: Record<string, string[]>,
    scopes: Record<string, string> = {},
  ) {
    permissionMap.value = legacyActions
      ? buildLegacyPermissionMap(itemsOrCodes as string[], legacyActions)
      : buildPermissionMap(itemsOrCodes as ResourcePermission[])
    dataScopes.value = Object.fromEntries(
      Object.entries(scopes).map(([resource, scope]) => [normalizeResource(resource), scope]),
    )
  }

  function clearPermissions() {
    permissionMap.value = {}
    dataScopes.value = {}
  }

  function can(resource: string, action: string): boolean {
    const actions = permissionMap.value[resolveResourceKey(resource)]
    return actions != null && actions.has(normalizeAction(action))
  }

  function canAny(resource: string, actions: string[]): boolean {
    return actions.some((action) => can(resource, action))
  }

  function canAll(resource: string, actions: string[]): boolean {
    return actions.every((action) => can(resource, action))
  }

  function canAccessMenuKey(menuCode: string): boolean {
    const resource = resolveMenuResource(menuCode)
    return Boolean(resource && hasReadPermission(permissionMap.value[resource]))
  }

  function syncFromAuth() {
    const authStore = useAuthStore()
    const currentUser = authStore.user
    if (hasPermissionPayload(currentUser)) {
      setPermissions(currentUser?.permissions || [], undefined, currentUser?.dataScopes || {})
    } else {
      clearPermissions()
    }
  }

  const allResources = computed(() => Object.keys(permissionMap.value))

  return {
    permissionMap,
    dataScopes,
    setPermissions,
    clearPermissions,
    can,
    canAny,
    canAll,
    canAccessMenuKey,
    syncFromAuth,
    allResources,
  }
})
