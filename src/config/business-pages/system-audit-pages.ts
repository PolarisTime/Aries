import type { ModulePageConfig } from '@/types/module-page'
import { operationLogsPageConfig } from './operation-log-page'

export const systemAuditPageConfigs: Record<string, ModulePageConfig> = {
  [operationLogsPageConfig.key]: operationLogsPageConfig,
}
