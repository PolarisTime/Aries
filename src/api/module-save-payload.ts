import dayjs from 'dayjs'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { getModulePageSchema } from '@/config/module-page-schema'
import {
  getBehaviorValue,
  hasBehavior,
} from '@/module-system/module-behavior-registry'
import {
  ENTITY_ID_FIELDS,
  parseEntityId,
  parseOptionalEntityId,
} from '@/types/entity-id'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { logger } from '@/utils/logger'

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

const REQUIRED_SUPPLIER_ID_MODULES = new Set([
  'purchase-order',
  'purchase-inbound',
  'supplier-statement',
])

function assertRequiredStableIdentities(
  moduleKey: string,
  record: ModuleRecord,
) {
  if (REQUIRED_SUPPLIER_ID_MODULES.has(moduleKey)) {
    parseEntityId(record.supplierId, `${moduleKey}.supplierId`)
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

function pickDefinedFields(record: ModuleRecord, fields: readonly string[]) {
  const next: Record<string, unknown> = {}
  for (const field of fields) {
    const value = record[field]
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
  { key: 'sourceSalesOutboundItemId' },
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
  item: ModuleLineItem,
  index: number,
) {
  if (moduleKey === 'receipt') {
    const sourceCustomerStatementId = parseOptionalEntityId(
      item.sourceCustomerStatementId,
      `items[${index}].sourceCustomerStatementId`,
    )
    if (!sourceCustomerStatementId) {
      throw new Error(
        `items[${index}].sourceCustomerStatementId 核销来源不能为空`,
      )
    }
    return
  }

  if (moduleKey !== 'payment') {
    return
  }

  const sourceSupplierStatementId = parseOptionalEntityId(
    item.sourceSupplierStatementId,
    `items[${index}].sourceSupplierStatementId`,
  )
  const sourceFreightStatementId = parseOptionalEntityId(
    item.sourceFreightStatementId,
    `items[${index}].sourceFreightStatementId`,
  )
  if (
    Boolean(sourceSupplierStatementId) === Boolean(sourceFreightStatementId)
  ) {
    throw new Error(`items[${index}] 核销对账单来源必须且只能填写一种`)
  }
}

function buildSingleAllocation(
  sourceKey:
    | 'sourceCustomerStatementId'
    | 'sourceSupplierStatementId'
    | 'sourceFreightStatementId',
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
  record: ModuleRecord,
): ModuleLineItem[] {
  const existingItems = toArray(record.items)
  const existingItem = existingItems[0] ?? { id: '' }

  if (moduleKey === 'receipt') {
    if (
      record.receiptPurpose === 'SUPPLIER_PREPAYMENT_REFUND' ||
      record.receiptPurpose === 'SUPPLIER_OTHER_RECEIPT'
    ) {
      return []
    }
    const sourceCustomerStatementId = parseOptionalEntityId(
      record.sourceCustomerStatementId,
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
          record.amount ?? existingItems[0]?.allocatedAmount,
        ),
      },
    ]
  }

  if (moduleKey !== 'payment') {
    return existingItems
  }

  if (
    record.paymentPurpose === 'SUPPLIER_PAYMENT' ||
    record.paymentPurpose === 'PURCHASE_PREPAYMENT'
  ) {
    return []
  }

  const sourceSupplierStatementId = parseOptionalEntityId(
    record.sourceSupplierStatementId,
    'sourceSupplierStatementId',
  )
  const sourceFreightStatementId = parseOptionalEntityId(
    record.sourceFreightStatementId,
    'sourceFreightStatementId',
  )
  if (sourceSupplierStatementId && sourceFreightStatementId) {
    throw new Error('付款核销对账单来源必须且只能填写一种')
  }
  if (existingItems.length > 1) {
    return existingItems
  }
  if (sourceSupplierStatementId) {
    return [
      {
        ...existingItem,
        sourceFreightStatementId: undefined,
        ...buildSingleAllocation(
          'sourceSupplierStatementId',
          sourceSupplierStatementId,
          record.amount ?? existingItems[0]?.allocatedAmount,
        ),
      },
    ]
  }
  if (sourceFreightStatementId) {
    return [
      {
        ...existingItem,
        sourceSupplierStatementId: undefined,
        ...buildSingleAllocation(
          'sourceFreightStatementId',
          sourceFreightStatementId,
          record.amount ?? existingItems[0]?.allocatedAmount,
        ),
      },
    ]
  }
  return existingItems
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
  assertRequiredStableIdentities(moduleKey, record)
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
    payload.attachmentIds = record.attachmentIds.map((id, index) =>
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
