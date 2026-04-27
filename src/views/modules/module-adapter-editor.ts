import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { getPermissionLabels, getRolePermissionLabels } from './module-adapter-system'
import { normalizeStringArray, parseParentRelationNos } from './module-adapter-shared'

export type EditorItemDragPosition = 'before' | 'after'

const defaultDraftValueByModuleKey: Record<string, Record<string, unknown> | undefined> = {
  carriers: { priceMode: '按吨' },
}

const editableLockedFieldKeysByModuleKey: Record<string, string[]> = {
  'sales-orders': ['deliveryDate', 'remark'],
}

const editableLockedItemColumnKeysByModuleKey: Record<string, string[]> = {
  'sales-orders': ['unitPrice'],
}

const derivedReadonlyItemColumnKeySet = new Set([
  'brand',
  'category',
  'material',
  'spec',
  'length',
  'unit',
  'quantityUnit',
  'pieceWeightTon',
  'piecesPerBundle',
  'weightTon',
  'amount',
])

const editableLineItemModuleKeySet = new Set([
  'purchase-orders',
  'purchase-inbounds',
  'sales-orders',
  'sales-outbounds',
  'freight-bills',
  'freight-statements',
  'purchase-contracts',
  'sales-contracts',
  'invoice-receipts',
  'invoice-issues',
])

const computedAmountModuleKeys = new Set([
  'purchase-orders',
  'purchase-inbounds',
  'sales-orders',
  'sales-outbounds',
  'purchase-contracts',
  'sales-contracts',
])

const defaultStatusByModuleKey: Record<string, string> = {
  'purchase-orders': '草稿',
  'purchase-inbounds': '草稿',
  'sales-orders': '草稿',
  'sales-outbounds': '草稿',
  'freight-bills': '未审核',
  receipts: '草稿',
  payments: '草稿',
  'invoice-receipts': '草稿',
  'invoice-issues': '草稿',
}

function toRoundedNumber(value: unknown, precision: number) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 0
  }
  return Number(numericValue.toFixed(precision))
}

function inferQuantityUnit(record?: Record<string, unknown> | null) {
  const explicitUnit = String(record?.quantityUnit || '').trim()
  if (explicitUnit) {
    return explicitUnit
  }

  return '件'
}

