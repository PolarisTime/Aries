const SNOWFLAKE_BUSINESS_NO_MODULES = new Set([
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
  'ledger-adjustment',
  'customer',
  'supplier',
  'carrier',
  'warehouse',
  'material',
  'material-categories',
  'department',
  'project',
])

export function usesSnowflakeBusinessNo(
  moduleKey: string,
  primaryNoKey?: string,
) {
  return Boolean(primaryNoKey && SNOWFLAKE_BUSINESS_NO_MODULES.has(moduleKey))
}
