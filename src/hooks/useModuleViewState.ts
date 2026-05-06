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
  const formFields = useMemo(() => config.formFields || [], [config.formFields])
  const isReadOnly = useMemo(() => Boolean(config.readOnly), [config.readOnly])
  const parentImportConfig = useMemo(() => config.parentImport, [config.parentImport])
  const isMaterialModule = useMemo(() => hasBehavior(moduleKey, 'supportsMaterialImport'), [moduleKey])
  const canImportMaterials = useMemo(() => canEditRecords, [canEditRecords])
  const canSaveCurrentEditor = useMemo(
    () => (editorMode === 'edit' ? canEditRecords : canCreateRecords),
    [editorMode, canEditRecords, canCreateRecords],
  )
  const canEditItemColumns = useMemo(
    () => canModuleEditLineItems(moduleKey, Boolean(config.itemColumns?.length)),
    [moduleKey, config.itemColumns],
  )
  const canEditLineItems = useMemo(
    () => canModuleEditLineItems(moduleKey, Boolean(config.itemColumns?.length)),
    [moduleKey, config.itemColumns],
  )
  const canEditFormFields = useMemo(() => Boolean(formFields.length), [formFields])
  const shouldShowItemAmountSummary = useMemo(
    () => Boolean(config.itemColumns?.some((column) => column.dataIndex === 'amount')),
    [config.itemColumns],
  )
  const statusMap = useMemo(() => config.statusMap || {}, [config.statusMap])
  const editorTitle = useMemo(
    () => (editorMode === 'edit' ? `编辑${config.title}` : `新增${config.title}`),
    [editorMode, config.title],
  )
  const editorItems = useMemo<ModuleLineItem[]>(
    () => (Array.isArray(editorForm.items) ? (editorForm.items as ModuleLineItem[]) : []),
    [editorForm.items],
  )
  const editorItemWeightTotal = useMemo(() => sumLineItemsBy(editorItems, 'weightTon'), [editorItems])
  const editorItemAmountTotal = useMemo(() => sumLineItemsBy(editorItems, 'amount'), [editorItems])

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
