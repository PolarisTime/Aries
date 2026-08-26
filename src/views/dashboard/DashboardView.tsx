import { useQuery } from '@tanstack/react-query'
import { Alert } from 'antd'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { getDashboardSummary } from '@/api/system/dashboard'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useIdleActivation } from '@/hooks/useIdleActivation'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { AppVersionFooter } from '@/layouts/AppVersionFooter'
import { DashboardAccountCard } from '@/views/dashboard/DashboardAccountCard'
import { DashboardFlowCardPlaceholder } from '@/views/dashboard/DashboardFlowCardPlaceholder'
import { DashboardGreetingHeader } from '@/views/dashboard/DashboardGreetingHeader'
import { DashboardPendingMetrics } from '@/views/dashboard/DashboardPendingMetrics'
import { DashboardTodoPanel } from '@/views/dashboard/DashboardTodoPanel'
import { useDashboardServerTime } from '@/views/dashboard/useDashboardServerTime'

const LazyDashboardFlowCard = lazy(() =>
  import('@/views/dashboard/DashboardFlowCard').then((m) => ({
    default: m.DashboardFlowCard,
  })),
)

/** 工作台看板：问候语 + 指标 + 待办/账户 + 业务链路 */
export function DashboardView() {
  const { t } = useTranslation()
  const isPageVisible = usePageVisibility()
  const canMountFlowCard = useIdleActivation(Boolean(isPageVisible), 1400)
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
        <DashboardPendingMetrics />
      </section>

      <section className="dashboard-command-center">
        <div className="dashboard-workplace-layout">
          <main className="dashboard-workplace-main dashboard-primary-region">
            <DashboardTodoPanel />
          </main>

          <aside className="dashboard-workplace-sidebar dashboard-context-region">
            <DashboardAccountCard summary={summary} />
          </aside>
        </div>

        <section className="dashboard-flow-region">
          {canMountFlowCard ? (
            <Suspense fallback={<DashboardFlowCardPlaceholder />}>
              <LazyDashboardFlowCard />
            </Suspense>
          ) : (
            <DashboardFlowCardPlaceholder />
          )}
        </section>
      </section>

      <AppVersionFooter />
    </div>
  )
}
