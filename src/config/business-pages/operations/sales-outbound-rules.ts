import type { ModuleRecord, ModuleRecordInput } from '@/types/module-page'
import { buildAmountWeightOverview, cloneLineItems } from '../shared/shared'

export function buildSalesOutboundOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}

export function buildSalesOutboundParentFilters(
  currentRecord: ModuleRecordInput,
): Record<string, unknown> {
  return {
    currentRecordId: currentRecord.id,
  }
}

export function mapSalesOrderToOutboundDraft(
  parentRecord: ModuleRecord,
): Partial<ModuleRecord> {
  return {
    customerId: parentRecord.customerId,
    customerName: parentRecord.customerName || '',
    projectId: parentRecord.projectId,
    projectName: parentRecord.projectName || '',
    settlementCompanyId: parentRecord.settlementCompanyId,
    settlementCompanyName: parentRecord.settlementCompanyName || '',
  }
}

export function transformSalesOrderItemsToOutboundItems(
  parentRecord: ModuleRecord,
) {
  return cloneLineItems(
    Array.isArray(parentRecord.items)
      ? parentRecord.items.map((item) => ({
          ...item,
          sourceNo: parentRecord.orderNo || '',
          sourceSalesOrderItemId: item.id,
        }))
      : [],
    'sales-outbound-item',
  )
}
