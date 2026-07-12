import {
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
} from '@/api/business'
import { assertApiSuccess, http } from '@/api/client'
import { withIdempotencyKey } from '@/api/idempotency'
import type { ApiResponse } from '@/types/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleRecord } from '@/types/module-page'
import { asNumber, asString } from '@/utils/type-narrowing'

export interface PaymentPrepaymentAllocationInput {
  id?: EntityId
  sourceSupplierStatementId: EntityId
  allocatedAmount: number | string
}

export interface PaymentPrepaymentAllocation {
  id?: EntityId
  lineNo: number
  sourceSupplierStatementId: EntityId
  statementNo: string
  statementBalanceAmount: number
  allocatedAmount: number
}

interface RawPaymentPrepaymentAllocation {
  id?: string | number | null
  lineNo?: number | null
  sourceStatementId?: string | number | null
  sourceSupplierStatementId?: string | number | null
  statementNo?: string | null
  statementBalanceAmount?: number | string | null
  allocatedAmount?: number | string | null
}

interface SupplierStatementCandidateFilters {
  supplierId: EntityId
  settlementCompanyId: EntityId
}

export async function fetchPaymentPrepaymentAllocationContext(
  paymentId: EntityId,
): Promise<ModuleRecord> {
  const response = await getBusinessModuleDetail(
    'payment',
    parseEntityId(paymentId, 'paymentId'),
  )
  return response.data
}

export async function listPaymentSupplierStatementCandidates({
  supplierId,
  settlementCompanyId,
}: SupplierStatementCandidateFilters): Promise<ModuleRecord[]> {
  const normalizedSupplierId = parseEntityId(supplierId, 'supplierId')
  const normalizedSettlementCompanyId = parseEntityId(
    settlementCompanyId,
    'settlementCompanyId',
  )
  const rows = await listAllBusinessModuleRows('supplier-statement', {
    supplierId: normalizedSupplierId,
    settlementCompanyId: normalizedSettlementCompanyId,
    status: '已确认',
  })

  return rows.filter(
    (row) =>
      parseOptionalEntityId(row.supplierId, 'supplierStatement.supplierId') ===
        normalizedSupplierId &&
      parseOptionalEntityId(
        row.settlementCompanyId,
        'supplierStatement.settlementCompanyId',
      ) === normalizedSettlementCompanyId &&
      asString(row.status).trim() === '已确认',
  )
}

export async function replacePaymentPrepaymentAllocations(
  paymentId: EntityId,
  items: PaymentPrepaymentAllocationInput[],
): Promise<PaymentPrepaymentAllocation[]> {
  const normalizedPaymentId = parseEntityId(paymentId, 'paymentId')
  const response = assertApiSuccess(
    await http.put<ApiResponse<RawPaymentPrepaymentAllocation[]>>(
      `/payments/${encodeURIComponent(normalizedPaymentId)}/prepayment-allocations`,
      {
        items: items.map((item, index) => ({
          ...(item.id
            ? { id: parseEntityId(item.id, `items[${index}].id`) }
            : {}),
          sourceSupplierStatementId: parseEntityId(
            item.sourceSupplierStatementId,
            `items[${index}].sourceSupplierStatementId`,
          ),
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
  const id = parseOptionalEntityId(allocation.id, 'allocation.id')
  return {
    ...(id ? { id } : {}),
    lineNo: asNumber(allocation.lineNo),
    sourceSupplierStatementId: parseEntityId(
      allocation.sourceSupplierStatementId ?? allocation.sourceStatementId,
      'allocation.sourceSupplierStatementId',
    ),
    statementNo: asString(allocation.statementNo).trim(),
    statementBalanceAmount: asNumber(allocation.statementBalanceAmount),
    allocatedAmount: asNumber(allocation.allocatedAmount),
  }
}
