import type { ModulePageConfig } from '@/types/module-page'
import { masterMaterialPageConfigs } from './master-material-pages'
import { masterPartyPageConfigs } from './master-party-pages'
import { masterWarehousePageConfigs } from './master-warehouse-pages'

export const masterDataPageConfigs: Record<string, ModulePageConfig> = {
  ...masterMaterialPageConfigs,
  ...masterPartyPageConfigs,
  ...masterWarehousePageConfigs,
}
