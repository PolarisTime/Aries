import dayjs, { type Dayjs } from 'dayjs'
import { message } from 'ant-design-vue'
import type { Ref } from 'vue'
import { saveBusinessModule } from '@/api/business'
import type {
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModulePageConfig,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import {
  applyModuleDefaultEditorDraft,
  buildDefaultEditorLineItem,
  getEditorValidationMessage,
  normalizeDraftRecordForModule,
  trimEditorItemsForModule,
} from './module-adapter-editor'
import { cloneRecord, cloneLineItems, resetReactiveObject } from '@/utils/clone-utils'

interface EditorAuditTarget {
  key: string
  value: unknown
}

interface EditorSession {
  editorForm: Record<string, unknown>
  editorMode: Ref<'create' | 'edit'>
  editorVisible: Ref<boolean>
  editorSaving: Ref<boolean>
  editorSourceRecordId: Ref<string>
  setMode: (mode: 'create' | 'edit') => void
  setSaving: (value: boolean) => void
  setVisible: (value: boolean) => void
  setSourceRecordId: (value: string) => void
}

interface UseEditorFormSupportOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
  formFields: Ref<ModuleFormFieldDefinition[]>
  parentImportConfig: Ref<ModuleParentImportDefinition | undefined>
  occupiedParentMap: Ref<Record<string, ModuleRecord>>
  editorSession: EditorSession
  editorItems: Ref<ModuleLineItem[]>
  canCreateRecords: Ref<boolean>
  canSaveCurrentEditor: Ref<boolean>
  canAuditRecords: Ref<boolean>
  isReadOnly: Ref<boolean>
  editorAuditTarget: Ref<EditorAuditTarget | null>
  getCurrentOperatorName: () => string
  getPrimaryNo: (record: ModuleRecord) => string
  generatePrimaryNo: () => string
  generatePrimaryNoAsync?: () => Promise<string>
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
  resetParentImportState: () => void
  syncSystemEditorState: () => void
  refreshModuleQueries: () => Promise<void>
  showRequestError: (error: unknown, fallbackMessage: string) => void
  isSuccessCode: (code: unknown) => boolean
  setPaginationCurrentPage: (value: number) => void
}

