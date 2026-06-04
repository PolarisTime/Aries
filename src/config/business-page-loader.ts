import type { ModulePageConfig } from '@/types/module-page'

type ConfigModule = {
  [key: string]: ModulePageConfig
}

type ConfigLoader = () => Promise<ConfigModule>

const businessPageLoaders: Record<string, ConfigLoader> = {
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
  'purchase-contract': async () =>
    (await import('@/config/business-pages/contract-operations'))
      .contractOperationsPageConfigs,
  'sales-contract': async () =>
    (await import('@/config/business-pages/contract-operations'))
      .contractOperationsPageConfigs,
  'supplier-statement': async () =>
    (await import('@/config/business-pages/statement-pages'))
      .statementPageConfigs,
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
  'invoice-receipt': async () =>
    (await import('@/config/business-pages/invoice-pages')).invoicePageConfigs,
  'invoice-issue': async () =>
    (await import('@/config/business-pages/invoice-pages')).invoicePageConfigs,
  'receivable-payable': async () =>
    (await import('@/config/business-pages/balance-pages')).balancePageConfigs,
  'inventory-report': async () =>
    (await import('@/config/business-pages/finance-report-pages'))
      .financeReportPageConfigs,
  'io-report': async () =>
    (await import('@/config/business-pages/finance-report-pages'))
      .financeReportPageConfigs,
  'pending-invoice-receipt-report': async () =>
    (await import('@/config/business-pages/finance-report-pages'))
      .financeReportPageConfigs,
  'general-setting': async () =>
    (await import('@/config/business-pages/system-core-pages'))
      .systemCorePageConfigs,
  'company-setting': async () =>
    (await import('@/config/business-pages/system-core-pages'))
      .systemCorePageConfigs,
  'operation-log': async () =>
    (await import('@/config/business-pages/system-audit-pages'))
      .systemAuditPageConfigs,
  department: async () =>
    (await import('@/config/business-pages/system-organization-pages'))
      .systemOrganizationPageConfigs,
  'system-permission-management': async () =>
    (await import('@/config/business-pages/system-access-pages'))
      .systemAccessPageConfigs,
  permission: async () =>
    (await import('@/config/business-pages/system-access-pages'))
      .systemAccessPageConfigs,
}

const loadedConfigCache = new Map<string, ModulePageConfig>()

export async function loadBusinessPageConfig(moduleKey: string) {
  const cached = loadedConfigCache.get(moduleKey)
  if (cached?.key === moduleKey) {
    return cached
  }
  if (cached && cached.key !== moduleKey) {
    loadedConfigCache.delete(moduleKey)
  }

  const loader = businessPageLoaders[moduleKey]
  if (!loader) {
    throw new Error(`Unknown module key: ${moduleKey}`)
  }

  const moduleConfigs = await loader()
  const config = moduleConfigs[moduleKey]
  if (!config) {
    throw new Error(`Module config not found: ${moduleKey}`)
  }

  loadedConfigCache.set(moduleKey, config)
  return config
}

export function primeBusinessPageConfig(
  moduleKey: string,
  config: ModulePageConfig,
) {
  if (config.key !== moduleKey) {
    return
  }
  loadedConfigCache.set(moduleKey, config)
}
