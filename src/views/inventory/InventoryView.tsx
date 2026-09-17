import { ReloadOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  Select,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  getInventoryBalances,
  getInventoryTransactions,
  type InventoryBalance,
  type InventoryTransaction,
} from '@/api/inventory/inventory'
import { AppProPage } from '@/components/AppProPage'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { useHasPermission } from '@/hooks/usePermission'
import type { ModuleOverviewItem } from '@/types/module-page'
import { DISPLAY_DATE_FORMAT } from '@/utils/formatters'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { useTableBodyScrollY } from '@/views/modules/components/use-table-body-scroll-y'

const TRANSACTION_TYPE_KEYS = [
  'PURCHASE_INBOUND',
  'PURCHASE_RETURN',
  'SALES_OUTBOUND',
  'SALES_RETURN',
  'INBOUND',
  'OUTBOUND',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'INITIAL_BALANCE',
] as const

const EMPTY_BALANCES: InventoryBalance[] = []
const EMPTY_TRANSACTIONS: InventoryTransaction[] = []
const EMPTY_OVERVIEW_ITEMS: ModuleOverviewItem[] = []

function requestErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

function displayText(value: unknown) {
  const text = String(value ?? '').trim()
  return text || '--'
}

function sumColumnWidths(columns: { width?: unknown }[]): number {
  return columns.reduce(
    (total, column) =>
      total + (typeof column.width === 'number' ? column.width : 0),
    0,
  )
}

function useWarehouseOptions() {
  const { warehouses, isLoading } = useMasterOptions({ warehouses: true })
  const options = useMemo(
    () =>
      warehouses.map(({ value, label }) => ({
        value,
        label: label || value,
      })),
    [warehouses],
  )
  return { options, isLoading }
}

function useTransactionTypeLabel() {
  const { t } = useTranslation()
  return useCallback(
    (value: string) => {
      const key = value.trim()
      if (!key) return '--'
      return (TRANSACTION_TYPE_KEYS as readonly string[]).includes(key)
        ? t(`inventory.transactionType.${key}`)
        : key
    },
    [t],
  )
}

function useFocusableTableBody(
  shellRef: RefObject<HTMLDivElement | null>,
  label: string,
) {
  useEffect(() => {
    const body = shellRef.current?.querySelector<HTMLElement>('.ant-table-body')
    if (!body) return
    body.tabIndex = 0
    body.setAttribute('role', 'region')
    body.setAttribute('aria-label', label)
  })
}

