import { getBehaviorValue, hasBehavior } from './module-behavior-registry'
import { DERIVED_READONLY_ITEM_COLUMN_KEYS } from './module-editor-shared'

export function canModuleEditLineItems(
  moduleKey: string,
  hasItemColumns: boolean,
) {
  return hasBehavior(moduleKey, 'supportsLineItems') && hasItemColumns
}

export function isSalesOrderLineLocked(statuses: string[]) {
  return isModuleLineItemsLocked('sales-order', statuses)
}

export function isModuleLineItemsLocked(moduleKey: string, statuses: string[]) {
  const lockedStatuses = getBehaviorValue(moduleKey, 'lineItemLockStatuses') as
    | string[]
    | undefined
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
  draft: Record<string, unknown>,
  currentOperatorName: string,
) {
  const defaultDraftValues = getBehaviorValue(moduleKey, 'defaultDraftValues')
  if (defaultDraftValues) {
    Object.assign(draft, defaultDraftValues as Record<string, unknown>)
  }

  const defaultOperatorField = getBehaviorValue(
    moduleKey,
    'defaultOperatorField',
  )
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

  const readonlyFields = getBehaviorValue(moduleKey, 'readonlyEditorFields') as
    | string[]
    | undefined
  if ((readonlyFields || []).includes(fieldKey)) {
    return true
  }

  if (
    getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked') &&
    lineItemsLocked
  ) {
    const lockedFields = getBehaviorValue(moduleKey, 'editableLockedFields') as
      | string[]
      | undefined
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

  if (getBehaviorValue(moduleKey, 'readonlyLineItems') === true) {
    return false
  }

  if (
    DERIVED_READONLY_ITEM_COLUMN_KEYS.has(columnKey) &&
    !(moduleKey === 'purchase-inbound' && columnKey === 'weightTon')
  ) {
    return false
  }

  if (moduleKey === 'purchase-inbound' && columnKey === 'batchNo') {
    return false
  }

  if (
    getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked') &&
    lineItemsLocked
  ) {
    const lockedItemColumns = getBehaviorValue(
      moduleKey,
      'editableLockedItemColumns',
    ) as string[] | undefined
    return (lockedItemColumns || []).includes(columnKey)
  }

  return true
}
