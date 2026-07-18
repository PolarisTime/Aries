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
  Table,
  type TableColumnsType,
  Tooltip,
  Typography,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
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
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { EntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'

const DEFAULT_PAGE_SIZE = 20

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

export function CashLedgerView() {
  const [settlementCompanyId, setSettlementCompanyId] = useState<EntityId>()
  const [startDate, setStartDate] = useState<string>()
  const [endDate, setEndDate] = useState<string>()
  const [counterpartyType, setCounterpartyType] = useState<string>()
  const [counterpartyId, setCounterpartyId] = useState<EntityId>()
  const [flowType, setFlowType] = useState<CashLedgerFlowType>()
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState<string>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const { formatCellValue } = useModuleDisplaySupport()
  const {
    settlementCompanies,
    customers,
    suppliers,
    carriers,
    isLoading: optionsLoading,
  } = useMasterOptions({
    settlementCompanies: true,
    customers: counterpartyType === '客户',
    suppliers: counterpartyType === '供应商',
    carriers: counterpartyType === '物流商',
  })
  const queryEnabled = Boolean(settlementCompanyId)

  const counterpartyOptions = useMemo(() => {
    if (counterpartyType === '客户') {
      return customers.map(({ id, label }) => ({ value: id, label }))
    }
    if (counterpartyType === '供应商') {
      return suppliers.map(({ id, label }) => ({ value: id, label }))
    }
    if (counterpartyType === '物流商') {
      return carriers.flatMap(({ id, label }) =>
        id ? [{ value: id, label }] : [],
      )
    }
    return []
  }, [carriers, counterpartyType, customers, suppliers])

  const ledgerFilter = useMemo<CashLedgerFilter>(
    () => ({
      settlementCompanyId: settlementCompanyId || '',
      startDate,
      endDate,
      counterpartyType,
      counterpartyId,
      flowType,
      keyword,
    }),
    [
      counterpartyId,
      counterpartyType,
      endDate,
      flowType,
      keyword,
      settlementCompanyId,
      startDate,
    ],
  )
  const ledgerQueryParams = useMemo<CashLedgerQuery>(
    () => ({ ...ledgerFilter, page: page - 1, size: pageSize }),
    [ledgerFilter, page, pageSize],
  )
  const dateRangeValue = useMemo<[Dayjs, Dayjs] | null>(
    () => (startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null),
    [endDate, startDate],
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

  const commitKeyword = (value: string) => {
    const normalized = value.trim()
    setKeywordInput(value)
    setKeyword(normalized || undefined)
    setPage(1)
  }

  const handleRefresh = async () => {
    const result = await ledgerQuery.refetch()
    if (result.isError) {
      message.error(requestErrorMessage(result.error, '刷新资金流水失败'))
    }
  }

  const formatAmount = (value: number | undefined) =>
    value == null ? '--' : formatCellValue(value, 'amount')

  const summaryItems = (
    summary: CashLedgerSummary,
  ): DescriptionsProps['items'] => [
    {
      key: 'openingBalance',
      label: '期初余额',
      children: formatAmount(summary.openingBalance),
    },
    {
      key: 'periodIncome',
      label: '期间收入',
      children: formatAmount(summary.periodIncome),
    },
    {
      key: 'periodExpense',
      label: '期间支出',
      children: formatAmount(summary.periodExpense),
    },
    {
      key: 'closingBalance',
      label: '期末余额',
      children: formatAmount(summary.closingBalance),
    },
  ]

  const columns: TableColumnsType<CashLedgerLine> = [
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
      render: formatAmount,
    },
    {
      title: '支出',
      dataIndex: 'expenseAmount',
      width: 130,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '累计余额',
      dataIndex: 'runningBalance',
      width: 140,
      align: 'right',
      render: formatAmount,
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

  const visibleData = queryEnabled ? ledgerQuery.data : undefined
  const rows = visibleData?.page.content || []
  const total = visibleData?.page.totalElements || 0

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
                  loading={exportMutation.isPending}
                  disabled={
                    !queryEnabled ||
                    ledgerQuery.isFetching ||
                    exportMutation.isPending
                  }
                  onClick={() => exportMutation.mutate(ledgerFilter)}
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
                  loading={ledgerQuery.isFetching}
                  disabled={
                    !queryEnabled ||
                    exportMutation.isPending ||
                    ledgerQuery.isFetching
                  }
                  onClick={() => void handleRefresh()}
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
              value={settlementCompanyId}
              options={settlementCompanies}
              loading={optionsLoading}
              showSearch={{ optionFilterProp: 'label' }}
              placeholder="请选择结算主体"
              onChange={(value) => {
                setSettlementCompanyId(value ? String(value) : undefined)
                setPage(1)
              }}
            />
          </div>
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">业务日期</Typography.Text>
            <DatePicker.RangePicker
              aria-label="业务日期"
              value={dateRangeValue}
              onChange={(_, dateStrings) => {
                setStartDate(dateStrings[0] || undefined)
                setEndDate(dateStrings[1] || undefined)
                setPage(1)
              }}
            />
          </div>
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">往来方类型</Typography.Text>
            <Select
              aria-label="往来方类型"
              value={counterpartyType}
              options={COUNTERPARTY_TYPE_OPTIONS}
              allowClear
              placeholder="全部往来方类型"
              onChange={(value) => {
                setCounterpartyType(value)
                setCounterpartyId(undefined)
                setPage(1)
              }}
            />
          </div>
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">往来方</Typography.Text>
            <Select
              aria-label="往来方"
              value={counterpartyId}
              options={counterpartyOptions}
              loading={optionsLoading}
              disabled={!counterpartyType}
              showSearch={{ optionFilterProp: 'label' }}
              allowClear
              placeholder={counterpartyType ? '全部往来方' : '先选择类型'}
              onChange={(value) => {
                setCounterpartyId(value ? String(value) : undefined)
                setPage(1)
              }}
            />
          </div>
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">流水类型</Typography.Text>
            <Select
              aria-label="流水类型"
              value={flowType}
              options={FLOW_TYPE_OPTIONS}
              allowClear
              placeholder="全部流水类型"
              onChange={(value) => {
                setFlowType(value)
                setPage(1)
              }}
            />
          </div>
          <div className="cash-ledger-filter">
            <Typography.Text type="secondary">关键字</Typography.Text>
            <Input
              aria-label="关键字"
              value={keywordInput}
              allowClear
              placeholder="单号、往来方、用途、经办人或备注"
              onChange={(event) => {
                const value = event.target.value
                setKeywordInput(value)
                if (!value) commitKeyword('')
              }}
              onBlur={(event) => commitKeyword(event.target.value)}
              onPressEnter={(event) => commitKeyword(event.currentTarget.value)}
            />
          </div>
        </section>

        {ledgerQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title="加载资金流水失败"
            description={requestErrorMessage(ledgerQuery.error, '请稍后重试')}
          />
        ) : null}

        {visibleData ? (
          <section className="cash-ledger-summary">
            <Descriptions
              size="small"
              bordered
              column={{ xs: 2, md: 4 }}
              items={summaryItems(visibleData.summary)}
            />
          </section>
        ) : null}

        <section className="cash-ledger-table">
          <Table
            rowKey="key"
            size="small"
            columns={columns}
            dataSource={rows}
            loading={queryEnabled && ledgerQuery.isFetching}
            scroll={{ x: 1530, y: 'calc(100vh - 410px)' }}
            locale={{
              emptyText: queryEnabled ? (
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
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (count) => `共 ${count} 条`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPageSize === pageSize ? nextPage : 1)
                setPageSize(nextPageSize)
              },
            }}
          />
        </section>
      </div>
    </div>
  )
}
