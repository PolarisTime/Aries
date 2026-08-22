import {
  AuditOutlined,
  ExportOutlined,
  PayCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, Statistic } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  DASHBOARD_METRIC_TARGETS,
  type DashboardPendingMetric,
  fetchDashboardPendingMetrics,
} from '@/api/system/dashboard-workspace'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import { formatAmount } from '@/utils/formatters'

const METRIC_ICONS: Record<
  DashboardPendingMetric['key'],
  typeof AuditOutlined
> = {
  'purchase-audit': AuditOutlined,
  'outbound-task': ExportOutlined,
  receivable: PayCircleOutlined,
  'stock-alert': WarningOutlined,
}

const METRIC_TITLE_KEYS: Record<DashboardPendingMetric['key'], string> = {
  'purchase-audit': 'dashboard.metrics.purchaseAudit',
  'outbound-task': 'dashboard.metrics.outboundTask',
  receivable: 'dashboard.metrics.receivable',
  'stock-alert': 'dashboard.metrics.stockAlert',
}

/** 工作台顶部核心指标卡：点击直达对应列表页并携带「待处理」筛选意图 */
export function DashboardPendingMetrics() {
  const { t } = useTranslation()
  const openTab = useTabOpen()
  const { data: metrics } = useQuery({
    queryKey: QUERY_KEYS.dashboardPendingMetrics,
    queryFn: fetchDashboardPendingMetrics,
    refetchInterval: 120000,
  })

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
              openTab({ pathname: target.pathname, search: target.search })
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
                {metric.key === 'receivable' && metric.amount != null
                  ? t('dashboard.metrics.receivableAmount', {
                      amount: formatAmount(metric.amount),
                    })
                  : null}
                {metric.key === 'stock-alert' ? (
                  <Badge
                    status={
                      metric.severity === 'danger'
                        ? 'error'
                        : metric.severity === 'warning'
                          ? 'warning'
                          : 'default'
                    }
                    text={t(
                      metric.severity === 'danger'
                        ? 'dashboard.metrics.stockAlertStates.danger'
                        : metric.severity === 'warning'
                          ? 'dashboard.metrics.stockAlertStates.warning'
                          : 'dashboard.metrics.stockAlertStates.normal',
                    )}
                  />
                ) : null}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
