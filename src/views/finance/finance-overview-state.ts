import dayjs from 'dayjs'
import type {
  FinanceDirection,
  FinanceOverviewSummary,
} from '@/api/finance/finance-overview'
import type { EntityId } from '@/types/entity-id'

export const DIRECTION_OPTIONS = [
  { label: '应收', value: 'RECEIVABLE' },
  { label: '应付', value: 'PAYABLE' },
]

export const PAYABLE_COUNTERPARTY_OPTIONS = [
  { label: '全部往来方', value: '' },
  { label: '供应商', value: '供应商' },
  { label: '物流商', value: '物流商' },
]

export interface FinanceOverviewState {
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

export type FinanceOverviewAction =
  | {
      type: 'update'
      values: Partial<FinanceOverviewState>
    }
  | { type: 'reset-filters' }

export type FinanceOverviewDispatch = React.Dispatch<FinanceOverviewAction>

export interface SummaryItem {
  key: string
  label: string
  value?: number
}

export function createInitialState(): FinanceOverviewState {
  return {
    asOfDate: dayjs().format('YYYY-MM-DD'),
    direction: 'RECEIVABLE',
    keywordInput: '',
    onlyOpen: false,
    page: 1,
  }
}

export function financeOverviewReducer(
  state: FinanceOverviewState,
  action: FinanceOverviewAction,
): FinanceOverviewState {
  if (action.type === 'reset-filters') {
    return { ...createInitialState(), pageSize: state.pageSize }
  }
  return { ...state, ...action.values }
}

export function requestErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

export function buildSummaryItems(
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
