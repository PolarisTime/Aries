import { updateBusinessModuleStatus } from '@/api/business/business-crud'
import { useBusinessGridBatchActions } from '@/hooks/useBusinessGridBatchActions'
import { useBusinessGridCustomerActions } from '@/hooks/useBusinessGridCustomerActions'
import { useBusinessGridCustomerProjectActions } from '@/hooks/useBusinessGridCustomerProjectActions'
import { useBusinessGridFreightActions } from '@/hooks/useBusinessGridFreightActions'
import { useBusinessGridPrintActions } from '@/hooks/useBusinessGridPrintActions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { useModuleEditorCapabilities } from '@/hooks/useModuleEditorCapabilities'
import { useModuleRecordActions } from '@/hooks/useModuleRecordActions'
import { useModuleToolbarActions } from '@/hooks/useModuleToolbarActions'
import {
  canAuditFromStatus,
  resolveReverseAuditTargetForStatus,
  resolveStatusChangeActionKind,
  resolveStatusOptions,
} from '@/module-system/adapter/module-adapter-actions'
import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import { getModuleStatusCommand } from '@/module-system/behavior/module-page-behaviors'
import type { ModuleKey } from '@/module-system/core/module-key'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
import { isDeletedModuleRecord } from '@/module-system/record/module-record-deletion'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
  ModuleParentImportSource,
  ModuleRecord,
} from '@/types/module-page'
import type {
  ModuleListRecordFor,
  PersistedModuleEditorDraftFor,
} from '@/types/module-record'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

interface OpenEditorOptions {
  parentImportSource?: ModuleParentImportSource | null
  initialValues?: Record<string, unknown>
}

interface Props {
  moduleKey: ModuleKey
  config: ModulePageConfig | undefined
  toolbarConfig: ModulePageConfig
  selectedRowKeys: string[]
  selectedRecords: ModuleRecord[]
  submittedFilters: SearchParams
  attachmentCounts: Record<string, number>
  canCreateRecord: boolean
  canUpdateRecord: boolean
  canDeleteRecord: boolean
  canAuditRecord: boolean
  canPrintRecord: boolean
  refreshModuleQueries: () => Promise<void>
  clearSelection: () => void
  handleExport: () => Promise<void>
  editRecord: PersistedModuleEditorDraftFor<ModuleKey> | null
  editorLockRelatedRows: ModuleListRecordFor<ModuleKey>[]
  openEditor: (
    record: ModuleListRecordFor<ModuleKey> | null,
    options?: OpenEditorOptions,
  ) => Promise<void>
  openAttachment: (record: ModuleRecord) => void
  recordDetailAction: ((record: ModuleRecord) => void) | undefined
}

