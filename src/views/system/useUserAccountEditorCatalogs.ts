import { useQuery } from '@tanstack/react-query'
import { listDepartmentOptions, listRoleOptions } from '@/api/user-accounts'

interface Props {
  canViewRoleCatalog: boolean
  canViewDepartmentCatalog: boolean
}

export function useUserAccountEditorCatalogs({
  canViewRoleCatalog,
  canViewDepartmentCatalog,
}: Props) {
  const { data: roleOptions = [] } = useQuery({
    queryKey: ['role-options'],
    queryFn: listRoleOptions,
    enabled: canViewRoleCatalog,
  })

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['department-options'],
    queryFn: listDepartmentOptions,
    enabled: canViewDepartmentCatalog,
  })

  return {
    departmentOptions,
    roleOptions,
  }
}
