import { getBehaviorValue, hasBehavior } from './module-behavior-registry'
import { DERIVED_READONLY_ITEM_COLUMN_KEYS } from './module-editor-shared'

const SYSTEM_GENERATED_PRIMARY_NO_MODULES = new Set([
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'purchase-contract',
  'sales-contract',
  'supplier-statement',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
  'invoice-receipt',
  'invoice-issue',
])

export function usesSystemGeneratedPrimaryNo(moduleKey: string) {
  return SYSTEM_GENERATED_PRIMARY_NO_MODULES.has(moduleKey)
}

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
    const resolvedDraftValues =
      typeof defaultDraftValues === 'function'
        ? defaultDraftValues()
        : defaultDraftValues
    Object.assign(draft, resolvedDraftValues)
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
  primaryNoKey?: string,
  parentFieldKey?: string,
  record?: Record<string, unknown>,
) {
  if (!canSaveCurrentEditor) {
    return true
  }

  if (fieldDisabled) {
    return true
  }

  if (
    primaryNoKey &&
    fieldKey === primaryNoKey &&
    usesSystemGeneratedPrimaryNo(moduleKey)
  ) {
    return true
  }

  if (parentFieldKey && fieldKey === parentFieldKey) {
    return true
  }

  const readonlyFields = getBehaviorValue(moduleKey, 'readonlyEditorFields')
  if ((readonlyFields || []).includes(fieldKey)) {
    return true
  }

  const resolveReadonlyEditorFields = getBehaviorValue(
    moduleKey,
    'resolveReadonlyEditorFields',
  ) as ((record: Record<string, unknown>) => string[]) | undefined
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

  if (columnKey === 'batchNo' && (moduleKey === 'purchase-inbound' || moduleKey === 'purchase-order')) {
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
