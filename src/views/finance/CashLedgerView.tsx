import {
  ClearOutlined,
  DownloadOutlined,
  DownOutlined,
  FilterOutlined,
  ReloadOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  type DescriptionsProps,
  Empty,
  Input,
  Select,
  type SelectProps,
  Table,
  type TableColumnsType,
  type TableProps,
  Tooltip,
  Typography,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
import { type Dispatch, useMemo, useReducer, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type CashLedgerFilter,
  type CashLedgerFlowType,
  type CashLedgerLine,
  type CashLedgerQuery,
  type CashLedgerSummary,
  exportCashLedger,
  getCashLedger,
} from '@/api/finance/cash-ledger'
import { AppProPage } from '@/components/AppProPage'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { message } from '@/utils/antd-app'
import { DISPLAY_DATE_FORMAT } from '@/utils/formatters'
import {
  type CashLedgerAction,
  type CashLedgerState,
  cashLedgerReducer,
  createInitialLedgerState,
} from '@/views/finance/cash-ledger-state'
import { sumColumnWidths } from '@/views/modules/components/business-grid-table-utils'

const COUNTERPARTY_TYPE_LABELS: Record<string, string> = {
  客户: 'financeDetail.counterpartyCustomer',
  供应商: 'financeDetail.counterpartySupplier',
  物流商: 'financeDetail.counterpartyCarrier',
}

const FLOW_TYPE_LABEL_KEYS: Record<CashLedgerFlowType, string> = {
  RECEIPT: 'financeDetail.flowReceipt',
  PAYMENT: 'financeDetail.flowPayment',
  PAYMENT_REVERSAL: 'financeDetail.flowPaymentReversal',
  RECEIPT_REVERSAL: 'financeDetail.flowReceiptReversal',
}

const PURPOSE_LABEL_KEYS: Record<string, string> = {
  CUSTOMER_STATEMENT_SETTLEMENT:
    'financeDetail.purposeCustomerStatementSettlement',
  SUPPLIER_PREPAYMENT_REFUND: 'financeDetail.purposeSupplierPrepaymentRefund',
  SUPPLIER_OTHER_RECEIPT: 'financeDetail.purposeSupplierOtherReceipt',
  STATEMENT_SETTLEMENT: 'financeDetail.purposeStatementSettlement',
  PURCHASE_PREPAYMENT: 'financeDetail.purposePurchasePrepayment',
  SUPPLIER_PAYMENT: 'financeDetail.purposeSupplierPayment',
}

function requestErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

function displayText(value: unknown) {
  const text = String(value ?? '').trim()
  return text || '--'
}

type FormatCellValue = ReturnType<
  typeof useModuleDisplaySupport
>['formatCellValue']

function formatAmount(
  formatCellValue: FormatCellValue,
  value: number | undefined,
) {
  return value == null ? '--' : formatCellValue(value, 'amount')
}

function buildSummaryItems(
  t: TFunction,
  summary: CashLedgerSummary,
  formatCellValue: FormatCellValue,
): DescriptionsProps['items'] {
  return [
    {
      key: 'openingBalance',
      label: t('financeDetail.openingBalance'),
      children: formatAmount(formatCellValue, summary.openingBalance),
    },
    {
      key: 'periodIncome',
      label: t('financeDetail.periodIncome'),
      children: formatAmount(formatCellValue, summary.periodIncome),
    },
    {
      key: 'periodExpense',
      label: t('financeDetail.periodExpense'),
      children: formatAmount(formatCellValue, summary.periodExpense),
    },
    {
      key: 'closingBalance',
      label: t('financeDetail.closingBalance'),
      children: formatAmount(formatCellValue, summary.closingBalance),
    },
  ]
}

function buildColumns(
  t: TFunction,
  formatCellValue: FormatCellValue,
): TableColumnsType<CashLedgerLine> {
  return [
    {
      title: t('financeDetail.colBusinessDate'),
      dataIndex: 'businessDate',
      width: 120,
      fixed: 'left',
      render: (value) => formatCellValue(value, 'date'),
    },
    {
      title: t('financeDetail.colFlowType'),
      dataIndex: 'flowType',
      width: 120,
      render: (value: CashLedgerFlowType) =>
        FLOW_TYPE_LABEL_KEYS[value] ? t(FLOW_TYPE_LABEL_KEYS[value]) : value,
    },
    {
      title: t('financeDetail.colDocumentNo'),
      dataIndex: 'documentNo',
      width: 180,
      ellipsis: true,
      render: (value: string, record: CashLedgerLine) => (
        <DocumentReferencePopover
          value={{ documentNo: value, id: record.documentId }}
          moduleKey={
            record.flowType.startsWith('RECEIPT') ? 'receipt' : 'payment'
          }
          documentLabel={t('financeDetail.document')}
        />
      ),
    },
    {
      title: t('financeDetail.colCounterpartyType'),
      dataIndex: 'counterpartyType',
      width: 110,
      render: displayText,
    },
    {
      title: t('financeDetail.colCounterpartyName'),
      dataIndex: 'counterpartyName',
      width: 180,
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('financeDetail.colPurpose'),
      dataIndex: 'purpose',
      width: 180,
      ellipsis: true,
      render: (value) =>
        PURPOSE_LABEL_KEYS[String(value)]
          ? t(PURPOSE_LABEL_KEYS[String(value)])
          : displayText(value),
    },
    {
      title: t('financeDetail.colIncome'),
      dataIndex: 'incomeAmount',
      width: 130,
      align: 'right',
      render: (value) => formatAmount(formatCellValue, value),
    },
    {
      title: t('financeDetail.colExpense'),
      dataIndex: 'expenseAmount',
      width: 130,
      align: 'right',
      render: (value) => formatAmount(formatCellValue, value),
    },
    {
      title: t('financeDetail.colRunningBalance'),
      dataIndex: 'runningBalance',
      width: 140,
      align: 'right',
      render: (value) => formatAmount(formatCellValue, value),
    },
    {
      title: t('financeDetail.colOperator'),
      dataIndex: 'operatorName',
      width: 120,
      render: displayText,
    },
    {
      title: t('financeDetail.colRemark'),
      dataIndex: 'remark',
      width: 220,
      ellipsis: true,
      render: displayText,
    },
  ]
}

interface CashLedgerWorkspaceModel {
  columns: TableColumnsType<CashLedgerLine>
  components: TableProps<CashLedgerLine>['components']
  counterpartyOptions: SelectProps['options']
  dispatch: Dispatch<CashLedgerAction>
  error: unknown
  exportPending: boolean
  formatCellValue: FormatCellValue
  isError: boolean
  isFetching: boolean
  onExport: () => void
  onRefresh: () => void
  optionsLoading: boolean
  pageSize: number
  queryEnabled: boolean
  rows: CashLedgerLine[]
  scrollX: number
  settlementCompanies: SelectProps['options']
  state: CashLedgerState
  summary?: CashLedgerSummary
  total: number
}

function CashLedgerWorkspace({ model }: { model: CashLedgerWorkspaceModel }) {
  const { t } = useTranslation()
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const counterpartyTypeOptions = Object.keys(COUNTERPARTY_TYPE_LABELS).map(
    (value) => ({
      value,
      label: t(COUNTERPARTY_TYPE_LABELS[value]),
    }),
  )
  const flowTypeOptions = (
    Object.keys(FLOW_TYPE_LABEL_KEYS) as CashLedgerFlowType[]
  ).map((value) => ({ value, label: t(FLOW_TYPE_LABEL_KEYS[value]) }))
  const dateRangeValue: [Dayjs, Dayjs] | null =
    model.state.startDate && model.state.endDate
      ? [dayjs(model.state.startDate), dayjs(model.state.endDate)]
      : null

  return (
    <AppProPage
      className="cash-ledger-pro-page"
      description={t('finance.cashLedger.description')}
      extra={
        <div className="cash-ledger-actions">
          <Tooltip title={t('finance.cashLedger.exportFiltered')}>
            <span>
              <Button
                icon={<DownloadOutlined />}
                loading={model.exportPending}
                disabled={
                  !model.queryEnabled || model.isFetching || model.exportPending
                }
                onClick={model.onExport}
              >
                {t('common.export')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.refresh')}>
            <span>
              <Button
                aria-label={t('finance.cashLedger.refreshAria')}
                icon={<ReloadOutlined />}
                loading={model.isFetching}
                disabled={
                  !model.queryEnabled || model.exportPending || model.isFetching
                }
                onClick={model.onRefresh}
              />
            </span>
          </Tooltip>
        </div>
      }
      title={t('finance.cashLedger.title')}
    >
      <div className="module-page-stack cash-ledger-page">
        <div className="module-grid-workspace">
          <section className="finance-filter-shell cash-ledger-filters">
            <div className="finance-filter-primary-row cash-ledger-primary-row">
              <div className="cash-ledger-filter">
                <Typography.Text type="secondary">结算主体</Typography.Text>
                <Select
                  aria-label={t('financeDetail.settlementCompany')}
                  aria-required="true"
                  value={model.state.settlementCompanyId}
                  options={model.settlementCompanies}
                  loading={model.optionsLoading}
                  showSearch={{ optionFilterProp: 'label' }}
                  placeholder={t('financeDetail.selectSettlementCompany')}
                  onChange={(value) => {
                    model.dispatch({
                      type: 'settlement-company-changed',
                      value: value ? String(value) : undefined,
                    })
                  }}
                />
              </div>
              <div className="cash-ledger-filter">
                <Typography.Text type="secondary">
                  {t('financeDetail.colBusinessDate')}
                </Typography.Text>
                <DatePicker.RangePicker
                  aria-label={t('financeDetail.colBusinessDate')}
                  value={dateRangeValue}
                  format={DISPLAY_DATE_FORMAT}
                  onChange={(dates) => {
                    model.dispatch({
                      type: 'date-range-changed',
                      startDate: dates?.[0]?.format('YYYY-MM-DD'),
                      endDate: dates?.[1]?.format('YYYY-MM-DD'),
                    })
                  }}
                />
              </div>
              <div className="cash-ledger-filter">
                <Typography.Text type="secondary">
                  {t('financeDetail.keyword')}
                </Typography.Text>
                <Input
                  aria-label={t('financeDetail.keyword')}
                  value={model.state.keywordInput}
                  allowClear
                  placeholder={t('financeDetail.keywordPlaceholder')}
                  onChange={(event) => {
                    model.dispatch({
                      type: 'keyword-input-changed',
                      value: event.target.value,
                    })
                  }}
                  onBlur={(event) =>
                    model.dispatch({
                      type: 'keyword-committed',
                      value: event.target.value,
                    })
                  }
                  onPressEnter={(event) =>
                    model.dispatch({
                      type: 'keyword-committed',
                      value: event.currentTarget.value,
                    })
                  }
                />
              </div>
              <div className="finance-filter-actions">
                <Button
                  icon={<ClearOutlined />}
                  onClick={() => {
                    model.dispatch({ type: 'reset-filters' })
                    setAdvancedFiltersOpen(false)
                  }}
                >
                  {t('common.reset')}
                </Button>
                <Button
                  aria-controls="cash-ledger-advanced-filters"
                  aria-expanded={advancedFiltersOpen}
                  icon={<FilterOutlined />}
                  onClick={() => setAdvancedFiltersOpen((open) => !open)}
                >
                  {t('finance.filters.advanced')}
                  {advancedFiltersOpen ? <UpOutlined /> : <DownOutlined />}
                </Button>
              </div>
            </div>

            {advancedFiltersOpen ? (
              <div
                className="finance-filter-advanced-row"
                id="cash-ledger-advanced-filters"
              >
                <div className="cash-ledger-filter">
                  <Typography.Text type="secondary">
                    {t('financeDetail.colCounterpartyType')}
                  </Typography.Text>
                  <Select
                    aria-label={t('financeDetail.colCounterpartyType')}
                    value={model.state.counterpartyType}
                    options={counterpartyTypeOptions}
                    allowClear
                    placeholder={t('financeDetail.allCounterpartyTypes')}
                    onChange={(value) => {
                      model.dispatch({
                        type: 'counterparty-type-changed',
                        value,
                      })
                    }}
                  />
                </div>
                <div className="cash-ledger-filter">
                  <Typography.Text type="secondary">
                    {t('financeDetail.counterparty')}
                  </Typography.Text>
                  <Select
                    aria-label={t('financeDetail.counterparty')}
                    value={model.state.counterpartyId}
                    options={model.counterpartyOptions}
                    loading={model.optionsLoading}
                    disabled={!model.state.counterpartyType}
                    showSearch={{ optionFilterProp: 'label' }}
                    allowClear
                    placeholder={
                      model.state.counterpartyType
                        ? t('financeDetail.allCounterparties')
                        : t('financeDetail.selectTypeFirst')
                    }
                    onChange={(value) => {
                      model.dispatch({
                        type: 'counterparty-changed',
                        value: value ? String(value) : undefined,
                      })
                    }}
                  />
                </div>
                <div className="cash-ledger-filter">
                  <Typography.Text type="secondary">
                    {t('financeDetail.colFlowType')}
                  </Typography.Text>
                  <Select
                    aria-label={t('financeDetail.colFlowType')}
                    value={model.state.flowType}
                    options={flowTypeOptions}
                    allowClear
                    placeholder={t('financeDetail.allFlowTypes')}
                    onChange={(value) => {
                      model.dispatch({ type: 'flow-type-changed', value })
                    }}
                  />
                </div>
              </div>
            ) : null}
          </section>

          {model.isError ? (
            <Alert
              type="error"
              showIcon
              title={t('financeDetail.loadFailed')}
              description={requestErrorMessage(
                model.error,
                t('financeDetail.retryLater'),
              )}
              action={
                <Button onClick={model.onRefresh}>{t('common.retry')}</Button>
              }
            />
          ) : null}

          {model.summary && !model.isError ? (
            <section className="cash-ledger-summary">
              <Descriptions
                size="small"
                bordered
                column={4}
                items={buildSummaryItems(
                  t,
                  model.summary,
                  model.formatCellValue,
                )}
              />
            </section>
          ) : null}

          <section className="cash-ledger-table">
            <Table
              rowKey="key"
              size="small"
              columns={model.columns}
              components={model.components}
              dataSource={model.rows}
              loading={model.queryEnabled && model.isFetching}
              scroll={{
                x: model.scrollX,
                y: 'calc(100vh - 410px - var(--app-tabbar-height))',
              }}
              locale={{
                emptyText: model.queryEnabled ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('financeDetail.empty')}
                  />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('financeDetail.selectSettlementCompany')}
                  />
                ),
              }}
              pagination={{
                current: model.state.page,
                pageSize: model.pageSize,
                total: model.total,
                showSizeChanger: true,
                showTotal: (count) => t('financeDetail.total', { count }),
                onChange: (nextPage, nextPageSize) => {
                  model.dispatch({
                    type: 'pagination-changed',
                    page: nextPageSize === model.pageSize ? nextPage : 1,
                    pageSize: nextPageSize,
                  })
                },
              }}
            />
          </section>
        </div>
      </div>
    </AppProPage>
  )
}

