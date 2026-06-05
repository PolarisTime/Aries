import { useQuery } from '@tanstack/react-query'
import { listDepartmentOptions, listRoleOptions } from '@/api/user-accounts'
import { QUERY_KEYS } from '@/constants/query-keys'

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
    queryKey: QUERY_KEYS.roleOptions,
    queryFn: listRoleOptions,
    enabled: enabled && canViewRoleCatalog,
  })

  const { data: departmentOptions = [] } = useQuery({
    queryKey: QUERY_KEYS.departmentOptions,
    queryFn: listDepartmentOptions,
    enabled: enabled && canViewDepartmentCatalog,
  })

  return {
    departmentOptions,
    roleOptions,
  }
}
