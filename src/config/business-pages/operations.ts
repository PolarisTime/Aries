import type { ModulePageConfig } from '@/types/module-page'
import { contractOperationsPageConfigs } from './operations/contract-operations'
import { freightOperationsPageConfigs } from './operations/freight-operations'
import { purchaseOperationsPageConfigs } from './operations/purchase-operations'
import { salesOperationsPageConfigs } from './operations/sales-operations'

export const operationsPageConfigs: Record<string, ModulePageConfig> = {
  ...purchaseOperationsPageConfigs,
  ...salesOperationsPageConfigs,
  ...freightOperationsPageConfigs,
  ...contractOperationsPageConfigs,
}
