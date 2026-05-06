import { useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { businessPageConfigs } from '@/config/business-pages'
import {
  buildWeightOverview,
  compactWeightOnlyPurchaseItemColumns,
} from '@/config/business-pages/shared'
import { listDisplaySwitches, isDisplaySwitchEnabled, DISPLAY_SWITCH_CODES } from '@/api/system-settings'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

const WEIGHT_ONLY_VIEW_SETTING_CODES: Record<string, string> = {
  'purchase-inbounds': DISPLAY_SWITCH_CODES.weightOnlyPurchaseInbounds,
  'sales-outbounds': DISPLAY_SWITCH_CODES.weightOnlySalesOutbounds,
}

const INVOICE_ASSIST_MODULE_KEYS = new Set(['invoice-receipts', 'invoice-issues'])

function buildWeightOnlyViewConfig(baseConfig: ModulePageConfig): ModulePageConfig {
  return {
    ...baseConfig,
    columns: baseConfig.columns.filter((column) => column.dataIndex !== 'totalAmount'),
    detailFields: baseConfig.detailFields.filter((field) => field.key !== 'totalAmount'),
    itemColumns: compactWeightOnlyPurchaseItemColumns,
    buildOverview: (rows: ModuleRecord[]) => buildWeightOverview(rows),
  }
}

interface Props {
  moduleKey: string
}

export function useModulePageConfig({ moduleKey }: Props) {
  const displaySwitchesQuery = useQuery({
    queryKey: ['general-settings', 'display-switches'],
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

  const config = useMemo<ModulePageConfig>(() => {
    const found = businessPageConfigs[moduleKey]
    if (!found) {
      throw new Error(`Unknown module key: ${moduleKey}`)
    }

    const switchCode = WEIGHT_ONLY_VIEW_SETTING_CODES[moduleKey]
    const isWeightOnlyViewEnabled = Boolean(
      switchCode
      && isDisplaySwitchEnabled(displaySwitchesQuery.data, switchCode),
    )

    return isWeightOnlyViewEnabled ? buildWeightOnlyViewConfig(found) : found
  }, [moduleKey, displaySwitchesQuery.data])

  const showSnowflakeId = useMemo(
    () => isDisplaySwitchEnabled(displaySwitchesQuery.data, DISPLAY_SWITCH_CODES.showSnowflakeId),
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
