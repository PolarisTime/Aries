import { useQuery } from '@tanstack/react-query'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_LONG } from '@/constants/query-policies'

export function useRuntimeConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.runtimeConfig,
    queryFn: getRuntimeConfig,
    staleTime: STALE_LONG,
  })
}
