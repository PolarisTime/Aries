import { computed, type Ref } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import {
  DISPLAY_SWITCH_CODES,
  isDisplaySwitchEnabled,
  listDisplaySwitches,
} from '@/api/system-settings'
import { businessPageConfigs } from '@/config/business-pages'
import type { ModulePageConfig } from '@/types/module-page'
import { getBehaviorValue } from './module-behavior-registry'
import { applyWeightOnlyViewConfig } from './module-display-switch-config'

const WEIGHT_ONLY_VIEW_SETTING_CODES: Record<string, string> = {
  'purchase-inbounds': DISPLAY_SWITCH_CODES.weightOnlyPurchaseInbounds,
  'sales-outbounds': DISPLAY_SWITCH_CODES.weightOnlySalesOutbounds,
}

const INVOICE_ASSIST_MODULE_KEYS = new Set(['invoice-receipts', 'invoice-issues'])

export function useModulePageConfig(moduleKey: Ref<string>) {
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

  const config = computed<ModulePageConfig>(() => {
    const found = businessPageConfigs[moduleKey.value]
    if (!found) {
      throw new Error(`Unknown module key: ${moduleKey.value}`)
    }

    const switchCode = WEIGHT_ONLY_VIEW_SETTING_CODES[moduleKey.value]
    const isWeightOnlyViewEnabled = Boolean(
      switchCode
      && isDisplaySwitchEnabled(displaySwitchesQuery.data.value, switchCode),
    )

    return isWeightOnlyViewEnabled ? applyWeightOnlyViewConfig(moduleKey.value, found) : found
  })

  const readOnlyAlertActionLink = computed(() =>
    getBehaviorValue(moduleKey.value, 'alertActionLink') ?? null,
  )
  const showSnowflakeId = computed(() =>
    isDisplaySwitchEnabled(displaySwitchesQuery.data.value, DISPLAY_SWITCH_CODES.showSnowflakeId),
  )
  const supportsInvoiceAssist = computed(() => INVOICE_ASSIST_MODULE_KEYS.has(moduleKey.value))

  return {
    config,
    readOnlyAlertActionLink,
    showSnowflakeId,
    supportsInvoiceAssist,
  }
}
