import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { listAllBusinessModuleRows } from '@/api/business'
import {
  DISPLAY_SWITCH_CODES,
  isDisplaySwitchEnabled,
  listClientSettings,
} from '@/api/system-settings'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { buildWeightOverview } from '@/config/business-pages/shared'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import {
  buildStatementLinkOptions,
  type StatementLinkCatalog,
} from '@/views/modules/module-adapter-finance-links'

const WEIGHT_ONLY_VIEW_SETTING_CODES: Record<string, string> = {
  'purchase-inbound': DISPLAY_SWITCH_CODES.weightOnlyPurchaseInbounds,
  'sales-outbound': DISPLAY_SWITCH_CODES.weightOnlySalesOutbounds,
}

const INVOICE_ASSIST_MODULE_KEYS = new Set([
  'invoice-receipt',
  'invoice-issue',
])

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
    buildOverview: (rows: ModuleRecord[]) => buildWeightOverview(rows),
  }
}

type Props = {
  moduleKey: string
  initialConfig?: ModulePageConfig
}

function useStatementLinkCatalog(enabled: boolean) {
  const customerStatementsQuery = useQuery({
    queryKey: ['statement-link-options', 'customer-statement'],
    queryFn: () => listAllBusinessModuleRows('customer-statement', {}),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const supplierStatementsQuery = useQuery({
    queryKey: ['statement-link-options', 'supplier-statement'],
    queryFn: () => listAllBusinessModuleRows('supplier-statement', {}),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const freightStatementsQuery = useQuery({
    queryKey: ['statement-link-options', 'freight-statement'],
    queryFn: () => listAllBusinessModuleRows('freight-statement', {}),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  return useMemo<StatementLinkCatalog>(
    () => ({
      customerStatements: customerStatementsQuery.data || [],
      supplierStatements: supplierStatementsQuery.data || [],
      freightStatements: freightStatementsQuery.data || [],
    }),
    [
      customerStatementsQuery.data,
      supplierStatementsQuery.data,
      freightStatementsQuery.data,
    ],
  )
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
        options: (form?: Record<string, unknown>) =>
          buildStatementLinkOptions(
            moduleKey,
            form,
            catalog,
          ),
      }
    }),
  }
}

export function useModulePageConfig({ moduleKey, initialConfig }: Props) {
  const previousModuleKeyRef = useRef(moduleKey)
  const switchCode = WEIGHT_ONLY_VIEW_SETTING_CODES[moduleKey]
  const needsStatementLinkCatalog =
    moduleKey === 'receipt' || moduleKey === 'payment'
  const canReusePreviousConfig = previousModuleKeyRef.current === moduleKey

  const moduleConfigQuery = useQuery({
    queryKey: ['business-page-config', moduleKey],
    queryFn: () => loadBusinessPageConfig(moduleKey),
    placeholderData: initialConfig
      ? () => initialConfig
      : canReusePreviousConfig
        ? keepPreviousData
        : undefined,
    staleTime: 5 * 60_000,
  })

  const displaySwitchesQuery = useQuery({
    queryKey: ['general-setting', 'client-settings'],
    queryFn: async () => {
      try {
        return await listClientSettings()
      } catch {
        return []
      }
    },
    enabled: true,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const statementLinkCatalog = useStatementLinkCatalog(needsStatementLinkCatalog)

  const config = useMemo<ModulePageConfig | undefined>(() => {
    const found = moduleConfigQuery.data
    if (!found || found.key !== moduleKey) {
      return undefined
    }

    const isWeightOnlyViewEnabled = Boolean(
      switchCode &&
        isDisplaySwitchEnabled(displaySwitchesQuery.data, switchCode),
    )

    const baseConfig = isWeightOnlyViewEnabled
      ? buildWeightOnlyViewConfig(found)
      : found

    return decorateStatementLinkConfig(
      baseConfig,
      moduleKey,
      statementLinkCatalog,
    )
  }, [
    moduleKey,
    moduleConfigQuery.data,
    displaySwitchesQuery.data,
    statementLinkCatalog,
  ])

  const showSnowflakeId = useMemo(
    () =>
      isDisplaySwitchEnabled(
        displaySwitchesQuery.data,
        DISPLAY_SWITCH_CODES.showSnowflakeId,
      ),
    [displaySwitchesQuery.data],
  )

  const supportsInvoiceAssist = useMemo(
    () => INVOICE_ASSIST_MODULE_KEYS.has(moduleKey),
    [moduleKey],
  )

  useEffect(() => {
    previousModuleKeyRef.current = moduleKey
  }, [moduleKey])

  return {
    config,
    showSnowflakeId,
    supportsInvoiceAssist,
    isLoading: moduleConfigQuery.isLoading || displaySwitchesQuery.isLoading,
  }
}
