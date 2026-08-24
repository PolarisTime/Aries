import {
  ClearOutlined,
  DownOutlined,
  FilterOutlined,
  ReloadOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  type TableColumnsType,
  type TableProps,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useMemo, useReducer, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getCashLedger } from '@/api/finance/cash-ledger'
import {
  type FinanceBalance,
  type FinanceDirection,
  type FinanceOverviewQuery,
  type FinanceOverviewSummary,
  getFinanceOverview,
} from '@/api/finance/finance-overview'
import { AppProPage } from '@/components/AppProPage'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { EntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'
import { DISPLAY_DATE_FORMAT } from '@/utils/formatters'
import { sumColumnWidths } from '@/views/modules/components/business-grid-table-utils'
import {
  buildCounterpartyLedgerQuery,
  COUNTERPARTY_LEDGER_EMPTY_DESCRIPTION,
} from './finance-overview-support'

const DIRECTION_OPTIONS = [
  { label: '应收', value: 'RECEIVABLE' },
  { label: '应付', value: 'PAYABLE' },
]

const PAYABLE_COUNTERPARTY_OPTIONS = [
  { label: '全部往来方', value: '' },
  { label: '供应商', value: '供应商' },
  { label: '物流商', value: '物流商' },
]

interface FinanceOverviewState {
  settlementCompanyId?: EntityId
  asOfDate: string
  direction: FinanceDirection
  counterpartyType?: string
  keywordInput: string
  keyword?: string
  onlyOpen: boolean
  page: number
  pageSize?: number
}

type FinanceOverviewAction =
  | {
      type: 'update'
      values: Partial<FinanceOverviewState>
    }
  | { type: 'reset-filters' }

type FinanceOverviewDispatch = React.Dispatch<FinanceOverviewAction>

interface SummaryItem {
  key: string
  label: string
  value?: number
}

function createInitialState(): FinanceOverviewState {
  return {
    asOfDate: dayjs().format('YYYY-MM-DD'),
    direction: 'RECEIVABLE',
    keywordInput: '',
    onlyOpen: false,
    page: 1,
  }
}

function financeOverviewReducer(
  state: FinanceOverviewState,
  action: FinanceOverviewAction,
): FinanceOverviewState {
  if (action.type === 'reset-filters') {
    return { ...createInitialState(), pageSize: state.pageSize }
  }
  return { ...state, ...action.values }
}

function requestErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

function displayText(value: unknown): string {
  const text = String(value ?? '').trim()
  return text || '--'
}

function buildSummaryItems(
  direction: FinanceDirection,
  summary?: FinanceOverviewSummary,
): SummaryItem[] {
  if (direction === 'RECEIVABLE') {
    return [
      { key: 'recognized', label: '应收', value: summary?.receivableAmount },
      { key: 'settled', label: '已收', value: summary?.receivedAmount },
      { key: 'outstanding', label: '未收', value: summary?.unreceivedAmount },
      { key: 'advance', label: '预收', value: summary?.advanceReceiptAmount },
    ]
  }
  return [
    { key: 'recognized', label: '应付', value: summary?.payableAmount },
    { key: 'settled', label: '已付', value: summary?.paidAmount },
    { key: 'outstanding', label: '未付', value: summary?.unpaidAmount },
    { key: 'advance', label: '预付', value: summary?.advancePaymentAmount },
  ]
}

function buildBalanceColumns(
  direction: FinanceDirection,
  formatAmount: (value: number | undefined) => string,
  onLedger: (record: FinanceBalance) => void,
  onQuickCreate: (
    record: FinanceBalance,
    moduleKey: 'receipt' | 'payment',
  ) => void,
): TableColumnsType<FinanceBalance> {
  return [
    {
      title: '往来类型',
      dataIndex: 'counterpartyType',
      width: 100,
      fixed: 'left',
    },
    {
      title: '往来方编码',
      dataIndex: 'counterpartyCode',
      width: 175,
      ellipsis: true,
      render: displayText,
    },
    {
      title: '往来方',
      dataIndex: 'counterpartyName',
      width: 220,
      ellipsis: true,
      render: displayText,
    },
    {
      title: direction === 'RECEIVABLE' ? '应收 (元)' : '应付 (元)',
      dataIndex: 'recognizedAmount',
      width: 150,
      align: 'right',
      render: formatAmount,
    },
    {
      title: direction === 'RECEIVABLE' ? '已收 (元)' : '已付 (元)',
      dataIndex: 'settledAmount',
      width: 150,
      align: 'right',
      render: formatAmount,
    },
    {
      title: direction === 'RECEIVABLE' ? '未收 (元)' : '未付 (元)',
      dataIndex: 'outstandingAmount',
      width: 150,
      align: 'right',
      render: (value) => {
        const amount = Number(value ?? 0)
        return (
          <span
            className={
              amount > 0 ? 'finance-overview-outstanding-value' : undefined
            }
          >
            {formatAmount(value)}
          </span>
        )
      },
    },
    {
      title: direction === 'RECEIVABLE' ? '预收 (元)' : '预付 (元)',
      dataIndex: 'advanceAmount',
      width: 150,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '结算主体',
      dataIndex: 'settlementCompanyName',
      width: 180,
      ellipsis: true,
      render: displayText,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 210,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => onLedger(record)}>
            对账明细
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() =>
              onQuickCreate(
                record,
                direction === 'RECEIVABLE' ? 'receipt' : 'payment',
              )
            }
          >
            {direction === 'RECEIVABLE' ? '去收款' : '去付款'}
          </Button>
        </Space>
      ),
    },
  ]
}

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

