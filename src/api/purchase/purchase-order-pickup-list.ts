import { z } from 'zod'
import { apiGet, assertApiSuccess } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { apiResponseSchema } from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'

const entityIdSchema = z.string().regex(/^[1-9]\d*$/)

const pickupListItemSchema = z.strictObject({
  itemId: entityIdSchema,
  orderId: entityIdSchema,
  orderNo: z.string(),
  lineNo: z.number().int().positive(),
  warehouseId: entityIdSchema.nullable(),
  warehouseName: z.string().nullable(),
  brand: z.string(),
  category: z.string(),
  material: z.string(),
  spec: z.string(),
  length: z.string().nullable(),
  pickupQuantity: z.number().int().positive(),
  pieceWeightTon: z.number().nonnegative(),
  pickupWeightTon: z.number().nonnegative(),
})

const pickupListGroupSchema = z.strictObject({
  key: z.string().min(1),
  supplierId: entityIdSchema.nullable(),
  supplierName: z.string(),
  settlementCompanyId: entityIdSchema.nullable(),
  settlementCompanyName: z.string().nullable(),
  orderCount: z.number().int().positive(),
  itemCount: z.number().int().positive(),
  totalQuantity: z.number().int().positive(),
  totalWeightTon: z.number().nonnegative(),
  items: z.array(pickupListItemSchema).min(1),
})

const pickupListSchema = z.strictObject({
  orderCount: z.number().int().positive(),
  supplierCount: z.number().int().positive(),
  itemCount: z.number().int().positive(),
  totalQuantity: z.number().int().positive(),
  totalWeightTon: z.number().nonnegative(),
  groups: z.array(pickupListGroupSchema).min(1),
  warnings: z.array(z.string()),
})

const pickupListResponseSchema = apiResponseSchema(pickupListSchema)

export type PurchaseOrderPickupList = z.output<typeof pickupListSchema>
export type PurchaseOrderPickupListGroup = z.output<
  typeof pickupListGroupSchema
>
export type PurchaseOrderPickupListItem = z.output<typeof pickupListItemSchema>

export async function fetchPurchaseOrderPickupList(
  orderIds: EntityId[],
  signal?: AbortSignal,
): Promise<PurchaseOrderPickupList> {
  const response = assertApiSuccess(
    await apiGet(
      ENDPOINTS.PURCHASE_ORDER_PICKUP_LIST_PREVIEW,
      pickupListResponseSchema,
      {
        params: { orderIds },
        paramsSerializer: { indexes: null },
        signal,
      },
    ),
    '查询采购订单提货清单失败',
  )
  return response.data
}
