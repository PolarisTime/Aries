import { useQuery } from '@tanstack/react-query'
import { Button, Card, Table, Tabs } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DASHBOARD_TODO_CATEGORIES,
  type DashboardTodoCategory,
  type DashboardTodoItem,
  fetchDashboardWorkspace,
} from '@/api/system/dashboard-workspace'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import { formatDate } from '@/utils/formatters'

/** 待办类目 → 目标模块路径（「去处理」直达单据详情） */
const TODO_CATEGORY_TARGETS: Record<
  Exclude<DashboardTodoCategory, 'all'>,
  string
> = {
  'purchase-audit': '/purchase-order',
  'sales-delivery': '/sales-order',
  'finance-reconcile': '/customer-statement',
}

const TODO_TAB_KEYS: Record<DashboardTodoCategory, string> = {
  all: 'dashboard.todo.tabs.all',
  'purchase-audit': 'dashboard.todo.tabs.purchaseAudit',
  'sales-delivery': 'dashboard.todo.tabs.salesDelivery',
  'finance-reconcile': 'dashboard.todo.tabs.financeReconcile',
}

/** 待办工作台：按类目展示紧急待办单据，一键直达处理 */
export function DashboardTodoPanel() {
  const { t } = useTranslation()
  const openTab = useTabOpen()
  const [category, setCategory] = useState<DashboardTodoCategory>('all')
  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.dashboardWorkspace,
    queryFn: fetchDashboardWorkspace,
    refetchInterval: 120000,
  })

  const rows = (data?.todoItems ?? [])
    .filter((item) => category === 'all' || item.category === category)
    .slice(0, 8)

  const columns = useMemo<ColumnsType<DashboardTodoItem>>(
    () => [
      {
        title: t('dashboard.todo.columns.docNo'),
        dataIndex: 'docNo',
        key: 'docNo',
        ellipsis: true,
      },
      {
        title: t('dashboard.todo.columns.bizType'),
        dataIndex: 'category',
        key: 'category',
        width: 110,
        render: (value: DashboardTodoItem['category']) =>
          t(TODO_TAB_KEYS[value]),
      },
      {
        title: t('dashboard.todo.columns.relatedDocument'),
        dataIndex: 'relatedDocumentNo',
        key: 'relatedDocumentNo',
        width: 140,
        ellipsis: true,
        render: (value: string | null) => value || '—',
      },
      {
        title: t('dashboard.todo.columns.counterparty'),
        dataIndex: 'counterpartyName',
        key: 'counterpartyName',
        ellipsis: true,
      },
      {
        title: t('dashboard.todo.columns.businessDate'),
        dataIndex: 'businessDate',
        key: 'businessDate',
        width: 130,
        render: (value: string) => formatDate(value),
      },
      {
        title: t('dashboard.todo.columns.action'),
        key: 'action',
        width: 90,
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            onClick={() =>
              openTab({
                pathname: TODO_CATEGORY_TARGETS[record.category],
                search: `docNo=${encodeURIComponent(record.docNo)}&openDetail=1`,
                forceSearch: true,
              })
            }
          >
            {t('dashboard.todo.goProcess')}
          </Button>
        ),
      },
    ],
    [openTab, t],
  )

  return (
    <Card
      size="small"
      className="dashboard-todo-panel"
      title={t('dashboard.todo.title')}
    >
      <Tabs
        size="small"
        activeKey={category}
        onChange={(key) => setCategory(key as DashboardTodoCategory)}
        items={DASHBOARD_TODO_CATEGORIES.map((value) => ({
          key: value,
          label: t(TODO_TAB_KEYS[value]),
        }))}
      />
      {isError ? (
        <div className="dashboard-todo-feedback">
          {t('dashboard.todo.loadFailed')}
        </div>
      ) : (
        <Table
          rowKey="id"
          size="small"
          loading={isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: t('dashboard.todo.empty') }}
        />
      )}
    </Card>
  )
}
