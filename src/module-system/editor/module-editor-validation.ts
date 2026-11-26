import i18next from 'i18next'
import {
  FIXED_FREIGHT_AMOUNT_FIELD,
  isFixedFreightSettlement,
  isValidFixedFreightAmount,
} from '@/constants/freight-settlement'
import {
  isPurchaseInbound,
  isPurchaseOrder,
  isSalesOutbound,
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
    if (isSalesOutbound(moduleKey) && Number(item.quantity || 0) < 1) {
      messages.push(
        i18next.t('modules.validation.salesOutboundQuantityMinimum', {
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

/** 空值交给「必填」提示；这里只拦「填了但不大于 0」的情况，避免同一问题报两条文案。 */
function getFreightBillSettlementMessage(
  moduleKey: string | undefined,
  editorForm: ModuleRecordInput,
): string | null {
  if (moduleKey !== 'freight-bill') {
    return null
  }
  if (!isFixedFreightSettlement(editorForm)) {
    return null
  }
  const amount = editorForm[FIXED_FREIGHT_AMOUNT_FIELD]
  if (!hasEditorValue(amount)) {
    return null
  }
  return isValidFixedFreightAmount(amount)
    ? null
    : i18next.t('modules.validation.fixedFreightAmountPositive')
}

export interface EditorValidationFieldError {
  fieldKey: string
  message: string
}

export interface EditorValidationResult {
  message: string | null
  /** 首个校验失败的表单字段 key（用于跨步向导自动跳回出错步骤并聚焦）。 */
  firstInvalidFieldKey?: string
  fieldErrors: EditorValidationFieldError[]
}

export interface EditorValidationOptions {
  fields: ModuleFormFieldDefinition[]
  editorForm: ModuleRecordInput
  moduleKey?: string
  hasItemColumns: boolean
  itemColumns?: ModuleColumnDefinition[]
  items?: ModuleLineItem[]
  itemCount: number
  skipRequiredFieldKeys?: string[]
  collectAll?: boolean
}

function formatValidationSummary(allErrors: string[]): string | null {
  if (!allErrors.length) {
    return null
  }
  return (
    allErrors.slice(0, 5).join('；') +
    (allErrors.length > 5
      ? ` ${i18next.t('modules.validation.errorSummarySuffix', { count: allErrors.length })}`
      : '')
  )
}

/**
 * 编辑器全表单提交校验（**唯一来源**）。
 *
 * <p>向导模式采用条件渲染，antd `form.validateFields()` 只能校验当前已挂载步骤的字段；
 * 因此本函数负责兜底全量可见字段的 `required` 与自定义 `validate`（如项目资料第 2 步
 * 「固定时段」必选具体时段），并返回首个出错字段 key 供调用方自动切回对应步骤并聚焦。</p>
 */
export function validateEditorSubmission(
  options: EditorValidationOptions,
): EditorValidationResult {
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
  const fieldErrors: EditorValidationFieldError[] = []
  const erroredFieldKeys = new Set<string>()
  const skipRequiredFieldKeySet = new Set(skipRequiredFieldKeys)

  const recordFieldError = (fieldKey: string, text: string) => {
    allErrors.push(text)
    fieldErrors.push({ fieldKey, message: text })
    erroredFieldKeys.add(fieldKey)
  }

  const buildResult = (): EditorValidationResult => ({
    message: collectAll
      ? formatValidationSummary(allErrors)
      : (allErrors[0] ?? null),
    firstInvalidFieldKey: fieldErrors[0]?.fieldKey,
    fieldErrors,
  })

  for (const field of fields) {
    if (skipRequiredFieldKeySet.has(field.key)) {
      continue
    }
    if (!isModuleFormFieldVisible(field, editorForm)) {
      continue
    }
    if (field.required && !hasEditorValue(editorForm[field.key])) {
      recordFieldError(
        field.key,
        i18next.t('modules.validation.fieldRequired', {
          label: field.label,
        }),
      )
      if (!collectAll) return buildResult()
      continue
    }
    const isDisabled = Boolean(
      field.disabled || field.disabledWhen?.(editorForm),
    )
    if (!isDisabled && field.validate) {
      const customMessage = field.validate(editorForm[field.key], editorForm)
      if (customMessage) {
        recordFieldError(field.key, customMessage)
        if (!collectAll) return buildResult()
      }
    }
  }

  if (hasItemColumns && itemCount === 0) {
    allErrors.push(i18next.t('modules.validation.minOneItem'))
    if (!collectAll) return buildResult()
  }

  if (!erroredFieldKeys.has(FIXED_FREIGHT_AMOUNT_FIELD)) {
    const freightBillMessage = getFreightBillSettlementMessage(
      options.moduleKey,
      editorForm,
    )
    if (freightBillMessage) {
      recordFieldError(FIXED_FREIGHT_AMOUNT_FIELD, freightBillMessage)
      if (!collectAll) return buildResult()
    }
  }

  if (hasItemColumns) {
    const itemMessages = getLineItemValidationMessages(
      items,
      itemColumns,
      options.moduleKey,
    )
    if (itemMessages.length) {
      allErrors.push(...itemMessages)
      if (!collectAll) return buildResult()
    }
  }

  return buildResult()
}

export function getEditorValidationMessage(options: EditorValidationOptions) {
  return validateEditorSubmission(options).message
}
