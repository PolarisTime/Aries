import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { buildWeightOverview } from '@/config/business-pages/shared'
import { QUERY_KEYS } from '@/constants/query-keys'
import { getModulePageBehavior } from '@/module-system/behavior/module-page-behaviors'
import type { ModuleKey } from '@/module-system/core/module-key'
import type {
  ModuleColumnDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { hasPermission } from '@/utils/permission'
import { usePermissions } from './usePermission'
import { useRuntimeConfig } from './useRuntimeConfig'

/** 受 `sales-orders:read:amount` 收敛的销售金额列（单价/金额）。 */
const SALES_ORDER_AMOUNT_ITEM_COLUMN_KEYS = new Set(['unitPrice', 'amount'])

const WEIGHT_ONLY_AMOUNT_COLUMN_KEYS = new Set([
  'unitPrice',
  'amount',
  'weightAdjustmentAmount',
])

export function filterWeightOnlyItemColumns(
  columns?: ModuleColumnDefinition[],
): ModuleColumnDefinition[] | undefined {
  return columns?.filter(
    (column) => !WEIGHT_ONLY_AMOUNT_COLUMN_KEYS.has(column.dataIndex),
  )
}

export function buildWeightOnlyViewConfig(
  baseConfig: ModulePageConfig,
): ModulePageConfig {
  return {
    ...baseConfig,
    columns: baseConfig.columns.filter(
      (column) => column.dataIndex !== 'totalAmount',
    ),
    detailFields: baseConfig.detailFields.filter(
      (field) => field.key !== 'totalAmount',
    ),
    formFields: baseConfig.formFields?.filter(
      (field) => field.key !== 'totalAmount',
    ),
    itemColumns: filterWeightOnlyItemColumns(baseConfig.itemColumns),
    detailItemColumns: filterWeightOnlyItemColumns(
      baseConfig.detailItemColumns,
    ),
    saveResultItemColumns: filterWeightOnlyItemColumns(
      baseConfig.saveResultItemColumns,
    ),
    buildOverview: (rows: ModuleRecord[]) => buildWeightOverview(rows),
  }
}

export function filterAmountItemColumns(
  columns?: ModuleColumnDefinition[],
): ModuleColumnDefinition[] | undefined {
  return columns?.filter(
    (column) => !SALES_ORDER_AMOUNT_ITEM_COLUMN_KEYS.has(column.dataIndex),
  )
}

/**
 * 无 `sales-orders:read:amount` 字段级权限时，移除销售订单的金额/单价列与字段，
 * 与后端 `PermissionDecimalSerializer` 的读侧脱敏保持一致（前端仅做 UI 降级）。
 */
export function buildAmountRestrictedViewConfig(
  baseConfig: ModulePageConfig,
): ModulePageConfig {
  return {
    ...baseConfig,
    columns: baseConfig.columns.filter(
      (column) => column.dataIndex !== 'totalAmount',
    ),
    detailFields: baseConfig.detailFields.filter(
      (field) => field.key !== 'totalAmount',
    ),
    formFields: baseConfig.formFields?.filter(
      (field) => field.key !== 'totalAmount',
    ),
    itemColumns: filterAmountItemColumns(baseConfig.itemColumns),
    detailItemColumns: filterAmountItemColumns(baseConfig.detailItemColumns),
    saveResultItemColumns: filterAmountItemColumns(
      baseConfig.saveResultItemColumns,
    ),
  }
}

interface Props {
  moduleKey: ModuleKey
  initialConfig?: ModulePageConfig
}

function isWeightOnlyViewEnabled(
  moduleKey: ModuleKey,
  runtimeConfig: ReturnType<typeof useRuntimeConfig>['data'],
) {
  if (!runtimeConfig) {
    return false
  }
  const featureKey = getModulePageBehavior(moduleKey)?.weightOnlyFeatureKey
  return featureKey ? runtimeConfig.features[featureKey] : false
}

export function useModulePageConfig({ moduleKey, initialConfig }: Props) {
  const { data: moduleConfig, isLoading: moduleConfigLoading } = useQuery({
    queryKey: QUERY_KEYS.businessPageConfig(moduleKey),
    queryFn: () => loadBusinessPageConfig(moduleKey),
    placeholderData: initialConfig ? () => initialConfig : keepPreviousData,
    staleTime: 5 * 60_000,
  })

  const { data: runtimeConfig, isLoading: runtimeConfigLoading } =
    useRuntimeConfig()

  const permissions = usePermissions()
  const canReadSalesAmount = hasPermission(
    permissions,
    'sales-orders:read:amount',
  )

  const config = (() => {
    const found = moduleConfig
    if (!found || found.key !== moduleKey) {
      return initialConfig
    }

    let baseConfig = isWeightOnlyViewEnabled(moduleKey, runtimeConfig)
      ? buildWeightOnlyViewConfig(found)
      : found

    if (moduleKey === 'sales-order' && !canReadSalesAmount) {
      baseConfig = buildAmountRestrictedViewConfig(baseConfig)
    }

    return baseConfig
  })() satisfies ModulePageConfig | undefined

  const showSnowflakeId = runtimeConfig?.ui.showSnowflakeId ?? false

  return {
    config,
    showSnowflakeId,
    isLoading: moduleConfigLoading || runtimeConfigLoading,
  }
}