function InventoryBalancesPanel() {
  const { t } = useTranslation()
  const defaultPageSize = useDefaultPageSize()
  const { formatCellValue } = useModuleDisplaySupport()
  const { shellRef, scrollY, shellStyle } = useTableBodyScrollY()
  useFocusableTableBody(shellRef, t('inventory.tabs.balances'))
  const { options: warehouseOptions, isLoading: warehousesLoading } =
    useWarehouseOptions()
  const [page, setPage] = useState(1)
  const [pageSizeOverride, setPageSizeOverride] = useState<number | null>(null)
  const effectivePageSize = pageSizeOverride ?? defaultPageSize
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [warehouseId, setWarehouseId] = useState<string | undefined>()

  const queryParams = useMemo(
    () => ({
      ...(keyword ? { keyword } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      page: page - 1,
      size: effectivePageSize,
    }),
    [effectivePageSize, keyword, page, warehouseId],
  )
  const balancesQuery = useQuery({
    queryKey: QUERY_KEYS.inventoryBalances(queryParams),
    queryFn: ({ signal }) => getInventoryBalances(queryParams, signal),
    placeholderData: keepPreviousData,
  })
  // 字段级权限：无 inventory:read:cost 时隐藏成本列（后端同时脱敏为 null）。
  const canViewCost = useHasPermission('inventory:read:cost')

  const columns = useMemo<TableColumnsType<InventoryBalance>>(() => {
    const formatNumber = (value: number) => formatCellValue(value, 'number')
    const formatAmount = (value: number) => formatCellValue(value, 'amount')
    return [
      {
        title: t('inventory.columns.materialCode'),
        dataIndex: 'materialCode',
        width: 150,
        fixed: 'left',
        ellipsis: true,
        render: displayText,
      },
      {
        title: t('inventory.columns.brand'),
        dataIndex: 'brand',
        width: 110,
        render: displayText,
      },
      {
        title: t('inventory.columns.material'),
        dataIndex: 'material',
        width: 120,
        render: displayText,
      },
      {
        title: t('inventory.columns.spec'),
        dataIndex: 'spec',
        width: 100,
        render: displayText,
      },
      {
        title: t('inventory.columns.length'),
        dataIndex: 'length',
        width: 90,
        render: displayText,
      },
      {
        title: t('inventory.columns.unit'),
        dataIndex: 'unit',
        width: 80,
        render: displayText,
      },
      {
        title: t('inventory.columns.warehouse'),
        dataIndex: 'warehouseName',
        width: 140,
        ellipsis: true,
        render: displayText,
      },
      {
        title: t('inventory.columns.batchNo'),
        dataIndex: 'batchNo',
        width: 130,
        ellipsis: true,
        render: displayText,
      },
      {
        title: t('inventory.columns.quantity'),
        dataIndex: 'quantity',
        width: 120,
        align: 'right',
        render: formatNumber,
      },
      ...(canViewCost
        ? [
            {
              title: t('inventory.columns.avgUnitCost'),
              dataIndex: 'avgUnitCost',
              width: 130,
              align: 'right' as const,
              render: formatAmount,
            },
            {
              title: t('inventory.columns.amount'),
              dataIndex: 'amount',
              width: 140,
              align: 'right' as const,
              render: formatAmount,
            },
          ]
        : []),
    ]
  }, [canViewCost, formatCellValue, t])

  const scrollX = useMemo(() => sumColumnWidths(columns), [columns])
  const rows = balancesQuery.data?.content ?? EMPTY_BALANCES
  const total = balancesQuery.data?.totalElements || 0

  const commitKeyword = (value: string) => {
    setKeyword(value.trim())
    setPage(1)
  }
  const resetFilters = () => {
    setKeywordInput('')
    setKeyword('')
    setWarehouseId(undefined)
    setPage(1)
  }

  return (
    <div className="module-grid-workspace inventory-workspace">
      <section className="finance-filter-shell">
        <div className="finance-filter-primary-row inventory-filter-row">
          <div className="finance-overview-filter">
            <Typography.Text type="secondary">
              {t('inventory.filters.keyword')}
            </Typography.Text>
            <Input
              aria-label={t('inventory.filters.keyword')}
              value={keywordInput}
              allowClear
              placeholder={t('inventory.filters.balanceKeywordPlaceholder')}
              onChange={(event) => setKeywordInput(event.target.value)}
              onBlur={(event) => commitKeyword(event.target.value)}
              onPressEnter={(event) => commitKeyword(event.currentTarget.value)}
            />
          </div>
          <div className="finance-overview-filter">
            <Typography.Text type="secondary">
              {t('inventory.filters.warehouse')}
            </Typography.Text>
            <Select
              aria-label={t('inventory.filters.warehouse')}
              value={warehouseId}
              options={warehouseOptions}
              loading={warehousesLoading}
              showSearch={{ optionFilterProp: 'label' }}
              allowClear
              placeholder={t('inventory.filters.warehousePlaceholder')}
              onChange={(value) => {
                setWarehouseId(value ? String(value) : undefined)
                setPage(1)
              }}
            />
          </div>
          <div className="finance-filter-actions">
            <Button onClick={resetFilters}>{t('common.reset')}</Button>
            <Tooltip title={t('common.refresh')}>
              <span>
                <Button
                  aria-label={t('inventory.refreshAria')}
                  icon={<ReloadOutlined />}
                  loading={balancesQuery.isFetching}
                  disabled={balancesQuery.isFetching}
                  onClick={() => void balancesQuery.refetch()}
                />
              </span>
            </Tooltip>
          </div>
        </div>
      </section>

      {balancesQuery.isError ? (
        <Alert
          type="error"
          showIcon
          title={t('inventory.loadFailed')}
          description={requestErrorMessage(
            balancesQuery.error,
            t('inventory.loadFailedHint'),
          )}
          action={
            <Button onClick={() => void balancesQuery.refetch()}>
              {t('errorBoundary.retry')}
            </Button>
          }
        />
      ) : null}

      <div className="aries-sr-only" role="status" aria-live="polite">
        {balancesQuery.isFetching
          ? ''
          : total === 0
            ? t('inventory.empty.balances')
            : t('common.total', { count: total })}
      </div>

      <section className="inventory-table">
        <div ref={shellRef} className="module-table-shell" style={shellStyle}>
          <Table
            rowKey="key"
            size="small"
            columns={columns}
            dataSource={rows}
            loading={balancesQuery.isFetching}
            scroll={{ x: scrollX, y: scrollY }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('inventory.empty.balances')}
                />
              ),
            }}
            pagination={false}
          />
        </div>
      </section>

      <ModuleTablePagination
        total={total}
        currentPage={page}
        pageSize={effectivePageSize}
        currentItemCount={rows.length}
        overviewItems={EMPTY_OVERVIEW_ITEMS}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPageSize === effectivePageSize ? nextPage : 1)
          setPageSizeOverride(nextPageSize)
        }}
      />
    </div>
  )
}

