import { ReloadOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Button, Card, Statistic, Tooltip } from 'antd'
import { useCallback, useMemo, useReducer, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type FinanceBalance,
  type FinanceOverviewQuery,
  getFinanceOverview,
} from '@/api/finance/finance-overview'
import { AppProPage } from '@/components/AppProPage'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { message } from '@/utils/antd-app'
import { buildRouterHref } from '@/utils/router-search'
import { sumColumnWidths } from '@/views/modules/components/business-grid-table-utils'
import { buildBalanceColumns } from './finance-overview-columns'
import { FinanceOverviewFilters } from './finance-overview-filters'
import { FinanceCounterpartyLedgerModal } from './finance-overview-ledger-modal'
import {
  buildSummaryItems,
  createInitialState,
  financeOverviewReducer,
  requestErrorMessage,
  type SummaryItem,
} from './finance-overview-state'
import { FinanceOverviewTableSection } from './finance-overview-table-section'

function FinanceOverviewSummarySection({ items }: { items: SummaryItem[] }) {
  return (
    <section className="finance-overview-summary">
      {items.map((item) => (
        <Card
          key={item.key}
          size="small"
          className={`finance-overview-metric finance-overview-metric--${item.key}`}
        >
          <Statistic
            title={item.label}
            value={item.value as number}
            precision={2}
            prefix="¥"
          />
        </Card>
      ))}
    </section>
  )
}

export function FinanceOverviewView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const defaultPageSize = useDefaultPageSize()
  const { formatCellValue } = useModuleDisplaySupport()
  const [state, dispatch] = useReducer(
    financeOverviewReducer,
    undefined,
    createInitialState,
  )
  const [ledgerBalance, setLedgerBalance] = useState<FinanceBalance | null>(
    null,
  )
  const { settlementCompanies, isLoading: optionsLoading } = useMasterOptions({
    settlementCompanies: true,
  })
  const defaultSettlementCompanyId = settlementCompanies[0]?.value
  const settlementCompanyId =
    state.settlementCompanyId ||
    (defaultSettlementCompanyId
      ? String(defaultSettlementCompanyId)
      : undefined)
  const pageSize = state.pageSize ?? defaultPageSize

  const queryParams = useMemo<FinanceOverviewQuery>(
    () => ({
      settlementCompanyId: settlementCompanyId || '',
      asOfDate: state.asOfDate,
      direction: state.direction,
      counterpartyType:
        state.direction === 'PAYABLE'
          ? state.counterpartyType || undefined
          : '客户',
      keyword: state.keyword,
      onlyOpen: state.onlyOpen,
      page: state.page - 1,
      size: pageSize,
    }),
    [settlementCompanyId, state, pageSize],
  )
  const queryEnabled = Boolean(settlementCompanyId)
  const overviewQuery = useQuery({
    queryKey: QUERY_KEYS.financeOverview(queryParams),
    queryFn: ({ signal }) => getFinanceOverview(queryParams, signal),
    enabled: queryEnabled,
    placeholderData: keepPreviousData,
  })

  const handleRefresh = async (): Promise<void> => {
    const result = await overviewQuery.refetch()
    if (result.isError) {
      message.error(requestErrorMessage(result.error, '刷新财务概览失败'))
    }
  }

  const formatAmount = useCallback(
    (value: number | undefined): string =>
      value == null ? '--' : formatCellValue(value, 'amount'),
    [formatCellValue],
  )
  const handleQuickCreate = useCallback(
    (record: FinanceBalance, moduleKey: 'receipt' | 'payment') => {
      void navigate({
        to: buildRouterHref(`/${moduleKey}`, {
          create: '1',
          counterpartyType: record.counterpartyType,
          counterpartyId: record.counterpartyId,
          counterpartyName: record.counterpartyName,
          settlementCompanyId: record.settlementCompanyId,
          settlementCompanyName: record.settlementCompanyName,
        }),
      } as never)
    },
    [navigate],
  )
  const columns = useMemo(
    () =>
      buildBalanceColumns(
        state.direction,
        formatAmount,
        setLedgerBalance,
        handleQuickCreate,
      ),
    [formatAmount, handleQuickCreate, state.direction],
  )
  const {
    columnSizes,
    handleColumnResizePreview,
    handleColumnResizeCommit,
    handleColumnResizeReset,
  } = useColumnSettingsSupport('finance:overview', undefined, columns.length)
  const { columns: resizableColumns, components } =
    useColumnResizing<FinanceBalance>({
      columns,
      columnSizes,
      onResizePreview: handleColumnResizePreview,
      onResizeCommit: handleColumnResizeCommit,
      onResizeReset: handleColumnResizeReset,
    })
  const tableScrollX = sumColumnWidths(
    resizableColumns.map((column) => column.width),
  )
  const summaryItems = buildSummaryItems(
    state.direction,
    overviewQuery.data?.summary,
  )
  const rows = overviewQuery.data?.balances.content || []
  const total = overviewQuery.data?.balances.totalElements || 0

  return (
    <AppProPage
      className="finance-overview-pro-page"
      description={t('finance.overview.description')}
      extra={
        <Tooltip title={t('common.refresh')}>
          <Button
            aria-label={t('finance.overview.refreshAria')}
            icon={<ReloadOutlined />}
            loading={overviewQuery.isFetching}
            disabled={!queryEnabled || overviewQuery.isFetching}
            onClick={() => void handleRefresh()}
          />
        </Tooltip>
      }
      title={t('finance.overview.title')}
    >
      <div className="module-page-stack finance-overview-page">
        <div className="module-grid-workspace">
          <FinanceOverviewFilters
            dispatch={dispatch}
            optionsLoading={optionsLoading}
            settlementCompanies={settlementCompanies}
            settlementCompanyId={settlementCompanyId}
            state={state}
          />

          {overviewQuery.isError ? (
            <Alert
              type="error"
              showIcon
              title="加载财务概览失败"
              description={requestErrorMessage(
                overviewQuery.error,
                '请稍后重试',
              )}
              action={
                <Button onClick={() => void overviewQuery.refetch()}>
                  重试
                </Button>
              }
            />
          ) : null}

          {overviewQuery.isSuccess ? (
            <FinanceOverviewSummarySection items={summaryItems} />
          ) : null}

          <FinanceOverviewTableSection
            columns={resizableColumns}
            components={components}
            loading={queryEnabled && overviewQuery.isFetching}
            onPageChange={(nextPage, nextPageSize) => {
              dispatch({
                type: 'update',
                values: {
                  page: nextPageSize === pageSize ? nextPage : 1,
                  pageSize: nextPageSize,
                },
              })
            }}
            page={state.page}
            pageSize={pageSize}
            queryEnabled={queryEnabled}
            rows={rows}
            scrollX={tableScrollX}
            total={total}
          />
        </div>
      </div>
      <FinanceCounterpartyLedgerModal
        balance={ledgerBalance}
        formatAmount={formatAmount}
        open={Boolean(ledgerBalance)}
        onClose={() => setLedgerBalance(null)}
      />
    </AppProPage>
  )
}
