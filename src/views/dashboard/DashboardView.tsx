import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Alert } from 'antd'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { getDashboardSummary } from '@/api/dashboard'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useIdleActivation } from '@/hooks/useIdleActivation'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import {
  DashboardSidebarPanels,
  DashboardWorkplaceHeader,
} from '@/views/dashboard/DashboardInfoPanels'
import { buildDashboardInfoItems } from '@/views/dashboard/dashboard-info-utils'
import { useDashboardServerTime } from '@/views/dashboard/useDashboardServerTime'

const LazyDashboardFlowCard = lazy(() =>
  import('@/views/dashboard/DashboardFlowCard').then((m) => ({
    default: m.DashboardFlowCard,
  })),
)

export function DashboardView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isPageVisible = usePageVisibility()
  const canMountFlowCard = useIdleActivation(Boolean(isPageVisible), 1400)
  const { data: summary, isError: summaryIsError } = useQuery({
    queryKey: QUERY_KEYS.dashboardSummary,
    queryFn: getDashboardSummary,
    refetchInterval: isPageVisible ? 120000 : false,
  })

  const animatedServerTime = useDashboardServerTime(summary?.serverTime)
  const infoItems = buildDashboardInfoItems(t, summary)

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

      <DashboardWorkplaceHeader
        animatedServerTime={animatedServerTime}
        summary={summary}
      />

      <div className="dashboard-workplace-layout">
        <main className="dashboard-workplace-main">
          {canMountFlowCard ? (
            <Suspense
              fallback={
                <div className="dashboard-flow-card-placeholder" aria-hidden />
              }
            >
              <LazyDashboardFlowCard navigate={navigate} summary={summary} />
            </Suspense>
          ) : (
            <div className="dashboard-flow-card-placeholder" aria-hidden />
          )}
        </main>

        <aside className="dashboard-workplace-sidebar">
          <DashboardSidebarPanels infoItems={infoItems} summary={summary} />
        </aside>
      </div>
    </div>
  )
}
