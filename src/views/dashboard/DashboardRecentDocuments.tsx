import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Card, Empty, Spin, Tabs } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DASHBOARD_RECENT_TABS,
  type DashboardRecentTab,
  fetchDashboardRecentDocuments,
} from '@/api/system/dashboard-recent'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import { formatAmount, formatDate } from '@/utils/formatters'

/** 最近单据页签标题（复用业务流程节点的既有文案） */
const RECENT_TITLE_KEYS: Record<DashboardRecentTab, string> = {
  'purchase-order': 'dashboard.flow.purchaseOrder.title',
  'sales-outbound': 'dashboard.flow.salesOutbound.title',
  'freight-bill': 'dashboard.flow.freightBill.title',
  'customer-statement': 'dashboard.flow.customerStatement.title',
}

/** 状态 → 徽标色调：处理类橙色、完结类绿色、其余蓝色 */
function statusBadgeClass(status: string): string {
  if (status.includes('待') || status.includes('草稿')) {
    return 'dashboard-recent-badge is-pending'
  }
  if (
    status.includes('完成') ||
    status.includes('已确认') ||
    status.includes('已入库') ||
    status.includes('已审核')
  ) {
    return 'dashboard-recent-badge is-done'
  }
  return 'dashboard-recent-badge is-active'
}

/** 最近单据：四个高频模块的最新 5 条单据，点击直达详情 */
export function DashboardRecentDocuments() {
  const { t } = useTranslation()
  const openTab = useTabOpen()
  const [tab, setTab] = useState<DashboardRecentTab>('purchase-order')
  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.dashboardRecentTab(tab),
    queryFn: () => fetchDashboardRecentDocuments(tab),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  return (
    <Card
      size="small"
      className="dashboard-recent-card"
      title={t('dashboard.recent.title')}
      extra={
        <span className="dashboard-recent-hint">
          {t('dashboard.recent.hint')}
        </span>
      }
    >
      <Tabs
        size="small"
        activeKey={tab}
        onChange={(key) => setTab(key as DashboardRecentTab)}
        items={DASHBOARD_RECENT_TABS.map((value) => ({
          key: value,
          label: t(RECENT_TITLE_KEYS[value]),
        }))}
      />
      {isError ? (
        <div className="dashboard-todo-feedback">
          {t('dashboard.recent.loadFailed')}
        </div>
      ) : (
        <div className="dashboard-recent-list">
          {isLoading ? (
            <div className="dashboard-recent-loading">
              <Spin size="small" />
            </div>
          ) : !data?.length ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('dashboard.recent.empty')}
            />
          ) : (
            data.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className="dashboard-recent-item"
                onClick={() =>
                  openTab({
                    pathname: `/${tab}`,
                    search: `docNo=${encodeURIComponent(doc.docNo)}&openDetail=1`,
                    forceSearch: true,
                  })
                }
              >
                <span className="dashboard-recent-copy">
                  <strong>{doc.docNo}</strong>
                  <small>{doc.counterpartyName}</small>
                </span>
                <span className="dashboard-recent-figure">
                  {doc.amount != null ? (
                    <strong>{formatAmount(doc.amount)}</strong>
                  ) : null}
                  <small>{formatDate(doc.businessDate)}</small>
                </span>
                <span className={statusBadgeClass(doc.status)}>
                  {doc.status}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </Card>
  )
}
