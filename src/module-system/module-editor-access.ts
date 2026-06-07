import type {
  ModuleFormFieldDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { getBehaviorValue } from './module-behavior-registry'
import { DERIVED_READONLY_ITEM_COLUMN_KEYS } from './module-editor-shared'

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
  draft: ModuleRecord,
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
  draft: ModuleRecord,
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
  _primaryNoKey?: string,
  parentFieldKey?: string,
  record?: ModuleRecord,
) {
  if (!canSaveCurrentEditor) {
    return true
  }

  if (fieldDisabled) {
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

export function isEditorItemColumnEditableForModule(
  moduleKey: string,
  columnKey: string,
  canEditLineItems: boolean,
  lineItemsLocked: boolean,
) {
  if (!canEditLineItems) {
    return false
  }

  const readonlyItemColumns = getBehaviorValue(moduleKey, 'readonlyItemColumns')
  if (readonlyItemColumns?.includes(columnKey)) {
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

  if (
    columnKey === 'batchNo' &&
    (moduleKey === 'purchase-inbound' || moduleKey === 'purchase-order')
  ) {
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
