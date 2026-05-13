import type { ModulePageConfig } from '@/types/module-page'
import { carriersPageConfig } from './carrier-page'
import { customersPageConfig } from './customer-page'
import { suppliersPageConfig } from './supplier-page'

export const masterPartyPageConfigs: Record<string, ModulePageConfig> = {
  [suppliersPageConfig.key]: suppliersPageConfig,
  [customersPageConfig.key]: customersPageConfig,
  [carriersPageConfig.key]: carriersPageConfig,
}
