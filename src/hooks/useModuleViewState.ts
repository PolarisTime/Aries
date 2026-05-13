import { useMemo } from 'react'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import { canModuleEditLineItems } from '@/views/modules/module-adapter-editor'
import { hasBehavior } from '@/views/modules/module-behavior-registry'

interface Props {
  moduleKey: string
  config: ModulePageConfig
  editorMode: 'create' | 'edit'
  editorForm: Record<string, unknown>
  canCreateRecords: boolean
  canEditRecords: boolean
}

function sumLineItemsBy(items: ModuleLineItem[], key: string): number {
  return items.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

export function useModuleViewState({
  moduleKey,
  config,
  editorMode,
  editorForm,
  canCreateRecords,
  canEditRecords,
}: Props) {
  const isReadOnly = Boolean(config.readOnly)
  const parentImportConfig = config.parentImport
  const canImportMaterials = canEditRecords
  const canSaveCurrentEditor =
    editorMode === 'edit' ? canEditRecords : canCreateRecords
  const canEditFormFields = config.formFields
    ? config.formFields.length > 0
    : false
  const editorTitle =
    editorMode === 'edit' ? `编辑${config.title}` : `新增${config.title}`

  const formFields = useMemo(() => config.formFields || [], [config.formFields])
  const statusMap = useMemo(() => config.statusMap || {}, [config.statusMap])
  const isMaterialModule = useMemo(
    () => hasBehavior(moduleKey, 'supportsMaterialImport'),
    [moduleKey],
  )
  const canEditLineItems = useMemo(
    () =>
      canModuleEditLineItems(moduleKey, Boolean(config.itemColumns?.length)),
    [moduleKey, config.itemColumns],
  )
  const shouldShowItemAmountSummary = useMemo(
    () =>
      Boolean(
        config.itemColumns?.some((column) => column.dataIndex === 'amount'),
      ),
    [config.itemColumns],
  )
  const editorItems = useMemo<ModuleLineItem[]>(
    () =>
      Array.isArray(editorForm.items)
        ? (editorForm.items as ModuleLineItem[])
        : [],
    [editorForm.items],
  )
  const editorItemWeightTotal = useMemo(
    () => sumLineItemsBy(editorItems, 'weightTon'),
    [editorItems],
  )
  const editorItemAmountTotal = useMemo(
    () => sumLineItemsBy(editorItems, 'amount'),
    [editorItems],
  )

  return {
    canEditFormFields,
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
