import { Form } from 'antd'
import { useCallback, useEffect, useRef } from 'react'
import { ERROR_CODE } from '@/constants/error-codes'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import {
  type EditorSessionStatus,
  useEditorSession,
} from '@/layouts/editor-session/EditorSessionGuard'
import type { ModuleKey } from '@/module-system/core/module-key'
import type {
  ModulePageConfig,
  ModuleParentImportSource,
} from '@/types/module-page'
import type { PersistedModuleEditorDraftFor } from '@/types/module-record'
import {
  type EditorFormValues,
  resolvePendingAttachmentFiles,
} from '@/views/modules/module-editor-workspace-support'
import { useEditorSaveShortcuts } from '@/views/modules/use-editor-save-shortcuts'
import { useModuleEditorCapabilityFlags } from '@/views/modules/use-module-editor-capability-flags'
import { useModuleEditorExpenseItems } from '@/views/modules/use-module-editor-expense-items'
import { useModuleEditorItemControls } from '@/views/modules/use-module-editor-item-controls'
import { useModuleEditorSettlementAccounts } from '@/views/modules/use-module-editor-settlement-accounts'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'
import { EditorFooterActions } from './EditorFooterActions'
import { ModuleEditorFormArea } from './ModuleEditorFormArea'
import { ModuleEditorItemsArea } from './ModuleEditorItemsArea'
import { ModuleEditorSaveResultHost } from './ModuleEditorSaveResultHost'
import { ModuleEditorWorkspaceTitle } from './ModuleEditorWorkspaceTitle'
import {
  isFinanceDocumentModule,
  resolveEditorCustomerId,
  resolveEditorPresentation,
  resolveEditorSessionIds,
  shouldAutoInsertBlankItemOnCreate,
} from './module-editor-workspace-presentation'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props<Key extends ModuleKey> {
  open: boolean
  config: ModulePageConfig
  record: PersistedModuleEditorDraftFor<Key> | null
  initialParentImportSource: ModuleParentImportSource | null
  initialEditorValues?: Record<string, unknown> | null
  moduleKey: Key
  canSave: boolean
  canAudit: boolean
  canCreateAnother: boolean
  lineItemsLocked?: boolean
  lockedLineItemsNotice?: string
  onClose: () => void
  onSaved: () => void
  onCreateAnother: () => void
}

function useEditorSessionActions(onClose: () => void) {
  const { endSession, requestClose, setSessionStatus } = useEditorSession()
  const markEditorDirty = useCallback(() => {
    setSessionStatus('dirty')
  }, [setSessionStatus])
  const finishAndCloseEditor = useCallback(() => {
    endSession()
    onClose()
  }, [endSession, onClose])
  const requestCloseEditor = useCallback(() => {
    requestClose(onClose)
  }, [onClose, requestClose])

  return { finishAndCloseEditor, markEditorDirty, requestCloseEditor }
}

interface EditorSessionLifecycleOptions {
  open: boolean
  moduleKey: string
  isEdit: boolean
  recordId?: string
  saving: boolean
  saveStatus?: 'success' | 'error' | 'warning'
  saveErrorCode?: number
}

function useEditorSessionLifecycle({
  open,
  moduleKey,
  isEdit,
  recordId,
  saving,
  saveStatus,
  saveErrorCode,
}: EditorSessionLifecycleOptions) {
  const { beginSession, endSession, setSessionStatus } = useEditorSession()
  const wasSavingRef = useRef(false)

  useEffect(() => {
    if (!open) return
    beginSession({
      moduleKey,
      mode: isEdit ? 'edit' : 'create',
      ...(recordId ? { recordId } : {}),
    })
    return endSession
  }, [beginSession, endSession, isEdit, moduleKey, open, recordId])

  useEffect(() => {
    if (!open) return
    let nextStatus: EditorSessionStatus | null = null
    if (saving) {
      wasSavingRef.current = true
      nextStatus = 'submitting'
    } else if (saveStatus === 'success') {
      wasSavingRef.current = false
      nextStatus = 'clean'
    } else if (
      saveStatus === 'error' &&
      saveErrorCode === ERROR_CODE.CONCURRENT_MODIFICATION
    ) {
      wasSavingRef.current = false
      nextStatus = 'conflict'
    } else if (saveStatus === 'error') {
      wasSavingRef.current = false
      nextStatus = 'dirty'
    } else if (wasSavingRef.current) {
      wasSavingRef.current = false
      nextStatus = 'dirty'
    }
    if (nextStatus) setSessionStatus(nextStatus)
  }, [open, saveErrorCode, saveStatus, saving, setSessionStatus])
}

