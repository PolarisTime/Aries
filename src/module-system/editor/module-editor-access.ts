import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import {
  isPurchaseInbound,
  isPurchaseModule,
  isPurchaseOrder,
  isSalesOutbound,
} from '@/module-system/core/module-category'
import { isPurchaseWeighRequiredCategory } from '@/module-system/core/module-option-resolvers'
import { DERIVED_READONLY_ITEM_COLUMN_KEYS } from '@/module-system/editor/module-editor-shared'
import type {
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export function isModuleLineItemsLocked(moduleKey: string, statuses: string[]) {
  const lockedStatuses = getBehaviorValue(moduleKey, 'lineItemLockStatuses')
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
  if (getBehaviorValue(moduleKey, 'readonlyLineItems') === true) {
    return false
  }

  return (
    canEditLineItems &&
    canSaveCurrentEditor &&
    !(
      Boolean(getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked')) &&
      lineItemsLocked
    )
  )
}

export function applyModuleDefaultEditorDraft(
  moduleKey: string,
  draft: ModuleRecordInput,
  currentOperatorName: string,
) {
  const defaultDraftValues = getBehaviorValue(moduleKey, 'defaultDraftValues')
  if (defaultDraftValues) {
    const resolvedDraftValues =
      typeof defaultDraftValues === 'function'
        ? defaultDraftValues()
        : defaultDraftValues
    for (const [key, value] of Object.entries(resolvedDraftValues)) {
      if (draft[key] === undefined) {
        draft[key] = value
      }
    }
  }

  const defaultOperatorField = getBehaviorValue(
    moduleKey,
    'defaultOperatorField',
  )
  if (
    typeof defaultOperatorField === 'string' &&
    draft[defaultOperatorField] === undefined
  ) {
    draft[defaultOperatorField] = currentOperatorName
  }

  return draft
}

export function applyFormFieldDefaultDraftValues(
  draft: ModuleRecordInput,
  fields: ModuleFormFieldDefinition[] = [],
) {
  for (const field of fields) {
    if (
      !Object.hasOwn(field, 'defaultValue') ||
      draft[field.key] !== undefined
    ) {
      continue
    }
    draft[field.key] = field.defaultValue
  }

  return draft
}

export function isEditorFieldDisabledForModule(
  moduleKey: string,
  fieldKey: string,
  fieldDisabled: boolean,
  canSaveCurrentEditor: boolean,
  lineItemsLocked: boolean,
  primaryNoKey?: string,
  parentFieldKey?: string,
  record?: ModuleRecord,
  authoritativePrimaryNo?: string,
) {
  const effectiveParentFieldKey = parentFieldKey

  if (!canSaveCurrentEditor) {
    return true
  }

  if (primaryNoKey && fieldKey === primaryNoKey && authoritativePrimaryNo) {
    return true
  }

  if (fieldDisabled) {
    return true
  }

  if (effectiveParentFieldKey && fieldKey === effectiveParentFieldKey) {
    return true
  }

  const parentImportedEditableFields = getBehaviorValue(
    moduleKey,
    'parentImportedEditableFields',
  )
  const parentImportLockApplies =
    getBehaviorValue(moduleKey, 'lockParentImportOnlyWhenPersisted') !== true ||
    Boolean(record?.id)
  if (
    effectiveParentFieldKey &&
    record &&
    parentImportLockApplies &&
    parentImportedEditableFields?.length &&
    asString(record[effectiveParentFieldKey]).trim()
  ) {
    return !parentImportedEditableFields.includes(fieldKey)
  }

  const readonlyFields = getBehaviorValue(moduleKey, 'readonlyEditorFields')
  if ((readonlyFields || []).includes(fieldKey)) {
    return true
  }

  const resolveReadonlyEditorFields = getBehaviorValue(
    moduleKey,
    'resolveReadonlyEditorFields',
  )
  if (record && resolveReadonlyEditorFields?.(record).includes(fieldKey)) {
    return true
  }

  if (
    getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked') &&
    lineItemsLocked
  ) {
    const lockedFields = getBehaviorValue(moduleKey, 'editableLockedFields')
    return !(lockedFields || []).includes(fieldKey)
  }

  return false
}

/**
 * 第一层：字段固有只读判定（与编辑状态无关，任何锁定白名单都不可越过）。
 * 包含 behavior 显式只读列、派生快照列（含显式声明的人工输入豁免）与模块特例。
 */
function isIntrinsicallyReadonlyItemColumn(
  moduleKey: string,
  columnKey: string,
  record?: ModuleLineItem,
) {
  const readonlyItemColumns = getBehaviorValue(moduleKey, 'readonlyItemColumns')
  if (readonlyItemColumns?.includes(columnKey)) {
    return true
  }

  if (DERIVED_READONLY_ITEM_COLUMN_KEYS.has(columnKey)) {
    // 人工输入豁免：这些列在特定模块是称重/实测结果，需要操作员填写。
    if (
      isPurchaseOrder(moduleKey) &&
      columnKey === 'pieceWeightTon' &&
      isPurchaseWeighRequiredCategory(record?.category)
    ) {
      return false
    }
    if (
      isSalesOutbound(moduleKey) &&
      (columnKey === 'actualWeightTon' || columnKey === 'weighWeightTon')
    ) {
      return false
    }
    return true
  }

  if (
    isPurchaseInbound(moduleKey) &&
    columnKey === 'materialCode' &&
    record?.sourcePurchaseOrderItemId
  ) {
    return true
  }

  if (columnKey === 'batchNo' && isPurchaseModule(moduleKey)) {
    return true
  }

  return false
}

export function isEditorItemColumnEditableForModule(
  moduleKey: string,
  columnKey: string,
  canEditLineItems: boolean,
  lineItemsLocked: boolean,
  record?: ModuleLineItem,
  parentImportedItemEditLocked = false,
) {
  if (!canEditLineItems) {
    return false
  }

  // 第一层：字段固有只读，任何状态白名单都不可越过。
  if (isIntrinsicallyReadonlyItemColumn(moduleKey, columnKey, record)) {
    return false
  }

  // 第二层：状态锁定，只能收窄第一层判定为可编辑的字段。
  const parentImportedItemEditableColumns = getBehaviorValue(
    moduleKey,
    'parentImportedItemEditableColumns',
  )
  if (
    parentImportedItemEditLocked &&
    parentImportedItemEditableColumns?.length
  ) {
    return parentImportedItemEditableColumns.includes(columnKey)
  }

  if (getBehaviorValue(moduleKey, 'readonlyLineItems') === true) {
    return false
  }

  if (
    getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked') &&
    lineItemsLocked
  ) {
    const lockedItemColumns = getBehaviorValue(
      moduleKey,
      'editableLockedItemColumns',
    )
    return (lockedItemColumns || []).includes(columnKey)
  }

  return true
}

function hasParentImportValue(
  record: ModuleRecordInput | undefined,
  parentFieldKey: string | undefined,
) {
  return Boolean(parentFieldKey && asString(record?.[parentFieldKey]).trim())
}

export function isParentImportedEditorLocked(
  moduleKey: string,
  record: ModuleRecordInput | undefined,
  parentFieldKey: string | undefined,
) {
  const effectiveParentFieldKey = parentFieldKey
  if (!hasParentImportValue(record, effectiveParentFieldKey)) {
    return false
  }

  if (
    getBehaviorValue(moduleKey, 'lockParentImportOnlyWhenPersisted') === true &&
    !record?.id
  ) {
    return false
  }

  return Boolean(
    getBehaviorValue(moduleKey, 'parentImportedEditableFields')?.length ||
      getBehaviorValue(moduleKey, 'parentImportedItemEditableColumns')?.length,
  )
}
