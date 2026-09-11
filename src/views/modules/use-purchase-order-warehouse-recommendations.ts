import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { fetchPurchaseOrderWarehouseRecommendations } from '@/api/purchase/purchase-order-warehouse-recommendations'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  getWarehouseRecommendationKey,
  getWarehouseSelectionSource,
  WAREHOUSE_RECOMMENDATION_KEY,
  WAREHOUSE_SELECTION_SOURCE_KEY,
} from '@/module-system/editor/module-editor-warehouse-recommendation'
import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleLineItem } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

interface Props {
  enabled: boolean
  supplierId: unknown
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
}

const RECOMMENDATION_STALE_TIME = 30_000

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
  useEffect(() => {
    setItemsRef.current = setItems
  }, [setItems])
  const normalizedSupplierId = parseEditorEntityId(supplierId)
  const materialIds = useMemo(
    () =>
      enabled
        ? collectMaterialIdsNeedingRecommendation(normalizedSupplierId, items)
        : [],
    [enabled, normalizedSupplierId, items],
  )
  const materialIdsKey = materialIds.join(',')

  // 供应商或待推荐物料变化时，先清理已失效的历史推荐仓库，避免残留错误选择。
  useEffect(() => {
    if (!enabled || items.length === 0) {
      return
    }
    setItemsRef.current((current) =>
      clearStaleRecommendedWarehouses(current, normalizedSupplierId),
    )
  }, [enabled, normalizedSupplierId, items])

  const recommendationsQuery = useQuery({
    queryKey: QUERY_KEYS.warehouseRecommendations({
      supplierId: normalizedSupplierId ?? '',
      materialIds,
    }),
    queryFn: ({ signal }) => {
      if (!normalizedSupplierId) {
        return Promise.resolve([])
      }
      return fetchPurchaseOrderWarehouseRecommendations(
        normalizedSupplierId,
        materialIds,
        signal,
      )
    },
    enabled: Boolean(enabled && normalizedSupplierId && materialIds.length),
    staleTime: RECOMMENDATION_STALE_TIME,
  })

  const recommendations = recommendationsQuery.data

  // 仅在查询成功且当前供应商/物料与结果匹配时写回编辑器，避免覆盖用户已编辑内容。
  useEffect(() => {
    if (!enabled || !normalizedSupplierId || !recommendations) {
      return
    }
    const requestedMaterialIdList = materialIdsKey
      ? materialIdsKey.split(',')
      : []
    if (!requestedMaterialIdList.length) {
      return
    }

    const requestedMaterialIds = new Set(requestedMaterialIdList)
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
  }, [enabled, normalizedSupplierId, materialIdsKey, recommendations])
}
