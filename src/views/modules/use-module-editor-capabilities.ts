import { computed, type Ref } from 'vue'
import type { ModuleFormFieldDefinition, ModuleRecord } from '@/types/module-page'
import {
  buildEditorAuditTarget,
  buildReverseAuditTarget,
} from './module-adapter-actions'
import {
  canManageEditorLineItems,
  isModuleLineItemsLocked,
} from './module-adapter-editor'
import { getBehaviorValue } from './module-behavior-registry'

interface UseModuleEditorCapabilitiesOptions {
  moduleKey: Ref<string>
  formFields: Ref<ModuleFormFieldDefinition[]>
  lineItemLockRelatedRows: Ref<ModuleRecord[]>
  canEditLineItems: Ref<boolean>
  canSaveCurrentEditor: Ref<boolean>
  canAuditRecords: Ref<boolean>
  canPrintRecords: Ref<boolean>
  canDeleteRecords: Ref<boolean>
  isReadOnly: Ref<boolean>
  resolveModuleStatusOptions: (statusField: ModuleFormFieldDefinition | undefined) => string[]
}

export function useModuleEditorCapabilities(options: UseModuleEditorCapabilitiesOptions) {
  const lineItemsLocked = computed(() =>
    isModuleLineItemsLocked(
      options.moduleKey.value,
      options.lineItemLockRelatedRows.value.map((record) => String(record.status || '')),
    ),
  )

  const editorAuditTarget = computed(() => {
    const statusField = options.formFields.value.find((field) => field.key === 'status')
    return buildEditorAuditTarget(
      options.moduleKey.value,
      options.resolveModuleStatusOptions(statusField),
      lineItemsLocked.value,
    )
  })

  const listStatusField = computed(() => options.formFields.value.find((field) => field.key === 'status'))
  const listStatusOptions = computed(() =>
    options.resolveModuleStatusOptions(listStatusField.value),
  )
  const listAuditTarget = computed(() =>
    buildEditorAuditTarget(options.moduleKey.value, listStatusOptions.value, false),
  )
  const listReverseAuditTarget = computed(() =>
    buildReverseAuditTarget(options.moduleKey.value, listStatusOptions.value, listStatusField.value?.defaultValue),
  )

  const canUseBulkAuditActions = computed(() => Boolean(
    !options.isReadOnly.value
    && options.canAuditRecords.value
    && listAuditTarget.value
    && listReverseAuditTarget.value,
  ))
  const canUseBulkPrintActions = computed(() => options.canPrintRecords.value)
  const canUseBulkDeleteActions = computed(() => !options.isReadOnly.value && options.canDeleteRecords.value)
  const canAuditEditor = computed(() => Boolean(editorAuditTarget.value))
  const canSaveAndAuditCurrentEditor = computed(() =>
    options.canSaveCurrentEditor.value && options.canAuditRecords.value && canAuditEditor.value,
  )
  const canManageEditorItems = computed(() =>
    canManageEditorLineItems(
      options.moduleKey.value,
      options.canEditLineItems.value,
      options.canSaveCurrentEditor.value,
      lineItemsLocked.value,
    ),
  )
  const canAddManualEditorItems = computed(() =>
    canManageEditorItems.value && getBehaviorValue(options.moduleKey.value, 'allowsManualLineItems') !== false,
  )
  const lockedLineItemsNotice = computed(() =>
    lineItemsLocked.value
      ? String(getBehaviorValue(options.moduleKey.value, 'lockedLineItemsNotice') || '')
      : '',
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
