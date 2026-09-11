import {
  AuditOutlined,
  ExportOutlined,
  InboxOutlined,
  PayCircleOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Card, Statistic } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  fetchDashboardAwaitingInboundCount,
  fetchDashboardMonthCounts,
} from '@/api/system/dashboard-recent'
import {
  DASHBOARD_METRIC_TARGETS,
  type DashboardPendingMetric,
} from '@/api/system/dashboard-workspace'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import { formatAmount } from '@/utils/formatters'
import { useDashboardWorkspaceQuery } from './useDashboardWorkspaceQuery'

const METRIC_ICONS: Record<
  DashboardPendingMetric['key'],
  typeof AuditOutlined
> = {
  'purchase-audit': AuditOutlined,
  'outbound-task': ExportOutlined,
  'statement-confirm': PayCircleOutlined,
}

const METRIC_TITLE_KEYS: Record<DashboardPendingMetric['key'], string> = {
  'purchase-audit': 'dashboard.metrics.purchaseAudit',
  'outbound-task': 'dashboard.metrics.outboundTask',
  'statement-confirm': 'dashboard.metrics.statementConfirm',
}

const MONTH_TARGET_PATHS = {
  outbound: '/sales-outbound',
  inbound: '/purchase-inbound',
  receipt: '/receipt',
} as const

const MONTH_TITLE_KEYS = {
  outbound: 'dashboard.metrics.monthOutbound',
  inbound: 'dashboard.metrics.monthInbound',
  receipt: 'dashboard.metrics.monthReceipt',
} as const

const MONTH_ICONS = {
  outbound: ExportOutlined,
  inbound: InboxOutlined,
  receipt: WalletOutlined,
} as const

const AWAITING_INBOUND_TARGET = {
  pathname: '/purchase-order',
  search: 'status=已审核',
}

/** 工作台顶部指标条：待处理指标（点击带「待处理」筛选直达）+ 本月经营单量 */
export function DashboardPendingMetrics() {
  const { t } = useTranslation()
  const openTab = useTabOpen()
  const isPageVisible = usePageVisibility()
  const { data } = useDashboardWorkspaceQuery()
  const { data: monthCounts } = useQuery({
    queryKey: QUERY_KEYS.dashboardMonthCounts,
    queryFn: fetchDashboardMonthCounts,
    staleTime: 300_000,
  })
  const { data: awaitingInboundCount } = useQuery({
    queryKey: QUERY_KEYS.dashboardAwaitingInbound,
    queryFn: fetchDashboardAwaitingInboundCount,
    refetchInterval: isPageVisible ? 120000 : false,
  })
  const metrics = data?.pendingMetrics

  if (!metrics?.length) {
    return null
  }

  return (
    <div className="dashboard-metric-grid">
      {metrics.map((metric) => {
        const Icon = METRIC_ICONS[metric.key]
        const target = DASHBOARD_METRIC_TARGETS[metric.key]
        return (
          <Card
            key={metric.key}
            hoverable
            size="small"
            className={`dashboard-metric-card severity-${metric.severity}`}
            onClick={() =>
              openTab({
                pathname: target.pathname,
                search: target.search,
                forceSearch: true,
              })
            }
          >
            <span className="dashboard-metric-icon" aria-hidden>
              <Icon />
            </span>
            <div className="dashboard-metric-copy">
              <Statistic
                title={t(METRIC_TITLE_KEYS[metric.key])}
                value={metric.count}
              />
              <div className="dashboard-metric-hint">
                {metric.key === 'statement-confirm' && metric.amount != null
                  ? t('dashboard.metrics.statementAmount', {
                      amount: formatAmount(metric.amount),
                    })
                  : null}
              </div>
            </div>
          </Card>
        )
      })}
      <Card
        hoverable
        size="small"
        className="dashboard-metric-card severity-warning"
        onClick={() =>
          openTab({
            pathname: AWAITING_INBOUND_TARGET.pathname,
            search: AWAITING_INBOUND_TARGET.search,
            forceSearch: true,
          })
        }
      >
        <span className="dashboard-metric-icon" aria-hidden>
          <InboxOutlined />
        </span>
        <div className="dashboard-metric-copy">
          <Statistic
            title={t('dashboard.metrics.awaitingInbound')}
            value={awaitingInboundCount ?? 0}
          />
          <div className="dashboard-metric-hint">
            {t('dashboard.metrics.awaitingInboundHint')}
          </div>
        </div>
      </Card>
      {(
        Object.keys(MONTH_TITLE_KEYS) as Array<keyof typeof MONTH_TITLE_KEYS>
      ).map((key) => {
        const Icon = MONTH_ICONS[key]
        const count = monthCounts?.[key]
        return (
          <Card
            key={key}
            hoverable
            size="small"
            className="dashboard-metric-card severity-month"
            onClick={() =>
              openTab({
                pathname: MONTH_TARGET_PATHS[key],
                forceSearch: true,
              })
            }
          >
            <span className="dashboard-metric-icon" aria-hidden>
              <Icon />
            </span>
            <div className="dashboard-metric-copy">
              <Statistic title={t(MONTH_TITLE_KEYS[key])} value={count ?? 0} />
              <div className="dashboard-metric-hint">
                {t('dashboard.metrics.monthUnit')}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