/**
 * 模块编辑器工作区（弹层外壳）。
 *
 * <p>本轮重构把外壳里三块内容移出本组件：标题抽到 ModuleEditorWorkspaceTitle，
 * 保存回执宿主抽到 ModuleEditorSaveResultHost，布局/客户 id/会话 id 等纯判断抽到
 * module-editor-workspace-presentation.ts。原因：本组件同时在 no-giant-component
 * (>300 行) 与 no-high-complexity-react-function 名单里，而这三块恰好既有分支又占行数。
 * 弹层结构、子组件 props、快捷键与编辑会话语义保持不变。</p>
 */
export function ModuleEditorWorkspace<Key extends ModuleKey>({
  open,
  config,
  record,
  initialParentImportSource,
  initialEditorValues = null,
  moduleKey,
  canSave,
  canAudit,
  canCreateAnother,
  lineItemsLocked = false,
  lockedLineItemsNotice = '',
  onClose,
  onSaved,
  onCreateAnother,
}: Props<Key>) {
  const [form] = Form.useForm<EditorFormValues>()
  const presentation = resolveEditorPresentation(config, moduleKey)
  const { finishAndCloseEditor, markEditorDirty, requestCloseEditor } =
    useEditorSessionActions(onClose)
  const watchedSettlementCompanyId = Form.useWatch('settlementCompanyId', form)
  const formFields = config.formFields || []
  const watchedCustomerId = Form.useWatch('customerId', form)
  const { projects: projectOptions } = useMasterOptions(
    resolveMasterOptionRequirements(formFields),
    open,
    resolveEditorCustomerId(watchedCustomerId),
  )
  const settlementAccountOptions = useModuleEditorSettlementAccounts({
    open,
    enabled: isFinanceDocumentModule(moduleKey),
    settlementCompanyId: watchedSettlementCompanyId,
  })

  const {
    canAddManualItems,
    canEditItemColumns,
    canManageItems,
    canSaveAndAuditInEditor,
    currentStatus,
    editorAuditActionKind,
    editorAuditLabel,
    editorAuditTarget,
  } = useModuleEditorCapabilityFlags({
    moduleKey,
    config,
    formFields,
    record,
    lineItemsLocked,
    canSave,
    canAudit,
  })

  // oxlint-disable react-doctor/no-event-handler -- These callbacks configure the editor hook; no effect is acting as a UI event.
  const {
    addItem,
    clearSaveResult,
    closeParentSelector,
    handleImportParentRecord,
    handleFormValuesChange,
    handleSave,
    isEdit,
    items,
    openParentSelector,
    parentImporting,
    parentSelectorDisplayFieldKey,
    parentSelectorFilters,
    parentSelectorModuleKey,
    parentSelectorOpen,
    authoritativePrimaryNo,
    saveResult,
    reloadAfterConflict,
    saving,
    setItems,
    expenseItems,
    updateExpenseItems,
  } = useModuleEditorWorkspace({
    open,
    config,
    record,
    initialParentImportSource,
    initialEditorValues,
    moduleKey,
    editorAuditActionKind,
    editorAuditTarget,
    form,
    onClose: finishAndCloseEditor,
    onDirty: markEditorDirty,
    onSaved,
    autoInsertBlankItemOnCreate: shouldAutoInsertBlankItemOnCreate(
      config,
      canAddManualItems,
    ),
  })
  // oxlint-enable react-doctor/no-event-handler

  // Ctrl/Cmd+S 保存、Ctrl/Cmd+Shift+S 保存并审核；保存中/只读/无权限时忽略。
  useEditorSaveShortcuts({
    enabled: open,
    canSave,
    canAudit: canSaveAndAuditInEditor,
    saving,
    onSave: (audit) => {
      void handleSave(audit)
    },
  })

  useEditorSessionLifecycle({
    open,
    moduleKey,
    isEdit,
    ...resolveEditorSessionIds(record),
    saving,
    saveStatus: saveResult?.status,
    saveErrorCode: saveResult?.errorCode,
  })
  const editorFormValues = Form.useWatch([], form) || {}
  const expense = useModuleEditorExpenseItems({
    open,
    expenseItems,
    updateExpenseItems,
  })
  const {
    canAddManualItemsForCurrentRecord,
    canAutoSortItems,
    canImportParentItems,
    freightStatementSortDirection,
    handleAutoSortItems,
    parentImportVisible,
    supportsExpenseTab,
    clearSelectedItems,
    handleRowReorder,
    itemColumns,
    itemTableComponents,
    itemColumnOrder,
    itemRowMenus,
    onItemColumnOrderChange,
    removeSelectedItems,
    selectedItemIds,
    toggleItemColumn,
    visibleItemColumnKeys,
  } = useModuleEditorItemControls({
    moduleKey,
    config,
    items,
    setItems,
    editorFormValues,
    canManageItems,
    canAddManualItems,
    canSave,
    saving,
    lineItemsLocked,
    canEditItemColumns,
  })

  return (
    <>
      <WorkspaceOverlay
        open={open}
        title={
          <ModuleEditorWorkspaceTitle
            config={config}
            currentStatus={currentStatus}
            financeLayout={presentation.financeLayout}
            isEdit={isEdit}
          />
        }
        onClose={requestCloseEditor}
        className={presentation.overlayClassName}
        footer={
          presentation.showFooterActions ? (
            <EditorFooterActions
              canSave={canSave}
              canAudit={canSaveAndAuditInEditor}
              auditLabel={editorAuditLabel}
              saving={saving}
              onCancel={requestCloseEditor}
              onSave={(audit) => {
                void handleSave(audit)
              }}
            />
          ) : undefined
        }
      >
        <ModuleEditorFormArea
          form={form}
          config={config}
          moduleKey={moduleKey}
          projectOptions={projectOptions}
          settlementAccountOptions={settlementAccountOptions}
          auditLabel={editorAuditLabel}
          actions={{
            canSave,
            canAudit: canSaveAndAuditInEditor,
            saving,
            visible: presentation.formActionsVisible,
            onCancel: requestCloseEditor,
            onSave: (audit) => {
              void handleSave(audit)
            },
          }}
          editorState={{ isEdit, lineItemsLocked }}
          lockedLineItemsNotice={lockedLineItemsNotice}
          authoritativePrimaryNo={authoritativePrimaryNo}
          layoutVariant={presentation.layoutVariant}
          onValuesChange={(changedValues) => {
            handleFormValuesChange(changedValues)
          }}
        />

        <ModuleEditorItemsArea
          open={open}
          moduleKey={moduleKey}
          config={config}
          items={items}
          expenseItems={expenseItems}
          expense={expense}
          supportsExpenseTab={supportsExpenseTab}
          selectedItemIds={selectedItemIds}
          parentImportVisible={parentImportVisible}
          parentImporting={parentImporting}
          parentSelectorDisplayFieldKey={parentSelectorDisplayFieldKey}
          parentSelectorFilters={parentSelectorFilters}
          parentSelectorModuleKey={parentSelectorModuleKey}
          parentSelectorOpen={parentSelectorOpen}
          itemColumns={itemColumns}
          itemTableComponents={itemTableComponents}
          itemColumnOrder={itemColumnOrder}
          itemRowMenus={itemRowMenus}
          visibleItemColumnKeys={visibleItemColumnKeys}
          capabilities={{
            addManualItems: canAddManualItemsForCurrentRecord,
            importParentItems: canImportParentItems,
            autoSortItems: canAutoSortItems,
            save: canSave,
            audit: canSaveAndAuditInEditor,
          }}
          auditLabel={editorAuditLabel}
          saving={saving}
          showFooterActions={!presentation.financeLayout}
          currentStatus={currentStatus}
          formValues={editorFormValues}
          projectOptions={projectOptions}
          setItems={setItems}
          setFormValue={(key, value) => form.setFieldValue(key, value)}
          freightStatementSortDirection={freightStatementSortDirection}
          onAddItem={addItem}
          onAutoSortItems={handleAutoSortItems}
          onCancel={requestCloseEditor}
          onSave={(audit) => {
            void handleSave(audit)
          }}
          onOpenParentSelector={openParentSelector}
          onCloseParentSelector={closeParentSelector}
          onRemoveSelectedItems={removeSelectedItems}
          onImportParentRecord={(parentRecords) => {
            clearSelectedItems()
            void handleImportParentRecord(parentRecords)
          }}
          onItemColumnOrderChange={onItemColumnOrderChange}
          onToggleItemColumn={toggleItemColumn}
          onItemsReorder={handleRowReorder}
        />
      </WorkspaceOverlay>

      <ModuleEditorSaveResultHost
        saveResult={saveResult}
        config={config}
        moduleKey={moduleKey}
        canCreateAnother={canCreateAnother}
        resolvingConflict={saving}
        onClearSaveResult={clearSaveResult}
        onCloseEditor={finishAndCloseEditor}
        onResolveConflict={() => {
          void reloadAfterConflict()
        }}
        onCreateAnother={onCreateAnother}
        resolvePendingFiles={() =>
          resolvePendingAttachmentFiles(form.getFieldValue('attachments'))
        }
      />
    </>
  )
}
