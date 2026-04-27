import { businessPageConfigs } from '@/config/business-pages'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

type PayloadBuilder = (record: ModuleRecord) => Record<string, unknown>

const lineItemPayloadModuleKeys = new Set([
  'purchase-orders',
  'purchase-inbounds',
  'sales-orders',
  'sales-outbounds',
  'freight-bills',
  'purchase-contracts',
  'sales-contracts',
  'supplier-statements',
  'customer-statements',
  'freight-statements',
  'invoice-receipts',
  'invoice-issues',
])

// Computed fields that the server calculates — never included in save payloads.
const COMPUTED_FIELD_KEYS = new Set([
  'totalWeight',
  'totalAmount',
  'totalFreight',
  'purchaseAmount',
  'salesAmount',
  'taxAmount',
  'amount',
  'permissionSummary',
  'userCount',
])

// Certain modules need extra fields that aren't in their detailFields definition.
const EXTRA_SCALAR_FIELDS: Record<string, string[]> = {
  'freight-statements': ['attachment'],
  'purchase-orders': ['buyerName'],
  'purchase-inbounds': ['buyerName'],
  'sales-orders': ['salesName'],
  'sales-outbounds': ['salesName'],
  'purchase-contracts': ['buyerName'],
  'sales-contracts': ['salesName'],
}

function resolveScalarFields(moduleKey: string): string[] {
  const config = businessPageConfigs[moduleKey]
  if (!config) {
    return []
  }

  const fromDetailFields = (config.detailFields || [])
    .map((f) => f.key)
    .filter((key) => !COMPUTED_FIELD_KEYS.has(key))

  const extras = EXTRA_SCALAR_FIELDS[moduleKey] || []
  return [...new Set([...fromDetailFields, ...extras])]
}

const scalarFieldCache = new Map<string, string[]>()

function getScalarFields(moduleKey: string): readonly string[] {
  const cached = scalarFieldCache.get(moduleKey)
  if (cached) {
    return cached
  }
  const fields: readonly string[] = Object.freeze(resolveScalarFields(moduleKey))
  scalarFieldCache.set(moduleKey, fields as unknown as string[])
  return fields
}

function toArray<T>(value: T[] | undefined) {
  return Array.isArray(value) ? value : []
}

function pickDefinedFields(record: ModuleRecord, fields: readonly string[]) {
  const next: Record<string, unknown> = {}
  fields.forEach((field) => {
    if (record[field] !== undefined) {
      next[field] = record[field]
    }
  })
  return next
}

function toPersistedLineItemId(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return String(value)
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim()
  return /^\d+$/.test(normalized) ? normalized : undefined
}

type LineItemFieldSpec = { key: string; numeric?: boolean }

const LINE_ITEM_FIELDS: readonly LineItemFieldSpec[] = [
  { key: 'materialCode' },
  { key: 'brand' },
  { key: 'category' },
  { key: 'material' },
  { key: 'spec' },
  { key: 'length' },
  { key: 'unit' },
  { key: 'batchNo' },
  { key: 'quantity', numeric: true },
  { key: 'quantityUnit' },
  { key: 'pieceWeightTon' },
  { key: 'piecesPerBundle', numeric: true },
  { key: 'weightTon' },
  { key: 'unitPrice' },
  { key: 'amount' },
  { key: 'sourcePurchaseOrderItemId' },
  { key: 'sourceSalesOrderItemId' },
  { key: 'sourceInboundItemId' },
  { key: 'sourceNo' },
  { key: 'customerName' },
  { key: 'projectName' },
  { key: 'materialName' },
  { key: 'warehouseName' },
]

function serializeLineItem(item: ModuleLineItem) {
  const persistedId = toPersistedLineItemId(item.id)
  const result: Record<string, unknown> = {}
  if (persistedId) {
    result.id = persistedId
  }
  for (const field of LINE_ITEM_FIELDS) {
    const value = item[field.key]
    if (value !== undefined) {
      result[field.key] = field.numeric ? Number(value || 0) : value
    }
  }
  return result
}

const scalarPayloadBuilders = new Map<string, PayloadBuilder>()

function getPayloadBuilder(moduleKey: string): PayloadBuilder {
  const cached = scalarPayloadBuilders.get(moduleKey)
  if (cached) {
    return cached
  }
  const fields = getScalarFields(moduleKey)
  const builder: PayloadBuilder = (record: ModuleRecord) => pickDefinedFields(record, fields)
  scalarPayloadBuilders.set(moduleKey, builder)
  return builder
}

export function serializeBusinessRecordForSave(
  moduleKey: string,
  record: ModuleRecord,
) {
  const builder = getPayloadBuilder(moduleKey)

  const payload = builder(record)

  if (
    moduleKey === 'freight-statements' &&
    Array.isArray(record.attachmentIds)
  ) {
    payload.attachmentIds = record.attachmentIds
  }

  if (lineItemPayloadModuleKeys.has(moduleKey)) {
    payload.items = toArray(record.items).map((item) => serializeLineItem(item))
  }

  return payload
}
