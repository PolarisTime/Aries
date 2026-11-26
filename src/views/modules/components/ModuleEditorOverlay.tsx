import type { FormInstance } from 'antd'
import type { ComponentProps, Dispatch, RefObject, SetStateAction } from 'react'
import { useEffect, useRef } from 'react'
import type { ProjectOption } from '@/api/master/project-options'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { SearchParams } from '@/types/api-raw'
import type { ModulePageConfig } from '@/types/module-page'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'
import type { EditorFormValues } from '@/views/modules/module-editor-workspace-support'
import { useEditorWizard } from '@/views/modules/use-editor-wizard'
import type { useModuleEditorExpenseItems } from '@/views/modules/use-module-editor-expense-items'
import type { useModuleEditorItemControls } from '@/views/modules/use-module-editor-item-controls'
import { EditorFooterActions } from './EditorFooterActions'
import { EditorWizardFooter } from './EditorWizardFooter'
import { ModuleEditorExtras } from './ModuleEditorExtras'
import { ModuleEditorFormArea } from './ModuleEditorFormArea'
import { ModuleEditorItemsArea } from './ModuleEditorItemsArea'
import { ModuleEditorWorkspaceTitle } from './ModuleEditorWorkspaceTitle'
import type { EditorPresentation } from './module-editor-workspace-presentation'
import { WorkspaceOverlay } from './WorkspaceOverlay'

type ItemsAreaProps = ComponentProps<typeof ModuleEditorItemsArea>

interface Props {
  config: ModulePageConfig
  moduleKey: ModuleKey
  form: FormInstance<EditorFormValues>
  record: EditorFormValues | null
  recordId?: string
  isEdit: boolean
  currentStatus: string
  presentation: EditorPresentation
  canSave: boolean
  canAudit: boolean
  auditLabel?: string
  editorBusy: boolean
  lineItemsLocked: boolean
  lockedLineItemsNotice: string
  authoritativePrimaryNo?: string
  projectOptions: ProjectOption[]
  settlementAccountOptions: readonly {
    label: string
    value: string | number | boolean
  }[]
  editorFormValues: EditorFormValues
  items: ItemsAreaProps['items']
  expenseItems: DocumentChargeItemDraft[]
  expense: ReturnType<typeof useModuleEditorExpenseItems>
  itemControls: ReturnType<typeof useModuleEditorItemControls>
  itemsEmptyText: string | undefined
  parentImporting: boolean
  parentSelectorDisplayFieldKey?: string
  parentSelectorFilters: SearchParams
  parentSelectorModuleKey?: ModuleKey
  parentSelectorOpen: boolean
  wizardFocusRef: RefObject<((fieldKey: string) => void) | null>
  onRequestClose: () => void
  onSave: (audit: boolean) => void
  onFormValuesChange: (changedValues: Record<string, unknown>) => void
  onSetItems: Dispatch<SetStateAction<ItemsAreaProps['items']>>
  onAddItem: () => void
  onOpenParentSelector: () => void
  onCloseParentSelector: () => void
  onRemoveSelectedItems: () => void
  onImportParentRecord: ItemsAreaProps['onImportParentRecord']
}

/**
 * 打开态编辑器弹层内容与向导控制器。
 *
 * <p>仅在 `open === true` 时挂载：关闭弹层即卸载，重新打开时向导自然回到第 1 步，
 * 无需在 effect 里按 `open` 重置状态；React 19 `Activity` 隐藏标签时 `open` 仍为 `true`，
 * 本组件不卸载，当前步骤得以保留。</p>
 */
