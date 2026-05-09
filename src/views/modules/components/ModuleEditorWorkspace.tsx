import { Form } from 'antd'
import { useMemo } from 'react'
import { useModuleEditorCapabilities } from '@/hooks/useModuleEditorCapabilities'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { useModuleEditorItems } from '@/views/modules/use-module-editor-items'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'
import { ModuleEditorFormSection } from './ModuleEditorFormSection'
import { ModuleEditorItemsSection } from './ModuleEditorItemsSection'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  config: ModulePageConfig
  record: ModuleRecord | null
  moduleKey: string
  canSave: boolean
  canAudit: boolean
  lineItemsLocked?: boolean
  lockedLineItemsNotice?: string
  onClose: () => void
  onSaved: () => void
}

export function ModuleEditorWorkspace({
  open,
  config,
  record,
  moduleKey,
  canSave,
  canAudit,
  lineItemsLocked = false,
  lockedLineItemsNotice = '',
  onClose,
  onSaved,
}: Props) {
  const [form] = Form.useForm()
  const formFields = useMemo(() => config.formFields || [], [config.formFields])
  const statusField = useMemo(
    () => formFields.find((field) => field.key === 'status'),
    [formFields],
  )
  const statusOptions = useMemo(
    () =>
      Array.isArray(statusField?.options)
        ? statusField.options.map((option) => String(option.value))
        : [],
    [statusField],
  )
  const canEditLineItems = Boolean(config.itemColumns?.length)
  const {
    canAddManualEditorItems,
    canManageEditorItems,
    canSaveAndAuditCurrentEditor,
    editorAuditTarget,
  } = useModuleEditorCapabilities({
    moduleKey,
    formFields,
    lineItemLockRelatedRows: [],
    lineItemsLockedOverride: lineItemsLocked,
    canEditLineItems,
    canSaveCurrentEditor: canSave,
    canAuditRecords: canAudit,
    canPrintRecords: false,
    canDeleteRecords: false,
    isReadOnly: Boolean(config.readOnly),
    resolveModuleStatusOptions: () => statusOptions,
  })

  const canManageItems = canManageEditorItems
  const canAddManualItems = canAddManualEditorItems
  const canImportParentItems = Boolean(config.parentImport && canManageItems)
  const {
    addItem,
    closeParentSelector,
    handleImportParentRecord,
    handleSave,
    isEdit,
    items,
    openParentSelector,
    parentImporting,
    parentSelectorOpen,
    saving,
    setItems,
  } = useModuleEditorWorkspace({
    open,
    config,
    record,
    moduleKey,
    editorAuditTarget,
    form,
    onClose,
    onSaved,
    autoInsertBlankItemOnCreate:
      Boolean(config.itemColumns?.length) && canAddManualItems,
  })
  const canSaveAndAuditInEditor = canSaveAndAuditCurrentEditor && !isEdit
  const {
    clearSelectedItems,
    handleDragOver,
    itemColumns,
    removeSelectedItems,
    selectedItemIds,
  } = useModuleEditorItems({
    moduleKey,
    config,
    items,
    setItems,
    canManageItems,
    lineItemsLocked,
  })

  return (
    <WorkspaceOverlay
      open={open}
      title={`${isEdit ? '编辑' : '新建'} — ${config.title}`}
      onClose={onClose}
    >
      <Form
        form={form}
        layout="horizontal"
        colon={false}
        labelWrap={false}
        className="editor-form-shell"
      >
        <ModuleEditorFormSection
          config={config}
          moduleKey={moduleKey}
          canSave={canSave}
          canAudit={canSaveAndAuditInEditor}
          saving={saving}
          showActions={!config.itemColumns?.length}
          lineItemsLocked={lineItemsLocked}
          lockedLineItemsNotice={lockedLineItemsNotice}
          onCancel={onClose}
          onSave={handleSave}
        />
      </Form>

      <ModuleEditorItemsSection
        config={config}
        items={items}
        selectedItemIds={selectedItemIds}
        canAddManualItems={canAddManualItems}
        canImportParentItems={canImportParentItems}
        parentImporting={parentImporting}
        parentSelectorOpen={parentSelectorOpen}
        itemColumns={itemColumns}
        canSave={canSave}
        canAudit={canSaveAndAuditInEditor}
        saving={saving}
        onAddItem={addItem}
        onCancel={onClose}
        onSave={handleSave}
        onOpenParentSelector={openParentSelector}
        onCloseParentSelector={closeParentSelector}
        onRemoveSelectedItems={removeSelectedItems}
        onImportParentRecord={(parentRecord) => {
          clearSelectedItems()
          void handleImportParentRecord(parentRecord)
        }}
        onRowDragOver={handleDragOver}
      />
    </WorkspaceOverlay>
  )
}
