import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listAllBusinessModuleRows } from '@/api/business'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { buildWeightOverview } from '@/config/business-pages/shared'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  buildStatementLinkOptions,
  type StatementLinkCatalog,
} from '@/module-system/module-adapter-finance-links'
import type {
  ModuleColumnDefinition,
  ModulePageConfig,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { useRuntimeConfig } from './useRuntimeConfig'

const WEIGHT_ONLY_AMOUNT_COLUMN_KEYS = new Set([
  'unitPrice',
  'amount',
  'weightAdjustmentAmount',
])

const INVOICE_ASSIST_MODULE_KEYS = new Set(['invoice-receipt', 'invoice-issue'])

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

function useStatementLinkCatalog(enabled: boolean) {
  const { data: customerStatements = [] } = useQuery({
    queryKey: QUERY_KEYS.statementLinkOptions('customer-statement'),
    queryFn: () => listAllBusinessModuleRows('customer-statement', {}),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })

  const { data: supplierStatements = [] } = useQuery({
    queryKey: QUERY_KEYS.statementLinkOptions('supplier-statement'),
    queryFn: () => listAllBusinessModuleRows('supplier-statement', {}),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })

  const { data: freightStatements = [] } = useQuery({
    queryKey: QUERY_KEYS.statementLinkOptions('freight-statement'),
    queryFn: () => listAllBusinessModuleRows('freight-statement', {}),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })

  return {
    customerStatements,
    supplierStatements,
    freightStatements,
  } satisfies StatementLinkCatalog
}

function decorateStatementLinkConfig(
  baseConfig: ModulePageConfig,
  moduleKey: string,
  catalog: StatementLinkCatalog,
): ModulePageConfig {
  if (moduleKey !== 'receipt' && moduleKey !== 'payment') {
    return baseConfig
  }

  return {
    ...baseConfig,
    formFields: (baseConfig.formFields || []).map((field) => {
      if (field.key !== 'sourceStatementId') {
        return field
      }
      return {
        ...field,
        options: (form?: ModuleRecordInput) =>
          buildStatementLinkOptions(moduleKey, form, catalog),
      }
    }),
  }
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
  const needsStatementLinkCatalog =
    moduleKey === 'receipt' || moduleKey === 'payment'

  const { data: moduleConfig, isLoading: moduleConfigLoading } = useQuery({
    queryKey: QUERY_KEYS.businessPageConfig(moduleKey),
    queryFn: () => loadBusinessPageConfig(moduleKey),
    placeholderData: initialConfig ? () => initialConfig : keepPreviousData,
    staleTime: 5 * 60_000,
  })

  const { data: runtimeConfig, isLoading: runtimeConfigLoading } =
    useRuntimeConfig()

  const statementLinkCatalog = useStatementLinkCatalog(
    needsStatementLinkCatalog,
  )

  const config = (() => {
    const found = moduleConfig
    if (!found || found.key !== moduleKey) {
      return initialConfig
    }

    const baseConfig = isWeightOnlyViewEnabled(moduleKey, runtimeConfig)
      ? buildWeightOnlyViewConfig(found)
      : found

    return decorateStatementLinkConfig(
      baseConfig,
      moduleKey,
      statementLinkCatalog,
    )
  })() satisfies ModulePageConfig | undefined

  const showSnowflakeId = runtimeConfig?.ui.showSnowflakeId ?? false

  const supportsInvoiceAssist = INVOICE_ASSIST_MODULE_KEYS.has(moduleKey)

  return {
    config,
    showSnowflakeId,
    supportsInvoiceAssist,
    isLoading: moduleConfigLoading || runtimeConfigLoading,
  }
}
