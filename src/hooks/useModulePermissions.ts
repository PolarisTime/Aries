import { usePermissionStore } from '@/stores/permissionStore'

interface Props {
  moduleKey: string
  resourceKey?: string
}

export function useModulePermissions({ moduleKey, resourceKey }: Props) {
  const can = usePermissionStore((s) => s.can)

  const resolvedResource = resourceKey || moduleKey

  return {
    canViewRecords: can(resolvedResource, 'read'),
    canCreateRecord: can(resolvedResource, 'create'),
    canUpdateRecord: can(resolvedResource, 'update'),
    canDeleteRecord: can(resolvedResource, 'delete'),
    canExportData: can(resolvedResource, 'export'),
    canAuditRecord: can(resolvedResource, 'audit'),
    can,
    resolvedResource,
  }
}