function hasEditorValue(value: unknown) {
  if (value === undefined || value === null) {
    return false
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return true
}

function getLineItemValidationMessage(
  items: ModuleLineItem[],
  itemColumns: ModuleColumnDefinition[],
) {
  const requiredColumns = itemColumns.filter((column) => column.required)
  if (!requiredColumns.length) {
    return null
  }

  for (const [index, item] of items.entries()) {
    const maxImportQuantity = Number(item._maxImportQuantity)
    if (Number.isFinite(maxImportQuantity) && Number(item.quantity || 0) > maxImportQuantity) {
      return `第${index + 1}行可关联数量不能超过${maxImportQuantity}件`
    }
    for (const column of requiredColumns) {
      if (!hasEditorValue(item[column.dataIndex])) {
        return `请填写第${index + 1}行${column.title}`
      }
    }
  }

  return null
}

export function canModuleEditLineItems(moduleKey: string, hasItemColumns: boolean) {
  return editableLineItemModuleKeySet.has(moduleKey) && hasItemColumns
}

export function isSalesOrderLineLocked(statuses: string[]) {
  return statuses.some((status) => status === '已审核')
}

export function canManageEditorLineItems(
  moduleKey: string,
  canEditLineItems: boolean,
  canSaveCurrentEditor: boolean,
  salesOrderLineLocked: boolean,
) {
  return canEditLineItems && canSaveCurrentEditor && !(moduleKey === 'sales-orders' && salesOrderLineLocked)
}

export function applyModuleDefaultEditorDraft(
  moduleKey: string,
  draft: Record<string, unknown>,
  currentOperatorName: string,
) {
  const defaultDraftValues = defaultDraftValueByModuleKey[moduleKey]
  if (defaultDraftValues) {
    Object.assign(draft, defaultDraftValues)
  }

  if (moduleKey === 'purchase-orders') {
    draft.buyerName = currentOperatorName
  }

  if (
    moduleKey === 'receipts'
    || moduleKey === 'payments'
    || moduleKey === 'invoice-receipts'
    || moduleKey === 'invoice-issues'
  ) {
    draft.operatorName = currentOperatorName
  }

  return draft
}

export function isEditorFieldDisabledForModule(
  moduleKey: string,
  fieldKey: string,
  fieldDisabled: boolean,
  canSaveCurrentEditor: boolean,
  salesOrderLineLocked: boolean,
) {
  if (!canSaveCurrentEditor) {
    return true
  }

  if (fieldDisabled) {
    return true
  }

  if (moduleKey === 'role-settings' && fieldKey === 'userCount') {
    return true
  }

  if (moduleKey === 'sales-orders' && salesOrderLineLocked) {
    return !editableLockedFieldKeysByModuleKey['sales-orders'].includes(fieldKey)
  }

  return false
}

export function isEditorItemColumnEditableForModule(
  moduleKey: string,
  columnKey: string,
  canEditLineItems: boolean,
  salesOrderLineLocked: boolean,
) {
  if (!canEditLineItems) {
    return false
  }

  if (derivedReadonlyItemColumnKeySet.has(columnKey)) {
    return false
  }

  if (moduleKey === 'sales-orders' && salesOrderLineLocked) {
    return editableLockedItemColumnKeysByModuleKey['sales-orders'].includes(columnKey)
  }

  return true
}

export function buildModuleLineItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildDefaultEditorLineItem(itemId = buildModuleLineItemId()): ModuleLineItem {
  return {
    id: itemId,
    materialCode: '',
    brand: '',
    category: '',
    material: '',
    spec: '',
    length: '',
    unit: '吨',
    batchNo: '',
    quantityUnit: '件',
    pieceWeightTon: 0,
    piecesPerBundle: 0,
    quantity: 0,
    weightTon: 0,
    unitPrice: 0,
    amount: 0,
  }
}

function isZeroLike(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return true
  }
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue === 0
}

function isBlankLike(value: unknown) {
  return !hasEditorValue(value)
}

function isEmptyPurchaseOrderLineItem(item: ModuleLineItem) {
  const defaultItem = buildDefaultEditorLineItem('')
  const unit = String(item.unit ?? '').trim()
  const quantityUnit = String(item.quantityUnit ?? '').trim()

  return isBlankLike(item.materialCode)
    && isBlankLike(item.brand)
    && isBlankLike(item.category)
    && isBlankLike(item.material)
    && isBlankLike(item.spec)
    && isBlankLike(item.length)
    && isBlankLike(item.batchNo)
    && (!unit || unit === defaultItem.unit)
    && (!quantityUnit || quantityUnit === defaultItem.quantityUnit)
    && isZeroLike(item.quantity)
    && isZeroLike(item.pieceWeightTon)
    && isZeroLike(item.piecesPerBundle)
    && isZeroLike(item.weightTon)
    && isZeroLike(item.unitPrice)
    && isZeroLike(item.amount)
}

export function trimEditorItemsForModule(moduleKey: string, items: ModuleLineItem[]) {
  if (moduleKey === 'purchase-orders') {
    return items.filter((item) => !isEmptyPurchaseOrderLineItem(item))
  }

  if (moduleKey === 'invoice-receipts' || moduleKey === 'invoice-issues') {
    return items.filter((item) => Number(item.weightTon || 0) > 0 || Number(item.amount || 0) > 0)
  }

  return items
}

export function moveEditorLineItemByDrag(
  items: ModuleLineItem[],
  sourceId: string,
  targetId: string,
  position: EditorItemDragPosition,
) {
  if (!sourceId || sourceId === targetId) {
    return items
  }

  const sourceItem = items.find((item) => String(item.id) === sourceId)
  if (!sourceItem) {
    return items
  }

  const nextItems = items.filter((item) => String(item.id) !== sourceId)
  const targetIndex = nextItems.findIndex((item) => String(item.id) === targetId)
  if (targetIndex < 0) {
    return items
  }

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
  nextItems.splice(insertIndex, 0, sourceItem)
  return nextItems
}