export function useEditorFormSupport(options: UseEditorFormSupportOptions) {
  const { editorSession: s } = options

  function getDefaultFieldValue(field: ModuleFormFieldDefinition) {
    if (field.defaultValue !== undefined) {
      return field.defaultValue
    }
    if (field.type === 'multiSelect') {
      return []
    }
    if (field.type === 'date') {
      return dayjs().format('YYYY-MM-DD')
    }
    if (field.type === 'number') {
      return 0
    }
    return ''
  }

  function buildDefaultEditorDraft() {
    const draft: Record<string, unknown> = {
      items: options.config.value.itemColumns?.length ? [buildDefaultEditorLineItem()] : [],
    }

    options.formFields.value.forEach((field) => {
      draft[field.key] = getDefaultFieldValue(field)
    })

    if (options.config.value.primaryNoKey && !draft[options.config.value.primaryNoKey]) {
      draft[options.config.value.primaryNoKey] = options.generatePrimaryNo()
    }

    return applyModuleDefaultEditorDraft(
      options.moduleKey.value,
      draft,
      options.getCurrentOperatorName(),
    )
  }

  function buildEditorDraft(mode: 'create' | 'edit', sourceRecord?: ModuleRecord) {
    const baseDraft = buildDefaultEditorDraft()

    if (!sourceRecord) {
      return baseDraft
    }

    const sourceDraft = cloneRecord(sourceRecord)
    const mergedDraft: Record<string, unknown> = {
      ...baseDraft,
      ...sourceDraft,
      items: cloneLineItems(sourceRecord.items),
    }

    if (mode === 'edit') {
      return mergedDraft
    }

    if (options.config.value.primaryNoKey) {
      mergedDraft[options.config.value.primaryNoKey] = options.generatePrimaryNo()
    }

    mergedDraft.id = ''
    options.formFields.value
      .filter((field) => field.type === 'date')
      .forEach((field) => {
        mergedDraft[field.key] = baseDraft[field.key]
      })
    options.formFields.value
      .filter((field) => field.defaultValue !== undefined)
      .forEach((field) => {
        mergedDraft[field.key] = field.defaultValue
      })

    return mergedDraft
  }

  async function applyGeneratedPrimaryNo(draft: Record<string, unknown>) {
    if (!options.config.value.primaryNoKey || !options.generatePrimaryNoAsync) {
      return
    }

    try {
      const generatedNo = await options.generatePrimaryNoAsync()
      if (generatedNo) {
        draft[options.config.value.primaryNoKey] = generatedNo
      }
    } catch {
      // Keep the local fallback when remote generation is unavailable.
    }
  }

  function closeEditor() {
    s.setVisible(false)
    s.setSaving(false)
    s.setSourceRecordId('')
    options.resetParentImportState()
    resetReactiveObject(s.editorForm, {})
  }

  async function openCreateEditor() {
    if (!options.canCreateRecords.value) {
      message.warning('暂无新增权限')
      return
    }
    if (options.isReadOnly.value) {
      message.warning('当前模块为只读模式')
      return
    }

    s.setMode('create')
    s.setSourceRecordId('')
    options.resetParentImportState()
    resetReactiveObject(s.editorForm, buildEditorDraft('create'))
    await applyGeneratedPrimaryNo(s.editorForm)
    options.syncSystemEditorState()
    s.setVisible(true)
  }

  function validateEditorForm() {
    const trimmedItems = trimEditorItemsForModule(options.moduleKey.value, options.editorItems.value)
    if (trimmedItems.length !== options.editorItems.value.length) {
      s.editorForm.items = trimmedItems
    }

    const validationMessage = getEditorValidationMessage({
      fields: options.formFields.value,
      editorForm: s.editorForm,
      moduleKey: options.moduleKey.value,
      hasItemColumns: Boolean(options.config.value.itemColumns?.length),
      itemColumns: options.config.value.itemColumns,
      items: trimmedItems,
      itemCount: trimmedItems.length,
      parentImportConfig: options.parentImportConfig.value,
      occupiedParentMap: options.occupiedParentMap.value,
      getPrimaryNo: options.getPrimaryNo,
    })
    if (validationMessage) {
      message.warning(validationMessage)
      return false
    }

    return true
  }

  function normalizeDraftRecord() {
    const items = cloneLineItems(s.editorForm.items)
    return normalizeDraftRecordForModule({
      moduleKey: options.moduleKey.value,
      record: {
        ...(cloneRecord(s.editorForm) as ModuleRecord),
        id: s.editorMode.value === 'edit'
          ? String(s.editorSourceRecordId.value || s.editorForm.id || '')
          : String(s.editorForm.id || ''),
        items,
      },
      items,
      primaryNoKey: options.config.value.primaryNoKey,
      generatePrimaryNo: options.generatePrimaryNo,
      currentOperatorName: options.getCurrentOperatorName(),
      sumLineItemsBy: options.sumLineItemsBy,
    })
  }

  async function handleSaveEditor(audit = false) {
    if (!options.canSaveCurrentEditor.value) {
      message.warning(s.editorMode.value === 'edit' ? '暂无编辑权限' : '暂无新增权限')
      return
    }

    if (audit && !options.canAuditRecords.value) {
      message.warning('暂无审核权限')
      return
    }

    if (!validateEditorForm()) {
      return
    }

    s.setSaving(true)
    try {
      const payload = normalizeDraftRecord()
      if (audit && options.editorAuditTarget.value) {
        payload[options.editorAuditTarget.value.key] = options.editorAuditTarget.value.value
      }
      const response = await saveBusinessModule(options.moduleKey.value, payload)
      if (!options.isSuccessCode(response.code)) {
        throw new Error(response.message || '保存失败')
      }

      options.setPaginationCurrentPage(1)
      await options.refreshModuleQueries()
      message.success(response.message || (audit ? '保存并审核成功' : '保存成功'))
      closeEditor()
    } catch (error) {
      options.showRequestError(error, audit ? '保存并审核失败' : '保存失败')
    } finally {
      s.setSaving(false)
    }
  }

  function getEditorDateValue(key: string) {
    const value = s.editorForm[key]
    return value ? dayjs(String(value)) : undefined
  }

  function handleEditorDateChange(key: string, value: Dayjs | null) {
    s.editorForm[key] = value ? value.format('YYYY-MM-DD') : ''
  }

  return {
    buildEditorDraft,
    closeEditor,
    getEditorDateValue,
    handleEditorDateChange,
    handleSaveEditor,
    openCreateEditor,
  }
}
