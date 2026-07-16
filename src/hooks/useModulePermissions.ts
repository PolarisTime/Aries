import { useResourcePermissions } from '@/hooks/useResourcePermissions'

interface Props {
  moduleKey: string
  resourceKey?: string
}

export function useModulePermissions({ moduleKey, resourceKey }: Props) {
  const resolvedResource = resourceKey || moduleKey
  const {
    canRead: canViewRecords,
    canCreate: canCreateRecord,
    canUpdate: canUpdateRecord,
    canDelete: canDeleteRecord,
    can,
  } = useResourcePermissions(resolvedResource)

  return {
    canViewRecords,
    canCreateRecord,
    canUpdateRecord,
    canDeleteRecord,
    canExportData: can('export'),
    canAuditRecord: can('audit'),
    canPrintRecord: can('print'),
    can,
  }
}
