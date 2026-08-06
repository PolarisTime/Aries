import i18next from 'i18next'
import {
  isPurchaseInbound,
  isPurchaseOrder,
} from '@/module-system/core/module-category'
import { isPurchaseWeighRequiredCategory } from '@/module-system/core/module-option-resolvers'
import { hasEditorValue } from '@/module-system/editor/module-editor-shared'
import { isModuleFormFieldVisible } from '@/module-system/presentation/module-form-field-visibility'
import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

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
    if (isPurchaseOrder(moduleKey) && Number(item.quantity || 0) < 1) {
      messages.push(
        i18next.t('modules.validation.purchaseOrderQuantityMinimum', {
          row: index + 1,
        }),
      )
    }
    if (isPurchaseInbound(moduleKey)) {
      if (!asString(item.sourcePurchaseOrderItemId).trim()) {
        messages.push(
          i18next.t('modules.validation.purchaseInboundSourceRequired', {
            row: index + 1,
          }),
        )
      }
      if (!asString(item.warehouseId).trim()) {
        messages.push(
          i18next.t('modules.validation.purchaseInboundWarehouseRequired', {
            row: index + 1,
          }),
        )
      }
      if (Number(item.quantity || 0) <= 0) {
        messages.push(
          i18next.t('modules.validation.purchaseInboundQuantityPositive', {
            row: index + 1,
          }),
        )
      }
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

  if (isPurchaseInbound(moduleKey)) {
    const parentRelationIds = new Set(
      items.flatMap((item) => {
        const value = asString(item._parentRelationId).trim()
        return value ? [value] : []
      }),
    )
    if (parentRelationIds.size > 1) {
      messages.push(i18next.t('modules.validation.purchaseInboundMixedSource'))
    }
  }

  return messages
}

export function getEditorValidationMessage(options: {
  fields: ModuleFormFieldDefinition[]
  editorForm: ModuleRecordInput
  moduleKey?: string
  hasItemColumns: boolean
  itemColumns?: ModuleColumnDefinition[]
  items?: ModuleLineItem[]
  itemCount: number
  skipRequiredFieldKeys?: string[]
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
    collectAll = false,
  } = options

  const allErrors: string[] = []
  const skipRequiredFieldKeySet = new Set(skipRequiredFieldKeys)

  for (const field of fields) {
    if (skipRequiredFieldKeySet.has(field.key)) {
      continue
    }
    if (!isModuleFormFieldVisible(field, editorForm)) {
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
