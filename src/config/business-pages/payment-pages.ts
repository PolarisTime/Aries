import type { ModulePageConfig } from '@/types/module-page'
import { paymentsPageConfig } from './payment-page'
import { receiptsPageConfig } from './receipt-page'

export const paymentPageConfigs: Record<string, ModulePageConfig> = {
  [receiptsPageConfig.key]: receiptsPageConfig,
  [paymentsPageConfig.key]: paymentsPageConfig,
}
