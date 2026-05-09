import type { ModulePageConfig } from '@/types/module-page'
import { contractOperationsPageConfigs } from './contract-operations'
import { freightOperationsPageConfigs } from './freight-operations'
import { purchaseOperationsPageConfigs } from './purchase-operations'
import { salesOperationsPageConfigs } from './sales-operations'

export const operationsPageConfigs: Record<string, ModulePageConfig> = {
  ...purchaseOperationsPageConfigs,
  ...salesOperationsPageConfigs,
  ...freightOperationsPageConfigs,
  ...contractOperationsPageConfigs,
}
