import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import {
  type EntityId,
  parseEntityId,
  parseOptionalEntityId,
} from '@/types/entity-id'
import { downloadBlob } from '@/utils/download'
import { asArray, asNumber, asString } from '@/utils/type-narrowing'

export type CashLedgerFlowType =
  | 'RECEIPT'
  | 'PAYMENT'
  | 'PAYMENT_REVERSAL'
  | 'RECEIPT_REVERSAL'

export interface CashLedgerFilter {
  settlementCompanyId: EntityId
  startDate?: string
  endDate?: string
  counterpartyType?: string
  counterpartyId?: EntityId
  flowType?: CashLedgerFlowType
  keyword?: string
}

export interface CashLedgerQuery extends CashLedgerFilter {
  page: number
  size: number
}

export interface CashLedgerSummary {
  openingBalance: number
  periodIncome: number
  periodExpense: number
  closingBalance: number
}

export interface CashLedgerLine {
  key: string
  businessDate: string
  flowType: CashLedgerFlowType
  documentId: EntityId
  documentNo: string
  counterpartyType: string
  counterpartyId?: EntityId
  counterpartyName: string
  purpose: string
  incomeAmount: number
  expenseAmount: number
  runningBalance: number
  operatorName: string
  remark: string
}

export interface CashLedgerPage {
  summary: CashLedgerSummary
  page: {
    content: CashLedgerLine[]
    totalElements: number
    totalPages: number
    page: number
    size: number
    hasNext: boolean
  }
}

type RawRecord = Record<string, unknown>

function normalizeSummary(raw: RawRecord = {}): CashLedgerSummary {
  return {
    openingBalance: asNumber(raw.openingBalance),
    periodIncome: asNumber(raw.periodIncome),
    periodExpense: asNumber(raw.periodExpense),
    closingBalance: asNumber(raw.closingBalance),
  }
}

function normalizeLine(raw: RawRecord, index: number): CashLedgerLine {
  const flowType = asString(raw.flowType).trim() as CashLedgerFlowType
  const documentId = parseEntityId(
    raw.documentId,
    `cashLedger.page.content[${index}].documentId`,
  )
  return {
    key: `${flowType}-${documentId}`,
    businessDate: asString(raw.businessDate),
    flowType,
    documentId,
    documentNo: asString(raw.documentNo),
    counterpartyType: asString(raw.counterpartyType),
    counterpartyId: parseOptionalEntityId(
      raw.counterpartyId,
      `cashLedger.page.content[${index}].counterpartyId`,
    ),
    counterpartyName: asString(raw.counterpartyName),
    purpose: asString(raw.purpose),
    incomeAmount: asNumber(raw.incomeAmount),
    expenseAmount: asNumber(raw.expenseAmount),
    runningBalance: asNumber(raw.runningBalance),
    operatorName: asString(raw.operatorName),
    remark: asString(raw.remark),
  }
}

export function normalizeCashLedgerPage(
  raw: RawRecord | null | undefined,
): CashLedgerPage {
  const source = raw || {}
  const rawPage = (source.page || {}) as RawRecord
  return {
    summary: normalizeSummary((source.summary || {}) as RawRecord),
    page: {
      content: asArray<RawRecord>(rawPage.content).map(normalizeLine),
      totalElements: asNumber(rawPage.totalElements),
      totalPages: asNumber(rawPage.totalPages),
      page: asNumber(rawPage.page),
      size: asNumber(rawPage.size),
      hasNext: rawPage.hasNext === true,
    },
  }
}

function normalizeFilter(filter: CashLedgerFilter) {
  const startDate = filter.startDate?.trim()
  const endDate = filter.endDate?.trim()
  const counterpartyType = filter.counterpartyType?.trim()
  const counterpartyId = parseOptionalEntityId(
    filter.counterpartyId,
    'counterpartyId',
  )
  const keyword = filter.keyword?.trim()
  return {
    settlementCompanyId: parseEntityId(
      filter.settlementCompanyId,
      'settlementCompanyId',
    ),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(counterpartyType ? { counterpartyType } : {}),
    ...(counterpartyId ? { counterpartyId } : {}),
    ...(filter.flowType ? { flowType: filter.flowType } : {}),
    ...(keyword ? { keyword } : {}),
  }
}

export async function getCashLedger(
  query: CashLedgerQuery,
  signal?: AbortSignal,
): Promise<CashLedgerPage> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawRecord>>(ENDPOINTS.CASH_LEDGER, {
      params: {
        ...normalizeFilter(query),
        page: Math.max(Math.trunc(query.page), 0),
        size: Math.max(Math.trunc(query.size), 1),
      },
      signal,
    }),
    '加载资金流水失败',
  )
  return normalizeCashLedgerPage(response.data)
}

export async function exportCashLedger(
  filter: CashLedgerFilter,
): Promise<void> {
  const blob = await http.get<Blob>(ENDPOINTS.CASH_LEDGER_EXPORT, {
    params: normalizeFilter(filter),
    responseType: 'blob',
  })
  downloadBlob(blob, '资金流水.xlsx')
}