function FinanceCounterpartyLedgerModal({
  balance,
  formatAmount,
  onClose,
  open,
}: {
  balance: FinanceBalance | null
  formatAmount: (value: number | undefined) => string
  onClose: () => void
  open: boolean
}) {
  const queryParams = balance
    ? buildCounterpartyLedgerQuery(balance)
    : undefined
  const query = useQuery({
    queryKey: ['finance', 'counterparty-ledger', balance?.key],
    queryFn: ({ signal }) => {
      if (!queryParams) {
        throw new Error('缺少往来方信息')
      }
      return getCashLedger(queryParams, signal)
    },
    enabled: open && Boolean(balance),
  })
  const rows = query.data?.page.content || []
  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      open={open}
      onCancel={onClose}
      title={
        <Space size={8}>
          <span>
            {balance ? `${balance.counterpartyName} · 对账明细` : '对账明细'}
          </span>
          <Tag color="blue">资金流水</Tag>
        </Space>
      }
      width={960}
    >
      {query.isError ? (
        <Alert
          type="error"
          showIcon
          title="加载对账明细失败"
          action={<Button onClick={() => void query.refetch()}>重试</Button>}
        />
      ) : (
        <Table
          size="small"
          rowKey="key"
          loading={query.isFetching}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 760, y: 520 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={COUNTERPARTY_LEDGER_EMPTY_DESCRIPTION}
              />
            ),
          }}
          columns={[
            { title: '日期', dataIndex: 'businessDate', width: 110 },
            { title: '流水类型', dataIndex: 'flowType', width: 100 },
            { title: '单号', dataIndex: 'documentNo', width: 160 },
            {
              title: '收入',
              dataIndex: 'incomeAmount',
              align: 'right' as const,
              width: 120,
              render: formatAmount,
            },
            {
              title: '支出',
              dataIndex: 'expenseAmount',
              align: 'right' as const,
              width: 120,
              render: formatAmount,
            },
          ]}
        />
      )}
    </Modal>
  )
}

