import type { ModulePageConfig } from '@/types/module-page'
import { customerStatementPageConfig } from './customer-statement-page'
import { freightStatementPageConfig } from './freight-statement-page'

export const statementPageConfigs: Record<string, ModulePageConfig> = {
  'customer-statement': customerStatementPageConfig,
  'freight-statement': freightStatementPageConfig,
}
