import type { ModulePageConfig } from '@/types/module-page'
import { systemAccessPageConfigs } from './system-access-pages'
import { systemAuditPageConfigs } from './system-audit-pages'
import { systemCorePageConfigs } from './system-core-pages'
import { systemOrganizationPageConfigs } from './system-organization-pages'

export const systemPageConfigs: Record<string, ModulePageConfig> = {
  ...systemCorePageConfigs,
  ...systemAuditPageConfigs,
  ...systemOrganizationPageConfigs,
  ...systemAccessPageConfigs,
}
