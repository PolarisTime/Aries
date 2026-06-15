import type { ModulePageConfig } from '@/types/module-page'
import { purchaseContractsPageConfig } from './purchase-contract-page'
import { salesContractsPageConfig } from './sales-contract-page'

export const contractOperationsPageConfigs: Record<string, ModulePageConfig> = {
  [purchaseContractsPageConfig.key]: purchaseContractsPageConfig,
  [salesContractsPageConfig.key]: salesContractsPageConfig,
}
