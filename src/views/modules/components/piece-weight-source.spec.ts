import { describe, expect, it } from 'vitest'
import { resolvePieceWeightLookupSource } from './piece-weight-source'

describe('resolvePieceWeightLookupSource', () => {
  it('uses purchase order item id for purchase order rows', () => {
    expect(
      resolvePieceWeightLookupSource('purchase-order', { id: 'po-item-1' }),
    ).toEqual({ purchaseOrderItemId: 'po-item-1' })
  })

  it('uses source purchase order item id for purchase inbound rows', () => {
    expect(
      resolvePieceWeightLookupSource('purchase-inbound', {
        id: 'inbound-item-1',
        sourcePurchaseOrderItemId: 'po-item-1',
      }),
    ).toEqual({ inboundItemId: 'inbound-item-1' })
  })

  it('uses sales order item id for sales order rows', () => {
    expect(
      resolvePieceWeightLookupSource('sales-order', {
        id: 'sales-order-item-1',
        sourcePurchaseOrderItemId: 'po-item-1',
      }),
    ).toEqual({ salesOrderItemId: 'sales-order-item-1' })
  })

  it('uses source sales order item id for sales outbound rows', () => {
    expect(
      resolvePieceWeightLookupSource('sales-outbound', {
        id: 'outbound-item-1',
        sourceSalesOrderItemId: 'sales-order-item-1',
      }),
    ).toEqual({ salesOrderItemId: 'sales-order-item-1' })
  })
})
