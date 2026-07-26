import {
  assertModuleKey,
  type ModuleKey,
} from '@/module-system/core/module-key'
import type { ModulePageConfig } from '@/types/module-page'

type ConfigModule = {
  [key: string]: ModulePageConfig
}

type ConfigLoader = () => Promise<ConfigModule>

const businessPageLoaders = {
  material: async () =>
    (await import('@/config/business-pages/master-material-pages'))
      .masterMaterialPageConfigs,
  'material-categories': async () =>
    (await import('@/config/business-pages/master-material-pages'))
      .masterMaterialPageConfigs,
  supplier: async () =>
    (await import('@/config/business-pages/master-party-pages'))
      .masterPartyPageConfigs,
  customer: async () =>
    (await import('@/config/business-pages/master-party-pages'))
      .masterPartyPageConfigs,
  carrier: async () =>
    (await import('@/config/business-pages/master-party-pages'))
      .masterPartyPageConfigs,
  warehouse: async () =>
    (await import('@/config/business-pages/master-warehouse-pages'))
      .masterWarehousePageConfigs,
  'purchase-order': async () =>
    (await import('@/config/business-pages/purchase-operations'))
      .purchaseOperationsPageConfigs,
  'purchase-inbound': async () =>
    (await import('@/config/business-pages/purchase-operations'))
      .purchaseOperationsPageConfigs,
  'sales-order': async () =>
    (await import('@/config/business-pages/sales-operations'))
      .salesOperationsPageConfigs,
  'sales-outbound': async () =>
    (await import('@/config/business-pages/sales-operations'))
      .salesOperationsPageConfigs,
  'freight-bill': async () =>
    (await import('@/config/business-pages/freight-operations'))
      .freightOperationsPageConfigs,
  'customer-statement': async () =>
    (await import('@/config/business-pages/statement-pages'))
      .statementPageConfigs,
  'freight-statement': async () =>
    (await import('@/config/business-pages/statement-pages'))
      .statementPageConfigs,
  receipt: async () =>
    (await import('@/config/business-pages/payment-pages')).paymentPageConfigs,
  payment: async () =>
    (await import('@/config/business-pages/payment-pages')).paymentPageConfigs,
  'company-setting': async () =>
    (await import('@/config/business-pages/master-settlement-company-pages'))
      .masterSettlementCompanyPageConfigs,
  'operation-log': async () =>
    (await import('@/config/business-pages/system-audit-pages'))
      .systemAuditPageConfigs,
} satisfies Record<ModuleKey, ConfigLoader>

const loadedConfigCache = new Map<ModuleKey, ModulePageConfig>()

export async function loadBusinessPageConfig(moduleKey: string) {
  const resolvedModuleKey = assertModuleKey(moduleKey)
  const cached = loadedConfigCache.get(resolvedModuleKey)
  if (cached?.key === resolvedModuleKey) {
    return cached
  }
  if (cached && cached.key !== resolvedModuleKey) {
    loadedConfigCache.delete(resolvedModuleKey)
  }

  const loader = businessPageLoaders[resolvedModuleKey]

  const moduleConfigs = await loader()
  const config = moduleConfigs[resolvedModuleKey]
  if (!config) {
    throw new Error(`Module config not found: ${resolvedModuleKey}`)
  }

  if (config.key !== resolvedModuleKey) {
    throw new Error(`Module config key mismatch: ${resolvedModuleKey}`)
  }
  loadedConfigCache.set(resolvedModuleKey, config)
  return config
}

export function primeBusinessPageConfig(
  moduleKey: ModuleKey,
  config: ModulePageConfig,
) {
  if (config.key !== moduleKey) {
    return
  }
  loadedConfigCache.set(moduleKey, config)
}
