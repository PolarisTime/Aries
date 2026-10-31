import { z } from 'zod'
import { apiDeleteNoContent, apiPut } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'

/**
 * 采购订单明细行「已开完」**手动标记** API。
 *
 * <p>语义: 人工裁定"该明细行不用再开了", 与吨位列的自动数字无关 —— 吨位列给事实
 * (真实已开货多少、还剩多少), 本标记给人作出的最终结论; 后端留痕(谁/何时)。</p>
 *
 * <ul>
 *   <li>`PUT /purchase-order-items/{itemId}/issued-done` body `{issuedDone:true}` → 200 + 标记与留痕;</li>
 *   <li>`DELETE /purchase-order-items/{itemId}/issued-done` → 204, 取消并清空留痕;</li>
 *   <li>幂等: 重复标记不覆盖首次留痕; 未标记时取消是 no-op; 明细行不存在 → 404。</li>
 * </ul>
 */
export type PurchaseOrderItemIssuedDoneRecord = {
  purchaseOrderItemId: EntityId
  issuedDone: boolean
  /** 标记操作人ID(取消后无该字段)。 */
  issuedDoneBy?: EntityId
  /** 标记操作人姓名快照(取消后无该字段)。 */
  issuedDoneName?: string
  /** 标记时刻(取消后无该字段)。 */
  issuedDoneAt?: string
}

const issuedDoneSchema = z.looseObject({
  purchaseOrderItemId: z.unknown(),
  issuedDone: z.boolean().nullable().optional(),
  issuedDoneBy: z.union([z.number(), z.string()]).nullable().optional(),
  issuedDoneName: z.string().nullable().optional(),
  issuedDoneAt: z.string().nullable().optional(),
})

function normalize(
  raw: z.infer<typeof issuedDoneSchema>,
  field: string,
): PurchaseOrderItemIssuedDoneRecord {
  const issuedDoneBy = parseOptionalEntityId(
    raw.issuedDoneBy,
    `${field}.issuedDoneBy`,
  )
  return {
    purchaseOrderItemId: parseEntityId(
      raw.purchaseOrderItemId,
      `${field}.purchaseOrderItemId`,
    ),
    issuedDone: Boolean(raw.issuedDone),
    ...(issuedDoneBy ? { issuedDoneBy } : {}),
    ...(raw.issuedDoneName ? { issuedDoneName: raw.issuedDoneName } : {}),
    ...(raw.issuedDoneAt ? { issuedDoneAt: raw.issuedDoneAt } : {}),
  }
}

/*
 * 后端 `V2PurchaseOrderItemController` 为类级 `@IdempotencyRequired`：PUT/DELETE 写请求
 * 必须带 `X-Idempotency-Key`，否则 422。`idempotencyKey` 可选：同一次用户动作内重试传同一个
 * key，不传则本次请求创建时生成一次（401 换令牌重试复用同一请求配置，key 不变）。
 */

/** 标记「已开完」(PUT)。 */
export async function markPurchaseOrderItemIssuedDone(
  itemId: EntityId,
  signal?: AbortSignal,
  idempotencyKey?: string,
): Promise<PurchaseOrderItemIssuedDoneRecord> {
  const id = parseEntityId(itemId, 'purchaseOrderItemId')
  const raw = await apiPut(
    ENDPOINTS.PURCHASE_ORDER_ITEM_ISSUED_DONE(id),
    issuedDoneSchema,
    { issuedDone: true },
    withIdempotencyKey(signal ? { signal } : {}, idempotencyKey),
  )
  return normalize(raw, `purchaseOrderItemIssuedDone[${id}]`)
}

/** 取消「已开完」标记并清空留痕(DELETE, 204)。 */
export async function clearPurchaseOrderItemIssuedDone(
  itemId: EntityId,
  signal?: AbortSignal,
  idempotencyKey?: string,
): Promise<void> {
  await apiDeleteNoContent(
    ENDPOINTS.PURCHASE_ORDER_ITEM_ISSUED_DONE(
      parseEntityId(itemId, 'purchaseOrderItemId'),
    ),
    withIdempotencyKey(signal ? { signal } : {}, idempotencyKey),
  )
}

/**
 * 按目标状态设置标记: `true` 走 PUT(拿到留痕), `false` 走 DELETE(204, 无留痕)。
 *
 * <p>返回归一化后的标记记录, 便于调用方回填「谁在什么时候标的」; 取消时只回标记状态。</p>
 */
export async function setPurchaseOrderItemIssuedDone(
  itemId: EntityId,
  issuedDone: boolean,
  signal?: AbortSignal,
  idempotencyKey?: string,
): Promise<PurchaseOrderItemIssuedDoneRecord> {
  const id = parseEntityId(itemId, 'purchaseOrderItemId')
  if (!issuedDone) {
    await clearPurchaseOrderItemIssuedDone(id, signal, idempotencyKey)
    return { purchaseOrderItemId: id, issuedDone: false }
  }
  return markPurchaseOrderItemIssuedDone(id, signal, idempotencyKey)
}
