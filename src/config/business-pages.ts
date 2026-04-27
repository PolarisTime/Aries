import type { ModulePageConfig } from '@/types/module-page'
import { financeAndReportPageConfigs } from './business-pages/finance-reports'
import { masterDataPageConfigs } from './business-pages/master-data'
import { operationsPageConfigs } from './business-pages/operations'
import { systemPageConfigs } from './business-pages/system'

export const businessPageConfigs: Record<string, ModulePageConfig> = {
  ...masterDataPageConfigs,
  ...operationsPageConfigs,
  ...financeAndReportPageConfigs,
  ...systemPageConfigs,
}
