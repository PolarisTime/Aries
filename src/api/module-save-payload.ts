import { businessPageConfigs } from '@/config/business-pages'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { hasBehavior, getBehaviorValue } from '@/views/modules/module-behavior-registry'

type PayloadBuilder = (record: ModuleRecord) => Record<string, unknown>

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

function resolveScalarFields(moduleKey: string): string[] {
  const config = businessPageConfigs[moduleKey]
  if (!config) {
    return []
  }

  const moduleSaveFields = config.saveFields
  if (moduleSaveFields) {
    const scalar = moduleSaveFields.scalar || []
    const computed = new Set(moduleSaveFields.computed || [])
    return scalar.filter((key) => !computed.has(key))
  }

  const fromDetailFields = (config.detailFields || [])
    .map((f) => f.key)
    .filter((key) => !COMPUTED_FIELD_KEYS.has(key))

  const extras = getBehaviorValue(moduleKey, 'extraScalarFields') || []
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
  { key: 'settlementMode' },
  { key: 'weighWeightTon' },
  { key: 'weightAdjustmentTon' },
  { key: 'weightAdjustmentAmount' },
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

function getLineItemFields(moduleKey: string): readonly LineItemFieldSpec[] {
  const config = businessPageConfigs[moduleKey]
  const moduleSaveFields = config?.saveFields
  if (moduleSaveFields?.lineItem) {
    return moduleSaveFields.lineItem.map((key) => ({ key }))
  }
  // numeric fields only matter for the global list
  return LINE_ITEM_FIELDS
}

const lineItemFieldCache = new Map<string, readonly LineItemFieldSpec[]>()

function getCachedLineItemFields(moduleKey: string): readonly LineItemFieldSpec[] {
  const cached = lineItemFieldCache.get(moduleKey)
  if (cached) return cached
  const fields = Object.freeze(getLineItemFields(moduleKey))
  lineItemFieldCache.set(moduleKey, fields)
  return fields
}

function serializeLineItem(item: ModuleLineItem, moduleKey: string) {
  const persistedId = toPersistedLineItemId(item.id)
  const result: Record<string, unknown> = {}
  if (persistedId) {
    result.id = persistedId
  }
  for (const field of getCachedLineItemFields(moduleKey)) {
    if (field.key === 'settlementMode' && moduleKey !== 'purchase-inbounds') {
      continue
    }
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

  if (import.meta.env.DEV) {
    const scalarFields = new Set(getScalarFields(moduleKey))
    for (const key of Object.keys(record)) {
      if (key === 'id' || key === 'items' || key === 'attachmentIds') continue
      if (record[key] !== undefined && !scalarFields.has(key)) {
        console.warn(
          `[save-payload] ${moduleKey}: field "${key}" not in save schema, will be silently dropped`
        )
      }
    }
  }

  if (
    hasBehavior(moduleKey, 'includeAttachmentIds') &&
    Array.isArray(record.attachmentIds)
  ) {
    payload.attachmentIds = record.attachmentIds
  }

  if (hasBehavior(moduleKey, 'savePayloadLineItems')) {
    payload.items = toArray(record.items).map((item) => serializeLineItem(item, moduleKey))
  }

  return payload
}
