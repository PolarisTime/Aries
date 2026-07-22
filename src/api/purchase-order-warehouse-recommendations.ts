import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

export type PurchaseOrderWarehouseRecommendation = {
  materialId: EntityId
  warehouseId: EntityId
  warehouseCode: string
  warehouseName: string
}

type RawWarehouseRecommendation = {
  materialId?: unknown
  warehouseId?: unknown
  warehouseCode?: unknown
  warehouseName?: unknown
}

const RECOMMENDATION_BATCH_SIZE = 200

function normalizeRecommendation(
  recommendation: RawWarehouseRecommendation,
  index: number,
): PurchaseOrderWarehouseRecommendation {
  return {
    materialId: parseEntityId(
      recommendation.materialId,
      `warehouseRecommendations[${index}].materialId`,
    ),
    warehouseId: parseEntityId(
      recommendation.warehouseId,
      `warehouseRecommendations[${index}].warehouseId`,
    ),
    warehouseCode: asString(recommendation.warehouseCode).trim(),
    warehouseName: asString(recommendation.warehouseName).trim(),
  }
}

export async function fetchPurchaseOrderWarehouseRecommendations(
  supplierId: EntityId,
  materialIds: EntityId[],
  signal?: AbortSignal,
): Promise<PurchaseOrderWarehouseRecommendation[]> {
  const distinctMaterialIds = [...new Set(materialIds)]
  if (!distinctMaterialIds.length) {
    return []
  }

  const batches: EntityId[][] = []
  for (
    let index = 0;
    index < distinctMaterialIds.length;
    index += RECOMMENDATION_BATCH_SIZE
  ) {
    batches.push(
      distinctMaterialIds.slice(index, index + RECOMMENDATION_BATCH_SIZE),
    )
  }

  const batchRows = await Promise.all(
    batches.map(async (batch) => {
      const rawResponse = await http.get<
        ApiResponse<RawWarehouseRecommendation[]>
      >(ENDPOINTS.PURCHASE_ORDER_WAREHOUSE_RECOMMENDATIONS, {
        params: { supplierId, materialIds: batch },
        paramsSerializer: { indexes: null },
        signal,
      })
      return assertApiSuccess(rawResponse, '查询采购仓库推荐失败').data
    }),
  )
  return batchRows.flat().map(normalizeRecommendation)
}
