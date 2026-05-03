import { computed, type Ref } from 'vue'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import { canModuleEditLineItems } from './module-adapter-editor'
import { hasBehavior } from './module-behavior-registry'

interface UseModuleViewStateOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
  editorMode: Ref<'create' | 'edit'>
  editorForm: Record<string, unknown>
  canCreateRecords: Ref<boolean>
  canEditRecords: Ref<boolean>
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
}

export function useModuleViewState(options: UseModuleViewStateOptions) {
  const formFields = computed(() => options.config.value.formFields || [])
  const isReadOnly = computed(() => Boolean(options.config.value.readOnly))
  const parentImportConfig = computed(() => options.config.value.parentImport)
  const isMaterialModule = computed(() => hasBehavior(options.moduleKey.value, 'supportsMaterialImport'))
  const canImportMaterials = computed(() => options.canEditRecords.value)
  const canSaveCurrentEditor = computed(() =>
    options.editorMode.value === 'edit' ? options.canEditRecords.value : options.canCreateRecords.value,
  )
  const canEditItemColumns = computed(() =>
    canModuleEditLineItems(options.moduleKey.value, Boolean(options.config.value.itemColumns?.length)),
  )
  const canEditLineItems = computed(() =>
    canModuleEditLineItems(options.moduleKey.value, Boolean(options.config.value.itemColumns?.length)),
  )
  const canEditFormFields = computed(() => Boolean(formFields.value.length))
  const shouldShowItemAmountSummary = computed(() =>
    Boolean(options.config.value.itemColumns?.some((column) => column.dataIndex === 'amount')),
  )
  const statusMap = computed(() => options.config.value.statusMap || {})
  const editorTitle = computed(() => {
    if (options.editorMode.value === 'edit') {
      return `编辑${options.config.value.title}`
    }
    return `新增${options.config.value.title}`
  })
  const editorItems = computed<ModuleLineItem[]>(() =>
    Array.isArray(options.editorForm.items) ? (options.editorForm.items as ModuleLineItem[]) : [],
  )
  const editorItemWeightTotal = computed(() => options.sumLineItemsBy(editorItems.value, 'weightTon'))
  const editorItemAmountTotal = computed(() => options.sumLineItemsBy(editorItems.value, 'amount'))

  return {
    canEditFormFields,
    canEditItemColumns,
    canEditLineItems,
    canImportMaterials,
    canSaveCurrentEditor,
    editorItemAmountTotal,
    editorItems,
    editorItemWeightTotal,
    editorTitle,
    formFields,
    isMaterialModule,
    isReadOnly,
    parentImportConfig,
    shouldShowItemAmountSummary,
    statusMap,
  }
}
