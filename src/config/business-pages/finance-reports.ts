import type { ModulePageConfig } from '@/types/module-page'
import { balancePageConfigs } from './finance/balance-pages'
import { financeReportPageConfigs } from './finance/finance-report-pages'
import { paymentPageConfigs } from './finance/payment-pages'

export const financeAndReportPageConfigs: Record<string, ModulePageConfig> = {
  ...balancePageConfigs,
  ...paymentPageConfigs,
  ...financeReportPageConfigs,
}
