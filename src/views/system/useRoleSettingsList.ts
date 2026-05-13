import { useQuery } from '@tanstack/react-query'
import { listRoleSettingsPage, type RoleRecord } from '@/api/role-actions'

export function useRoleSettingsList(enabled = true) {
  const { data: rolesData = [] } = useQuery({
    queryKey: ['role-settings'],
    queryFn: async () => {
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
    },
    enabled,
  })

  return { roles: rolesData }
}
