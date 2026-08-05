import dayjs from 'dayjs'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { getModulePageSchema } from '@/config/module-page-schema'
import {
  getBehaviorValue,
  hasBehavior,
} from '@/module-system/behavior/module-behavior-registry'
import {
  isPurchaseInbound,
  isPurchaseModule,
} from '@/module-system/core/module-category'
import {
  type MainFlowModuleKey,
  type ModuleSaveRequestMap,
  parseMainFlowSaveRequest,
} from '@/shared/schemas/module-record'
import type { EntityId } from '@/types/entity-id'
import {
  ENTITY_ID_FIELDS,
  parseEntityId,
  parseOptionalEntityId,
} from '@/types/entity-id'
import type { ModulePageConfig } from '@/types/module-page'
import type { MainFlowEditorDraft } from '@/types/module-record'
import { logger } from '@/utils/logger'

interface SerializableLineItem {
  id?: EntityId
}

interface SerializableBusinessRecord {
  id?: EntityId
  items?: SerializableLineItem[]
}

function getDynamicFields(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value))
}

// Computed fields that the server calculates — never included in save payloads.
const COMPUTED_FIELD_KEYS = new Set([
  'totalWeight',
  'totalAmount',
  'totalFreight',
  'taxAmount',
  'amount',
  'userCount',
])

function assertRequiredStableIdentities(
  moduleKey: string,
  record: SerializableBusinessRecord,
) {
  const fields = getDynamicFields(record)
  if (isPurchaseModule(moduleKey)) {
    parseEntityId(fields.supplierId, `${moduleKey}.supplierId`)
  }
}

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

function pickDefinedFields(
  record: SerializableBusinessRecord,
  fields: readonly string[],
) {
  const dynamicFields = getDynamicFields(record)
  const next: Record<string, unknown> = {}
  for (const field of fields) {
    const value = dynamicFields[field]
    if (value !== undefined) {
      next[field] = serializeFieldValue(field, value)
    }
  }
  return next
}

function serializeFieldValue(field: string, value: unknown) {
  if (isReferenceIdField(field)) {
    return parseOptionalEntityId(value, field)
  }
  if (dayjs.isDayjs(value)) {
    if (!value.isValid()) {
      throw new Error(`${field} 日期格式不合法`)
    }
    return value.format('YYYY-MM-DD HH:mm:ss')
  }
  return value
}

function isReferenceIdField(field: string) {
  return ENTITY_ID_FIELDS.has(field)
}

function toPersistedLineItemId(value: unknown) {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) {
    return undefined
  }
  return parseOptionalEntityId(value, 'items[].id')
}

type LineItemFieldSpec = { key: string; numeric?: boolean }

const NUMERIC_LINE_ITEM_FIELD_KEYS = new Set([
  'quantity',
  'piecesPerBundle',
  'weightTon',
  'weighWeightTon',
  'weightAdjustmentTon',
  'weightAdjustmentAmount',
  'unitPrice',
  'amount',
  'allocatedAmount',
])

const LINE_ITEM_FIELDS: readonly LineItemFieldSpec[] = [
  { key: 'materialId' },
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
  { key: 'settlementCompanyId' },
  { key: 'settlementCompanyName' },
  { key: 'customerName' },
  { key: 'projectName' },
  { key: 'materialName' },
  { key: 'warehouseId' },
  { key: 'warehouseName' },
]

