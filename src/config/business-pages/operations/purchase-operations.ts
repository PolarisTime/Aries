import type { ModulePageConfig } from '@/types/module-page'
import { purchaseInboundsPageConfig } from './purchase-inbound-page'
import { purchaseOrdersPageConfig } from './purchase-order-page'

export const purchaseOperationsPageConfigs: Record<string, ModulePageConfig> = {
  [purchaseOrdersPageConfig.key]: purchaseOrdersPageConfig,
  [purchaseInboundsPageConfig.key]: purchaseInboundsPageConfig,
}
