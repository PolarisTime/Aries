import { useQuery } from '@tanstack/react-query'
import { getRuntimeConfig } from '@/api/runtime-config'
import { QUERY_KEYS } from '@/constants/query-keys'

export function useRuntimeConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.runtimeConfig,
    queryFn: getRuntimeConfig,
    staleTime: 30_000,
  })
}
