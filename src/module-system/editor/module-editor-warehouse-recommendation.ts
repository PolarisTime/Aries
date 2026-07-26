import type { ModuleLineItem } from '@/types/module-page'

export const WAREHOUSE_SELECTION_SOURCE_KEY = '_warehouseSelectionSource'
export const WAREHOUSE_RECOMMENDATION_KEY = '_warehouseRecommendationKey'

export type WarehouseSelectionSource = 'manual' | 'recommended'

export function getWarehouseSelectionSource(
  item: ModuleLineItem,
): WarehouseSelectionSource | undefined {
  const value = item[WAREHOUSE_SELECTION_SOURCE_KEY]
  return value === 'manual' || value === 'recommended' ? value : undefined
}

export function getWarehouseRecommendationKey(item: ModuleLineItem) {
  const value = item[WAREHOUSE_RECOMMENDATION_KEY]
  return typeof value === 'string' ? value : ''
}

export function markManualWarehouseSelection(item: ModuleLineItem) {
  return {
    ...item,
    [WAREHOUSE_SELECTION_SOURCE_KEY]: 'manual',
    [WAREHOUSE_RECOMMENDATION_KEY]: undefined,
  }
}
