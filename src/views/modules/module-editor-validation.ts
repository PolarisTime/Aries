import { isPurchaseWeighRequiredCategory } from '@/constants/module-options'
import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { parseParentRelationNos } from './module-adapter-shared'
import { hasEditorValue } from './module-editor-shared'

function getLineItemValidationMessage(
  items: ModuleLineItem[],
  itemColumns: ModuleColumnDefinition[],
  moduleKey?: string,
) {
  const requiredColumns = itemColumns.filter((column) => column.required)

  for (const [index, item] of items.entries()) {
    const maxImportQuantity = Number(item._maxImportQuantity)
    if (
      Number.isFinite(maxImportQuantity) &&
      Number(item.quantity || 0) > maxImportQuantity
    ) {
      return `第${index + 1}行可关联数量不能超过${maxImportQuantity}件`
    }
    if (moduleKey === 'purchase-inbound') {
      const isWeighSettlement =
        String(item.settlementMode || '').trim() === '过磅'
      if (
        isPurchaseWeighRequiredCategory(item.category) &&
        !isWeighSettlement
      ) {
        return `第${index + 1}行商品类别需按过磅入库，请将本行结算方式改为过磅`
      }
      if (
        isWeighSettlement &&
        (!hasEditorValue(item.weighWeightTon) ||
          Number(item.weighWeightTon || 0) <= 0)
      ) {
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
    const itemValidationMessage = getLineItemValidationMessage(
      items,
      itemColumns,
      options.moduleKey,
    )
    if (itemValidationMessage) {
      return itemValidationMessage
    }
  }

  if (parentImportConfig?.enforceUniqueRelation) {
    const parentNos = parseParentRelationNos(
      editorForm[parentImportConfig.parentFieldKey],
    )
    for (const parentNo of parentNos) {
      if (occupiedParentMap[parentNo]) {
        return `${parentImportConfig.label}已被${getPrimaryNo(occupiedParentMap[parentNo])}关联`
      }
    }
  }

  return null
}
