import { useQuery } from '@tanstack/react-query'
import { fetchBackendHealth } from '@/api/auth/auth-api'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePageVisibility } from '@/hooks/usePageVisibility'

const HEALTH_CHECK_INTERVAL_MS = 30_000

/** 后端健康状态：由 react-query 统一负责缓存、重试与轮询，页面不可见时停止轮询。 */
export function useBackendStatus(token: string): {
  backendOnline: boolean
} {
  const isPageVisible = usePageVisibility()
  const { data } = useQuery({
    queryKey: QUERY_KEYS.backendHealth,
    queryFn: fetchBackendHealth,
    enabled: Boolean(token),
    refetchInterval: isPageVisible && token ? HEALTH_CHECK_INTERVAL_MS : false,
    retry: 2,
    staleTime: 15_000,
  })

  return {
    backendOnline: data?.status === 'UP',
  }
}
