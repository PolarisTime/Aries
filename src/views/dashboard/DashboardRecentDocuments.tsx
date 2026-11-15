import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Card, Empty, Spin, Tabs } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DASHBOARD_RECENT_TABS,
  type DashboardRecentTab,
  fetchDashboardRecentDocuments,
} from '@/api/system/dashboard-recent'
import { getStatusText } from '@/constants/document-status'
import { QUERY_KEYS } from '@/constants/query-keys'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import { formatAmount, formatDate } from '@/utils/formatters'

/** 最近单据页签标题（复用业务流程节点的既有文案） */
const RECENT_TITLE_KEYS: Record<DashboardRecentTab, string> = {
  'purchase-order': 'dashboard.flow.purchaseOrder.title',
  'sales-outbound': 'dashboard.flow.salesOutbound.title',
  'freight-bill': 'dashboard.flow.freightBill.title',
  'customer-statement': 'dashboard.flow.customerStatement.title',
}

/**
 * 待处理类状态（徽标橙色）：草稿与各种「待…」。
 *
 * <p>状态值已是英文 code（后端 V219），不能再按 `includes('待')` 判中文子串 ——
 * 那是 code 迁移前的写法，迁移后会静默全部落到 `is-active`。</p>
 */
const PENDING_STATUSES: ReadonlySet<string> = new Set([
  DOCUMENT_STATUS.DRAFT,
  DOCUMENT_STATUS.UNAUDITED,
  DOCUMENT_STATUS.UNSIGNED,
  DOCUMENT_STATUS.PENDING_AUDIT,
  DOCUMENT_STATUS.PENDING_CONFIRM,
  DOCUMENT_STATUS.PENDING_APPROVAL,
  DOCUMENT_STATUS.QUOTING,
])

/** 完结类状态（徽标绿色）：完成/审核通过/确认/已结算。 */
const DONE_STATUSES: ReadonlySet<string> = new Set([
  DOCUMENT_STATUS.AUDITED,
  DOCUMENT_STATUS.COMPLETED,
  DOCUMENT_STATUS.PURCHASE_COMPLETED,
  DOCUMENT_STATUS.SALES_COMPLETED,
  DOCUMENT_STATUS.INBOUND_COMPLETED,
  DOCUMENT_STATUS.DELIVERY_VERIFICATION,
  DOCUMENT_STATUS.CONFIRMED,
  DOCUMENT_STATUS.SIGNED,
  DOCUMENT_STATUS.ARCHIVED,
  DOCUMENT_STATUS.RECEIVED,
  DOCUMENT_STATUS.PAID,
  DOCUMENT_STATUS.SUCCESS,
])

/** 状态 code → 徽标色调：待处理橙色、完结绿色、其余蓝色 */
function statusBadgeClass(status: string): string {
  if (PENDING_STATUSES.has(status)) {
    return 'dashboard-recent-badge is-pending'
  }
  if (DONE_STATUSES.has(status)) {
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
                  {/* 展示必须中文：直接渲染 doc.status 会把 code 摆给用户 */}
                  {getStatusText(doc.status, t)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </Card>
  )
}
