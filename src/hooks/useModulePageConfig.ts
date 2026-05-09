import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { listAllBusinessModuleRows } from '@/api/business'
import {
  DISPLAY_SWITCH_CODES,
  isDisplaySwitchEnabled,
  listDisplaySwitches,
} from '@/api/system-settings'
import { businessPageConfigs } from '@/config/business-pages'
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

interface Props {
  moduleKey: string
}

function useStatementLinkCatalog() {
  const customerStatementsQuery = useQuery({
    queryKey: ['statement-link-options', 'customer-statement'],
    queryFn: () => listAllBusinessModuleRows('customer-statement', {}),
    enabled: true,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const supplierStatementsQuery = useQuery({
    queryKey: ['statement-link-options', 'supplier-statement'],
    queryFn: () => listAllBusinessModuleRows('supplier-statement', {}),
    enabled: true,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const freightStatementsQuery = useQuery({
    queryKey: ['statement-link-options', 'freight-statement'],
    queryFn: () => listAllBusinessModuleRows('freight-statement', {}),
    enabled: true,
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
            moduleKey as 'receipt' | 'payment',
            form,
            catalog,
          ),
      }
    }),
  }
}

export function useModulePageConfig({ moduleKey }: Props) {
  const displaySwitchesQuery = useQuery({
    queryKey: ['general-setting', 'display-switches'],
    queryFn: async () => {
      try {
        return await listDisplaySwitches()
      } catch {
        return []
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const statementLinkCatalog = useStatementLinkCatalog()

  const config = useMemo<ModulePageConfig>(() => {
    const found = businessPageConfigs[moduleKey]
    if (!found) {
      throw new Error(`Unknown module key: ${moduleKey}`)
    }

    const switchCode = WEIGHT_ONLY_VIEW_SETTING_CODES[moduleKey]
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
  }, [moduleKey, displaySwitchesQuery.data, statementLinkCatalog])

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

  return {
    config,
    showSnowflakeId,
    supportsInvoiceAssist,
    isLoading: displaySwitchesQuery.isLoading,
  }
}
