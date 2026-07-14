import type { ModuleLineItem } from '@/types/module-page'

export interface PieceWeightLookupSource {
  inboundItemId?: string | number
  purchaseOrderItemId?: string | number
  salesOrderItemId?: string | number
}

function asLookupId(value: unknown): string | number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }
  return undefined
}

export function resolvePieceWeightLookupSource(
  moduleKey: string,
  item: ModuleLineItem,
): PieceWeightLookupSource {
  const sourceSalesOrderItemId = asLookupId(item.sourceSalesOrderItemId)
  if (sourceSalesOrderItemId !== undefined) {
    return { salesOrderItemId: sourceSalesOrderItemId }
  }

  const itemId = asLookupId(item.id)
  if (moduleKey === 'purchase-inbound' && itemId !== undefined) {
    return { inboundItemId: itemId }
  }

  if (moduleKey === 'sales-order' && itemId !== undefined) {
    return { salesOrderItemId: itemId }
  }

  const sourcePurchaseOrderItemId = asLookupId(item.sourcePurchaseOrderItemId)
  if (sourcePurchaseOrderItemId !== undefined) {
    return { purchaseOrderItemId: sourcePurchaseOrderItemId }
  }

  if (moduleKey === 'inventory-report') {
    return {}
  }

  return itemId !== undefined ? { purchaseOrderItemId: itemId } : {}
}