export function CashLedgerView() {
  const { t } = useTranslation()
  const defaultPageSize = useDefaultPageSize()
  const [state, dispatch] = useReducer(
    cashLedgerReducer,
    defaultPageSize,
    createInitialLedgerState,
  )
  if (state.observedDefaultPageSize !== defaultPageSize) {
    dispatch({ type: 'default-page-size-changed', value: defaultPageSize })
  }
  const pageSize = state.pageSizeOverride ?? defaultPageSize
  const { formatCellValue } = useModuleDisplaySupport()
  const rawColumns = useMemo(
    () => buildColumns(t, formatCellValue),
    [t, formatCellValue],
  )
  const {
    columnSizes,
    handleColumnResizePreview,
    handleColumnResizeCommit,
    handleColumnResizeReset,
  } = useColumnSettingsSupport(
    'finance:cash-ledger',
    undefined,
    rawColumns.length,
  )
  const { columns: resizableColumns, components } =
    useColumnResizing<CashLedgerLine>({
      columns: rawColumns,
      columnSizes,
      onResizePreview: handleColumnResizePreview,
      onResizeCommit: handleColumnResizeCommit,
      onResizeReset: handleColumnResizeReset,
    })
  const tableScrollX = sumColumnWidths(
    resizableColumns.map((column) => column.width),
  )
  const {
    settlementCompanies,
    customers,
    suppliers,
    carriers,
    isLoading: optionsLoading,
  } = useMasterOptions({
    settlementCompanies: true,
    customers: state.counterpartyType === '客户',
    suppliers: state.counterpartyType === '供应商',
    carriers: state.counterpartyType === '物流商',
  })
  const queryEnabled = Boolean(state.settlementCompanyId)
  const counterpartyOptions = useMemo(() => {
    if (state.counterpartyType === '客户') {
      return customers.map(({ id, label }) => ({ value: id, label }))
    }
    if (state.counterpartyType === '供应商') {
      return suppliers.map(({ id, label }) => ({ value: id, label }))
    }
    if (state.counterpartyType === '物流商') {
      return carriers.flatMap(({ id, label }) =>
        id ? [{ value: id, label }] : [],
      )
    }
    return []
  }, [carriers, customers, state.counterpartyType, suppliers])
  const ledgerFilter = useMemo<CashLedgerFilter>(
    () => ({
      settlementCompanyId: state.settlementCompanyId || '',
      startDate: state.startDate,
      endDate: state.endDate,
      counterpartyType: state.counterpartyType,
      counterpartyId: state.counterpartyId,
      flowType: state.flowType,
      keyword: state.keyword,
    }),
    [
      state.counterpartyId,
      state.counterpartyType,
      state.endDate,
      state.flowType,
      state.keyword,
      state.settlementCompanyId,
      state.startDate,
    ],
  )
  const ledgerQueryParams = useMemo<CashLedgerQuery>(
    () => ({ ...ledgerFilter, page: state.page - 1, size: pageSize }),
    [ledgerFilter, pageSize, state.page],
  )
  const ledgerQuery = useQuery({
    queryKey: QUERY_KEYS.cashLedger(ledgerQueryParams),
    queryFn: ({ signal }) => getCashLedger(ledgerQueryParams, signal),
    enabled: queryEnabled,
    placeholderData: keepPreviousData,
  })
  const exportMutation = useMutation({
    mutationFn: exportCashLedger,
    onSuccess: () => message.success(t('financeDetail.exported')),
    onError: (error) =>
      message.error(
        requestErrorMessage(error, t('financeDetail.exportFailed')),
      ),
  })
  const visibleData = queryEnabled ? ledgerQuery.data : undefined

  const handleRefresh = async () => {
    const result = await ledgerQuery.refetch()
    if (result.isError) {
      message.error(
        requestErrorMessage(result.error, t('financeDetail.refreshFailed')),
      )
    }
  }

  return (
    <CashLedgerWorkspace
      model={{
        columns: resizableColumns,
        components,
        counterpartyOptions,
        dispatch,
        error: ledgerQuery.error,
        exportPending: exportMutation.isPending,
        formatCellValue,
        isError: ledgerQuery.isError,
        isFetching: ledgerQuery.isFetching,
        onExport: () => exportMutation.mutate(ledgerFilter),
        onRefresh: () => void handleRefresh(),
        optionsLoading,
        pageSize,
        queryEnabled,
        rows: visibleData?.page.content || [],
        scrollX: tableScrollX,
        settlementCompanies,
        state,
        summary: visibleData?.summary,
        total: visibleData?.page.totalElements || 0,
      }}
    />
  )
}
