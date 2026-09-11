import { useQuery } from '@tanstack/react-query'
import { fetchDashboardWorkspace } from '@/api/system/dashboard-workspace'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePageVisibility } from '@/hooks/usePageVisibility'

const DASHBOARD_WORKSPACE_REFETCH_INTERVAL = 120_000

/**
 * 工作台共享查询：待处理指标与待办面板复用同一 query，
 * 统一 queryKey / queryFn / 轮询间隔 / 页面可见性，避免各自声明观察者配置。
 */
export function useDashboardWorkspaceQuery() {
  const isPageVisible = usePageVisibility()
  return useQuery({
    queryKey: QUERY_KEYS.dashboardWorkspace,
    queryFn: fetchDashboardWorkspace,
    refetchInterval: isPageVisible
      ? DASHBOARD_WORKSPACE_REFETCH_INTERVAL
      : false,
  })
}
