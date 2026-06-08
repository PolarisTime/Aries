import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'

export function useRefreshQuery(queryKey: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: [queryKey] })
    if (queryKey === 'general-setting') {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.numberRules })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientSettings })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.displaySwitches,
      })
    }
    if (queryKey === 'number-rules') {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.generalSetting })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientSettings })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.displaySwitches,
      })
    }
  }
}
