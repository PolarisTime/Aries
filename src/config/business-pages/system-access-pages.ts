import type { ModulePageConfig } from '@/types/module-page'
import { permissionManagementPageConfig } from './system-permission-management-page'

export const systemAccessPageConfigs: Record<string, ModulePageConfig> = {
  [permissionManagementPageConfig.key]: permissionManagementPageConfig,
}
