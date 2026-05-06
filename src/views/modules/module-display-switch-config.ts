import {
  buildWeightOverview,
} from '@/config/business-pages/shared'
import type { ModuleColumnDefinition, ModuleDetailField, ModulePageConfig, ModuleRecord } from '@/types/module-page'

const WEIGHT_ONLY_HEADER_HIDDEN_KEYS = ['totalAmount']

const WEIGHT_ONLY_ITEM_HIDDEN_KEYS: Record<string, string[]> = {
  'purchase-inbounds': ['unitPrice', 'amount', 'weightAdjustmentAmount'],
  'sales-outbounds': ['unitPrice', 'amount'],
}

function filterColumns<T extends ModuleColumnDefinition | ModuleDetailField>(columns: T[] | undefined, hiddenKeys: string[]) {
  if (!columns?.length) {
    return columns
  }
  const hiddenKeySet = new Set(hiddenKeys)
  return columns.filter((column) => {
    const key = 'dataIndex' in column ? column.dataIndex : column.key
    return !hiddenKeySet.has(key)
  })
}

export function applyWeightOnlyViewConfig(moduleKey: string, baseConfig: ModulePageConfig): ModulePageConfig {
  const itemHiddenKeys = WEIGHT_ONLY_ITEM_HIDDEN_KEYS[moduleKey]
  if (!itemHiddenKeys) {
    return baseConfig
  }

  return {
    ...baseConfig,
    columns: filterColumns(baseConfig.columns, WEIGHT_ONLY_HEADER_HIDDEN_KEYS) || [],
    detailFields: filterColumns(baseConfig.detailFields, WEIGHT_ONLY_HEADER_HIDDEN_KEYS) || [],
    itemColumns: filterColumns(baseConfig.itemColumns, itemHiddenKeys),
    buildOverview: (rows: ModuleRecord[]) => buildWeightOverview(rows),
  }
}
