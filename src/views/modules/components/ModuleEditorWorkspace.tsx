import { Form } from 'antd'
import { useCallback, useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { isConcurrencyRecoveryCode } from '@/api/core/resource-version'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import {
  type EditorSessionStatus,
  useEditorSession,
} from '@/layouts/editor-session/EditorSessionGuard'
import type { ModuleKey } from '@/module-system/core/module-key'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import type {
  ModulePageConfig,
  ModuleParentImportSource,
  ModuleRecordInput,
} from '@/types/module-page'
import type { PersistedModuleEditorDraftFor } from '@/types/module-record'
import {
  type EditorFormValues,
  resolvePendingAttachmentFiles,
} from '@/views/modules/module-editor-workspace-support'
import {
  type RemovedItemsSnapshot,
  restoreRemovedItems,
  useConfirmedItemRemoval,
} from '@/views/modules/use-confirmed-item-removal'
import { useEditorSaveShortcuts } from '@/views/modules/use-editor-save-shortcuts'
import { useModuleEditorCapabilityFlags } from '@/views/modules/use-module-editor-capability-flags'
import { useModuleEditorExpenseItems } from '@/views/modules/use-module-editor-expense-items'
import { useModuleEditorItemControls } from '@/views/modules/use-module-editor-item-controls'
import { useModuleEditorSettlementAccounts } from '@/views/modules/use-module-editor-settlement-accounts'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'
import { resolveItemsEmptyText } from '../module-editor-empty-text'
import { ModuleEditorOverlay } from './ModuleEditorOverlay'
import { ModuleEditorSaveResultHost } from './ModuleEditorSaveResultHost'
import {
  isFinanceDocumentModule,
  resolveEditorCustomerId,
  resolveEditorPresentation,
  resolveEditorSessionIds,
} from './module-editor-workspace-presentation'

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
  /**
   * 会话宿主哨兵节点的 id：只用于在 effect 清理时区分**隐藏**与**卸载**。
   * 隐藏时保留会话槽与其脏状态，真正卸载时才结束会话。
   */
  const sessionSentinelId = useId()

  useEffect(() => {
    if (!open) return
    beginSession({
      moduleKey,
      mode: isEdit ? 'edit' : 'create',
      ...(recordId ? { recordId } : {}),
    })
    return () => {
      if (document.getElementById(sessionSentinelId)) {
        return
      }
      endSession()
    }
  }, [
    beginSession,
    endSession,
    isEdit,
    moduleKey,
    open,
    recordId,
    sessionSentinelId,
  ])

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
      isConcurrencyRecoveryCode(saveErrorCode)
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

  return { sessionSentinelId }
}

/**
 * 模块编辑器工作区（会话生命周期、表单状态与保存回执宿主）。
 *
 * <p>打开态弹层与多步向导交互抽至 {@link ModuleEditorOverlay}，保证本组件职责清晰、
 * 弹层关闭重开时向导自然复位。</p>
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
  const { t } = useTranslation()
  const wizardFocusRef = useRef<((fieldKey: string) => void) | null>(null)
  const sessionIds = resolveEditorSessionIds(record)
  const editorActionPlacement = useUiSettingsStore(
    (state) => state.settings?.editorActionPlacement ?? 'top',
  )
  const presentation = resolveEditorPresentation(config, moduleKey, {
    actionPlacement: editorActionPlacement,
  })
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
    canReorderItems,
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

  const handleValidationFieldError = useCallback(
    (fieldKey: string) => {
      if (wizardFocusRef.current) {
        wizardFocusRef.current(fieldKey)
        return
      }
      form.focusField(fieldKey)
    },
    [form],
  )

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
    onValidationFieldError: handleValidationFieldError,
  })
  // oxlint-enable react-doctor/no-event-handler

  const editorBusy = saving || parentImporting

  useEditorSaveShortcuts({
    enabled: open,
    canSave,
    canAudit: canSaveAndAuditInEditor,
    saving: editorBusy,
    onSave: (audit) => {
      void handleSave(audit)
    },
  })

  const { sessionSentinelId } = useEditorSessionLifecycle({
    open,
    moduleKey,
    isEdit,
    ...sessionIds,
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
  const itemControls = useModuleEditorItemControls({
    moduleKey,
    config,
    items,
    setItems,
    editorFormValues,
    canManageItems,
    canReorderItems,
    canAddManualItems,
    canSave,
    saving,
    lineItemsLocked,
    canEditItemColumns,
    recordStatus: String(record?.status ?? ''),
  })

  const itemsEmptyText = resolveItemsEmptyText({
    canAddManualItems: itemControls.canAddManualItemsForCurrentRecord,
    importActionLabel: config.parentImport?.buttonText,
    t,
  })

  const removeSelectedItems = useConfirmedItemRemoval({
    items,
    selectedItemIds: itemControls.selectedItemIds,
    onConfirmDelete: itemControls.removeSelectedItems,
    onRestore: (snapshot: RemovedItemsSnapshot) =>
      setItems((current) => restoreRemovedItems(current, snapshot)),
  })

  return (
    <>
      <span id={sessionSentinelId} hidden aria-hidden="true" />
      {open ? (
        <ModuleEditorOverlay
          config={config}
          moduleKey={moduleKey}
          form={form}
          record={record as ModuleRecordInput | null}
          recordId={sessionIds.recordId}
          isEdit={isEdit}
          currentStatus={currentStatus}
          presentation={presentation}
          canSave={canSave}
          canAudit={canSaveAndAuditInEditor}
          auditLabel={editorAuditLabel}
          editorBusy={editorBusy}
          lineItemsLocked={lineItemsLocked}
          lockedLineItemsNotice={lockedLineItemsNotice}
          authoritativePrimaryNo={authoritativePrimaryNo}
          projectOptions={projectOptions}
          settlementAccountOptions={settlementAccountOptions}
          editorFormValues={editorFormValues}
          items={items}
          expenseItems={expenseItems}
          expense={expense}
          itemControls={itemControls}
          itemsEmptyText={itemsEmptyText}
          parentImporting={parentImporting}
          parentSelectorDisplayFieldKey={parentSelectorDisplayFieldKey}
          parentSelectorFilters={parentSelectorFilters}
          parentSelectorModuleKey={parentSelectorModuleKey}
          parentSelectorOpen={parentSelectorOpen}
          wizardFocusRef={wizardFocusRef}
          onRequestClose={requestCloseEditor}
          onSave={(audit) => {
            void handleSave(audit)
          }}
          onFormValuesChange={handleFormValuesChange}
          onSetItems={setItems}
          onAddItem={addItem}
          onOpenParentSelector={openParentSelector}
          onCloseParentSelector={closeParentSelector}
          onRemoveSelectedItems={removeSelectedItems}
          onImportParentRecord={handleImportParentRecord}
        />
      ) : null}

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
