import i18next from 'i18next'
import { isPurchaseWeighRequiredCategory } from '@/constants/module-options'
import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
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
      messages.push(
        i18next.t('modules.validation.maxImportExceeded', {
          row: index + 1,
          max: maxImportQuantity,
        }),
      )
    }
    if (moduleKey === 'purchase-inbound') {
      const isWeighSettlement = asString(item.settlementMode).trim() === '过磅'
      if (
        isPurchaseWeighRequiredCategory(item.category) &&
        !isWeighSettlement
      ) {
        messages.push(
          i18next.t('modules.validation.weighRequired', { row: index + 1 }),
        )
      }
      if (
        isWeighSettlement &&
        (!hasEditorValue(item.weighWeightTon) ||
          Number(item.weighWeightTon || 0) <= 0)
      ) {
        messages.push(
          i18next.t('modules.validation.weighWeightRequired', {
            row: index + 1,
          }),
        )
      }
    }
    for (const column of requiredColumns) {
      if (!hasEditorValue(item[column.dataIndex])) {
        messages.push(
          i18next.t('modules.validation.lineItemRequired', {
            row: index + 1,
            label: column.title,
          }),
        )
      }
    }
  }

  return messages
}

export function getEditorValidationMessage(options: {
  fields: ModuleFormFieldDefinition[]
  editorForm: ModuleRecord
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
      if (!collectAll)
        return i18next.t('modules.validation.fieldRequired', {
          label: field.label,
        })
      allErrors.push(
        i18next.t('modules.validation.fieldRequired', { label: field.label }),
      )
    }
  }

  if (hasItemColumns && itemCount === 0) {
    if (!collectAll) return i18next.t('modules.validation.minOneItem')
    allErrors.push(i18next.t('modules.validation.minOneItem'))
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
        const msg = i18next.t('modules.validation.parentRelationOccupied', {
          parentLabel: parentImportConfig.label,
          parentNo,
          occupiedNo: occupiedPrimaryNo,
        })
        if (!collectAll) return msg
        allErrors.push(msg)
      }
    }
  }

  if (allErrors.length) {
    return (
      allErrors.slice(0, 5).join('；') +
      (allErrors.length > 5
        ? ` ${i18next.t('modules.validation.errorSummarySuffix', { count: allErrors.length })}`
        : '')
    )
  }

  return null
}