export function recalculateEditorLineItem(item: ModuleLineItem, changedKey?: string) {
  if (changedKey === 'quantity' || changedKey === 'pieceWeightTon') {
    item.weightTon = toRoundedNumber(Number(item.quantity || 0) * Number(item.pieceWeightTon || 0), 3)
  }

  if (changedKey === 'amount' && Number(item.weightTon || 0) > 0) {
    item.unitPrice = toRoundedNumber(Number(item.amount || 0) / Number(item.weightTon || 0), 2)
    return item
  }

  if (
    changedKey === 'quantity'
    || changedKey === 'pieceWeightTon'
    || changedKey === 'weightTon'
    || changedKey === 'unitPrice'
  ) {
    item.amount = toRoundedNumber(Number(item.weightTon || 0) * Number(item.unitPrice || 0), 2)
  }

  return item
}

export function applyMaterialToEditorLineItem(
  item: ModuleLineItem,
  materialRecord?: Record<string, unknown> | null,
) {
  if (!materialRecord) {
    return item
  }

  item.brand = materialRecord.brand || ''
  item.category = materialRecord.category || ''
  item.material = materialRecord.material || ''
  item.spec = materialRecord.spec || ''
  item.length = materialRecord.length || ''
  item.unit = materialRecord.unit || '吨'
  item.batchNo = ''
  item.quantityUnit = inferQuantityUnit(materialRecord)
  item.pieceWeightTon = toRoundedNumber(materialRecord.pieceWeightTon || 0, 3)
  item.piecesPerBundle = toRoundedNumber(materialRecord.piecesPerBundle || 0, 0)
  item.unitPrice = toRoundedNumber(materialRecord.unitPrice || 0, 2)
  return recalculateEditorLineItem(item, 'quantity')
}

export function getEditorValidationMessage(options: {
  fields: ModuleFormFieldDefinition[]
  editorForm: Record<string, unknown>
  hasItemColumns: boolean
  itemColumns?: ModuleColumnDefinition[]
  items?: ModuleLineItem[]
  itemCount: number
  parentImportConfig?: ModuleParentImportDefinition
  occupiedParentMap: Record<string, ModuleRecord>
  getPrimaryNo: (record: ModuleRecord) => string
}) {
  const {
    fields,
    editorForm,
    hasItemColumns,
    itemColumns = [],
    items = [],
    itemCount,
    parentImportConfig,
    occupiedParentMap,
    getPrimaryNo,
  } = options

  for (const field of fields) {
    if (field.required && !hasEditorValue(editorForm[field.key])) {
      return `请填写${field.label}`
    }
  }

  if (hasItemColumns && itemCount === 0) {
    return '请至少填写一条明细'
  }

  if (hasItemColumns) {
    const itemValidationMessage = getLineItemValidationMessage(items, itemColumns)
    if (itemValidationMessage) {
      return itemValidationMessage
    }
  }

  if (parentImportConfig?.enforceUniqueRelation) {
    const parentNos = parseParentRelationNos(editorForm[parentImportConfig.parentFieldKey])
    for (const parentNo of parentNos) {
      if (occupiedParentMap[parentNo]) {
        return `${parentImportConfig.label}已被${getPrimaryNo(occupiedParentMap[parentNo])}关联`
      }
    }
  }

  return null
}

export function isNumberEditorColumn(columnKey: string) {
  return [
    'pieceWeightTon',
    'piecesPerBundle',
    'quantity',
    'weightTon',
    'unitPrice',
    'amount',
  ].includes(columnKey)
}

export function getEditorItemPrecision(columnKey: string) {
  if (['pieceWeightTon', 'weightTon'].includes(columnKey)) {
    return 3
  }
  if (['unitPrice', 'amount'].includes(columnKey)) {
    return 2
  }
  return 0
}

export function getEditorItemMin(columnKey: string) {
  if (isNumberEditorColumn(columnKey)) {
    return 0
  }
  return undefined
}

