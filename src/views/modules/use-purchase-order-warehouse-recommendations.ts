import { useEffect, useMemo, useRef } from 'react'
import { fetchPurchaseOrderWarehouseRecommendations } from '@/api/purchase-order-warehouse-recommendations'
import {
  getWarehouseRecommendationKey,
  getWarehouseSelectionSource,
  WAREHOUSE_RECOMMENDATION_KEY,
  WAREHOUSE_SELECTION_SOURCE_KEY,
} from '@/module-system/module-editor-warehouse-recommendation'
import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleLineItem } from '@/types/module-page'
import { logger } from '@/utils/logger'
import { asString } from '@/utils/type-narrowing'

interface Props {
  enabled: boolean
  supplierId: unknown
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
}

function parseEditorEntityId(value: unknown): EntityId | undefined {
  try {
    return parseOptionalEntityId(value)
  } catch {
    return undefined
  }
}

function recommendationKey(supplierId: EntityId, materialId: EntityId) {
  return `${supplierId}:${materialId}`
}

function hasWarehouse(item: ModuleLineItem) {
  return Boolean(
    asString(item.warehouseId).trim() || asString(item.warehouseName).trim(),
  )
}

function collectMaterialIdsNeedingRecommendation(
  supplierId: EntityId | undefined,
  items: ModuleLineItem[],
) {
  if (!supplierId) {
    return []
  }

  const materialIds = new Set<EntityId>()
  for (const item of items) {
    const materialId = parseEditorEntityId(item.materialId)
    if (!materialId) {
      continue
    }

    const source = getWarehouseSelectionSource(item)
    if (source === 'manual') {
      continue
    }
    if (source !== 'recommended' && hasWarehouse(item)) {
      continue
    }
    if (
      getWarehouseRecommendationKey(item) ===
      recommendationKey(supplierId, materialId)
    ) {
      continue
    }
    materialIds.add(materialId)
  }
  return [...materialIds].sort()
}

function clearStaleRecommendedWarehouses(
  items: ModuleLineItem[],
  supplierId: EntityId | undefined,
) {
  let changed = false
  const nextItems = items.map((item) => {
    if (getWarehouseSelectionSource(item) !== 'recommended') {
      return item
    }

    const materialId = parseEditorEntityId(item.materialId)
    if (!supplierId || !materialId) {
      changed = true
      return {
        ...item,
        warehouseId: undefined,
        warehouseName: '',
        [WAREHOUSE_SELECTION_SOURCE_KEY]: undefined,
        [WAREHOUSE_RECOMMENDATION_KEY]: undefined,
      }
    }

    if (
      getWarehouseRecommendationKey(item) ===
      recommendationKey(supplierId, materialId)
    ) {
      return item
    }

    if (!hasWarehouse(item)) {
      return item
    }
    changed = true
    return { ...item, warehouseId: undefined, warehouseName: '' }
  })
  return changed ? nextItems : items
}

export function usePurchaseOrderWarehouseRecommendations({
  enabled,
  supplierId,
  items,
  setItems,
}: Props) {
  const setItemsRef = useRef(setItems)
  setItemsRef.current = setItems
  const normalizedSupplierId = parseEditorEntityId(supplierId)
  const materialIds = useMemo(
    () =>
      enabled
        ? collectMaterialIdsNeedingRecommendation(normalizedSupplierId, items)
        : [],
    [enabled, normalizedSupplierId, items],
  )
  const materialIdsKey = materialIds.join(',')

  useEffect(() => {
    if (!enabled) {
      return
    }

    setItemsRef.current((current) =>
      clearStaleRecommendedWarehouses(current, normalizedSupplierId),
    )
    const requestedMaterialIdList = materialIdsKey
      ? materialIdsKey.split(',')
      : []
    if (!normalizedSupplierId || !requestedMaterialIdList.length) {
      return
    }

    const controller = new AbortController()
    const requestedMaterialIds = new Set(requestedMaterialIdList)
    void fetchPurchaseOrderWarehouseRecommendations(
      normalizedSupplierId,
      requestedMaterialIdList,
      controller.signal,
    )
      .then((recommendations) => {
        if (controller.signal.aborted) {
          return
        }
        const recommendationByMaterialId = new Map(
          recommendations.map((recommendation) => [
            recommendation.materialId,
            recommendation,
          ]),
        )
        setItemsRef.current((current) =>
          current.map((item) => {
            const materialId = parseEditorEntityId(item.materialId)
            if (!materialId || !requestedMaterialIds.has(materialId)) {
              return item
            }

            const source = getWarehouseSelectionSource(item)
            if (
              source === 'manual' ||
              (source !== 'recommended' && hasWarehouse(item))
            ) {
              return item
            }

            const key = recommendationKey(normalizedSupplierId, materialId)
            if (getWarehouseRecommendationKey(item) === key) {
              return item
            }
            const recommendation = recommendationByMaterialId.get(materialId)
            return {
              ...item,
              warehouseId: recommendation?.warehouseId,
              warehouseName: recommendation?.warehouseName || '',
              [WAREHOUSE_SELECTION_SOURCE_KEY]: 'recommended',
              [WAREHOUSE_RECOMMENDATION_KEY]: key,
            }
          }),
        )
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        logger.warn('采购订单仓库自动推荐失败', { error })
      })

    return () => controller.abort()
  }, [enabled, normalizedSupplierId, materialIdsKey])
}
