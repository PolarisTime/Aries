import type { ModulePageConfig } from '@/types/module-page'
import { invoiceIssuePageConfig } from './invoice-issue-page'
import { invoiceReceiptPageConfig } from './invoice-receipt-page'

export const invoicePageConfigs: Record<string, ModulePageConfig> = {
  'invoice-receipt': invoiceReceiptPageConfig,
  'invoice-issue': invoiceIssuePageConfig,
}