export function normalizeDraftRecordForModule(options: {
  moduleKey: string
  record: ModuleRecord
  items: ModuleLineItem[]
  primaryNoKey?: string
  generatePrimaryNo: () => string
  currentOperatorName: string
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
}) {
  const {
    moduleKey,
    record,
    items,
    primaryNoKey,
    generatePrimaryNo: createPrimaryNo,
    currentOperatorName,
    sumLineItemsBy,
  } = options

  if (primaryNoKey && !record[primaryNoKey]) {
    record[primaryNoKey] = createPrimaryNo()
  }

  applyModuleDefaultEditorDraft(moduleKey, record, currentOperatorName)

  if (computedAmountModuleKeys.has(moduleKey)) {
    record.totalWeight = Number(sumLineItemsBy(items, 'weightTon').toFixed(3))
    record.totalAmount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
  }

  if (moduleKey === 'freight-bills') {
    record.totalWeight = Number(sumLineItemsBy(items, 'weightTon').toFixed(3))
    record.totalFreight = Number((Number(record.unitPrice || 0) * Number(record.totalWeight || 0)).toFixed(2))
    if (!record.deliveryStatus) {
      record.deliveryStatus = '未送达'
    }
  }

  if (moduleKey === 'freight-statements' && items.length) {
    record.totalWeight = Number(sumLineItemsBy(items, 'weightTon').toFixed(3))
  }

  if (moduleKey === 'supplier-statements') {
    if (items.length) {
      record.purchaseAmount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
      const sourceInboundNos = Array.from(
        new Set(
          items
            .map((item) => String(item.sourceNo || '').trim())
            .filter(Boolean),
        ),
      )
      record.sourceInboundNos = sourceInboundNos.join(', ')
    }
    record.paymentAmount = Number(record.paymentAmount || 0)
    record.closingAmount = Number(Number(record.purchaseAmount || 0).toFixed(2))
  }

  if (moduleKey === 'customer-statements') {
    if (items.length) {
      record.salesAmount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
      const sourceOrderNos = Array.from(
        new Set(
          items
            .map((item) => String(item.sourceNo || '').trim())
            .filter(Boolean),
        ),
      )
      record.sourceOrderNos = sourceOrderNos.join(', ')
    }
    record.receiptAmount = Number(record.receiptAmount || 0)
    record.closingAmount = Number(Number(record.salesAmount || 0).toFixed(2))
  }

  if (moduleKey === 'invoice-receipts') {
    if (items.length) {
      record.amount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
      const sourcePurchaseOrderNos = Array.from(
        new Set(
          items
            .map((item) => String(item.sourceNo || '').trim())
            .filter(Boolean),
        ),
      )
      record.sourcePurchaseOrderNos = sourcePurchaseOrderNos.join(', ')
    }
  }

  if (moduleKey === 'invoice-issues') {
    if (items.length) {
      record.amount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
      const sourceSalesOrderNos = Array.from(
        new Set(
          items
            .map((item) => String(item.sourceNo || '').trim())
            .filter(Boolean),
        ),
      )
      record.sourceSalesOrderNos = sourceSalesOrderNos.join(', ')
    }
  }

  if (moduleKey === 'freight-statements') {
    record.unpaidAmount = Number((Number(record.totalFreight || 0) - Number(record.paidAmount || 0)).toFixed(2))
    if (Array.isArray(record.attachments)) {
      record.attachment = record.attachments
        .map((item) => String((item as Record<string, unknown>).name || ''))
        .filter(Boolean)
        .join(', ')
    }
  }

  if (moduleKey === 'role-settings') {
    const permissionCodes = normalizeStringArray(record.permissionCodes)
    record.permissionCodes = permissionCodes
    record.permissionCount = permissionCodes.length
    record.permissionSummary = getPermissionLabels(permissionCodes).join('、')
  }

  if (moduleKey === 'user-accounts') {
    const roleNames = normalizeStringArray(record.roleNames)
    record.roleNames = roleNames
    record.permissionSummary = getRolePermissionLabels(roleNames).join('、')
  }

  if (!record.status && defaultStatusByModuleKey[moduleKey]) {
    record.status = defaultStatusByModuleKey[moduleKey]
  }

  if (
    (
      moduleKey === 'receipts'
      || moduleKey === 'payments'
      || moduleKey === 'invoice-receipts'
      || moduleKey === 'invoice-issues'
    ) && !record.operatorName
  ) {
    record.operatorName = currentOperatorName
  }

  return record
}
