import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { isPurchaseWeighRequiredCategory } from '@/constants/module-options'
import { getBehaviorValue, hasBehavior } from './module-behavior-registry'
import { parseParentRelationNos } from './module-adapter-shared'

export type EditorItemDragPosition = 'before' | 'after'

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
  'weightAdjustmentTon',
  'weightAdjustmentAmount',
  'amount',
])

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
  moduleKey?: string,
) {
  const requiredColumns = itemColumns.filter((column) => column.required)

  for (const [index, item] of items.entries()) {
    const maxImportQuantity = Number(item._maxImportQuantity)
    if (Number.isFinite(maxImportQuantity) && Number(item.quantity || 0) > maxImportQuantity) {
      return `第${index + 1}行可关联数量不能超过${maxImportQuantity}件`
    }
    if (moduleKey === 'purchase-inbounds') {
      const isWeighSettlement = String(item.settlementMode || '').trim() === '过磅'
      if (isPurchaseWeighRequiredCategory(item.category) && !isWeighSettlement) {
        return `第${index + 1}行商品类别需按过磅入库，请将本行结算方式改为过磅`
      }
      if (isWeighSettlement && (!hasEditorValue(item.weighWeightTon) || Number(item.weighWeightTon || 0) <= 0)) {
        return `请填写第${index + 1}行过磅重量`
      }
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
  return hasBehavior(moduleKey, 'supportsLineItems') && hasItemColumns
}

export function isSalesOrderLineLocked(statuses: string[]) {
  return isModuleLineItemsLocked('sales-orders', statuses)
}

export function isModuleLineItemsLocked(moduleKey: string, statuses: string[]) {
  const lockedStatuses = getBehaviorValue(moduleKey, 'lineItemLockStatuses') as string[] | undefined
  if (!lockedStatuses?.length) {
    return false
  }
  return statuses.some((status) => lockedStatuses.includes(status))
}

export function canManageEditorLineItems(
  moduleKey: string,
  canEditLineItems: boolean,
  canSaveCurrentEditor: boolean,
  lineItemsLocked: boolean,
) {
  return canEditLineItems
    && canSaveCurrentEditor
    && !(Boolean(getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked')) && lineItemsLocked)
}

export function applyModuleDefaultEditorDraft(
  moduleKey: string,
  draft: Record<string, unknown>,
  currentOperatorName: string,
) {
  const defaultDraftValues = getBehaviorValue(moduleKey, 'defaultDraftValues')
  if (defaultDraftValues) {
    Object.assign(draft, defaultDraftValues as Record<string, unknown>)
  }

  const defaultOperatorField = getBehaviorValue(moduleKey, 'defaultOperatorField')
  if (typeof defaultOperatorField === 'string') {
    draft[defaultOperatorField] = currentOperatorName
  }

  return draft
}

export function isEditorFieldDisabledForModule(
  moduleKey: string,
  fieldKey: string,
  fieldDisabled: boolean,
  canSaveCurrentEditor: boolean,
  lineItemsLocked: boolean,
) {
  if (!canSaveCurrentEditor) {
    return true
  }

  if (fieldDisabled) {
    return true
  }

  const readonlyFields = getBehaviorValue(moduleKey, 'readonlyEditorFields') as string[] | undefined
  if ((readonlyFields || []).includes(fieldKey)) {
    return true
  }

  if (Boolean(getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked')) && lineItemsLocked) {
    const lockedFields = getBehaviorValue(moduleKey, 'editableLockedFields') as string[] | undefined
    return !(lockedFields || []).includes(fieldKey)
  }

  return false
}

export function isEditorItemColumnEditableForModule(
  moduleKey: string,
  columnKey: string,
  canEditLineItems: boolean,
  lineItemsLocked: boolean,
) {
  if (!canEditLineItems) {
    return false
  }

  if (
    derivedReadonlyItemColumnKeySet.has(columnKey)
    && !(moduleKey === 'purchase-inbounds' && columnKey === 'weightTon')
  ) {
    return false
  }

  if (Boolean(getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked')) && lineItemsLocked) {
    const lockedItemColumns = getBehaviorValue(moduleKey, 'editableLockedItemColumns') as string[] | undefined
    return (lockedItemColumns || []).includes(columnKey)
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
    weightAdjustmentTon: 0,
    weightAdjustmentAmount: 0,
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
    && isZeroLike(item.weighWeightTon)
    && isZeroLike(item.weightAdjustmentTon)
    && isZeroLike(item.weightAdjustmentAmount)
    && isZeroLike(item.unitPrice)
    && isZeroLike(item.amount)
}

export function trimEditorItemsForModule(moduleKey: string, items: ModuleLineItem[]) {
  const strategy = getBehaviorValue(moduleKey, 'lineItemTrimStrategy')
  if (strategy === 'purchaseOrderBlank') {
    return items.filter((item) => !isEmptyPurchaseOrderLineItem(item))
  }

  if (strategy === 'positiveWeightOrAmount') {
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
  const theoreticalWeightTon = toRoundedNumber(Number(item.quantity || 0) * Number(item.pieceWeightTon || 0), 3)
  const isWeighSettlement = String(item.settlementMode || '').trim() === '过磅'
  const hasWeighWeightTon = isWeighSettlement
    && item.weighWeightTon !== undefined
    && item.weighWeightTon !== null
    && item.weighWeightTon !== ''

  if (changedKey === 'settlementMode' && !isWeighSettlement) {
    item.weighWeightTon = undefined
    item.weightTon = theoreticalWeightTon
  }

  if (changedKey === 'quantity' || changedKey === 'pieceWeightTon' || changedKey === 'settlementMode') {
    item.weightTon = hasWeighWeightTon
      ? toRoundedNumber(item.weighWeightTon, 3)
      : theoreticalWeightTon
  }

  if (changedKey === 'weighWeightTon' && isWeighSettlement) {
    item.weightTon = toRoundedNumber(item.weighWeightTon, 3)
  }

  if (changedKey === 'weightTon' && isWeighSettlement) {
    item.weighWeightTon = toRoundedNumber(item.weightTon, 3)
  }

  if (changedKey === 'amount' && Number(item.weightTon || 0) > 0) {
    item.unitPrice = toRoundedNumber(Number(item.amount || 0) / Number(item.weightTon || 0), 2)
    return item
  }

  if (
    changedKey === 'quantity'
    || changedKey === 'pieceWeightTon'
    || changedKey === 'weighWeightTon'
    || changedKey === 'settlementMode'
    || changedKey === 'weightTon'
    || changedKey === 'unitPrice'
  ) {
    item.amount = toRoundedNumber(Number(item.weightTon || 0) * Number(item.unitPrice || 0), 2)
  }

  if (
    changedKey === 'quantity'
    || changedKey === 'pieceWeightTon'
    || changedKey === 'weighWeightTon'
    || changedKey === 'settlementMode'
    || changedKey === 'weightTon'
    || changedKey === 'unitPrice'
  ) {
    item.weightAdjustmentTon = toRoundedNumber(Number(item.weightTon || 0) - theoreticalWeightTon, 3)
    item.weightAdjustmentAmount = toRoundedNumber(Number(item.weightAdjustmentTon || 0) * Number(item.unitPrice || 0), 2)
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
  item.settlementMode = isPurchaseWeighRequiredCategory(item.category)
    ? '过磅'
    : String(item.settlementMode || '理算')
  item.weighWeightTon = undefined
  item.weightAdjustmentTon = 0
  item.weightAdjustmentAmount = 0
  return recalculateEditorLineItem(item, 'quantity')
}

export function getEditorValidationMessage(options: {
  fields: ModuleFormFieldDefinition[]
  editorForm: Record<string, unknown>
  moduleKey?: string
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
    const itemValidationMessage = getLineItemValidationMessage(items, itemColumns, options.moduleKey)
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
    'weighWeightTon',
    'weightAdjustmentTon',
    'weightAdjustmentAmount',
    'unitPrice',
    'amount',
  ].includes(columnKey)
}

export function getEditorItemPrecision(columnKey: string) {
  if (['pieceWeightTon', 'weightTon', 'weighWeightTon', 'weightAdjustmentTon'].includes(columnKey)) {
    return 3
  }
  if (['unitPrice', 'amount', 'weightAdjustmentAmount'].includes(columnKey)) {
    return 2
  }
  return 0
}

export function getEditorItemMin(columnKey: string) {
  if (['weightAdjustmentTon', 'weightAdjustmentAmount'].includes(columnKey)) {
    return undefined
  }
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

  if (hasBehavior(moduleKey, 'computesAmounts')) {
    record.totalWeight = Number(sumLineItemsBy(items, 'weightTon').toFixed(3))
    record.totalAmount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
  }

  const normalizeFn = getBehaviorValue(moduleKey, 'normalizeDraftRecord')
  if (normalizeFn) {
    normalizeFn(record, items, { primaryNoKey, generatePrimaryNo: createPrimaryNo, currentOperatorName, sumLineItemsBy })
  }

  if (!record.status) {
    const defaultStatus = getBehaviorValue(moduleKey, 'defaultStatus')
    if (defaultStatus) {
      record.status = defaultStatus as string
    }
  }

  return record
}
