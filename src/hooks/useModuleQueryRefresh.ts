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
    const relatedModuleKeys =
      moduleKey === 'purchase-inbound' ? ['purchase-order'] : []
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
      ...relatedModuleKeys.flatMap((relatedModuleKey) => [
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.businessGrid(relatedModuleKey),
        }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.businessGridAll(relatedModuleKey),
        }),
      ]),
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
