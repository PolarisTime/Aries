import type { ModulePageConfig } from '@/types/module-page'
import { customerStatementPageConfig } from './customer-statement-page'
import { freightStatementPageConfig } from './freight-statement-page'
import { supplierStatementPageConfig } from './supplier-statement-page'

export const statementPageConfigs: Record<string, ModulePageConfig> = {
  'supplier-statement': supplierStatementPageConfig,
  'customer-statement': customerStatementPageConfig,
  'freight-statement': freightStatementPageConfig,
}
