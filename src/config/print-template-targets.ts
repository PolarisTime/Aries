import { businessPageConfigs } from '@/config/business-pages'

export interface PrintTemplateTargetOption {
  value: string
  label: string
}

const excludedModuleKeys = new Set([
  'materials',
  'suppliers',
  'customers',
  'carriers',
  'inventory-report',
  'io-report',
  'receivables-payables',
  'general-settings',
  'permission-management',
  'user-accounts',
  'role-settings',
  'ops-support',
])

export const printTemplateTargetOptions: PrintTemplateTargetOption[] = Object.values(businessPageConfigs)
  .filter((config) => !excludedModuleKeys.has(config.key))
  .map((config) => ({
    value: config.key,
    label: config.title,
  }))

export const printTemplateTargetMap = Object.fromEntries(
  printTemplateTargetOptions.map((item) => [item.value, item.label]),
) as Record<string, string>
