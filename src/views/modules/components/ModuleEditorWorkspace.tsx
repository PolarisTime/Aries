import { Form } from 'antd'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
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
import { EditorFooterActions } from './EditorFooterActions'
import { ModuleEditorExtras } from './ModuleEditorExtras'
import { ModuleEditorFormArea } from './ModuleEditorFormArea'
import { ModuleEditorItemsArea } from './ModuleEditorItemsArea'
import { ModuleEditorSaveResultHost } from './ModuleEditorSaveResultHost'
import { ModuleEditorTopActions } from './ModuleEditorTopActions'
import { ModuleEditorWorkspaceTitle } from './ModuleEditorWorkspaceTitle'
import { ModuleItemsToolbarActions } from './ModuleItemsToolbarActions'
import { buildModuleItemsActions } from './module-editor-items-actions'
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
  /**
   * 会话宿主哨兵节点的 id：只用于在 effect 清理时区分**隐藏**与**卸载**。
   *
   * <p>React 19 的 `Activity` 隐藏面板时用 `display:none` 隐藏子树、销毁子树 effect，
   * **并把子树里 host node 的 ref 置空**（实测 `ref.current === null`），但 DOM 节点仍在文档里；
   * 真正卸载（关闭编辑器、刷新标签、路由换页、标签被回收）时节点已从文档移除。
   * 因此不能用 ref 判断，只能用「哨兵节点还在不在文档里」判断。`useId()` 是组件 state，
   * 隐藏时保留、卸载时随实例销毁，正好做这个身份标记。</p>
   *
   * <p>这条判定的意义：隐藏不得结束会话，否则恢复后脏状态被重置为 clean，
   * 关闭标签的「存在未保存的修改」守卫就失效了（e2e P2-25 第 4 步会变红）。</p>
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
        // 只是被隐藏（Activity hidden）：保留会话槽与其状态。
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

  /*
   * 编辑器忙态：保存与上游导入共用同一把 in-flight 锁。
   *
   * <p>导入进行中若还允许保存，保存载荷取自导入前的 items，服务端会先落一份
   * 「没有导入行」的单据；导入随后完成又置脏，用户以为已保存、其实还要再存一次。
   * 取消与 Ctrl+S 同频禁用，避免同一段异步链路里出现第二份草稿快照。</p>
   */
  const editorBusy = saving || parentImporting

  // Ctrl/Cmd+S 保存、Ctrl/Cmd+Shift+S 保存并审核；保存中/导入中/只读/无权限时忽略。
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
    removeSelectedItems: removeSelectedItemsDirectly,
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
    canReorderItems,
    canAddManualItems,
    canSave,
    saving,
    lineItemsLocked,
    canEditItemColumns,
  })

  /* 删除选中：二次确认 + toast 撤销（P1-4）。唯一实现见 use-confirmed-item-removal。 */
  const removeSelectedItems = useConfirmedItemRemoval({
    items,
    selectedItemIds,
    onConfirmDelete: removeSelectedItemsDirectly,
    onRestore: (snapshot: RemovedItemsSnapshot) =>
      setItems((current) => restoreRemovedItems(current, snapshot)),
  })

  /*
   * 顶部操作栏：工具动作（新增明细/导入/列设置/自动排序/删除选中）靠左，
   * 单据级动作（取消/保存/保存并审核）靠右。两组都由**这里**构建 ——
   * 明细区不再自己渲染工具栏，避免同一批按钮出现两个出口。
   */
  const [itemColumnSettingsOpen, setItemColumnSettingsOpen] = useState(false)
  const itemsToolbarActions = config.itemColumns?.length ? (
    <ModuleItemsToolbarActions
      capabilities={{
        addManualItems: canAddManualItemsForCurrentRecord,
        importParentItems: canImportParentItems,
        autoSortItems: canAutoSortItems,
        save: canSave,
        audit: canSaveAndAuditInEditor,
      }}
      columnSettingsOpen={itemColumnSettingsOpen}
      config={config}
      extraActions={buildModuleItemsActions({
        open,
        moduleKey,
        config,
        currentStatus,
        formValues: editorFormValues,
        items,
        setItems,
        setFormValue: (key, value) => form.setFieldValue(key, value),
        saving: editorBusy,
        projectOptions,
      })}
      freightStatementSortDirection={freightStatementSortDirection}
      itemColumnOrder={itemColumnOrder}
      onAddItem={addItem}
      onAutoSortItems={handleAutoSortItems}
      onColumnSettingsOpenChange={setItemColumnSettingsOpen}
      onItemColumnOrderChange={onItemColumnOrderChange}
      onOpenParentSelector={openParentSelector}
      onRemoveSelectedItems={removeSelectedItems}
      onToggleItemColumn={toggleItemColumn}
      parentImportVisible={parentImportVisible}
      parentImporting={parentImporting}
      saving={editorBusy}
      selectedItemCount={selectedItemIds.length}
      visibleItemColumnKeys={visibleItemColumnKeys}
    />
  ) : undefined

  return (
    <>
      {/* 会话宿主哨兵：见 useEditorSessionLifecycle 里的 sessionSentinelId。
          本身 hidden、不承载任何子节点，因此不参与布局、不进无障碍树；
          只用来在 effect 清理时判断「子树被 Activity 隐藏（节点还在文档里）」还是「真的卸载」。 */}
      <span id={sessionSentinelId} hidden aria-hidden="true" />
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
      >
        <ModuleEditorTopActions
          tools={itemsToolbarActions}
          actions={
            presentation.formActionsVisible ||
            presentation.overlayFooterVisible ||
            itemsToolbarActions ? (
              <EditorFooterActions
                canSave={canSave}
                canAudit={canSaveAndAuditInEditor}
                auditLabel={editorAuditLabel}
                saving={editorBusy}
                onCancel={requestCloseEditor}
                onSave={(audit) => {
                  void handleSave(audit)
                }}
              />
            ) : undefined
          }
        />
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
            saving: editorBusy,
            // 单据级动作已统一到顶部操作栏，表单头不再重复渲染一份
            visible: false,
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

        {/* 编辑器附加节点（模块配置可选的 renderEditorExtras）：只读派生展示，不写单据数据。 */}
        <ModuleEditorExtras
          config={config}
          // 主流程编辑器的精确草稿类型（items 带模块私有字段）只在会话/保存链路内需要；
          // 附加节点按通用契约（ModuleRecordInput）消费，这里做一次边界收窄。
          record={record as ModuleRecordInput | null}
          form={form}
          formValues={editorFormValues}
          items={items}
          expenseItems={expenseItems}
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
          saving={editorBusy}
          // 工具栏与单据级动作都移到顶部操作栏，明细区不再渲染
          showFooterActions={false}
          showItemsToolbar={false}
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
            // 返回 Promise：选单弹层据此保持打开+锁定，直到导入真正回填完成。
            return handleImportParentRecord(parentRecords)
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
