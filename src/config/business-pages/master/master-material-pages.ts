import type { ModulePageConfig } from '@/types/module-page'
import { materialCategoriesPageConfig } from './material-categories-page'
import { materialsPageConfig } from './material-page'

export const masterMaterialPageConfigs: Record<string, ModulePageConfig> = {
  [materialsPageConfig.key]: materialsPageConfig,
  [materialCategoriesPageConfig.key]: materialCategoriesPageConfig,
}