/** 主筛选行 + 高级筛选行；高级区展开状态为组件内部 UI 状态 */
function FinanceOverviewFilters({
  dispatch,
  optionsLoading,
  settlementCompanies,
  settlementCompanyId,
  state,
}: {
  dispatch: FinanceOverviewDispatch
  optionsLoading: boolean
  settlementCompanies: { label: string; value: string | number }[]
  settlementCompanyId?: string
  state: FinanceOverviewState
}) {
  const { t } = useTranslation()
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)

  const commitKeyword = (value: string): void => {
    const normalized = value.trim()
    dispatch({
      type: 'update',
      values: {
        keywordInput: value,
        keyword: normalized || undefined,
        page: 1,
      },
    })
  }

  return (
    <section className="finance-filter-shell finance-overview-toolbar">
      <div className="finance-filter-primary-row finance-overview-primary-row">
        <Segmented
          aria-label="财务方向"
          value={state.direction}
          options={DIRECTION_OPTIONS}
          onChange={(value) => {
            dispatch({
              type: 'update',
              values: {
                direction: value as FinanceDirection,
                counterpartyType: undefined,
                page: 1,
              },
            })
          }}
        />
        <div className="finance-overview-filter">
          <Typography.Text type="secondary">结算主体</Typography.Text>
          <Select
            aria-label="结算主体"
            aria-required="true"
            value={settlementCompanyId}
            options={settlementCompanies}
            loading={optionsLoading}
            showSearch={{ optionFilterProp: 'label' }}
            placeholder="请选择结算主体"
            onChange={(value) => {
              dispatch({
                type: 'update',
                values: {
                  settlementCompanyId: value ? String(value) : undefined,
                  page: 1,
                },
              })
            }}
          />
        </div>
        <div className="finance-overview-filter finance-overview-filter--keyword">
          <Typography.Text type="secondary">往来方</Typography.Text>
          <Input
            aria-label="往来方"
            value={state.keywordInput}
            allowClear
            placeholder="名称、拼音或编码"
            onChange={(event) => {
              const value = event.target.value
              if (!value) {
                commitKeyword('')
                return
              }
              dispatch({ type: 'update', values: { keywordInput: value } })
            }}
            onBlur={(event) => commitKeyword(event.target.value)}
            onPressEnter={(event) => commitKeyword(event.currentTarget.value)}
          />
        </div>
        <div className="finance-overview-filter finance-overview-filter--date">
          <Typography.Text type="secondary">截止日期</Typography.Text>
          <DatePicker
            aria-label="截止日期"
            value={dayjs(state.asOfDate)}
            allowClear={false}
            format={DISPLAY_DATE_FORMAT}
            onChange={(value) => {
              if (value) {
                dispatch({
                  type: 'update',
                  values: {
                    asOfDate: value.format('YYYY-MM-DD'),
                    page: 1,
                  },
                })
              }
            }}
          />
        </div>
        <Segmented
          aria-label="余额范围"
          value={state.onlyOpen ? 'open' : 'all'}
          options={[
            { label: '全部', value: 'all' },
            { label: '有余额', value: 'open' },
          ]}
          onChange={(value) => {
            dispatch({
              type: 'update',
              values: { onlyOpen: value === 'open', page: 1 },
            })
          }}
        />
        <div className="finance-filter-actions">
          <Button
            icon={<ClearOutlined />}
            onClick={() => dispatch({ type: 'reset-filters' })}
          >
            {t('common.reset')}
          </Button>
          <Button
            aria-controls="finance-overview-advanced-filters"
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
          id="finance-overview-advanced-filters"
        >
          {state.direction === 'PAYABLE' ? (
            <div className="finance-overview-filter">
              <Typography.Text type="secondary">往来类型</Typography.Text>
              <Select
                aria-label="往来类型"
                value={state.counterpartyType || ''}
                options={PAYABLE_COUNTERPARTY_OPTIONS}
                onChange={(value) => {
                  dispatch({
                    type: 'update',
                    values: {
                      counterpartyType: value || undefined,
                      page: 1,
                    },
                  })
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

/** 往来余额表格：列渲染、分页与空态展示 */
function FinanceOverviewTableSection({
  components,
  columns,
  loading,
  onPageChange,
  page,
  pageSize,
  queryEnabled,
  rows,
  scrollX,
  total,
}: {
  columns: TableColumnsType<FinanceBalance>
  components: TableProps<FinanceBalance>['components']
  loading: boolean
  onPageChange: (page: number, pageSize: number) => void
  page: number
  pageSize: number
  queryEnabled: boolean
  rows: FinanceBalance[]
  scrollX: number
  total: number
}) {
  return (
    <section className="finance-overview-table">
      <Table
        rowKey="key"
        size="small"
        columns={columns}
        components={components}
        dataSource={rows}
        loading={loading}
        scroll={{ x: scrollX }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={queryEnabled ? '暂无往来余额' : '请选择结算主体'}
            />
          ),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
          onChange: onPageChange,
        }}
      />
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
        to: `/${moduleKey}`,
        search: new URLSearchParams({
          create: '1',
          counterpartyType: record.counterpartyType,
          counterpartyId: record.counterpartyId,
          counterpartyName: record.counterpartyName,
          settlementCompanyId: record.settlementCompanyId,
          settlementCompanyName: record.settlementCompanyName,
        }).toString(),
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
