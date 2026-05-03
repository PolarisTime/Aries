import { type Ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  findCustomerOption,
  resolveSingleCustomerProjectName,
} from '@/api/customer-options'
import type { ModuleFormFieldDefinition, ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { resetReactiveObject } from '@/utils/clone-utils'
import {
  isEditorFieldDisabledForModule,
  isEditorItemColumnEditableForModule,
} from './module-adapter-editor'

interface UseModuleEditorEntryOptions {
  moduleKey: Ref<string>
  editorForm: Record<string, unknown>
  editorMode: Ref<'create' | 'edit'>
  editorVisible: Ref<boolean>
  editorSourceRecordId: Ref<string>
  formFields: Ref<ModuleFormFieldDefinition[]>
  canEditRecords: Ref<boolean>
  canSaveCurrentEditor: Ref<boolean>
  canEditLineItems: Ref<boolean>
  lineItemsLocked: Ref<boolean>
  isReadOnly: Ref<boolean>
  handleCustomEditRecord?: (record: ModuleRecord) => Promise<boolean> | boolean
  handleView: (record: ModuleRecord) => Promise<unknown> | unknown
  resolveRecordForDetail: (record: ModuleRecord) => Promise<ModuleRecord> | ModuleRecord
  resetParentImportState: () => void
  buildEditorDraft: (mode: 'create' | 'edit', sourceRecord?: ModuleRecord) => Record<string, unknown>
  syncSystemEditorState: () => void
}

export function useModuleEditorEntry(options: UseModuleEditorEntryOptions) {
  async function handleEdit(record: ModuleRecord) {
    if (await options.handleCustomEditRecord?.(record)) {
      return
    }

    if (!options.canEditRecords.value) {
      message.warning('暂无编辑权限')
      return
    }
    if (options.isReadOnly.value) {
      await options.handleView(record)
      return
    }

    if (!options.formFields.value.length) {
      await options.handleView(record)
      return
    }

    const detailRecord = await options.resolveRecordForDetail(record)

    options.editorMode.value = 'edit'
    options.editorSourceRecordId.value = String(detailRecord.id || '')
    options.resetParentImportState()
    resetReactiveObject(options.editorForm, options.buildEditorDraft('edit', detailRecord))
    options.syncSystemEditorState()
    options.editorVisible.value = true
  }

  function isEditorFieldDisabled(field: ModuleFormFieldDefinition) {
    return isEditorFieldDisabledForModule(
      options.moduleKey.value,
      field.key,
      Boolean(field.disabled),
      options.canSaveCurrentEditor.value,
      options.lineItemsLocked.value,
    )
  }

  function isEditorItemColumnEditable(columnKey: string, record?: ModuleLineItem) {
    const baseEditable = isEditorItemColumnEditableForModule(
      options.moduleKey.value,
      columnKey,
      options.canEditLineItems.value,
      options.lineItemsLocked.value,
    )
    if (columnKey === 'weighWeightTon') {
      return baseEditable
        && options.moduleKey.value === 'purchase-inbounds'
        && String(record?.settlementMode || '').trim() === '过磅'
    }
    if (columnKey === 'weightTon') {
      return baseEditable
        && options.moduleKey.value === 'purchase-inbounds'
        && String(record?.settlementMode || '').trim() === '过磅'
    }
    if (options.moduleKey.value === 'purchase-inbounds' && columnKey === 'warehouseName') {
      return baseEditable
    }
    return baseEditable
  }

  function syncSalesOrderCustomerProjectFields(key: string, value: unknown) {
    if (options.moduleKey.value !== 'sales-orders') {
      return
    }
    if (key === 'customerName') {
      const customerName = String(value || '').trim()
      const currentProjectName = String(options.editorForm.projectName || '').trim()
      if (!customerName) {
        options.editorForm.projectName = ''
        return
      }
      if (currentProjectName && findCustomerOption(customerName, currentProjectName)) {
        return
      }
      options.editorForm.projectName = resolveSingleCustomerProjectName(customerName)
      return
    }
    if (key === 'projectName') {
      const selected = findCustomerOption(options.editorForm.customerName, value)
      if (selected?.customerName) {
        options.editorForm.customerName = selected.customerName
      }
    }
  }

  function setEditorFormValue(key: string, value: unknown) {
    options.editorForm[key] = value
    syncSalesOrderCustomerProjectFields(key, value)
  }

  return {
    handleEdit,
    isEditorFieldDisabled,
    isEditorItemColumnEditable,
    setEditorFormValue,
  }
}
