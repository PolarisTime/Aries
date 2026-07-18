import { ReloadOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  Segmented,
  Select,
  Statistic,
  Table,
  type TableColumnsType,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type FinanceBalance,
  type FinanceDirection,
  type FinanceOverviewQuery,
  getFinanceOverview,
} from '@/api/finance-overview'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { EntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'

const DIRECTION_OPTIONS = [
  { label: '应收', value: 'RECEIVABLE' },
  { label: '应付', value: 'PAYABLE' },
]

const PAYABLE_COUNTERPARTY_OPTIONS = [
  { label: '全部往来方', value: '' },
  { label: '供应商', value: '供应商' },
  { label: '物流商', value: '物流商' },
]

function requestErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

function displayText(value: unknown): string {
  const text = String(value ?? '').trim()
  return text || '--'
}

export function FinanceOverviewView() {
  const defaultPageSize = useDefaultPageSize()
  const { formatCellValue } = useModuleDisplaySupport()
  const [settlementCompanyId, setSettlementCompanyId] = useState<EntityId>()
  const [asOfDate, setAsOfDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [direction, setDirection] = useState<FinanceDirection>('RECEIVABLE')
  const [counterpartyType, setCounterpartyType] = useState<string>()
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState<string>()
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const { settlementCompanies, isLoading: optionsLoading } = useMasterOptions({
    settlementCompanies: true,
  })

  useEffect(() => {
    setPage(1)
    setPageSize(defaultPageSize)
  }, [defaultPageSize])

  useEffect(() => {
    if (!settlementCompanyId && settlementCompanies[0]?.value) {
      setSettlementCompanyId(String(settlementCompanies[0].value))
    }
  }, [settlementCompanies, settlementCompanyId])

  const queryParams = useMemo<FinanceOverviewQuery>(
    () => ({
      settlementCompanyId: settlementCompanyId || '',
      asOfDate,
      direction,
      counterpartyType:
        direction === 'PAYABLE' ? counterpartyType || undefined : '客户',
      keyword,
      onlyOpen,
      page: page - 1,
      size: pageSize,
    }),
    [
      asOfDate,
      counterpartyType,
      direction,
      keyword,
      onlyOpen,
      page,
      pageSize,
      settlementCompanyId,
    ],
  )
  const queryEnabled = Boolean(settlementCompanyId)
  const overviewQuery = useQuery({
    queryKey: QUERY_KEYS.financeOverview(queryParams),
    queryFn: ({ signal }) => getFinanceOverview(queryParams, signal),
    enabled: queryEnabled,
    placeholderData: keepPreviousData,
  })

  const commitKeyword = (value: string): void => {
    const normalized = value.trim()
    setKeywordInput(value)
    setKeyword(normalized || undefined)
    setPage(1)
  }

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

  const summary = overviewQuery.data?.summary
  const summaryItems =
    direction === 'RECEIVABLE'
      ? [
          {
            key: 'recognized',
            label: '应收',
            value: summary?.receivableAmount,
          },
          { key: 'settled', label: '已收', value: summary?.receivedAmount },
          {
            key: 'outstanding',
            label: '未收',
            value: summary?.unreceivedAmount,
          },
          {
            key: 'advance',
            label: '预收',
            value: summary?.advanceReceiptAmount,
          },
        ]
      : [
          { key: 'recognized', label: '应付', value: summary?.payableAmount },
          { key: 'settled', label: '已付', value: summary?.paidAmount },
          { key: 'outstanding', label: '未付', value: summary?.unpaidAmount },
          {
            key: 'advance',
            label: '预付',
            value: summary?.advancePaymentAmount,
          },
        ]

  const columns = useMemo<TableColumnsType<FinanceBalance>>(
    () => [
      {
        title: '往来类型',
        dataIndex: 'counterpartyType',
        width: 100,
        fixed: 'left',
      },
      {
        title: '往来方编码',
        dataIndex: 'counterpartyCode',
        width: 150,
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
        title: direction === 'RECEIVABLE' ? '应收' : '应付',
        dataIndex: 'recognizedAmount',
        width: 150,
        align: 'right',
        render: formatAmount,
      },
      {
        title: direction === 'RECEIVABLE' ? '已收' : '已付',
        dataIndex: 'settledAmount',
        width: 150,
        align: 'right',
        render: formatAmount,
      },
      {
        title: direction === 'RECEIVABLE' ? '未收' : '未付',
        dataIndex: 'outstandingAmount',
        width: 150,
        align: 'right',
        render: formatAmount,
      },
      {
        title: direction === 'RECEIVABLE' ? '预收' : '预付',
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
    ],
    [direction, formatAmount],
  )

  const rows = overviewQuery.data?.balances.content || []
  const total = overviewQuery.data?.balances.totalElements || 0

  return (
    <div className="module-page-stack finance-overview-page">
      <div className="module-grid-workspace">
        <header className="module-workspace-header">
          <div className="module-workspace-heading">
            <div className="module-workspace-title-row">
              <span className="module-workspace-kicker">Finance</span>
              <h1 className="module-workspace-title">财务概览</h1>
            </div>
          </div>
          <Tooltip title="刷新">
            <Button
              aria-label="刷新财务概览"
              icon={<ReloadOutlined />}
              loading={overviewQuery.isFetching}
              disabled={!queryEnabled || overviewQuery.isFetching}
              onClick={() => void handleRefresh()}
            />
          </Tooltip>
        </header>

        <section className="finance-overview-toolbar">
          <Segmented
            aria-label="财务方向"
            value={direction}
            options={DIRECTION_OPTIONS}
            onChange={(value) => {
              setDirection(value as FinanceDirection)
              setCounterpartyType(undefined)
              setPage(1)
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
                setSettlementCompanyId(value ? String(value) : undefined)
                setPage(1)
              }}
            />
          </div>
          <div className="finance-overview-filter finance-overview-filter--date">
            <Typography.Text type="secondary">截止日期</Typography.Text>
            <DatePicker
              aria-label="截止日期"
              value={dayjs(asOfDate)}
              allowClear={false}
              onChange={(value) => {
                if (value) setAsOfDate(value.format('YYYY-MM-DD'))
                setPage(1)
              }}
            />
          </div>
          {direction === 'PAYABLE' ? (
            <div className="finance-overview-filter">
              <Typography.Text type="secondary">往来类型</Typography.Text>
              <Select
                aria-label="往来类型"
                value={counterpartyType || ''}
                options={PAYABLE_COUNTERPARTY_OPTIONS}
                onChange={(value) => {
                  setCounterpartyType(value || undefined)
                  setPage(1)
                }}
              />
            </div>
          ) : null}
          <div className="finance-overview-filter finance-overview-filter--keyword">
            <Typography.Text type="secondary">往来方</Typography.Text>
            <Input
              aria-label="往来方"
              value={keywordInput}
              allowClear
              placeholder="名称、编码或ID"
              onChange={(event) => {
                const value = event.target.value
                setKeywordInput(value)
                if (!value) commitKeyword('')
              }}
              onBlur={(event) => commitKeyword(event.target.value)}
              onPressEnter={(event) => commitKeyword(event.currentTarget.value)}
            />
          </div>
          <Segmented
            aria-label="余额范围"
            value={onlyOpen ? 'open' : 'all'}
            options={[
              { label: '全部', value: 'all' },
              { label: '有余额', value: 'open' },
            ]}
            onChange={(value) => {
              setOnlyOpen(value === 'open')
              setPage(1)
            }}
          />
        </section>

        {overviewQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title="加载财务概览失败"
            description={requestErrorMessage(overviewQuery.error, '请稍后重试')}
          />
        ) : null}

        <section className="finance-overview-summary">
          {summaryItems.map((item) => (
            <div
              key={item.key}
              className={`finance-overview-metric finance-overview-metric--${item.key}`}
            >
              <Statistic
                title={item.label}
                value={item.value ?? 0}
                precision={2}
                prefix="¥"
              />
            </div>
          ))}
        </section>

        <section className="finance-overview-table">
          <Table
            rowKey="key"
            size="small"
            columns={columns}
            dataSource={rows}
            loading={queryEnabled && overviewQuery.isFetching}
            scroll={{ x: 1250, y: 'calc(100vh - 410px)' }}
            locale={{
              emptyText: queryEnabled ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无往来余额"
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
