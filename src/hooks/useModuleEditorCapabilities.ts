import { useMemo } from 'react'
import type { ModuleFormFieldDefinition, ModuleRecord } from '@/types/module-page'
import {
  buildEditorAuditTarget,
  buildReverseAuditTarget,
} from '@/views/modules/module-adapter-actions'
import {
  canManageEditorLineItems,
  isModuleLineItemsLocked,
} from '@/views/modules/module-adapter-editor'
import { getBehaviorValue } from '@/views/modules/module-behavior-registry'

interface Props {
  moduleKey: string
  formFields: ModuleFormFieldDefinition[]
  lineItemLockRelatedRows: ModuleRecord[]
  canEditLineItems: boolean
  canSaveCurrentEditor: boolean
  canAuditRecords: boolean
  canPrintRecords: boolean
  canDeleteRecords: boolean
  isReadOnly: boolean
  resolveModuleStatusOptions: (statusField: ModuleFormFieldDefinition | undefined) => string[]
}

export function useModuleEditorCapabilities({
  moduleKey,
  formFields,
  lineItemLockRelatedRows,
  canEditLineItems,
  canSaveCurrentEditor,
  canAuditRecords,
  canPrintRecords,
  canDeleteRecords,
  isReadOnly,
  resolveModuleStatusOptions,
}: Props) {
  const lineItemsLocked = useMemo(
    () =>
      isModuleLineItemsLocked(
        moduleKey,
        lineItemLockRelatedRows.map((record) => String(record.status || '')),
      ),
    [moduleKey, lineItemLockRelatedRows],
  )

  const editorAuditTarget = useMemo(() => {
    const statusField = formFields.find((field) => field.key === 'status')
    return buildEditorAuditTarget(
      moduleKey,
      resolveModuleStatusOptions(statusField),
      lineItemsLocked,
    )
  }, [moduleKey, formFields, lineItemsLocked, resolveModuleStatusOptions])

  const listStatusField = useMemo(
    () => formFields.find((field) => field.key === 'status'),
    [formFields],
  )
  const listStatusOptions = useMemo(
    () => resolveModuleStatusOptions(listStatusField),
    [listStatusField, resolveModuleStatusOptions],
  )
  const listAuditTarget = useMemo(
    () => buildEditorAuditTarget(moduleKey, listStatusOptions, false),
    [moduleKey, listStatusOptions],
  )
  const listReverseAuditTarget = useMemo(
    () => buildReverseAuditTarget(moduleKey, listStatusOptions, listStatusField?.defaultValue),
    [moduleKey, listStatusOptions, listStatusField],
  )

  const canUseBulkAuditActions = useMemo(
    () => Boolean(!isReadOnly && canAuditRecords && listAuditTarget && listReverseAuditTarget),
    [isReadOnly, canAuditRecords, listAuditTarget, listReverseAuditTarget],
  )
  const canUseBulkPrintActions = useMemo(() => canPrintRecords, [canPrintRecords])
  const canUseBulkDeleteActions = useMemo(
    () => !isReadOnly && canDeleteRecords,
    [isReadOnly, canDeleteRecords],
  )
  const canAuditEditor = useMemo(() => Boolean(editorAuditTarget), [editorAuditTarget])
  const canSaveAndAuditCurrentEditor = useMemo(
    () => canSaveCurrentEditor && canAuditRecords && canAuditEditor,
    [canSaveCurrentEditor, canAuditRecords, canAuditEditor],
  )
  const canManageEditorItems = useMemo(
    () =>
      canManageEditorLineItems(
        moduleKey,
        canEditLineItems,
        canSaveCurrentEditor,
        lineItemsLocked,
      ),
    [moduleKey, canEditLineItems, canSaveCurrentEditor, lineItemsLocked],
  )
  const canAddManualEditorItems = useMemo(
    () =>
      canManageEditorItems && getBehaviorValue(moduleKey, 'allowsManualLineItems') !== false,
    [canManageEditorItems, moduleKey],
  )
  const lockedLineItemsNotice = useMemo(
    () =>
      lineItemsLocked
        ? String(getBehaviorValue(moduleKey, 'lockedLineItemsNotice') || '')
        : '',
    [lineItemsLocked, moduleKey],
  )

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
