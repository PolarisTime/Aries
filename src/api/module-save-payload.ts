import dayjs from 'dayjs'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { getModulePageSchema } from '@/config/module-page-schema'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { logger } from '@/utils/logger'
import {
  getBehaviorValue,
  hasBehavior,
} from '@/module-system/module-behavior-registry'

// Computed fields that the server calculates — never included in save payloads.
const COMPUTED_FIELD_KEYS = new Set([
  'totalWeight',
  'totalAmount',
  'totalFreight',
  'taxAmount',
  'amount',
  'permissionSummary',
  'userCount',
])

async function loadModuleConfig(
  moduleKey: string,
): Promise<ModulePageConfig | null> {
  try {
    return await loadBusinessPageConfig(moduleKey)
  } catch {
    return null
  }
}

async function resolveScalarFields(moduleKey: string): Promise<string[]> {
  const schemaSaveFields = getModulePageSchema(moduleKey)?.saveFields
  if (schemaSaveFields) {
    const scalar = schemaSaveFields.scalar || []
    const computed = new Set(schemaSaveFields.computed || [])
    return scalar.filter((key) => !computed.has(key))
  }

  const config = await loadModuleConfig(moduleKey)
  if (!config) {
    return []
  }

  const moduleSaveFields = config.saveFields
  if (moduleSaveFields) {
    const scalar = moduleSaveFields.scalar || []
    const computed = new Set(moduleSaveFields.computed || [])
    return scalar.filter((key) => !computed.has(key))
  }

  const fromDetailFields = (config.detailFields || []).flatMap((f) =>
    !COMPUTED_FIELD_KEYS.has(f.key) ? [f.key] : [],
  )

  const extras = getBehaviorValue(moduleKey, 'extraScalarFields') || []
  return [...new Set([...fromDetailFields, ...extras])]
}

const scalarFieldCache = new Map<string, Promise<readonly string[]>>()

function getScalarFields(moduleKey: string): Promise<readonly string[]> {
  const cached = scalarFieldCache.get(moduleKey)
  if (cached) {
    return cached
  }
  const fieldsPromise = resolveScalarFields(moduleKey).then((fields) =>
    Object.freeze(fields),
  )
  scalarFieldCache.set(moduleKey, fieldsPromise)
  return fieldsPromise
}

function toArray<T>(value: T[] | undefined) {
  return Array.isArray(value) ? value : []
}

function pickDefinedFields(record: ModuleRecord, fields: readonly string[]) {
  const next: Record<string, unknown> = {}
  fields.forEach((field) => {
    if (record[field] !== undefined) {
      const value = record[field]
      next[field] = dayjs.isDayjs(value)
        ? value.format('YYYY-MM-DD HH:mm:ss')
        : value
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

async function resolveLineItemFields(
  moduleKey: string,
): Promise<readonly LineItemFieldSpec[]> {
  const schemaSaveFields = getModulePageSchema(moduleKey)?.saveFields
  if (schemaSaveFields?.lineItem) {
    return schemaSaveFields.lineItem.map((key) => ({ key }))
  }

  const config = await loadModuleConfig(moduleKey)
  const moduleSaveFields = config?.saveFields
  if (moduleSaveFields?.lineItem) {
    return moduleSaveFields.lineItem.map((key) => ({ key }))
  }
  // numeric fields only matter for the global list
  return LINE_ITEM_FIELDS
}

const lineItemFieldCache = new Map<
  string,
  Promise<readonly LineItemFieldSpec[]>
>()

function getCachedLineItemFields(
  moduleKey: string,
): Promise<readonly LineItemFieldSpec[]> {
  const cached = lineItemFieldCache.get(moduleKey)
  if (cached) return cached
  const fieldsPromise = resolveLineItemFields(moduleKey).then((fields) =>
    Object.freeze(fields),
  )
  lineItemFieldCache.set(moduleKey, fieldsPromise)
  return fieldsPromise
}

function serializeLineItem(
  item: ModuleLineItem,
  moduleKey: string,
  lineItemFields: readonly LineItemFieldSpec[],
) {
  const persistedId = toPersistedLineItemId(item.id)
  const result: Record<string, unknown> = {}
  if (persistedId) {
    result.id = persistedId
  }
  for (const field of lineItemFields) {
    if (field.key === 'settlementMode' && moduleKey !== 'purchase-inbound') {
      continue
    }
    const value = item[field.key]
    if (value !== undefined) {
      result[field.key] = field.numeric ? Number(value || 0) : value
    }
  }
  return result
}

export function serializeBusinessRecordForSave(
  moduleKey: string,
  record: ModuleRecord,
) {
  return serializeBusinessRecordForSaveAsync(moduleKey, record)
}

async function serializeBusinessRecordForSaveAsync(
  moduleKey: string,
  record: ModuleRecord,
) {
  const scalarFields = await getScalarFields(moduleKey)
  const payload = pickDefinedFields(record, scalarFields)

  if (import.meta.env.DEV) {
    const scalarFieldSet = new Set(scalarFields)
    for (const key of Object.keys(record)) {
      if (
        key === 'id' ||
        key === 'items' ||
        key === 'attachmentIds' ||
        key === '_preallocatedId'
      ) {
        continue
      }
      if (record[key] !== undefined && !scalarFieldSet.has(key)) {
        logger.warn(
          `[save-payload] ${moduleKey}: field "${key}" not in save schema, will be silently dropped`,
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
    const lineItemFields = await getCachedLineItemFields(moduleKey)
    payload.items = toArray(record.items).map((item) =>
      serializeLineItem(item, moduleKey, lineItemFields),
    )
  }

  return payload
}
