import type { ModulePageConfig } from '@/types/module-page'
import { salesOrdersPageConfig } from './sales-order-page'
import { salesOutboundsPageConfig } from './sales-outbound-page'

export const salesOperationsPageConfigs: Record<string, ModulePageConfig> = {
  [salesOrdersPageConfig.key]: salesOrdersPageConfig,
  [salesOutboundsPageConfig.key]: salesOutboundsPageConfig,
}
