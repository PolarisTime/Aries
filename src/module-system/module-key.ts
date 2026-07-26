export const MODULE_KEYS = [
  'material',
  'material-categories',
  'supplier',
  'customer',
  'carrier',
  'warehouse',
  'company-setting',
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
  'operation-log',
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]

const moduleKeySet: ReadonlySet<string> = new Set(MODULE_KEYS)

export function isModuleKey(value: string): value is ModuleKey {
  return moduleKeySet.has(value)
}

export function assertModuleKey(value: string): ModuleKey {
  if (!isModuleKey(value)) {
    throw new Error(`Unknown module key: ${value}`)
  }
  return value
}
