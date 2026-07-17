import { useQuery } from '@tanstack/react-query'
import { listDepartmentOptions, listRoleOptions } from '@/api/user-accounts'
import { QUERY_KEYS } from '@/constants/query-keys'

interface Props {
  enabled?: boolean
}

export function useUserAccountEditorCatalogs({ enabled = true }: Props) {
  const { data: roleOptions = [] } = useQuery({
    queryKey: QUERY_KEYS.roleOptions,
    queryFn: listRoleOptions,
    enabled,
  })

  const { data: departmentOptions = [] } = useQuery({
    queryKey: QUERY_KEYS.departmentOptions,
    queryFn: listDepartmentOptions,
    enabled,
  })

  return {
    departmentOptions,
    roleOptions,
  }
}
