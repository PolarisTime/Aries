import type { ModulePageConfig } from '@/types/module-page'
import { balancePageConfigs } from './balance-pages'
import { financeReportPageConfigs } from './finance-report-pages'
import { invoicePageConfigs } from './invoice-pages'
import { paymentPageConfigs } from './payment-pages'
import { statementPageConfigs } from './statement-pages'

export const financeAndReportPageConfigs: Record<string, ModulePageConfig> = {
  ...financeReportPageConfigs,
  ...statementPageConfigs,
  ...paymentPageConfigs,
  ...invoicePageConfigs,
  ...balancePageConfigs,
}