async function resolveLineItemFields(
  moduleKey: string,
): Promise<readonly LineItemFieldSpec[]> {
  const schemaSaveFields = getModulePageSchema(moduleKey)?.saveFields
  if (schemaSaveFields?.lineItem) {
    return schemaSaveFields.lineItem.map((key) => ({
      key,
      numeric: NUMERIC_LINE_ITEM_FIELD_KEYS.has(key),
    }))
  }

  const config = await loadModuleConfig(moduleKey)
  const moduleSaveFields = config?.saveFields
  if (moduleSaveFields?.lineItem) {
    return moduleSaveFields.lineItem.map((key) => ({
      key,
      numeric: NUMERIC_LINE_ITEM_FIELD_KEYS.has(key),
    }))
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
  item: SerializableLineItem,
  moduleKey: string,
  lineItemFields: readonly LineItemFieldSpec[],
) {
  const dynamicFields = getDynamicFields(item)
  const persistedId = toPersistedLineItemId(item.id)
  const result: Record<string, unknown> = {}
  if (persistedId) {
    result.id = persistedId
  }
  for (const field of lineItemFields) {
    if (field.key === 'settlementMode' && !isPurchaseInbound(moduleKey)) {
      continue
    }
    const value = dynamicFields[field.key]
    if (value !== undefined) {
      const serializedValue = field.numeric
        ? serializeNumericField(field.key, value)
        : serializeFieldValue(field.key, value)
      if (serializedValue !== undefined) {
        result[field.key] = serializedValue
      }
    }
  }
  return result
}

function serializeNumericField(field: string, value: unknown) {
  const nextValue = Number(value || 0)
  if (!Number.isFinite(nextValue)) {
    throw new Error(`${field} 数值不合法`)
  }
  return nextValue
}

function assertTypedAllocationSource(
  moduleKey: string,
  item: SerializableLineItem,
  index: number,
) {
  const fields = getDynamicFields(item)
  const statementLinkingType = getBehaviorValue(
    moduleKey,
    'supportsStatementLinking',
  )
  if (statementLinkingType === 'receipt') {
    const sourceCustomerStatementId = parseOptionalEntityId(
      fields.sourceCustomerStatementId,
      `items[${index}].sourceCustomerStatementId`,
    )
    if (!sourceCustomerStatementId) {
      throw new Error(
        `items[${index}].sourceCustomerStatementId 核销来源不能为空`,
      )
    }
    return
  }

  if (statementLinkingType !== 'payment') {
    return
  }

  const sourceFreightStatementId = parseOptionalEntityId(
    fields.sourceFreightStatementId,
    `items[${index}].sourceFreightStatementId`,
  )
  if (!sourceFreightStatementId) {
    throw new Error(`items[${index}].sourceFreightStatementId 核销来源不能为空`)
  }
}

function buildSingleAllocation(
  sourceKey: 'sourceCustomerStatementId' | 'sourceFreightStatementId',
  sourceId: string,
  amount: unknown,
): Record<string, unknown> {
  return {
    [sourceKey]: sourceId,
    allocatedAmount: amount,
  }
}

function resolveLineItemsForSave(
  moduleKey: string,
  record: SerializableBusinessRecord,
): SerializableLineItem[] {
  const fields = getDynamicFields(record)
  const existingItems = toArray(record.items)
  const existingItem = existingItems[0] ?? { id: '' }
  const firstItemFields = existingItems[0]
    ? getDynamicFields(existingItems[0])
    : {}
  const statementLinkingType = getBehaviorValue(
    moduleKey,
    'supportsStatementLinking',
  )

  if (statementLinkingType === 'receipt') {
    if (
      fields.receiptPurpose === 'SUPPLIER_PREPAYMENT_REFUND' ||
      fields.receiptPurpose === 'SUPPLIER_OTHER_RECEIPT'
    ) {
      return []
    }
    const sourceCustomerStatementId = parseOptionalEntityId(
      fields.sourceCustomerStatementId,
      'sourceCustomerStatementId',
    )
    if (!sourceCustomerStatementId || existingItems.length > 1) {
      return existingItems
    }
    return [
      {
        ...existingItem,
        ...buildSingleAllocation(
          'sourceCustomerStatementId',
          sourceCustomerStatementId,
          fields.amount ?? firstItemFields.allocatedAmount,
        ),
      },
    ]
  }

  if (statementLinkingType !== 'payment') {
    return existingItems
  }

  if (
    fields.paymentPurpose === 'SUPPLIER_PAYMENT' ||
    fields.paymentPurpose === 'PURCHASE_PREPAYMENT'
  ) {
    return []
  }

  const sourceFreightStatementId = parseOptionalEntityId(
    fields.sourceFreightStatementId,
    'sourceFreightStatementId',
  )
  if (existingItems.length > 1) {
    return existingItems
  }
  if (sourceFreightStatementId) {
    return [
      {
        ...existingItem,
        ...buildSingleAllocation(
          'sourceFreightStatementId',
          sourceFreightStatementId,
          fields.amount ?? firstItemFields.allocatedAmount,
        ),
      },
    ]
  }
  return existingItems
}

function serializeBusinessRecordForSave(
  moduleKey: string,
  record: SerializableBusinessRecord,
) {
  return serializeBusinessRecordForSaveAsync(moduleKey, record)
}

async function serializeBusinessRecordForSaveAsync(
  moduleKey: string,
  record: SerializableBusinessRecord,
) {
  const dynamicFields = getDynamicFields(record)
  assertRequiredStableIdentities(moduleKey, record)
  const scalarFields = await getScalarFields(moduleKey)
  const payload = pickDefinedFields(record, scalarFields)

  if (import.meta.env.DEV) {
    const scalarFieldSet = new Set(scalarFields)
    for (const key of Object.keys(record)) {
      if (key === 'id' || key === 'items' || key === 'attachmentIds') {
        continue
      }
      if (dynamicFields[key] !== undefined && !scalarFieldSet.has(key)) {
        logger.warn(
          `[save-payload] ${moduleKey}: field "${key}" not in save schema, will be silently dropped`,
        )
      }
    }
  }

  if (
    hasBehavior(moduleKey, 'includeAttachmentIds') &&
    Array.isArray(dynamicFields.attachmentIds)
  ) {
    payload.attachmentIds = dynamicFields.attachmentIds.map((id, index) =>
      parseEntityId(id, `attachmentIds[${index}]`),
    )
  }

  if (hasBehavior(moduleKey, 'savePayloadLineItems')) {
    const lineItemFields = await getCachedLineItemFields(moduleKey)
    payload.items = resolveLineItemsForSave(moduleKey, record).map(
      (item, index) => {
        assertTypedAllocationSource(moduleKey, item, index)
        return serializeLineItem(item, moduleKey, lineItemFields)
      },
    )
  }

  return payload
}

export function toSaveRequest<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  record: MainFlowEditorDraft<Key>,
): Promise<ModuleSaveRequestMap[Key]>
export function toSaveRequest(
  moduleKey: string,
  record: SerializableBusinessRecord,
): Promise<unknown>
export async function toSaveRequest(
  moduleKey: string,
  record: SerializableBusinessRecord,
) {
  return parseMainFlowSaveRequest(
    moduleKey,
    await serializeBusinessRecordForSave(moduleKey, record),
  )
}
