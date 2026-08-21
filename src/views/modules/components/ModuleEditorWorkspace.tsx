import {
  ArrowRightOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Button, Card, Form, Space, Table, Typography } from 'antd'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { ERROR_CODE } from '@/constants/error-codes'
import { DISPLAY_WEIGHT_PRECISION } from '@/constants/precision'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import { useModuleEditorCapabilities } from '@/hooks/useModuleEditorCapabilities'
import {
  type EditorSessionStatus,
  useEditorSession,
} from '@/layouts/editor-session/EditorSessionGuard'
import { resolveStatusChangeActionLabelKey } from '@/module-system/adapter/module-adapter-actions'
import { isParentImportedEditorLocked } from '@/module-system/adapter/module-adapter-editor'
import type { ModuleKey } from '@/module-system/core/module-key'
import { sortItemsByMaterialDefault } from '@/module-system/editor/module-editor-item-sort'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import type {
  ModulePageConfig,
  ModuleParentImportSource,
} from '@/types/module-page'
import type { PersistedModuleEditorDraftFor } from '@/types/module-record'
import { groupFreightStatementItems } from '@/views/modules/freight-statement-item-groups'
import type { EditorFormValues } from '@/views/modules/module-editor-workspace-support'
import type { EditorSaveResult } from '@/views/modules/use-editor-submission-controller'
import { useModuleEditorItems } from '@/views/modules/use-module-editor-items'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'
import { EditorFooterActions } from './EditorFooterActions'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'
import { ModuleEditorFormSection } from './ModuleEditorFormSection'
import { ModuleEditorItemsSection } from './ModuleEditorItemsSection'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props<Key extends ModuleKey> {
  open: boolean
  config: ModulePageConfig
  record: PersistedModuleEditorDraftFor<Key> | null
  initialParentImportSource: ModuleParentImportSource | null
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

const NEXT_MODULE_PATHS: Record<string, { labelKey: string; path: string }> = {
  'purchase-order': {
    labelKey: 'modules.nextModule.createPurchaseInbound',
    path: '/purchase-inbound',
  },
  'sales-order': {
    labelKey: 'modules.nextModule.createSalesOutbound',
    path: '/sales-outbound',
  },
}

const FINANCE_DOCUMENT_MODULES = new Set(['receipt', 'payment'])

function isFinanceOrTradeModule(key: string) {
  return (
    key === 'purchase-order' ||
    key === 'purchase-inbound' ||
    key === 'sales-order' ||
    key === 'sales-outbound' ||
    key === 'receipt' ||
    key === 'payment' ||
    key === 'customer-statement' ||
    key === 'freight-statement'
  )
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

export function ModuleEditorWorkspace<Key extends ModuleKey>({
  open,
  config,
  record,
  initialParentImportSource,
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
  const watchedCustomerId = Form.useWatch('customerId', form)
  const customerId =
    typeof watchedCustomerId === 'string' && watchedCustomerId
      ? watchedCustomerId
      : undefined
  const formFields = config.formFields || []
  const formOptionRequirements = resolveMasterOptionRequirements(formFields)
  useMasterOptions(formOptionRequirements, open, customerId)
  const statusField = formFields.find((field) => field.key === 'status')
  const statusOptions = Array.isArray(statusField?.options)
    ? statusField.options.map((option) => String(option.value))
    : []
  const currentStatus = String(
    readModuleRecordField(record, 'status') || '',
  ).trim()
  const isSalesOrderDeliveryVerification =
    moduleKey === 'sales-order' && currentStatus === '交付核定'
  const canEditLineItems = Boolean(config.itemColumns?.length)
  // oxlint-disable react-doctor/no-event-handler -- These are capability inputs, not event handlers.
  const {
    canAddManualEditorItems,
    canManageEditorItems,
    canSaveAndAuditCurrentEditor,
    editorAuditActionKind,
    editorAuditTarget,
  } = useModuleEditorCapabilities({
    moduleKey,
    formFields,
    lineItemLockRelatedRows: [],
    lineItemsLockedOverride: lineItemsLocked,
    currentStatus: currentStatus || undefined,
    canEditLineItems,
    canSaveCurrentEditor: canSave,
    canAuditRecords: canAudit,
    canPrintRecords: false,
    canDeleteRecords: false,
    isReadOnly: Boolean(config.readOnly),
    resolveModuleStatusOptions: () => statusOptions,
  })
  // oxlint-enable react-doctor/no-event-handler

  const canConfirmDeliveryVerification =
    isSalesOrderDeliveryVerification && canSave && canAudit
  const editorAuditLabel = canConfirmDeliveryVerification
    ? t('modules.editorFooter.confirmDeliveryVerification')
    : t('modules.editorFooter.saveAndAction', {
        action: t(
          resolveStatusChangeActionLabelKey(editorAuditActionKind || 'audit'),
        ),
      })
  const canManageItems = canManageEditorItems
  const canEditItemColumns = canSave && Boolean(config.itemColumns?.length)
  const canAddManualItems = canAddManualEditorItems
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
  } = useModuleEditorWorkspace({
    open,
    config,
    record,
    initialParentImportSource,
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
  const parentImportedItemEditLocked = isParentImportedEditorLocked(
    moduleKey,
    editorFormValues,
    config.parentImport?.parentFieldKey,
  )
  const canManageCurrentItems = canManageItems && !parentImportedItemEditLocked
  const canAddManualItemsForCurrentRecord =
    canAddManualItems && !parentImportedItemEditLocked
  const canImportParentItems =
    Boolean(config.parentImport) &&
    !config.readOnly &&
    canSave &&
    !lineItemsLocked &&
    !parentImportedItemEditLocked
  // 自动排序当前仅销售订单启用：导入上游后行序随上游，需按商品资料默认规则整理。
  const canAutoSortItems =
    moduleKey === 'sales-order' &&
    items.length > 1 &&
    !saving &&
    !lineItemsLocked
  const handleAutoSortItems = () => {
    setItems((current) => sortItemsByMaterialDefault(current))
  }
  const parentImportVisible = Boolean(
    config.parentImport &&
      (config.parentImport.visibleWhen?.(editorFormValues) ?? true),
  )
  const canSaveAndAuditInEditor =
    canSaveAndAuditCurrentEditor || canConfirmDeliveryVerification
  const useFinanceEditorLayout = FINANCE_DOCUMENT_MODULES.has(moduleKey)
  const {
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
  } = useModuleEditorItems({
    moduleKey,
    supplierId: editorFormValues.supplierId,
    config,
    items,
    setItems,
    canManageItems: canManageCurrentItems && !saving,
    lineItemsLocked,
    canEditItemColumns: canEditItemColumns && !saving,
    parentImportedItemEditLocked,
  })

  return (
    <>
      <WorkspaceOverlay
        open={open}
        title={t('modules.editor.title', {
          mode: isEdit ? t('modules.editor.edit') : t('modules.editor.create'),
          title: config.title,
        })}
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
        <Form
          form={form}
          layout={useFinanceEditorLayout ? 'vertical' : 'horizontal'}
          colon={false}
          labelWrap={false}
          className={`editor-form-shell${
            useFinanceEditorLayout ? ' editor-form-shell--finance' : ''
          }`}
          onValuesChange={(changedValues) => {
            handleFormValuesChange(changedValues)
          }}
        >
          <ModuleEditorFormSection
            config={config}
            moduleKey={moduleKey}
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
          />
        </Form>

        <ModuleEditorItemsSection
          config={config}
          items={items}
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
        />
      ) : null}
    </>
  )
}

interface SaveResultOverlayProps<Key extends ModuleKey> {
  saveResult: EditorSaveResult<Key>
  config: ModulePageConfig
  moduleKey: Key
  canCreateAnother: boolean
  resolvingConflict: boolean
  onClear: () => void
  onResolveConflict: () => void
  onCreateAnother: () => void
}

function SaveResultOverlay<Key extends ModuleKey>({
  saveResult,
  config,
  moduleKey,
  canCreateAnother,
  resolvingConflict,
  onClear,
  onResolveConflict,
  onCreateAnother,
}: SaveResultOverlayProps<Key>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rawItems = readModuleRecordField(saveResult.record, 'items')
  const items: Record<string, unknown>[] = Array.isArray(rawItems)
    ? rawItems.flatMap((item) =>
        item && typeof item === 'object'
          ? [Object.fromEntries(Object.entries(item))]
          : [],
      )
    : []

  const isSuccess =
    saveResult.status === 'success' || saveResult.status === 'warning'
  const isConflict =
    saveResult.status === 'error' &&
    saveResult.errorCode === ERROR_CODE.CONCURRENT_MODIFICATION

  const NEXT_MODULE: Record<string, { label: string; path: string }> =
    Object.fromEntries(
      Object.entries(NEXT_MODULE_PATHS).map(([key, { labelKey, path }]) => [
        key,
        { label: t(labelKey), path },
      ]),
    )

  const nextModule = isSuccess ? NEXT_MODULE[moduleKey] : null

  const handleCreateNext = (targetModule: { label: string; path: string }) => {
    onClear()
    void navigate({
      to: targetModule.path,
      search: new URLSearchParams({
        sourceModule: moduleKey,
        sourceRecordId: String(saveResult.record?.id || ''),
      }).toString(),
    } as never)
  }

  const quickActions = nextModule ? (
    <Button
      type="primary"
      icon={<ArrowRightOutlined />}
      onClick={() => handleCreateNext(nextModule)}
    >
      {nextModule.label}
    </Button>
  ) : null

  const resultTitle = isSuccess
    ? t('modules.saveResult.pageSuccess', { title: config.title })
    : isConflict
      ? t('modules.saveResult.conflict')
      : t('modules.saveResult.error')

  const actionBar = (
    <>
      {quickActions}
      {isSuccess && canCreateAnother ? (
        <Button icon={<PlusOutlined />} onClick={onCreateAnother}>
          {t('modules.saveResult.createAnother')}
        </Button>
      ) : null}
      <Button
        type="primary"
        icon={isConflict ? <ReloadOutlined /> : undefined}
        loading={isConflict && resolvingConflict}
        onClick={isConflict ? onResolveConflict : onClear}
      >
        {isConflict
          ? t('modules.saveResult.reloadLatest')
          : saveResult.status === 'error'
            ? t('modules.saveResult.backToEdit')
            : t('modules.saveResult.close')}
      </Button>
    </>
  )

  const baseItemColumns = [
    {
      title: t('modules.itemColumns.brand'),
      dataIndex: 'brand',
      ellipsis: true,
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.material'),
      dataIndex: 'material',
      ellipsis: true,
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.spec'),
      dataIndex: 'spec',
      ellipsis: true,
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.length'),
      dataIndex: 'length',
      ellipsis: true,
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.quantity'),
      dataIndex: 'quantity',
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.weightTon'),
      dataIndex: 'weightTon',
      align: 'center' as const,
      render: (v: unknown) =>
        v != null ? Number(v).toFixed(DISPLAY_WEIGHT_PRECISION) : '-',
    },
  ]
  const financeItemColumns = [
    {
      title: t('modules.itemColumns.unitPrice'),
      dataIndex: 'unitPrice',
      align: 'right' as const,
      render: (v: unknown) => (v != null ? Number(v).toFixed(2) : '-'),
    },
    {
      title: t('modules.itemColumns.amount'),
      dataIndex: 'amount',
      align: 'right' as const,
      render: (v: unknown) => (v != null ? Number(v).toFixed(2) : '-'),
    },
  ]
  const freightItemColumns = [
    {
      title: t('modules.columns.customerName'),
      dataIndex: 'customerName',
      ellipsis: true,
    },
    {
      title: t('modules.columns.projectName'),
      dataIndex: 'projectName',
      ellipsis: true,
    },
    {
      title: t('modules.itemColumns.warehouseName'),
      dataIndex: 'warehouseName',
      ellipsis: true,
    },
    {
      title: t('modules.itemColumns.brand'),
      dataIndex: 'brand',
      ellipsis: true,
    },
    {
      title: t('modules.itemColumns.material'),
      dataIndex: 'material',
      ellipsis: true,
    },
    { title: t('modules.itemColumns.spec'), dataIndex: 'spec', ellipsis: true },
    {
      title: t('modules.itemColumns.length'),
      dataIndex: 'length',
      ellipsis: true,
    },
    {
      title: t('modules.itemColumns.quantity'),
      dataIndex: 'quantity',
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.weightTon'),
      dataIndex: 'weightTon',
      align: 'center' as const,
      render: (v: unknown) =>
        v != null ? Number(v).toFixed(DISPLAY_WEIGHT_PRECISION) : '-',
    },
  ]
  const itemColumns =
    moduleKey === 'freight-bill'
      ? freightItemColumns
      : isFinanceOrTradeModule(moduleKey)
        ? [...baseItemColumns, ...financeItemColumns]
        : baseItemColumns
  const itemGroups =
    moduleKey === 'freight-statement'
      ? groupFreightStatementItems(items)
      : [
          {
            key: 'all',
            sourceNo: '',
            customerName: '',
            projectName: '',
            totalQuantity: 0,
            totalWeightTon: 0,
            items,
          },
        ]

  return (
    <WorkspaceOverlay
      open
      title={config.title}
      onClose={isConflict ? onResolveConflict : onClear}
      className="save-result-overlay"
    >
      <AppResult
        className="app-result--workspace"
        status={saveResult.status}
        title={resultTitle}
        subTitle={saveResult.message}
        traceId={saveResult.traceId}
        extra={actionBar}
      />

      {saveResult.record ? (
        <Card size="small" className="mb-16">
          <Space orientation="vertical" size={4}>
            {(config.formFields || []).map((field) => {
              const val = readModuleRecordField(saveResult.record, field.key)
              if (val == null || val === '') return null
              const suffix =
                readModuleRecordField(field, 'type') === 'weight'
                  ? ` ${t('modules.itemColumns.weightTon').replace(/\(.*\)/, '')}`
                  : readModuleRecordField(field, 'type') === 'amount'
                    ? ` ${t('modules.itemColumns.amount')}`
                    : ''
              return (
                <div key={field.key}>
                  <Typography.Text type="secondary">
                    {field.label}：
                  </Typography.Text>
                  <Typography.Text>
                    {String(val)}
                    {suffix}
                  </Typography.Text>
                </div>
              )
            })}
          </Space>
        </Card>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-16 module-items-groups">
          {(itemGroups.length
            ? itemGroups
            : [
                {
                  key: 'empty',
                  sourceNo: '',
                  customerName: '',
                  projectName: '',
                  totalQuantity: 0,
                  totalWeightTon: 0,
                  items: [],
                },
              ]
          ).map((group) => (
            <div className="module-items-group" key={group.key}>
              {'projectGroups' in group ? (
                <>
                  <FreightStatementItemGroupHeader group={group} />
                  {group.projectGroups.map((projectGroup) => (
                    <div
                      className="module-items-project-group"
                      key={projectGroup.key}
                    >
                      <FreightStatementProjectGroupHeader
                        group={projectGroup}
                      />
                      <Table
                        rowKey={(_, i) => String(i)}
                        dataSource={projectGroup.items}
                        columns={itemColumns}
                        size="small"
                        pagination={false}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <Table
                  rowKey={(_, i) => String(i)}
                  dataSource={group.items}
                  columns={itemColumns}
                  size="small"
                  pagination={false}
                />
              )}
            </div>
          ))}
        </div>
      ) : null}
    </WorkspaceOverlay>
  )
}