export function useBusinessGridActions({
  moduleKey,
  config,
  toolbarConfig,
  selectedRowKeys,
  selectedRecords,
  submittedFilters,
  attachmentCounts,
  canCreateRecord,
  canUpdateRecord,
  canDeleteRecord,
  canAuditRecord,
  canPrintRecord,
  refreshModuleQueries,
  clearSelection,
  handleExport,
  editRecord,
  editorLockRelatedRows,
  openEditor,
  openAttachment,
  recordDetailAction,
}: Props) {
  const { formatCellValue } = useModuleDisplaySupport()

  const formFields = config?.formFields || []
  const statusFields = [...formFields, ...(config?.filters || [])]
  const {
    canUseBulkAuditAction,
    canUseBulkReverseAuditAction,
    canUseBulkDeleteActions,
    canUseBulkPrintActions,
    lineItemsLocked: editorLineItemsLocked,
    listAuditActionKind,
    listAuditTarget,
    listReverseAuditActionKind,
    listReverseAuditTarget,
    listAuditSourceStatuses,
  } = useModuleEditorCapabilities({
    moduleKey,
    formFields,
    listStatusFields: statusFields,
    lineItemLockRelatedRows: editorLockRelatedRows,
    currentStatus: editRecord?.status ? asString(editRecord.status) : undefined,
    canEditLineItems: canUpdateRecord,
    canSaveCurrentEditor: canCreateRecord || canUpdateRecord,
    canAuditRecords: canAuditRecord,
    canPrintRecords: canPrintRecord,
    canDeleteRecords: canDeleteRecord,
    isReadOnly: Boolean(config?.readOnly),
    resolveModuleStatusOptions: (statusField) => {
      if (!Array.isArray(statusField?.options)) return []
      return resolveStatusOptions({ fields: [statusField] })
    },
  })

  const lockedLineItemsNotice = String(
    getBehaviorValue(moduleKey, 'lockedLineItemsNotice') || '',
  )

  const handleStatusChange = async (record: ModuleRecord, status: string) => {
    const statusCommand = getModuleStatusCommand(moduleKey, status)
    if (statusCommand) {
      modal.confirm({
        title: statusCommand.confirmTitle,
        content: statusCommand.confirmContent,
        okText: statusCommand.okText,
        cancelText: '取消',
        mask: { closable: false },
        onOk: async () => {
          await statusCommand.execute(String(record.id))
          message.success(statusCommand.successMessage)
          await refreshModuleQueries()
        },
      })
      return
    }
    await updateBusinessModuleStatus(moduleKey, String(record.id), status)
    message.success(`${config?.title ?? '单据'}状态已更新`)
    await refreshModuleQueries()
  }

  const { buildActions } = useModuleRecordActions({
    moduleKey,
    isReadOnly: Boolean(config?.readOnly),
    attachmentCounts,
    onAttach: openAttachment,
    detailActionLabel: config?.detailActionLabel,
    onDetail: recordDetailAction,
    onEdit: (record) => {
      void openEditor(record)
    },
    canEditRecord: (record) =>
      resolveModuleRecordCapabilities(record, moduleKey).canEdit,
    onStatusChange: (record, status) => {
      void handleStatusChange(record, status)
    },
  })

  const canUseSelectedBulkAuditAction =
    canUseBulkAuditAction &&
    selectedRecords.some(
      (record) =>
        !isDeletedModuleRecord(record) &&
        canAuditFromStatus(
          record.status,
          listAuditTarget,
          listReverseAuditTarget,
          listAuditSourceStatuses,
        ),
    )
  const selectedReverseAuditTargets = selectedRecords.flatMap((record) => {
    if (isDeletedModuleRecord(record)) return []
    const targetStatus = resolveReverseAuditTargetForStatus(
      moduleKey,
      record.status,
      listAuditTarget,
      listReverseAuditTarget,
    )
    return targetStatus ? [targetStatus] : []
  })
  const hasSingleReverseAuditTarget = selectedReverseAuditTargets.every(
    (targetStatus) => targetStatus === selectedReverseAuditTargets[0],
  )
  const effectiveListReverseAuditActionKind =
    selectedReverseAuditTargets.length > 0 && hasSingleReverseAuditTarget
      ? resolveStatusChangeActionKind(selectedReverseAuditTargets[0], true)
      : listReverseAuditActionKind
  const canUseSelectedBulkReverseAuditAction =
    canUseBulkReverseAuditAction && selectedReverseAuditTargets.length > 0
  const canUseSelectedBulkDeleteActions =
    canUseBulkDeleteActions &&
    selectedRecords.some(
      (record) => resolveModuleRecordCapabilities(record, moduleKey).canDelete,
    )

  const refreshAndClearSelection = async () => {
    clearSelection()
    await refreshModuleQueries()
  }

  const { handlePrintSelectedRecords, handleExportSalesOrderPrintXlsx } =
    useBusinessGridPrintActions({
      moduleKey,
      selectedRowKeys,
      selectedRows: selectedRecords,
    })

  const {
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
  } = useBusinessGridBatchActions({
    moduleKey,
    selectedRowKeys,
    selectedRows: selectedRecords,
    listAuditTarget,
    listReverseAuditTarget,
    listAuditSourceStatuses,
    listAuditActionKind,
    listReverseAuditActionKind: effectiveListReverseAuditActionKind,
    refreshAndClearSelection,
  })

  const { openFreightSummary } = useBusinessGridFreightActions({
    submittedFilters,
    formatCellValue,
  })

  const { openCustomerSummary } = useBusinessGridCustomerActions({
    submittedFilters,
    formatCellValue,
  })

  const { openCustomerProjects } = useBusinessGridCustomerProjectActions({
    selectedRows: selectedRecords,
  })

  const {
    visibleToolbarActions: baseVisibleToolbarActions,
    handleAction: handleToolbarAction,
  } = useModuleToolbarActions({
    moduleKey,
    config: toolbarConfig,
    formFields,
    isMaterialModule: false,
    selectedRowCount: selectedRowKeys.length,
    canUseBulkAuditAction: canUseSelectedBulkAuditAction,
    canUseBulkReverseAuditAction: canUseSelectedBulkReverseAuditAction,
    canUseBulkDeleteActions: canUseSelectedBulkDeleteActions,
    listAuditActionKind,
    listReverseAuditActionKind: effectiveListReverseAuditActionKind,
    handlers: {
      exportMaterialRows: async () => {
        await handleExport()
      },
      exportRows: async () => {
        await handleExport()
      },
      handleSelectedAuditRecords,
      handleSelectedDeleteRecords,
      handleSelectedReverseAuditRecords,
      openCreateEditor: async () => {
        await openEditor(null)
      },
      openFreightSummary,
      openCustomerSummary,
      openCustomerProjects,
    },
  })

  const selectedRecordActions =
    selectedRecords.length === 1 ? buildActions(selectedRecords[0]) : []
  const selectedRecordToolbarActions: ModuleActionDefinition[] =
    selectedRecordActions.map((action) => ({
      key: action.key,
      label: action.label,
      type: 'default',
      danger: action.danger,
      disabled: action.disabled,
    }))
  const visibleToolbarActions = [
    ...baseVisibleToolbarActions,
    ...selectedRecordToolbarActions,
  ]
  const handleAction = async (action: ModuleActionDefinition) => {
    const selectedRecordAction = selectedRecordActions.find(
      (candidate) => candidate.key === action.key,
    )
    if (selectedRecordAction) {
      selectedRecordAction.onClick()
      return
    }
    await handleToolbarAction(action)
  }

  return {
    buildActions,
    visibleToolbarActions,
    handleAction,
    handlePrintSelectedRecords,
    handleExportSalesOrderPrintXlsx,
    canUseBulkPrintActions,
    editorLineItemsLocked,
    lockedLineItemsNotice,
  }
}
