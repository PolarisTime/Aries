import {
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
} from '@/api/business'
import { assertApiSuccess, http } from '@/api/client'
import { withIdempotencyKey } from '@/api/idempotency'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import { asNumber, asString } from '@/utils/type-narrowing'

export interface PaymentPrepaymentAllocationInput {
  id?: string
  sourceStatementId: string
  allocatedAmount: number | string
}

export interface PaymentPrepaymentAllocation {
  id?: string
  lineNo: number
  sourceStatementId: string
  statementNo: string
  statementBalanceAmount: number
  allocatedAmount: number
}

interface RawPaymentPrepaymentAllocation {
  id?: string | number | null
  lineNo?: number | null
  sourceStatementId?: string | number | null
  statementNo?: string | null
  statementBalanceAmount?: number | string | null
  allocatedAmount?: number | string | null
}

interface SupplierStatementCandidateFilters {
  supplierCode: string
  settlementCompanyId: string
}

export async function fetchPaymentPrepaymentAllocationContext(
  paymentId: string,
): Promise<ModuleRecord> {
  const response = await getBusinessModuleDetail('payment', paymentId)
  return response.data
}

export async function listPaymentSupplierStatementCandidates({
  supplierCode,
  settlementCompanyId,
}: SupplierStatementCandidateFilters): Promise<ModuleRecord[]> {
  const rows = await listAllBusinessModuleRows('supplier-statement', {
    settlementCompanyId,
    status: '已确认',
  })

  return rows.filter(
    (row) =>
      asString(row.supplierCode).trim() === supplierCode &&
      asString(row.settlementCompanyId) === settlementCompanyId &&
      asString(row.status).trim() === '已确认',
  )
}

export async function replacePaymentPrepaymentAllocations(
  paymentId: string,
  items: PaymentPrepaymentAllocationInput[],
): Promise<PaymentPrepaymentAllocation[]> {
  const response = assertApiSuccess(
    await http.put<ApiResponse<RawPaymentPrepaymentAllocation[]>>(
      `/payments/${encodeURIComponent(paymentId)}/prepayment-allocations`,
      {
        items: items.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          sourceStatementId: item.sourceStatementId,
          allocatedAmount: asNumber(item.allocatedAmount),
        })),
      },
      withIdempotencyKey(),
    ),
    '更新采购预付款分配失败',
  )

  return Array.isArray(response.data)
    ? response.data.map(normalizeAllocation)
    : []
}

function normalizeAllocation(
  allocation: RawPaymentPrepaymentAllocation,
): PaymentPrepaymentAllocation {
  const id = asString(allocation.id).trim()
  return {
    ...(id ? { id } : {}),
    lineNo: asNumber(allocation.lineNo),
    sourceStatementId: asString(allocation.sourceStatementId).trim(),
    statementNo: asString(allocation.statementNo).trim(),
    statementBalanceAmount: asNumber(allocation.statementBalanceAmount),
    allocatedAmount: asNumber(allocation.allocatedAmount),
  }
}