function InventoryTransactionsPanel() {
  const { t } = useTranslation()
  const defaultPageSize = useDefaultPageSize()
  const { formatCellValue } = useModuleDisplaySupport()
  const { shellRef, scrollY, shellStyle } = useTableBodyScrollY()
  useFocusableTableBody(shellRef, t('inventory.tabs.transactions'))
  const { options: warehouseOptions, isLoading: warehousesLoading } =
    useWarehouseOptions()
  const transactionTypeLabel = useTransactionTypeLabel()
  const [page, setPage] = useState(1)
  const [pageSizeOverride, setPageSizeOverride] = useState<number | null>(null)
  const effectivePageSize = pageSizeOverride ?? defaultPageSize
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [warehouseId, setWarehouseId] = useState<string | undefined>()
  const [transactionType, setTransactionType] = useState<string | undefined>()
  const [startDate, setStartDate] = useState<string | undefined>()
  const [endDate, setEndDate] = useState<string | undefined>()

  const transactionTypeOptions = useMemo(
    () =>
      TRANSACTION_TYPE_KEYS.map((value) => ({
        value,
        label: t(`inventory.transactionType.${value}`),
      })),
    [t],
  )
  const dateRangeValue: [Dayjs, Dayjs] | null =
    startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null

  const queryParams = useMemo(
    () => ({
      ...(keyword ? { keyword } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(transactionType ? { transactionType } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      page: page - 1,
      size: effectivePageSize,
    }),
    [
      effectivePageSize,
      endDate,
      keyword,
      page,
      startDate,
      transactionType,
      warehouseId,
    ],
  )
  const transactionsQuery = useQuery({
    queryKey: QUERY_KEYS.inventoryTransactions(queryParams),
    queryFn: ({ signal }) => getInventoryTransactions(queryParams, signal),
    placeholderData: keepPreviousData,
  })
  // 字段级权限：无 inventory:read:cost 时隐藏成本列（后端同时脱敏为 null）。
  const canViewCost = useHasPermission('inventory:read:cost')

  const columns = useMemo<TableColumnsType<InventoryTransaction>>(() => {
    const formatNumber = (value: number) => formatCellValue(value, 'number')
    const formatAmount = (value: number) => formatCellValue(value, 'amount')
    const formatDateTime = (value: string) => formatCellValue(value, 'datetime')
    return [
      {
        title: t('inventory.columns.transactionNo'),
        dataIndex: 'transactionNo',
        width: 180,
        fixed: 'left',
        ellipsis: true,
        render: displayText,
      },
      {
        title: t('inventory.columns.transactionType'),
        dataIndex: 'transactionType',
        width: 120,
        render: (value: string) => transactionTypeLabel(value),
      },
      {
        title: t('inventory.columns.materialCode'),
        dataIndex: 'materialCode',
        width: 150,
        ellipsis: true,
        render: displayText,
      },
      {
        title: t('inventory.columns.brand'),
        dataIndex: 'brand',
        width: 110,
        render: displayText,
      },
      {
        title: t('inventory.columns.material'),
        dataIndex: 'material',
        width: 120,
        render: displayText,
      },
      {
        title: t('inventory.columns.spec'),
        dataIndex: 'spec',
        width: 100,
        render: displayText,
      },
      {
        title: t('inventory.columns.unit'),
        dataIndex: 'unit',
        width: 80,
        render: displayText,
      },
      {
        title: t('inventory.columns.warehouse'),
        dataIndex: 'warehouseName',
        width: 140,
        ellipsis: true,
        render: displayText,
      },
      {
        title: t('inventory.columns.batchNo'),
        dataIndex: 'batchNo',
        width: 130,
        ellipsis: true,
        render: displayText,
      },
      {
        title: t('inventory.columns.direction'),
        dataIndex: 'direction',
        width: 80,
        render: (value: number) =>
          value < 0
            ? t('inventory.direction.out')
            : t('inventory.direction.in'),
      },
      {
        title: t('inventory.columns.quantity'),
        dataIndex: 'quantity',
        width: 120,
        align: 'right',
        render: formatNumber,
      },
      ...(canViewCost
        ? [
            {
              title: t('inventory.columns.unitCost'),
              dataIndex: 'unitCost',
              width: 120,
              align: 'right' as const,
              render: formatAmount,
            },
            {
              title: t('inventory.columns.amount'),
              dataIndex: 'amount',
              width: 140,
              align: 'right' as const,
              render: formatAmount,
            },
          ]
        : []),
      {
        title: t('inventory.columns.sourceDocumentNo'),
        dataIndex: 'sourceDocumentNo',
        width: 180,
        ellipsis: true,
        render: displayText,
      },
      {
        title: t('inventory.columns.occurredAt'),
        dataIndex: 'occurredAt',
        width: 170,
        render: formatDateTime,
      },
    ]
  }, [canViewCost, formatCellValue, t, transactionTypeLabel])

  const scrollX = useMemo(() => sumColumnWidths(columns), [columns])
  const rows = transactionsQuery.data?.content ?? EMPTY_TRANSACTIONS
  const total = transactionsQuery.data?.totalElements || 0

  const commitKeyword = (value: string) => {
    setKeyword(value.trim())
    setPage(1)
  }
  const resetFilters = () => {
    setKeywordInput('')
    setKeyword('')
    setWarehouseId(undefined)
    setTransactionType(undefined)
    setStartDate(undefined)
    setEndDate(undefined)
    setPage(1)
  }

  return (
    <div className="module-grid-workspace inventory-workspace">
      <section className="finance-filter-shell">
        <div className="finance-filter-primary-row inventory-filter-row">
          <div className="finance-overview-filter">
            <Typography.Text type="secondary">
              {t('inventory.filters.keyword')}
            </Typography.Text>
            <Input
              aria-label={t('inventory.filters.keyword')}
              value={keywordInput}
              allowClear
              placeholder={t('inventory.filters.transactionKeywordPlaceholder')}
              onChange={(event) => setKeywordInput(event.target.value)}
              onBlur={(event) => commitKeyword(event.target.value)}
              onPressEnter={(event) => commitKeyword(event.currentTarget.value)}
            />
          </div>
          <div className="finance-overview-filter">
            <Typography.Text type="secondary">
              {t('inventory.filters.warehouse')}
            </Typography.Text>
            <Select
              aria-label={t('inventory.filters.warehouse')}
              value={warehouseId}
              options={warehouseOptions}
              loading={warehousesLoading}
              showSearch={{ optionFilterProp: 'label' }}
              allowClear
              placeholder={t('inventory.filters.warehousePlaceholder')}
              onChange={(value) => {
                setWarehouseId(value ? String(value) : undefined)
                setPage(1)
              }}
            />
          </div>
          <div className="finance-overview-filter">
            <Typography.Text type="secondary">
              {t('inventory.filters.transactionType')}
            </Typography.Text>
            <Select
              aria-label={t('inventory.filters.transactionType')}
              value={transactionType}
              options={transactionTypeOptions}
              allowClear
              placeholder={t('inventory.filters.transactionTypePlaceholder')}
              onChange={(value) => {
                setTransactionType(value)
                setPage(1)
              }}
            />
          </div>
          <div className="finance-overview-filter">
            <Typography.Text type="secondary">
              {t('inventory.filters.occurredAt')}
            </Typography.Text>
            <DatePicker.RangePicker
              aria-label={t('inventory.filters.occurredAt')}
              value={dateRangeValue}
              format={DISPLAY_DATE_FORMAT}
              onChange={(dates) => {
                setStartDate(dates?.[0]?.format('YYYY-MM-DD'))
                setEndDate(dates?.[1]?.format('YYYY-MM-DD'))
                setPage(1)
              }}
            />
          </div>
          <div className="finance-filter-actions">
            <Button onClick={resetFilters}>{t('common.reset')}</Button>
            <Tooltip title={t('common.refresh')}>
              <span>
                <Button
                  aria-label={t('inventory.refreshAria')}
                  icon={<ReloadOutlined />}
                  loading={transactionsQuery.isFetching}
                  disabled={transactionsQuery.isFetching}
                  onClick={() => void transactionsQuery.refetch()}
                />
              </span>
            </Tooltip>
          </div>
        </div>
      </section>

      {transactionsQuery.isError ? (
        <Alert
          type="error"
          showIcon
          title={t('inventory.loadFailed')}
          description={requestErrorMessage(
            transactionsQuery.error,
            t('inventory.loadFailedHint'),
          )}
          action={
            <Button onClick={() => void transactionsQuery.refetch()}>
              {t('errorBoundary.retry')}
            </Button>
          }
        />
      ) : null}

      <div className="aries-sr-only" role="status" aria-live="polite">
        {transactionsQuery.isFetching
          ? ''
          : total === 0
            ? t('inventory.empty.transactions')
            : t('common.total', { count: total })}
      </div>

      <section className="inventory-table">
        <div ref={shellRef} className="module-table-shell" style={shellStyle}>
          <Table
            rowKey="key"
            size="small"
            columns={columns}
            dataSource={rows}
            loading={transactionsQuery.isFetching}
            scroll={{ x: scrollX, y: scrollY }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('inventory.empty.transactions')}
                />
              ),
            }}
            pagination={false}
          />
        </div>
      </section>

      <ModuleTablePagination
        total={total}
        currentPage={page}
        pageSize={effectivePageSize}
        currentItemCount={rows.length}
        overviewItems={EMPTY_OVERVIEW_ITEMS}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPageSize === effectivePageSize ? nextPage : 1)
          setPageSizeOverride(nextPageSize)
        }}
      />
    </div>
  )
}

export function InventoryView() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'balances' | 'transactions'>(
    'balances',
  )

  return (
    <AppProPage
      className="inventory-pro-page"
      description={t('inventory.description')}
      title={t('inventory.title')}
    >
      <div className="module-page-stack inventory-page">
        <Tabs
          activeKey={activeTab}
          onChange={(key) =>
            setActiveTab(key === 'transactions' ? 'transactions' : 'balances')
          }
          items={[
            {
              key: 'balances',
              label: t('inventory.tabs.balances'),
              children: <InventoryBalancesPanel />,
            },
            {
              key: 'transactions',
              label: t('inventory.tabs.transactions'),
              children: <InventoryTransactionsPanel />,
            },
          ]}
        />
      </div>
    </AppProPage>
  )
}
