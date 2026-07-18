import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { buildWeightOverview } from '@/config/business-pages/shared'
import { QUERY_KEYS } from '@/constants/query-keys'
import type {
  ModuleColumnDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { useRuntimeConfig } from './useRuntimeConfig'

const WEIGHT_ONLY_AMOUNT_COLUMN_KEYS = new Set([
  'unitPrice',
  'amount',
  'weightAdjustmentAmount',
])

function filterWeightOnlyItemColumns(
  columns?: ModuleColumnDefinition[],
): ModuleColumnDefinition[] | undefined {
  return columns?.filter(
    (column) => !WEIGHT_ONLY_AMOUNT_COLUMN_KEYS.has(column.dataIndex),
  )
}

function buildWeightOnlyViewConfig(
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
    buildOverview: (rows: ModuleRecord[]) => buildWeightOverview(rows),
  }
}

interface Props {
  moduleKey: string
  initialConfig?: ModulePageConfig
}

function isWeightOnlyViewEnabled(
  moduleKey: string,
  runtimeConfig: ReturnType<typeof useRuntimeConfig>['data'],
) {
  if (!runtimeConfig) {
    return false
  }
  if (moduleKey === 'purchase-inbound') {
    return runtimeConfig.features.weightOnlyPurchaseInbound
  }
  if (moduleKey === 'sales-outbound') {
    return runtimeConfig.features.weightOnlySalesOutbound
  }
  return false
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

  const config = (() => {
    const found = moduleConfig
    if (!found || found.key !== moduleKey) {
      return initialConfig
    }

    const baseConfig = isWeightOnlyViewEnabled(moduleKey, runtimeConfig)
      ? buildWeightOnlyViewConfig(found)
      : found

    return baseConfig
  })() satisfies ModulePageConfig | undefined

  const showSnowflakeId = runtimeConfig?.ui.showSnowflakeId ?? false

  return {
    config,
    showSnowflakeId,
    isLoading: moduleConfigLoading || runtimeConfigLoading,
  }
}
