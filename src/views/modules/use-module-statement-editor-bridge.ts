import { type Ref } from 'vue'
import type { ModuleRecord } from '@/types/module-page'
import { resetReactiveObject } from '@/utils/clone-utils'

interface UseModuleStatementEditorBridgeOptions {
  editorForm: Record<string, unknown>
  editorMode: Ref<'create' | 'edit'>
  editorVisible: Ref<boolean>
  editorSourceRecordId: Ref<string>
  resetParentImportState: () => void
  buildEditorDraft: (mode: 'create' | 'edit', sourceRecord?: ModuleRecord) => Record<string, unknown>
}

export function useModuleStatementEditorBridge(options: UseModuleStatementEditorBridgeOptions) {
  function openCreateEditorWithDraft(draft: ModuleRecord) {
    options.editorMode.value = 'create'
    options.editorSourceRecordId.value = ''
    options.resetParentImportState()
    resetReactiveObject(options.editorForm, draft)
    options.editorVisible.value = true
  }

  function createEditorBaseDraft() {
    return options.buildEditorDraft('create') as ModuleRecord
  }

  return {
    createEditorBaseDraft,
    openCreateEditorWithDraft,
  }
}