export function ModuleEditorOverlay({
  config,
  moduleKey,
  form,
  record,
  recordId,
  isEdit,
  currentStatus,
  presentation,
  canSave,
  canAudit,
  auditLabel,
  editorBusy,
  lineItemsLocked,
  lockedLineItemsNotice,
  authoritativePrimaryNo,
  projectOptions,
  settlementAccountOptions,
  editorFormValues,
  items,
  expenseItems,
  expense,
  itemControls,
  itemsEmptyText,
  parentImporting,
  parentSelectorDisplayFieldKey,
  parentSelectorFilters,
  parentSelectorModuleKey,
  parentSelectorOpen,
  wizardFocusRef,
  onRequestClose,
  onSave,
  onFormValuesChange,
  onSetItems,
  onAddItem,
  onOpenParentSelector,
  onCloseParentSelector,
  onRemoveSelectedItems,
  onImportParentRecord,
}: Props) {
  const overlayBodyRef = useRef<HTMLDivElement | null>(null)
  const wizard = useEditorWizard({
    config,
    moduleKey,
    recordId,
    isEdit,
    form,
    overlayBodyRef,
  })

  useEffect(() => {
    wizardFocusRef.current = wizard.focusInvalidField
    return () => {
      wizardFocusRef.current = null
    }
  }, [wizard.focusInvalidField, wizardFocusRef])

  const footer = presentation.wizardFooterVisible ? (
    <EditorWizardFooter
      currentStep={wizard.currentStep}
      totalSteps={wizard.totalSteps}
      isEdit={isEdit}
      canSave={canSave}
      canAudit={canAudit}
      auditLabel={auditLabel}
      saving={editorBusy}
      onPrevious={wizard.goPrevious}
      onNext={wizard.goNext}
      onCancel={onRequestClose}
      onSave={onSave}
    />
  ) : presentation.overlayFooterVisible ? (
    <EditorFooterActions
      canSave={canSave}
      canAudit={canAudit}
      auditLabel={auditLabel}
      saving={editorBusy}
      onCancel={onRequestClose}
      onSave={onSave}
    />
  ) : undefined

  return (
    <WorkspaceOverlay
      open
      title={
        <ModuleEditorWorkspaceTitle
          config={config}
          currentStatus={currentStatus}
          financeLayout={presentation.financeLayout}
          isEdit={isEdit}
        />
      }
      onClose={onRequestClose}
      className={presentation.overlayClassName}
      bodyRef={overlayBodyRef}
      footer={footer}
    >
      <ModuleEditorFormArea
        form={form}
        config={config}
        moduleKey={moduleKey}
        projectOptions={projectOptions}
        settlementAccountOptions={settlementAccountOptions}
        auditLabel={auditLabel}
        actions={{
          canSave,
          canAudit,
          saving: editorBusy,
          visible: presentation.formActionsVisible,
          onCancel: onRequestClose,
          onSave,
        }}
        editorState={{ isEdit, lineItemsLocked }}
        lockedLineItemsNotice={lockedLineItemsNotice}
        authoritativePrimaryNo={authoritativePrimaryNo}
        recordId={recordId}
        layoutVariant={presentation.layoutVariant}
        wizard={
          wizard.isWizard
            ? {
                currentStep: wizard.currentStep,
                onStepChange: (next) => {
                  void wizard.goToStep(next)
                },
                hideInlineNav: presentation.wizardFooterVisible,
              }
            : undefined
        }
        onValuesChange={onFormValuesChange}
      />

      {/* 编辑器附加节点（模块配置可选的 renderEditorExtras）：只读派生展示，不写单据数据。 */}
      <ModuleEditorExtras
        config={config}
        record={record}
        form={form}
        formValues={editorFormValues}
        items={items}
        expenseItems={expenseItems}
      />

      <ModuleEditorItemsArea
        open
        moduleKey={moduleKey}
        config={config}
        items={items}
        expenseItems={expenseItems}
        expense={expense}
        supportsExpenseTab={itemControls.supportsExpenseTab}
        selectedItemIds={itemControls.selectedItemIds}
        parentImportVisible={itemControls.parentImportVisible}
        parentImporting={parentImporting}
        parentSelectorDisplayFieldKey={parentSelectorDisplayFieldKey}
        parentSelectorFilters={parentSelectorFilters}
        parentSelectorModuleKey={parentSelectorModuleKey}
        parentSelectorOpen={parentSelectorOpen}
        itemColumns={itemControls.itemColumns}
        itemRowSelection={itemControls.itemRowSelection}
        itemsEmptyText={itemsEmptyText}
        itemTableComponents={itemControls.itemTableComponents}
        itemColumnOrder={itemControls.itemColumnOrder}
        itemRowMenus={itemControls.itemRowMenus}
        visibleItemColumnKeys={itemControls.visibleItemColumnKeys}
        capabilities={{
          addManualItems: itemControls.canAddManualItemsForCurrentRecord,
          importParentItems: itemControls.canImportParentItems,
          autoSortItems: itemControls.canAutoSortItems,
          save: canSave,
          audit: canAudit,
        }}
        auditLabel={auditLabel}
        saving={editorBusy}
        showFooterActions={!presentation.overlayFooterVisible}
        currentStatus={currentStatus}
        formValues={editorFormValues}
        projectOptions={projectOptions}
        setItems={onSetItems}
        setFormValue={(key, value) => form.setFieldValue(key, value)}
        freightStatementSortDirection={
          itemControls.freightStatementSortDirection
        }
        onAddItem={onAddItem}
        onAutoSortItems={itemControls.handleAutoSortItems}
        onCancel={onRequestClose}
        onSave={onSave}
        onOpenParentSelector={onOpenParentSelector}
        onCloseParentSelector={onCloseParentSelector}
        onRemoveSelectedItems={onRemoveSelectedItems}
        onImportParentRecord={(parentRecords) => {
          itemControls.clearSelectedItems()
          return onImportParentRecord(parentRecords)
        }}
        onItemColumnOrderChange={itemControls.onItemColumnOrderChange}
        onToggleItemColumn={itemControls.toggleItemColumn}
        onItemsReorder={itemControls.handleRowReorder}
      />
    </WorkspaceOverlay>
  )
}
