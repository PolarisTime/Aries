import { isPurchaseWeighRequiredCategory } from '@/module-system/core/module-option-resolvers'
import type { ModuleRecord, ModuleRecordInput } from '@/types/module-page'
import { buildAmountWeightOverview, cloneLineItems } from '../shared/shared'

export function buildPurchaseInboundOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}

export function buildPurchaseInboundParentFilters(
  currentRecord: ModuleRecordInput,
): Record<string, unknown> {
  return {
    supplierId: currentRecord.supplierId,
    currentRecordId: currentRecord.id,
  }
}

export function mapPurchaseOrderToInboundDraft(
  parentRecord: ModuleRecord,
): Partial<ModuleRecord> {
  return {
    purchaseOrderNo: parentRecord.orderNo || '',
    supplierId: parentRecord.supplierId,
    supplierCode: parentRecord.supplierCode || '',
    supplierName: parentRecord.supplierName || '',
    settlementCompanyId: parentRecord.settlementCompanyId,
    settlementCompanyName: parentRecord.settlementCompanyName || '',
  }
}

export function transformPurchaseOrderItemsToInboundItems(
  parentRecord: ModuleRecord,
) {
  return cloneLineItems(
    Array.isArray(parentRecord.items)
      ? parentRecord.items.map((item) => {
          const quantity = Number(item.remainingQuantity ?? item.quantity ?? 0)
          const pieceWeightTon = Number(item.pieceWeightTon || 0)
          const unitPrice = Number(item.unitPrice || 0)
          const weightTon = Number((quantity * pieceWeightTon).toFixed(8))
          return {
            ...item,
            sourceNo: parentRecord.orderNo || '',
            sourcePurchaseOrderItemId: item.id,
            settlementMode: isPurchaseWeighRequiredCategory(item.category)
              ? '过磅'
              : '理算',
            quantity,
            weightTon,
            weighWeightTon: undefined,
            weightAdjustmentTon: 0,
            weightAdjustmentAmount: 0,
            amount: Number((weightTon * unitPrice).toFixed(2)),
          }
        })
      : [],
    'purchase-inbound-item',
  )
}
