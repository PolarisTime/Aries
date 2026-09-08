import { useQuery } from '@tanstack/react-query'
import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { getDashboardSummary } from '@/api/system/dashboard'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { AppVersionFooter } from '@/layouts/AppVersionFooter'
import { DashboardGreetingHeader } from '@/views/dashboard/DashboardGreetingHeader'
import { DashboardModuleGrid } from '@/views/dashboard/DashboardModuleGrid'
import { DashboardPendingMetrics } from '@/views/dashboard/DashboardPendingMetrics'
import { DashboardRecentDocuments } from '@/views/dashboard/DashboardRecentDocuments'
import { DashboardTodoPanel } from '@/views/dashboard/DashboardTodoPanel'
import { useDashboardServerTime } from '@/views/dashboard/useDashboardServerTime'

/** 工作台看板：指标条 + 待办/最近单据 + 全部模块宫格 */
export function DashboardView() {
  const { t } = useTranslation()
  const isPageVisible = usePageVisibility()
  const { data: summary, isError: summaryIsError } = useQuery({
    queryKey: QUERY_KEYS.dashboardSummary,
    queryFn: getDashboardSummary,
    refetchInterval: isPageVisible ? 120000 : false,
  })
  const animatedServerTime = useDashboardServerTime(summary?.serverTime)

  return (
    <div className="page-stack dashboard-root">
      {summaryIsError ? (
        <Alert
          type="error"
          showIcon
          title={t('dashboard.alerts.loadFailed')}
          className="mb-4"
        />
      ) : null}

      <section className="dashboard-header-band">
        <DashboardGreetingHeader
          animatedServerTime={animatedServerTime}
          summary={summary}
        />
      </section>

      <DashboardPendingMetrics />

      <section className="dashboard-command-center">
        <div className="dashboard-workplace-layout">
          <main className="dashboard-workplace-main dashboard-primary-region">
            <DashboardTodoPanel />
            <DashboardRecentDocuments />
          </main>

          <aside className="dashboard-workplace-sidebar dashboard-context-region">
            <DashboardModuleGrid />
          </aside>
        </div>
      </section>

      <AppVersionFooter />
    </div>
  )
}
