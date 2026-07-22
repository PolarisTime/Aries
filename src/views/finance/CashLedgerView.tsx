import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
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
  Tooltip,
  Typography,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { type Dispatch, useMemo, useReducer } from 'react'
import {
  type CashLedgerFilter,
  type CashLedgerFlowType,
  type CashLedgerLine,
  type CashLedgerQuery,
  type CashLedgerSummary,
  exportCashLedger,
  getCashLedger,
} from '@/api/cash-ledger'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { EntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'

const COUNTERPARTY_TYPE_OPTIONS = ['客户', '供应商', '物流商'].map((value) => ({
  value,
  label: value,
}))

const FLOW_TYPE_LABELS: Record<CashLedgerFlowType, string> = {
  RECEIPT: '收款',
  PAYMENT: '付款',
  PAYMENT_REVERSAL: '付款冲销',
  RECEIPT_REVERSAL: '收款冲销',
}

const FLOW_TYPE_OPTIONS = Object.entries(FLOW_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
)

const PURPOSE_LABELS: Record<string, string> = {
  CUSTOMER_STATEMENT_SETTLEMENT: '客户结算收款',
  SUPPLIER_PREPAYMENT_REFUND: '供应商预付款退款',
  SUPPLIER_OTHER_RECEIPT: '供应商其他收款',
  STATEMENT_SETTLEMENT: '对账结算',
  PURCHASE_PREPAYMENT: '采购预付款',
  SUPPLIER_PAYMENT: '供应商总额付款',
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

interface CashLedgerState {
  observedDefaultPageSize: number
  settlementCompanyId?: EntityId
  startDate?: string
  endDate?: string
  counterpartyType?: string
  counterpartyId?: EntityId
  flowType?: CashLedgerFlowType
  keywordInput: string
  keyword?: string
  page: number
  pageSizeOverride?: number
}

type CashLedgerAction =
  | { type: 'settlement-company-changed'; value?: EntityId }
  | { type: 'date-range-changed'; startDate?: string; endDate?: string }
  | { type: 'counterparty-type-changed'; value?: string }
  | { type: 'counterparty-changed'; value?: EntityId }
  | { type: 'flow-type-changed'; value?: CashLedgerFlowType }
  | { type: 'keyword-input-changed'; value: string }
  | { type: 'keyword-committed'; value: string }
  | { type: 'pagination-changed'; page: number; pageSize: number }
  | { type: 'default-page-size-changed'; value: number }

function createInitialLedgerState(defaultPageSize: number): CashLedgerState {
  return {
    keywordInput: '',
    observedDefaultPageSize: defaultPageSize,
    page: 1,
  }
}

function cashLedgerReducer(
  state: CashLedgerState,
  action: CashLedgerAction,
): CashLedgerState {
  switch (action.type) {
    case 'settlement-company-changed':
      return { ...state, settlementCompanyId: action.value, page: 1 }
    case 'date-range-changed':
      return {
        ...state,
        startDate: action.startDate,
        endDate: action.endDate,
        page: 1,
      }
    case 'counterparty-type-changed':
      return {
        ...state,
        counterpartyType: action.value,
        counterpartyId: undefined,
        page: 1,
      }
    case 'counterparty-changed':
      return { ...state, counterpartyId: action.value, page: 1 }
    case 'flow-type-changed':
      return { ...state, flowType: action.value, page: 1 }
    case 'keyword-input-changed':
      return action.value
        ? { ...state, keywordInput: action.value }
        : { ...state, keywordInput: '', keyword: undefined, page: 1 }
    case 'keyword-committed': {
      const normalized = action.value.trim()
      return {
        ...state,
        keywordInput: action.value,
        keyword: normalized || undefined,
        page: 1,
      }
    }
    case 'pagination-changed':
      return {
        ...state,
        page: action.page,
        pageSizeOverride: action.pageSize,
      }
    case 'default-page-size-changed':
      return {
        ...state,
        observedDefaultPageSize: action.value,
        page: 1,
        pageSizeOverride: undefined,
      }
  }
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
  summary: CashLedgerSummary,
  formatCellValue: FormatCellValue,
): DescriptionsProps['items'] {
  return [
    {
      key: 'openingBalance',
      label: '期初余额',
      children: formatAmount(formatCellValue, summary.openingBalance),
    },
    {
      key: 'periodIncome',
      label: '期间收入',
      children: formatAmount(formatCellValue, summary.periodIncome),
    },
    {
      key: 'periodExpense',
      label: '期间支出',
      children: formatAmount(formatCellValue, summary.periodExpense),
    },
    {
      key: 'closingBalance',
      label: '期末余额',
      children: formatAmount(formatCellValue, summary.closingBalance),
    },
  ]
}

function buildColumns(
  formatCellValue: FormatCellValue,
): TableColumnsType<CashLedgerLine> {
  return [
    {
      title: '业务日期',
      dataIndex: 'businessDate',
      width: 120,
      fixed: 'left',
      render: (value) => formatCellValue(value, 'date'),
    },
    {
      title: '流水类型',
      dataIndex: 'flowType',
      width: 120,
      render: (value: CashLedgerFlowType) => FLOW_TYPE_LABELS[value] || value,
    },
    {
      title: '单号',
      dataIndex: 'documentNo',
      width: 180,
      ellipsis: true,
      render: displayText,
    },
    {
      title: '往来方类型',
      dataIndex: 'counterpartyType',
      width: 110,
      render: displayText,
    },
    {
      title: '往来方名称',
      dataIndex: 'counterpartyName',
      width: 180,
      ellipsis: true,
      render: displayText,
    },
    {
      title: '用途',
      dataIndex: 'purpose',
      width: 180,
      ellipsis: true,
      render: (value) => PURPOSE_LABELS[String(value)] || displayText(value),
    },
    {
      title: '收入',
      dataIndex: 'incomeAmount',
      width: 130,
      align: 'right',
      render: (value) => formatAmount(formatCellValue, value),
    },
    {
      title: '支出',
      dataIndex: 'expenseAmount',
      width: 130,
      align: 'right',
      render: (value) => formatAmount(formatCellValue, value),
    },
    {
      title: '累计余额',
      dataIndex: 'runningBalance',
      width: 140,
      align: 'right',
      render: (value) => formatAmount(formatCellValue, value),
    },
    {
      title: '经办人',
      dataIndex: 'operatorName',
      width: 120,
      render: displayText,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 220,
      ellipsis: true,
      render: displayText,
    },
  ]
}

interface CashLedgerWorkspaceModel {
  columns: TableColumnsType<CashLedgerLine>
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
  settlementCompanies: SelectProps['options']
  state: CashLedgerState
  summary?: CashLedgerSummary
  total: number
}

function CashLedgerWorkspace({ model }: { model: CashLedgerWorkspaceModel }) {
  const dateRangeValue: [Dayjs, Dayjs] | null =
    model.state.startDate && model.state.endDate
      ? [dayjs(model.state.startDate), dayjs(model.state.endDate)]
      : null

  return (
    <div className="module-page-stack cash-ledger-page">
      <div className="module-grid-workspace">
        <header className="module-workspace-header">
          <div className="module-workspace-heading">
            <div className="module-workspace-title-row">
              <span className="module-workspace-kicker">Finance</span>
              <h1 className="module-workspace-title">资金流水</h1>
            </div>
          </div>
          <div className="cash-ledger-actions">
            <Tooltip title="导出当前筛选结果">
              <span>
                <Button
                  icon={<DownloadOutlined />}
                  loading={model.exportPending}
                  disabled={
                    !model.queryEnabled ||
                    model.isFetching ||
                    model.exportPending
                  }
                  onClick={model.onExport}
                >
                  导出
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="刷新">
              <span>
                <Button
                  aria-label="刷新资金流水"
                  icon={<ReloadOutlined />}
                  loading={model.isFetching}
                  disabled={
                    !model.queryEnabled ||
                    model.exportPending ||
                    model.isFetching
                  }
                  onClick={model.onRefresh}
                />
              </span>
            </Tooltip>
          </div>
        </header>

        <section className="cash-ledger-filters">
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">结算主体</Typography.Text>
            <Select
              aria-label="结算主体"
              aria-required="true"
              value={model.state.settlementCompanyId}
              options={model.settlementCompanies}
              loading={model.optionsLoading}
              showSearch={{ optionFilterProp: 'label' }}
              placeholder="请选择结算主体"
              onChange={(value) => {
                model.dispatch({
                  type: 'settlement-company-changed',
                  value: value ? String(value) : undefined,
                })
              }}
            />
          </div>
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">业务日期</Typography.Text>
            <DatePicker.RangePicker
              aria-label="业务日期"
              value={dateRangeValue}
              onChange={(_, dateStrings) => {
                model.dispatch({
                  type: 'date-range-changed',
                  startDate: dateStrings[0] || undefined,
                  endDate: dateStrings[1] || undefined,
                })
              }}
            />
          </div>
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">往来方类型</Typography.Text>
            <Select
              aria-label="往来方类型"
              value={model.state.counterpartyType}
              options={COUNTERPARTY_TYPE_OPTIONS}
              allowClear
              placeholder="全部往来方类型"
              onChange={(value) => {
                model.dispatch({
                  type: 'counterparty-type-changed',
                  value,
                })
              }}
            />
          </div>
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">往来方</Typography.Text>
            <Select
              aria-label="往来方"
              value={model.state.counterpartyId}
              options={model.counterpartyOptions}
              loading={model.optionsLoading}
              disabled={!model.state.counterpartyType}
              showSearch={{ optionFilterProp: 'label' }}
              allowClear
              placeholder={
                model.state.counterpartyType ? '全部往来方' : '先选择类型'
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
            <Typography.Text type="secondary">流水类型</Typography.Text>
            <Select
              aria-label="流水类型"
              value={model.state.flowType}
              options={FLOW_TYPE_OPTIONS}
              allowClear
              placeholder="全部流水类型"
              onChange={(value) => {
                model.dispatch({ type: 'flow-type-changed', value })
              }}
            />
          </div>
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">关键字</Typography.Text>
            <Input
              aria-label="关键字"
              value={model.state.keywordInput}
              allowClear
              placeholder="单号、往来方、用途、经办人或备注"
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
        </section>

        {model.isError ? (
          <Alert
            type="error"
            showIcon
            title="加载资金流水失败"
            description={requestErrorMessage(model.error, '请稍后重试')}
          />
        ) : null}

        {model.summary ? (
          <section className="cash-ledger-summary">
            <Descriptions
              size="small"
              bordered
              column={{ xs: 2, md: 4 }}
              items={buildSummaryItems(model.summary, model.formatCellValue)}
            />
          </section>
        ) : null}

        <section className="cash-ledger-table">
          <Table
            rowKey="key"
            size="small"
            columns={model.columns}
            dataSource={model.rows}
            loading={model.queryEnabled && model.isFetching}
            scroll={{ x: 1530, y: 'calc(100vh - 410px)' }}
            locale={{
              emptyText: model.queryEnabled ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无资金流水"
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="请选择结算主体"
                />
              ),
            }}
            pagination={{
              current: model.state.page,
              pageSize: model.pageSize,
              total: model.total,
              showSizeChanger: true,
              showTotal: (count) => `共 ${count} 条`,
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
  )
}

export function CashLedgerView() {
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
    onSuccess: () => message.success('资金流水已导出'),
    onError: (error) =>
      message.error(requestErrorMessage(error, '导出资金流水失败')),
  })
  const visibleData = queryEnabled ? ledgerQuery.data : undefined

  const handleRefresh = async () => {
    const result = await ledgerQuery.refetch()
    if (result.isError) {
      message.error(requestErrorMessage(result.error, '刷新资金流水失败'))
    }
  }

  return (
    <CashLedgerWorkspace
      model={{
        columns: buildColumns(formatCellValue),
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
        settlementCompanies,
        state,
        summary: visibleData?.summary,
        total: visibleData?.page.totalElements || 0,
      }}
    />
  )
}
