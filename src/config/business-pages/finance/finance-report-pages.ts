import type { ModulePageConfig } from '@/types/module-page'
import { inventoryReportPageConfig } from '../reports/inventory-report-page'
import { ioReportPageConfig } from '../reports/io-report-page'

export const financeReportPageConfigs: Record<string, ModulePageConfig> = {
  [inventoryReportPageConfig.key]: inventoryReportPageConfig,
  [ioReportPageConfig.key]: ioReportPageConfig,
}
