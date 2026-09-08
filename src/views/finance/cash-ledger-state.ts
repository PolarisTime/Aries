import dayjs from 'dayjs'
import type { CashLedgerFlowType } from '@/api/finance/cash-ledger'
import type { EntityId } from '@/types/entity-id'

export interface CashLedgerState {
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

export type CashLedgerAction =
  | { type: 'settlement-company-changed'; value?: EntityId }
  | { type: 'date-range-changed'; startDate?: string; endDate?: string }
  | { type: 'counterparty-type-changed'; value?: string }
  | { type: 'counterparty-changed'; value?: EntityId }
  | { type: 'flow-type-changed'; value?: CashLedgerFlowType }
  | { type: 'keyword-input-changed'; value: string }
  | { type: 'keyword-committed'; value: string }
  | { type: 'pagination-changed'; page: number; pageSize: number }
  | { type: 'default-page-size-changed'; value: number }
  | { type: 'reset-filters' }

export function createInitialLedgerState(
  defaultPageSize: number,
): CashLedgerState {
  const today = dayjs()
  return {
    startDate: today.subtract(3, 'month').format('YYYY-MM-DD'),
    endDate: today.format('YYYY-MM-DD'),
    keywordInput: '',
    observedDefaultPageSize: defaultPageSize,
    page: 1,
  }
}

export function cashLedgerReducer(
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
    case 'reset-filters':
      return {
        ...createInitialLedgerState(state.observedDefaultPageSize),
        pageSizeOverride: state.pageSizeOverride,
      }
  }
}
