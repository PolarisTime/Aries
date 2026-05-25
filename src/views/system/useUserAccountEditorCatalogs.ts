import { useQuery } from '@tanstack/react-query'
import { listDepartmentOptions, listRoleOptions } from '@/api/user-accounts'
import { QUERY_KEYS } from '@/constants/query-keys'
import { trackLoadTaskOnce } from '@/utils/lazy-load-progress'

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
    queryFn: () =>
      trackLoadTaskOnce('user-role-options', '用户角色选项', listRoleOptions),
    enabled: enabled && canViewRoleCatalog,
  })

  const { data: departmentOptions = [] } = useQuery({
    queryKey: QUERY_KEYS.departmentOptions,
    queryFn: () =>
      trackLoadTaskOnce(
        'user-department-options',
        '用户部门选项',
        listDepartmentOptions,
      ),
    enabled: enabled && canViewDepartmentCatalog,
  })

  return {
    departmentOptions,
    roleOptions,
  }
}
