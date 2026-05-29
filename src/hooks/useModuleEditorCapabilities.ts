import type {
  ModuleFilterDefinition,
  ModuleFormFieldDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  buildListAuditTargets,
  buildEditorAuditTarget,
  resolveStatusOptions,
} from '@/module-system/module-adapter-actions'
import {
  canManageEditorLineItems,
  isModuleLineItemsLocked,
} from '@/module-system/module-adapter-editor'
import { getBehaviorValue } from '@/module-system/module-behavior-registry'

interface Props {
  moduleKey: string
  formFields: ModuleFormFieldDefinition[]
  listStatusFields?: Array<ModuleFormFieldDefinition | ModuleFilterDefinition>
  lineItemLockRelatedRows: ModuleRecord[]
  lineItemsLockedOverride?: boolean
  currentStatus?: string
  canEditLineItems: boolean
  canSaveCurrentEditor: boolean
  canAuditRecords: boolean
  canPrintRecords: boolean
  canDeleteRecords: boolean
  isReadOnly: boolean
  resolveModuleStatusOptions: (
    statusField: ModuleFormFieldDefinition | undefined,
  ) => string[]
}

export function useModuleEditorCapabilities({
  moduleKey,
  formFields,
  listStatusFields,
  lineItemLockRelatedRows,
  lineItemsLockedOverride,
  currentStatus,
  canEditLineItems,
  canSaveCurrentEditor,
  canAuditRecords,
  canPrintRecords,
  canDeleteRecords,
  isReadOnly,
  resolveModuleStatusOptions,
}: Props) {
  const lineItemsLocked =
    typeof lineItemsLockedOverride === 'boolean'
      ? lineItemsLockedOverride
      : isModuleLineItemsLocked(
          moduleKey,
          lineItemLockRelatedRows.map((record) => asString(record.status)),
        )

  const editorAuditTarget = (() => {
    const statusField = formFields.find((field) => field.key === 'status')
    return buildEditorAuditTarget(
      moduleKey,
      resolveModuleStatusOptions(statusField),
      currentStatus,
    )
  })()

  const effectiveListStatusFields = listStatusFields || formFields
  const listStatusField = effectiveListStatusFields.find(
    (field) => field.key === 'status',
  )
  const listStatusOptions = resolveStatusOptions({
    fields: effectiveListStatusFields,
  })
  const listPreferredStatus =
    listStatusField && 'defaultValue' in listStatusField
      ? listStatusField.defaultValue
      : undefined
  const {
    auditTarget: listAuditTarget,
    reverseAuditTarget: listReverseAuditTarget,
  } = buildListAuditTargets({
    moduleKey,
    statusOptions: listStatusOptions,
    preferredStatus: listPreferredStatus,
  })

  const canUseBulkAuditActions =
    !isReadOnly &&
    canAuditRecords &&
    Boolean(listAuditTarget && listReverseAuditTarget)
  const canUseBulkPrintActions = canPrintRecords
  const canUseBulkDeleteActions = !isReadOnly && canDeleteRecords
  const canAuditEditor = Boolean(editorAuditTarget)
  const canSaveAndAuditCurrentEditor =
    canSaveCurrentEditor && canAuditRecords && canAuditEditor

  const canManageEditorItems = canManageEditorLineItems(
    moduleKey,
    canEditLineItems,
    canSaveCurrentEditor,
    lineItemsLocked,
  )
  const canAddManualEditorItems =
    canManageEditorItems &&
    getBehaviorValue(moduleKey, 'allowsManualLineItems') !== false
  const lockedLineItemsNotice = lineItemsLocked
    ? String(getBehaviorValue(moduleKey, 'lockedLineItemsNotice') || '')
    : ''

  return {
    canAddManualEditorItems,
    canAuditEditor,
    canManageEditorItems,
    canSaveAndAuditCurrentEditor,
    canUseBulkAuditActions,
    canUseBulkDeleteActions,
    canUseBulkPrintActions,
    editorAuditTarget,
    lineItemsLocked,
    listAuditTarget,
    listReverseAuditTarget,
    listStatusOptions,
    lockedLineItemsNotice,
  }
}
