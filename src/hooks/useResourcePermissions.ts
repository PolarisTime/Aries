import { useCallback, useMemo } from 'react'
import { hasPermission, usePermissionStore } from '@/stores/permissionStore'

interface ResourcePermissions {
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  can: (action: string) => boolean
}

export function useResourcePermissions(resource: string): ResourcePermissions {
  const permissionMap = usePermissionStore((state) => state.permissionMap)

  const can = useCallback(
    (action: string) => hasPermission(permissionMap, resource, action),
    [permissionMap, resource],
  )

  return useMemo(
    () => ({
      canRead: can('read'),
      canCreate: can('create'),
      canUpdate: can('update'),
      canDelete: can('delete'),
      can,
    }),
    [can],
  )
}
