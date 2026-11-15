import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { createAndDownloadExportArtifact } from '@/api/core/export-artifacts'
import { ENDPOINTS } from '@/constants/endpoints'
import { exactPageSchema, responseEntityIdSchema } from '@/shared/schemas/api'
import {
  type EntityId,
  parseEntityId,
  parseOptionalEntityId,
} from '@/types/entity-id'
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

const decimalSchema = z.union([z.number(), z.string()])
const cashLedgerSummarySchema = z.looseObject({
  openingBalance: decimalSchema,
  periodIncome: decimalSchema,
  periodExpense: decimalSchema,
  closingBalance: decimalSchema,
})
const cashLedgerLineSchema = z.looseObject({
  businessDate: z.string(),
  flowType: z.string(),
  documentId: responseEntityIdSchema,
  documentNo: z.string(),
  counterpartyType: z.string(),
  counterpartyId: responseEntityIdSchema.nullish(),
  counterpartyName: z.string().nullish(),
  purpose: z.string().nullish(),
  incomeAmount: decimalSchema,
  expenseAmount: decimalSchema,
  runningBalance: decimalSchema,
  operatorName: z.string().nullish(),
  remark: z.string().nullish(),
})
const cashLedgerPageSchema = exactPageSchema(cashLedgerLineSchema)

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

function normalizeCashLedgerPage(
  summaryRaw: RawRecord | null | undefined,
  pageRaw: RawRecord | null | undefined,
): CashLedgerPage {
  const summary = summaryRaw || {}
  const page = pageRaw || {}
  return {
    summary: normalizeSummary(summary),
    page: {
      content: asArray<RawRecord>(page.content).map(normalizeLine),
      totalElements: asNumber(page.totalElements),
      totalPages: asNumber(page.totalPages),
      page: asNumber(page.currentPage),
      size: asNumber(page.pageSize),
      hasNext: page.hasMore === true,
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
  // 标准分页契约：列表返回 PageResponse，汇总走独立 /summary（同一筛选条件）。
  const filter = normalizeFilter(query)
  const [pageResponse, summary] = await Promise.all([
    apiGet(ENDPOINTS.CASH_LEDGER, cashLedgerPageSchema, {
      params: {
        ...filter,
        page: Math.max(Math.trunc(query.page), 0),
        size: Math.max(Math.trunc(query.size), 1),
      },
      signal,
    }),
    apiGet(ENDPOINTS.CASH_LEDGER_SUMMARY, cashLedgerSummarySchema, {
      params: filter,
      signal,
    }),
  ])
  return normalizeCashLedgerPage(summary, pageResponse)
}

/**
 * 导出资金流水 XLSX（两步：POST 创建导出资源 → GET content 下载）。
 *
 * <p>筛选条件从查询参数改为请求体：导出被建模为资源创建，筛选条件属于资源属性，
 * 字段语义与 `GET /cash-ledger` 完全一致（见 `normalizeFilter`）。产物保留 30 分钟，
 * 过期后下载返回 404，`createAndDownloadExportArtifact` 会提示重新生成。</p>
 */
export async function exportCashLedger(
  filter: CashLedgerFilter,
): Promise<void> {
  await createAndDownloadExportArtifact(
    ENDPOINTS.CASH_LEDGER_EXPORT_REQUESTS,
    normalizeFilter(filter),
    { fallbackFileName: '资金流水.xlsx' },
  )
}
