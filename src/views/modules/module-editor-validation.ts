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

function getLineItemValidationMessages(
  items: ModuleLineItem[],
  itemColumns: ModuleColumnDefinition[],
  moduleKey?: string,
): string[] {
  const messages: string[] = []
  const requiredColumns = itemColumns.filter((column) => column.required)

  for (const [index, item] of items.entries()) {
    const maxImportQuantity = Number(item._maxImportQuantity)
    if (
      Number.isFinite(maxImportQuantity) &&
      Number(item.quantity || 0) > maxImportQuantity
    ) {
      messages.push(`第${index + 1}行可关联数量不能超过${maxImportQuantity}件`)
    }
    if (moduleKey === 'purchase-inbound') {
      const isWeighSettlement =
        String(item.settlementMode || '').trim() === '过磅'
      if (
        isPurchaseWeighRequiredCategory(item.category) &&
        !isWeighSettlement
      ) {
        messages.push(`第${index + 1}行商品类别需按过磅入库，请将本行结算方式改为过磅`)
      }
      if (
        isWeighSettlement &&
        (!hasEditorValue(item.weighWeightTon) ||
          Number(item.weighWeightTon || 0) <= 0)
      ) {
        messages.push(`请填写第${index + 1}行过磅重量`)
      }
    }
    for (const column of requiredColumns) {
      if (!hasEditorValue(item[column.dataIndex])) {
        messages.push(`请填写第${index + 1}行${column.title}`)
      }
    }
  }

  return messages
}

export function getEditorValidationMessage(options: {
  fields: ModuleFormFieldDefinition[]
  editorForm: Record<string, unknown>
  moduleKey?: string
  hasItemColumns: boolean
  itemColumns?: ModuleColumnDefinition[]
  items?: ModuleLineItem[]
  itemCount: number
  skipRequiredFieldKeys?: string[]
  parentImportConfig?: ModuleParentImportDefinition
  occupiedParentMap: Record<string, ModuleRecord>
  getPrimaryNo: (record: ModuleRecord) => string
  collectAll?: boolean
}) {
  const {
    fields,
    editorForm,
    hasItemColumns,
    itemColumns = [],
    items = [],
    itemCount,
    skipRequiredFieldKeys = [],
    parentImportConfig,
    occupiedParentMap,
    getPrimaryNo,
    collectAll = false,
  } = options

  const allErrors: string[] = []
  const skipRequiredFieldKeySet = new Set(skipRequiredFieldKeys)

  for (const field of fields) {
    if (skipRequiredFieldKeySet.has(field.key)) {
      continue
    }
    if (field.required && !hasEditorValue(editorForm[field.key])) {
      if (!collectAll) return `请填写${field.label}`
      allErrors.push(`请填写${field.label}`)
    }
  }

  if (hasItemColumns && itemCount === 0) {
    if (!collectAll) return '请至少填写一条明细'
    allErrors.push('请至少填写一条明细')
  }

  if (hasItemColumns) {
    const itemMessages = getLineItemValidationMessages(
      items,
      itemColumns,
      options.moduleKey,
    )
    if (itemMessages.length) {
      if (!collectAll) return itemMessages[0]
      allErrors.push(...itemMessages)
    }
  }

  if (parentImportConfig?.enforceUniqueRelation) {
    const parentNos = parseParentRelationNos(
      editorForm[parentImportConfig.parentFieldKey],
    )
    for (const parentNo of parentNos) {
      if (occupiedParentMap[parentNo]) {
        const occupiedPrimaryNo = getPrimaryNo(occupiedParentMap[parentNo])
        const msg = `${parentImportConfig.label}${parentNo}已被${occupiedPrimaryNo}关联`
        if (!collectAll) return msg
        allErrors.push(msg)
      }
    }
  }

  if (allErrors.length) {
    return allErrors.slice(0, 5).join('；') + (allErrors.length > 5 ? ` 等共${allErrors.length}个问题` : '')
  }

  return null
}
