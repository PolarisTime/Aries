import { useQueryClient } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/constants/query-keys'

export function useModuleQueryRefresh(moduleKey: string) {
  const queryClient = useQueryClient()

  const refreshModuleQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGrid(moduleKey),
      }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGridAll(moduleKey),
      }),
    ])
  }

  return { refreshModuleQueries }
}
