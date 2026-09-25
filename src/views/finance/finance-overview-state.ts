import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
import type {
  FinanceDirection,
  FinanceOverviewSummary,
} from '@/api/finance/finance-overview'
import type { EntityId } from '@/types/entity-id'

export function buildDirectionOptions(t: TFunction) {
  return [
    { label: t('financeDetail.receivable'), value: 'RECEIVABLE' as const },
    { label: t('financeDetail.payable'), value: 'PAYABLE' as const },
  ]
}

export function buildPayableCounterpartyOptions(t: TFunction) {
  return [
    { label: t('financeDetail.allCounterparties'), value: '' },
    { label: t('financeDetail.counterpartySupplier'), value: '供应商' },
    { label: t('financeDetail.counterpartyCarrier'), value: '物流商' },
  ]
}

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
  t: TFunction,
  direction: FinanceDirection,
  summary?: FinanceOverviewSummary,
): SummaryItem[] {
  if (direction === 'RECEIVABLE') {
    return [
      {
        key: 'recognized',
        label: t('financeDetail.receivable'),
        value: summary?.receivableAmount,
      },
      {
        key: 'settled',
        label: t('financeDetail.received'),
        value: summary?.receivedAmount,
      },
      {
        key: 'outstanding',
        label: t('financeDetail.unreceived'),
        value: summary?.unreceivedAmount,
      },
      {
        key: 'advance',
        label: t('financeDetail.prepaid'),
        value: summary?.advanceReceiptAmount,
      },
    ]
  }
  return [
    {
      key: 'recognized',
      label: t('financeDetail.payable'),
      value: summary?.payableAmount,
    },
    {
      key: 'settled',
      label: t('financeDetail.paid'),
      value: summary?.paidAmount,
    },
    {
      key: 'outstanding',
      label: t('financeDetail.unpaid'),
      value: summary?.unpaidAmount,
    },
    {
      key: 'advance',
      label: t('financeDetail.prepayment'),
      value: summary?.advancePaymentAmount,
    },
  ]
}
