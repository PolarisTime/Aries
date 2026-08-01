import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { exactPageSchema, responseEntityIdSchema } from '@/shared/schemas/api'
import { type EntityId, parseEntityId } from '@/types/entity-id'
import { asArray, asNumber, asString } from '@/utils/type-narrowing'

export type FinanceDirection = 'RECEIVABLE' | 'PAYABLE'

export interface FinanceOverviewQuery {
  settlementCompanyId: EntityId
  asOfDate: string
  direction: FinanceDirection
  counterpartyType?: string
  keyword?: string
  onlyOpen?: boolean
  page: number
  size: number
}

export interface FinanceOverviewSummary {
  receivableAmount: number
  receivedAmount: number
  unreceivedAmount: number
  advanceReceiptAmount: number
  payableAmount: number
  paidAmount: number
  unpaidAmount: number
  advancePaymentAmount: number
}

export interface FinanceBalance {
  key: string
  direction: FinanceDirection
  counterpartyType: string
  counterpartyId: EntityId
  counterpartyCode: string
  counterpartyName: string
  settlementCompanyId: EntityId
  settlementCompanyName: string
  recognizedAmount: number
  settledAmount: number
  outstandingAmount: number
  advanceAmount: number
}

export interface FinanceOverviewPage {
  asOfDate: string
  summary: FinanceOverviewSummary
  balances: {
    content: FinanceBalance[]
    totalElements: number
    totalPages: number
    currentPage: number
    pageSize: number
    hasMore: boolean
  }
}

type RawRecord = Record<string, unknown>

const decimalSchema = z.union([z.number(), z.string()])
const financeOverviewSummarySchema = z.looseObject({
  receivableAmount: decimalSchema,
  receivedAmount: decimalSchema,
  unreceivedAmount: decimalSchema,
  advanceReceiptAmount: decimalSchema,
  payableAmount: decimalSchema,
  paidAmount: decimalSchema,
  unpaidAmount: decimalSchema,
  advancePaymentAmount: decimalSchema,
})
const financeBalanceSchema = z.looseObject({
  direction: z.string(),
  counterpartyType: z.string(),
  counterpartyId: responseEntityIdSchema,
  counterpartyCode: z.string().nullish(),
  counterpartyName: z.string(),
  settlementCompanyId: responseEntityIdSchema,
  settlementCompanyName: z.string(),
  recognizedAmount: decimalSchema,
  settledAmount: decimalSchema,
  outstandingAmount: decimalSchema,
  advanceAmount: decimalSchema,
})
const financeOverviewResponseSchema = z.looseObject({
  asOfDate: z.string(),
  summary: financeOverviewSummarySchema,
  balances: exactPageSchema(financeBalanceSchema),
})

function normalizeSummary(raw: RawRecord = {}): FinanceOverviewSummary {
  return {
    receivableAmount: asNumber(raw.receivableAmount),
    receivedAmount: asNumber(raw.receivedAmount),
    unreceivedAmount: asNumber(raw.unreceivedAmount),
    advanceReceiptAmount: asNumber(raw.advanceReceiptAmount),
    payableAmount: asNumber(raw.payableAmount),
    paidAmount: asNumber(raw.paidAmount),
    unpaidAmount: asNumber(raw.unpaidAmount),
    advancePaymentAmount: asNumber(raw.advancePaymentAmount),
  }
}

function normalizeBalance(raw: RawRecord, index: number): FinanceBalance {
  const direction = asString(raw.direction).trim() as FinanceDirection
  const counterpartyType = asString(raw.counterpartyType).trim()
  const counterpartyId = parseEntityId(
    raw.counterpartyId,
    `financeOverview.balances.content[${index}].counterpartyId`,
  )
  return {
    key: `${direction}-${counterpartyType}-${counterpartyId}`,
    direction,
    counterpartyType,
    counterpartyId,
    counterpartyCode: asString(raw.counterpartyCode),
    counterpartyName: asString(raw.counterpartyName),
    settlementCompanyId: parseEntityId(
      raw.settlementCompanyId,
      `financeOverview.balances.content[${index}].settlementCompanyId`,
    ),
    settlementCompanyName: asString(raw.settlementCompanyName),
    recognizedAmount: asNumber(raw.recognizedAmount),
    settledAmount: asNumber(raw.settledAmount),
    outstandingAmount: asNumber(raw.outstandingAmount),
    advanceAmount: asNumber(raw.advanceAmount),
  }
}

function normalizeFinanceOverview(
  raw: RawRecord | null | undefined,
): FinanceOverviewPage {
  const source = raw || {}
  const rawBalances = (source.balances || {}) as RawRecord
  return {
    asOfDate: asString(source.asOfDate),
    summary: normalizeSummary((source.summary || {}) as RawRecord),
    balances: {
      content: asArray<RawRecord>(rawBalances.content).map(normalizeBalance),
      totalElements: asNumber(rawBalances.totalElements),
      totalPages: asNumber(rawBalances.totalPages),
      currentPage: asNumber(rawBalances.currentPage),
      pageSize: asNumber(rawBalances.pageSize),
      hasMore: rawBalances.hasMore === true,
    },
  }
}

function normalizeQuery(query: FinanceOverviewQuery) {
  const counterpartyType = query.counterpartyType?.trim()
  const keyword = query.keyword?.trim()
  return {
    settlementCompanyId: parseEntityId(
      query.settlementCompanyId,
      'settlementCompanyId',
    ),
    asOfDate: query.asOfDate,
    direction: query.direction,
    ...(counterpartyType ? { counterpartyType } : {}),
    ...(keyword ? { keyword } : {}),
    ...(query.onlyOpen ? { onlyOpen: true } : {}),
    page: Math.max(Math.trunc(query.page), 0),
    size: Math.max(Math.trunc(query.size), 1),
  }
}

export async function getFinanceOverview(
  query: FinanceOverviewQuery,
  signal?: AbortSignal,
): Promise<FinanceOverviewPage> {
  const response = await apiGet(
    ENDPOINTS.FINANCE_OVERVIEW,
    financeOverviewResponseSchema,
    {
      params: normalizeQuery(query),
      signal,
    },
  )
  return normalizeFinanceOverview(response)
}
