import { assertApiSuccess, http } from '@/api/client'
import type { PagePayload } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import {
  type EntityId,
  parseEntityId,
  parseOptionalEntityId,
} from '@/types/entity-id'
import { downloadBlob } from '@/utils/download'
import { asArray, asNumber, asString } from '@/utils/type-narrowing'

export interface PurchaseFinanceFlowSummary {
  purchasePlanAmount: number
  inboundSettlementAmount: number
  reconciledAmount: number
  invoicedAmount: number
  expenseAmount: number
  incomeAmount: number
  netCashExpense: number
  historicalAdjustmentAmount: number
  payableBalance: number
  prepaymentBalance: number
}

export interface PurchaseFinanceFlowLine {
  key: string
  flowSequence: number
  businessDate: string
  documentRole: string
  documentType: string
  documentId: EntityId
  documentNo: string
  documentItemId?: EntityId
  lineNo?: number
  sourceDocumentType: string
  sourceDocumentId?: EntityId
  sourceDocumentNo: string
  sourceDocumentItemId?: EntityId
  sourceLineNo?: number
  rootPurchaseOrderId?: EntityId
  rootPurchaseOrderItemId?: EntityId
  settlementCompanyId?: EntityId
  settlementCompanyName: string
  supplierId?: EntityId
  supplierCode: string
  supplierName: string
  materialId?: EntityId
  materialCode: string
  materialName: string
  quantity?: number
  quantityUnit: string
  actualWeightTon?: number
  unitPrice?: number
  lineAmount?: number
  expenseAmount?: number
  incomeAmount?: number
  adjustmentDirection: string
  adjustmentEffect: string
  status: string
  effective: boolean
  remark: string
}

export interface PurchaseFinanceDocumentFlow {
  summary: PurchaseFinanceFlowSummary
  items: {
    content: PurchaseFinanceFlowLine[]
    totalElements: number
    totalPages: number
    currentPage: number
    pageSize: number
    hasMore: boolean
  }
}

export interface PurchaseFinanceFlowFilter {
  settlementCompanyId: EntityId
  supplierId: EntityId
  documentType?: string
  status?: string
  startDate?: string
  endDate?: string
  materialKeyword?: string
  purchaseOrderId?: EntityId
}

export interface PurchaseFinanceFlowQuery extends PurchaseFinanceFlowFilter {
  page: number
  size: number
}

type RawRecord = Record<string, unknown>

function optionalNumber(value: unknown) {
  return value === undefined || value === null || value === ''
    ? undefined
    : asNumber(value)
}

function normalizeSummary(raw: RawRecord = {}): PurchaseFinanceFlowSummary {
  return {
    purchasePlanAmount: asNumber(raw.purchasePlanAmount),
    inboundSettlementAmount: asNumber(raw.inboundSettlementAmount),
    reconciledAmount: asNumber(raw.reconciledAmount),
    invoicedAmount: asNumber(raw.invoicedAmount),
    expenseAmount: asNumber(raw.expenseAmount),
    incomeAmount: asNumber(raw.incomeAmount),
    netCashExpense: asNumber(raw.netCashExpense),
    historicalAdjustmentAmount: asNumber(raw.historicalAdjustmentAmount),
    payableBalance: asNumber(raw.payableBalance),
    prepaymentBalance: asNumber(raw.prepaymentBalance),
  }
}

