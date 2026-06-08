import { useQueryClient } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/constants/query-keys'
import {
  getMasterOptionQueryKey,
  reloadMasterOptionsForModule,
} from '@/hooks/master-option-cache-refresh'

export function useModuleQueryRefresh(moduleKey: string) {
  const queryClient = useQueryClient()

  const refreshModuleQueries = async () => {
    const masterOptionQueryKey = getMasterOptionQueryKey(moduleKey)
    const tasks = [
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGrid(moduleKey),
      }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGridAll(moduleKey),
      }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.parentSelectorListBase,
      }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.statementLinkOptionsBase,
      }),
    ]

    if (masterOptionQueryKey) {
      tasks.push(
        reloadMasterOptionsForModule(moduleKey).then((data) => {
          queryClient.setQueryData(masterOptionQueryKey, data)
          return queryClient.invalidateQueries({
            queryKey: masterOptionQueryKey,
          })
        }),
      )
    }

    await Promise.all(tasks)
  }

  return { refreshModuleQueries }
}
