import { useQuery } from '@tanstack/react-query'
import { listRoleSettingsPage, type RoleRecord } from '@/api/role-actions'
import { QUERY_KEYS } from '@/constants/query-keys'
import { trackLoadTaskOnce } from '@/utils/lazy-load-progress'

export function useRoleSettingsList(enabled = true) {
  const { data: rolesData = [] } = useQuery({
    queryKey: QUERY_KEYS.roleSettings,
    queryFn: () =>
      trackLoadTaskOnce('role-settings-list', '角色列表数据', async () => {
        const allRoles: RoleRecord[] = []
        let page = 0
        while (true) {
          const data = await listRoleSettingsPage(page, 100)
          allRoles.push(...(data.records || []))
          const totalPages = Number(data.totalPages || 0)
          if (
            (totalPages > 0 && page + 1 >= totalPages) ||
            (data.records || []).length < 100
          ) {
            break
          }
          page += 1
        }
        return allRoles
      }),
    enabled,
  })

  return { roles: rolesData }
}
