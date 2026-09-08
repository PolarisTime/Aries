import { Form, Space, Tag } from 'antd'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useModuleEditorCapabilityFlags } from '@/views/modules/use-module-editor-capability-flags'
import { useModuleEditorExpenseItems } from '@/views/modules/use-module-editor-expense-items'
import { useModuleEditorItemControls } from '@/views/modules/use-module-editor-item-controls'
import { useModuleEditorSettlementAccounts } from '@/views/modules/use-module-editor-settlement-accounts'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'
import { EditorFooterActions } from './EditorFooterActions'
import { ModuleEditorFormArea } from './ModuleEditorFormArea'
import { ModuleEditorItemsSection } from './ModuleEditorItemsSection'
import { SaveResultOverlay } from './SaveResultOverlay'
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

const FINANCE_DOCUMENT_MODULES = new Set(['receipt', 'payment'])

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
  const { t } = useTranslation()
  const [form] = Form.useForm<EditorFormValues>()
  const { finishAndCloseEditor, markEditorDirty, requestCloseEditor } =
    useEditorSessionActions(onClose)
  const watchedSettlementCompanyId = Form.useWatch('settlementCompanyId', form)
  const formFields = config.formFields || []
  const watchedCustomerId = Form.useWatch('customerId', form)
  const { projects: projectOptions } = useMasterOptions(
    resolveMasterOptionRequirements(formFields),
    open,
    typeof watchedCustomerId === 'string' && watchedCustomerId
      ? watchedCustomerId
      : undefined,
  )
  const { materials: masterMaterials } = useMasterOptions(
    { materials: true },
    open,
  )
  const settlementAccountOptions = useModuleEditorSettlementAccounts({
    open,
    enabled: FINANCE_DOCUMENT_MODULES.has(moduleKey),
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
    autoInsertBlankItemOnCreate:
      Boolean(config.itemColumns?.length) && canAddManualItems,
  })
  // oxlint-enable react-doctor/no-event-handler

  useEditorSessionLifecycle({
    open,
    moduleKey,
    isEdit,
    ...(record?.id ? { recordId: String(record.id) } : {}),
    saving,
    saveStatus: saveResult?.status,
    saveErrorCode: saveResult?.errorCode,
  })
  const editorFormValues = Form.useWatch([], form) || {}
  const expense = useModuleEditorExpenseItems({
    masterMaterials,
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
    handleDragOver,
    itemColumns,
    itemTableComponents,
    itemColumnOrder,
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

  const useFinanceEditorLayout = FINANCE_DOCUMENT_MODULES.has(moduleKey)

  return (
    <>
      <WorkspaceOverlay
        open={open}
        title={
          <Space size={8}>
            <span>
              {t('modules.editor.title', {
                mode: isEdit
                  ? t('modules.editor.edit')
                  : t('modules.editor.create'),
                title: config.title,
              })}
            </span>
            {useFinanceEditorLayout ? (
              <Tag color={currentStatus === '已审核' ? 'success' : 'default'}>
                {currentStatus || '草稿'}
              </Tag>
            ) : null}
          </Space>
        }
        onClose={requestCloseEditor}
        className={
          useFinanceEditorLayout
            ? 'workspace-overlay-panel--finance-editor'
            : undefined
        }
        footer={
          useFinanceEditorLayout ? (
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
            visible: !useFinanceEditorLayout && !config.itemColumns?.length,
            onCancel: requestCloseEditor,
            onSave: (audit) => {
              void handleSave(audit)
            },
          }}
          editorState={{ isEdit, lineItemsLocked }}
          lockedLineItemsNotice={lockedLineItemsNotice}
          authoritativePrimaryNo={authoritativePrimaryNo}
          layoutVariant={useFinanceEditorLayout ? 'finance' : 'default'}
          onValuesChange={(changedValues) => {
            handleFormValuesChange(changedValues)
          }}
        />

        <ModuleEditorItemsSection
          config={config}
          items={items}
          expenseItems={expenseItems}
          expenseSelectedItemIds={expense.expenseSelectedItemIds}
          expenseMaterialOptions={expense.expenseMaterialOptions}
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
          showFooterActions={!useFinanceEditorLayout}
          onAddItem={addItem}
          onAutoSortItems={handleAutoSortItems}
          freightStatementSortDirection={freightStatementSortDirection}
          onExpenseSelectedChange={expense.handleExpenseSelectedChange}
          onExpenseSelectAll={expense.handleExpenseSelectAll}
          onExpenseChange={expense.handleExpenseChange}
          onCreateExpense={expense.handleCreateExpense}
          onExpenseAddItem={expense.handleExpenseAddItem}
          onExpenseDelete={expense.handleExpenseDelete}
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
          onRowDragOver={handleDragOver}
        />
      </WorkspaceOverlay>

      {saveResult ? (
        <SaveResultOverlay
          saveResult={saveResult}
          config={config}
          moduleKey={moduleKey}
          canCreateAnother={canCreateAnother}
          resolvingConflict={saving}
          onClear={() => {
            clearSaveResult()
            if (saveResult.status !== 'error') finishAndCloseEditor()
          }}
          onResolveConflict={() => {
            void reloadAfterConflict()
          }}
          onCreateAnother={() => {
            clearSaveResult()
            finishAndCloseEditor()
            onCreateAnother()
          }}
          pendingFiles={resolvePendingAttachmentFiles(
            form.getFieldValue('attachments'),
          )}
        />
      ) : null}
    </>
  )
}
