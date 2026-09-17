import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, Button, Empty, Table, Tabs } from 'antd'
import type { RefObject } from 'react'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
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
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { useTableBodyScrollY } from '@/views/modules/components/use-table-body-scroll-y'
import {
  InventoryBalancesFilters,
  InventoryTransactionsFilters,
} from './InventoryFilters'
import {
  buildInventoryBalanceColumns,
  buildInventoryTransactionColumns,
  sumColumnWidths,
} from './inventory-columns'

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

// ---------- 余额面板状态 ----------

interface BalancesState {
  page: number
  pageSizeOverride: number | null
  keywordInput: string
  keyword: string
  warehouseId?: string
}

type BalancesAction =
  | { type: 'keywordInput'; value: string }
  | { type: 'keywordCommit'; value: string }
  | { type: 'warehouse'; value?: string }
  | { type: 'reset' }
  | { type: 'page'; page: number; pageSizeOverride: number | null }

const BALANCES_INITIAL: BalancesState = {
  page: 1,
  pageSizeOverride: null,
  keywordInput: '',
  keyword: '',
  warehouseId: undefined,
}

function balancesReducer(
  state: BalancesState,
  action: BalancesAction,
): BalancesState {
  switch (action.type) {
    case 'keywordInput':
      return { ...state, keywordInput: action.value }
    case 'keywordCommit':
      return { ...state, keyword: action.value.trim(), page: 1 }
    case 'warehouse':
      return { ...state, warehouseId: action.value, page: 1 }
    case 'reset':
      return BALANCES_INITIAL
    case 'page':
      return {
        ...state,
        page: action.page,
        pageSizeOverride: action.pageSizeOverride,
      }
    default:
      return state
  }
}

function InventoryBalancesPanel() {
  const { t } = useTranslation()
  const defaultPageSize = useDefaultPageSize()
  const { formatCellValue } = useModuleDisplaySupport()
  const { shellRef, scrollY, shellStyle } = useTableBodyScrollY()
  useFocusableTableBody(shellRef, t('inventory.tabs.balances'))
  const { options: warehouseOptions, isLoading: warehousesLoading } =
    useWarehouseOptions()
  const [state, dispatch] = useReducer(balancesReducer, BALANCES_INITIAL)
  const effectivePageSize = state.pageSizeOverride ?? defaultPageSize

  const queryParams = useMemo(
    () => ({
      ...(state.keyword ? { keyword: state.keyword } : {}),
      ...(state.warehouseId ? { warehouseId: state.warehouseId } : {}),
      page: state.page - 1,
      size: effectivePageSize,
    }),
    [effectivePageSize, state.keyword, state.page, state.warehouseId],
  )
  const balancesQuery = useQuery({
    queryKey: QUERY_KEYS.inventoryBalances(queryParams),
    queryFn: ({ signal }) => getInventoryBalances(queryParams, signal),
    placeholderData: keepPreviousData,
  })
  // 字段级权限：无 inventory:read:cost 时隐藏成本列（后端同时脱敏为 null）。
  const canViewCost = useHasPermission('inventory:read:cost')

  const columns = useMemo(
    () => buildInventoryBalanceColumns({ t, formatCellValue, canViewCost }),
    [canViewCost, formatCellValue, t],
  )
  const scrollX = useMemo(() => sumColumnWidths(columns), [columns])
  const rows = balancesQuery.data?.content ?? EMPTY_BALANCES
  const total = balancesQuery.data?.totalElements || 0

  return (
    <div className="module-grid-workspace inventory-workspace">
      <InventoryBalancesFilters
        keywordInput={state.keywordInput}
        onKeywordInputChange={(value) =>
          dispatch({ type: 'keywordInput', value })
        }
        onKeywordCommit={(value) => dispatch({ type: 'keywordCommit', value })}
        warehouseId={state.warehouseId}
        warehouseOptions={warehouseOptions}
        warehousesLoading={warehousesLoading}
        onWarehouseChange={(value) => dispatch({ type: 'warehouse', value })}
        onReset={() => dispatch({ type: 'reset' })}
        onRefresh={() => void balancesQuery.refetch()}
        refreshing={balancesQuery.isFetching}
      />

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
        currentPage={state.page}
        pageSize={effectivePageSize}
        currentItemCount={rows.length}
        overviewItems={EMPTY_OVERVIEW_ITEMS}
        onPageChange={(nextPage, nextPageSize) =>
          dispatch({
            type: 'page',
            page: nextPageSize === effectivePageSize ? nextPage : 1,
            pageSizeOverride: nextPageSize,
          })
        }
      />
    </div>
  )
}

// ---------- 流水面板状态 ----------

interface TransactionsState {
  page: number
  pageSizeOverride: number | null
  keywordInput: string
  keyword: string
  warehouseId?: string
  transactionType?: string
  startDate?: string
  endDate?: string
}

