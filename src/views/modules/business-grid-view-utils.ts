import type { AppPageDefinition } from '@/config/page-registry'
import type { ModulePageConfig } from '@/types/module-page'

export function resolveBusinessGridInitialConfig(
  pageDef: AppPageDefinition | undefined,
  loaderConfig?: ModulePageConfig,
) {
  if (!pageDef?.moduleKey || loaderConfig?.key !== pageDef.moduleKey) {
    return undefined
  }
  return loaderConfig
}
