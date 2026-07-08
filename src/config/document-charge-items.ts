export const DOCUMENT_CHARGE_ENABLED_MODULE_KEYS = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
] as const

export const DOCUMENT_CHARGE_ITEM_SAVE_FIELDS = [
  'chargeName',
  'chargeDirection',
  'settlementPartyType',
  'settlementPartyId',
  'settlementPartyName',
  'amount',
  'billable',
  'remark',
] as const

export type DocumentChargeEnabledModuleKey =
  (typeof DOCUMENT_CHARGE_ENABLED_MODULE_KEYS)[number]

export function isDocumentChargeEnabledModule(moduleKey: string): boolean {
  return DOCUMENT_CHARGE_ENABLED_MODULE_KEYS.includes(
    moduleKey as DocumentChargeEnabledModuleKey,
  )
}
