import type { ModulePageConfig } from '@/types/module-page'
import { inventoryReportPageConfig } from './inventory-report-page'
import { ioReportPageConfig } from './io-report-page'
import { pendingInvoiceReceiptReportPageConfig } from './pending-invoice-receipt-report-page'

export const financeReportPageConfigs: Record<string, ModulePageConfig> = {
  [inventoryReportPageConfig.key]: inventoryReportPageConfig,
  [ioReportPageConfig.key]: ioReportPageConfig,
  [pendingInvoiceReceiptReportPageConfig.key]:
    pendingInvoiceReceiptReportPageConfig,
}