function normalizeLine(raw: RawRecord, index: number): PurchaseFinanceFlowLine {
  const documentId = parseEntityId(
    raw.documentId,
    `purchaseFinanceFlow.items[${index}].documentId`,
  )
  const documentType = asString(raw.documentType).trim()
  const lineNo = optionalNumber(raw.lineNo)
  return {
    key: `${documentType}-${documentId}-${lineNo ?? asNumber(raw.flowSequence)}`,
    flowSequence: asNumber(raw.flowSequence),
    businessDate: asString(raw.businessDate),
    documentRole: asString(raw.documentRole),
    documentType,
    documentId,
    documentNo: asString(raw.documentNo),
    documentItemId: parseOptionalEntityId(
      raw.documentItemId,
      `purchaseFinanceFlow.items[${index}].documentItemId`,
    ),
    lineNo,
    sourceDocumentType: asString(raw.sourceDocumentType),
    sourceDocumentId: parseOptionalEntityId(
      raw.sourceDocumentId,
      `purchaseFinanceFlow.items[${index}].sourceDocumentId`,
    ),
    sourceDocumentNo: asString(raw.sourceDocumentNo),
    sourceDocumentItemId: parseOptionalEntityId(
      raw.sourceDocumentItemId,
      `purchaseFinanceFlow.items[${index}].sourceDocumentItemId`,
    ),
    sourceLineNo: optionalNumber(raw.sourceLineNo),
    rootPurchaseOrderId: parseOptionalEntityId(
      raw.rootPurchaseOrderId,
      `purchaseFinanceFlow.items[${index}].rootPurchaseOrderId`,
    ),
    rootPurchaseOrderItemId: parseOptionalEntityId(
      raw.rootPurchaseOrderItemId,
      `purchaseFinanceFlow.items[${index}].rootPurchaseOrderItemId`,
    ),
    settlementCompanyId: parseOptionalEntityId(
      raw.settlementCompanyId,
      `purchaseFinanceFlow.items[${index}].settlementCompanyId`,
    ),
    settlementCompanyName: asString(raw.settlementCompanyName),
    supplierId: parseOptionalEntityId(
      raw.supplierId,
      `purchaseFinanceFlow.items[${index}].supplierId`,
    ),
    supplierCode: asString(raw.supplierCode),
    supplierName: asString(raw.supplierName),
    materialId: parseOptionalEntityId(
      raw.materialId,
      `purchaseFinanceFlow.items[${index}].materialId`,
    ),
    materialCode: asString(raw.materialCode),
    materialName: asString(raw.materialName),
    quantity: optionalNumber(raw.quantity),
    quantityUnit: asString(raw.quantityUnit),
    actualWeightTon: optionalNumber(raw.actualWeightTon),
    unitPrice: optionalNumber(raw.unitPrice),
    lineAmount: optionalNumber(raw.lineAmount),
    expenseAmount: optionalNumber(raw.expenseAmount),
    incomeAmount: optionalNumber(raw.incomeAmount),
    adjustmentDirection: asString(raw.adjustmentDirection),
    adjustmentEffect: asString(raw.adjustmentEffect),
    status: asString(raw.status),
    effective: raw.effective === true || raw.effective === 'true',
    remark: asString(raw.remark),
  }
}

export function normalizePurchaseFinanceDocumentFlow(
  raw: RawRecord | null | undefined,
): PurchaseFinanceDocumentFlow {
  const source = raw || {}
  const page = (source.items || {}) as PagePayload<RawRecord>
  const content = asArray<RawRecord>(page.content ?? page.records).map(
    normalizeLine,
  )
  return {
    summary: normalizeSummary((source.summary || {}) as RawRecord),
    items: {
      content,
      totalElements: asNumber(page.totalElements),
      totalPages: asNumber(page.totalPages),
      currentPage: asNumber(page.currentPage ?? page.page),
      pageSize: asNumber(page.pageSize ?? page.size),
      hasMore:
        typeof page.hasMore === 'boolean'
          ? page.hasMore
          : asNumber(page.currentPage ?? page.page) + 1 <
            asNumber(page.totalPages),
    },
  }
}

function normalizedOptionalText(value: string | undefined) {
  const normalized = value?.trim()
  return normalized || undefined
}

function normalizeFilter(query: PurchaseFinanceFlowFilter) {
  const documentType = normalizedOptionalText(query.documentType)
  const status = normalizedOptionalText(query.status)
  const startDate = normalizedOptionalText(query.startDate)
  const endDate = normalizedOptionalText(query.endDate)
  const materialKeyword = normalizedOptionalText(query.materialKeyword)
  const purchaseOrderId = parseOptionalEntityId(
    query.purchaseOrderId,
    'purchaseOrderId',
  )

  return {
    settlementCompanyId: parseEntityId(
      query.settlementCompanyId,
      'settlementCompanyId',
    ),
    supplierId: parseEntityId(query.supplierId, 'supplierId'),
    ...(documentType ? { documentType } : {}),
    ...(status ? { status } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(materialKeyword ? { materialKeyword } : {}),
    ...(purchaseOrderId ? { purchaseOrderId } : {}),
  }
}

export async function getPurchaseFinanceDocumentFlow(
  query: PurchaseFinanceFlowQuery,
  signal?: AbortSignal,
) {
  const params = {
    ...normalizeFilter(query),
    page: Math.max(Math.trunc(query.page), 0),
    size: Math.max(Math.trunc(query.size), 1),
  }
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawRecord>>(
      ENDPOINTS.PURCHASE_FINANCE_DOCUMENT_FLOW,
      { params, signal },
    ),
    '加载采购财务单据流失败',
  )
  return normalizePurchaseFinanceDocumentFlow(response.data)
}

export async function exportPurchaseFinanceDocumentFlow(
  filter: PurchaseFinanceFlowFilter,
): Promise<void> {
  const blob = await http.post<Blob>(
    ENDPOINTS.PURCHASE_FINANCE_DOCUMENT_FLOW_EXPORT,
    normalizeFilter(filter),
    { responseType: 'blob' },
  )
  downloadBlob(blob, '采购财务单据流.xlsx')
}
