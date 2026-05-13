import { useQuery } from '@tanstack/react-query'
import { listDepartmentOptions, listRoleOptions } from '@/api/user-accounts'

interface Props {
  canViewRoleCatalog: boolean
  canViewDepartmentCatalog: boolean
  enabled?: boolean
}

export function useUserAccountEditorCatalogs({
  canViewRoleCatalog,
  canViewDepartmentCatalog,
  enabled = true,
}: Props) {
  const { data: roleOptions = [] } = useQuery({
    queryKey: ['role-options'],
    queryFn: listRoleOptions,
    enabled: enabled && canViewRoleCatalog,
  })

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['department-options'],
    queryFn: listDepartmentOptions,
    enabled: enabled && canViewDepartmentCatalog,
  })

  return {
    departmentOptions,
    roleOptions,
  }
}