type TransactionsAction =
  | { type: 'keywordInput'; value: string }
  | { type: 'keywordCommit'; value: string }
  | { type: 'warehouse'; value?: string }
  | { type: 'transactionType'; value?: string }
  | { type: 'dateRange'; start?: string; end?: string }
  | { type: 'reset' }
  | { type: 'page'; page: number; pageSizeOverride: number | null }

const TRANSACTIONS_INITIAL: TransactionsState = {
  page: 1,
  pageSizeOverride: null,
  keywordInput: '',
  keyword: '',
  warehouseId: undefined,
  transactionType: undefined,
  startDate: undefined,
  endDate: undefined,
}

function transactionsReducer(
  state: TransactionsState,
  action: TransactionsAction,
): TransactionsState {
  switch (action.type) {
    case 'keywordInput':
      return { ...state, keywordInput: action.value }
    case 'keywordCommit':
      return { ...state, keyword: action.value.trim(), page: 1 }
    case 'warehouse':
      return { ...state, warehouseId: action.value, page: 1 }
    case 'transactionType':
      return { ...state, transactionType: action.value, page: 1 }
    case 'dateRange':
      return { ...state, startDate: action.start, endDate: action.end, page: 1 }
    case 'reset':
      return TRANSACTIONS_INITIAL
    case 'page':
      return {
        ...state,
        page: action.page,
        pageSizeOverride: action.pageSizeOverride,
      }
    default:
      return state
  }
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
  const [state, dispatch] = useReducer(
    transactionsReducer,
    TRANSACTIONS_INITIAL,
  )
  const effectivePageSize = state.pageSizeOverride ?? defaultPageSize

  const transactionTypeOptions = useMemo(
    () =>
      TRANSACTION_TYPE_KEYS.map((value) => ({
        value,
        label: t(`inventory.transactionType.${value}`),
      })),
    [t],
  )

  const queryParams = useMemo(
    () => ({
      ...(state.keyword ? { keyword: state.keyword } : {}),
      ...(state.warehouseId ? { warehouseId: state.warehouseId } : {}),
      ...(state.transactionType
        ? { transactionType: state.transactionType }
        : {}),
      ...(state.startDate ? { startDate: state.startDate } : {}),
      ...(state.endDate ? { endDate: state.endDate } : {}),
      page: state.page - 1,
      size: effectivePageSize,
    }),
    [
      effectivePageSize,
      state.endDate,
      state.keyword,
      state.page,
      state.startDate,
      state.transactionType,
      state.warehouseId,
    ],
  )
  const transactionsQuery = useQuery({
    queryKey: QUERY_KEYS.inventoryTransactions(queryParams),
    queryFn: ({ signal }) => getInventoryTransactions(queryParams, signal),
    placeholderData: keepPreviousData,
  })
  // 字段级权限：无 inventory:read:cost 时隐藏成本列（后端同时脱敏为 null）。
  const canViewCost = useHasPermission('inventory:read:cost')

  const columns = useMemo(
    () =>
      buildInventoryTransactionColumns({
        t,
        formatCellValue,
        transactionTypeLabel,
        canViewCost,
      }),
    [canViewCost, formatCellValue, t, transactionTypeLabel],
  )
  const scrollX = useMemo(() => sumColumnWidths(columns), [columns])
  const rows = transactionsQuery.data?.content ?? EMPTY_TRANSACTIONS
  const total = transactionsQuery.data?.totalElements || 0

  return (
    <div className="module-grid-workspace inventory-workspace">
      <InventoryTransactionsFilters
        keywordInput={state.keywordInput}
        onKeywordInputChange={(value) =>
          dispatch({ type: 'keywordInput', value })
        }
        onKeywordCommit={(value) => dispatch({ type: 'keywordCommit', value })}
        warehouseId={state.warehouseId}
        warehouseOptions={warehouseOptions}
        warehousesLoading={warehousesLoading}
        onWarehouseChange={(value) => dispatch({ type: 'warehouse', value })}
        transactionType={state.transactionType}
        transactionTypeOptions={transactionTypeOptions}
        onTransactionTypeChange={(value) =>
          dispatch({ type: 'transactionType', value })
        }
        startDate={state.startDate}
        endDate={state.endDate}
        onDateRangeChange={(start, end) =>
          dispatch({ type: 'dateRange', start, end })
        }
        onReset={() => dispatch({ type: 'reset' })}
        onRefresh={() => void transactionsQuery.refetch()}
        refreshing={transactionsQuery.isFetching}
      />

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
        currentPage={state.page}
        pageSize={effectivePageSize}
        currentItemCount={rows.length}
        overviewItems={EMPTY_OVERVIEW_ITEMS}
        onPageChange={(nextPage, nextPageSize) =>
          dispatch({
            type: 'page',
            page: nextPageSize === effectivePageSize ? nextPage : 1,
            pageSizeOverride: nextPageSize,
          })
        }
      />
    </div>
  )
}

export function InventoryView() {
  const { t } = useTranslation()

  return (
    <AppProPage
      className="inventory-pro-page"
      description={t('inventory.description')}
      title={t('inventory.title')}
    >
      <div className="module-page-stack inventory-page">
        <Tabs
          defaultActiveKey="balances"
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
