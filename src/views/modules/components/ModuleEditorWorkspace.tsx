import { ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Button, Card, Form, Space, Table, Typography } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { ERROR_CODE } from '@/constants/error-codes'
import { DISPLAY_WEIGHT_PRECISION } from '@/constants/precision'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import { useModuleEditorCapabilities } from '@/hooks/useModuleEditorCapabilities'
import { editorTaskStore } from '@/layouts/editor-workspace/editor-task-store'
import { isParentImportedEditorLocked } from '@/module-system/module-adapter-editor'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { useModuleEditorItems } from '@/views/modules/use-module-editor-items'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'
import { EditorFooterActions } from './EditorFooterActions'
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

const NEXT_MODULE_PATHS: Record<string, { labelKey: string; path: string }> = {
  'purchase-order': {
    labelKey: 'modules.nextModule.createPurchaseInbound',
    path: '/purchase-inbound',
  },
}

const FINANCE_DOCUMENT_MODULES = new Set([
  'receipt',
  'payment',
  'ledger-adjustment',
])

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
  const { t } = useTranslation()
  const [form] = Form.useForm()
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
  const canEditItemColumns = canSave && Boolean(config.itemColumns?.length)
  const canAddManualItems = canAddManualEditorItems
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
    moduleKey,
    editorAuditTarget,
    form,
    onClose,
    onSaved,
    autoInsertBlankItemOnCreate:
      Boolean(config.itemColumns?.length) && canAddManualItems,
  })

  useEffect(() => {
    const activeKey = editorTaskStore.getState().activeKey
    const activeTask = editorTaskStore
      .getState()
      .tasks.find((task) => task.key === activeKey)
    if (!activeTask || activeTask.moduleKey !== moduleKey) {
      return
    }
    if (saving) {
      editorTaskStore.getState().updateStatus(activeTask.key, 'saving')
      return
    }
    if (saveResult?.status === 'error') {
      editorTaskStore.getState().updateStatus(activeTask.key, 'error')
      return
    }
    if (saveResult?.status === 'success') {
      editorTaskStore.getState().updateStatus(activeTask.key, 'clean')
    }
  }, [moduleKey, saveResult?.status, saving])
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
  const parentImportVisible = Boolean(
    config.parentImport &&
      (config.parentImport.visibleWhen?.(editorFormValues) ?? true),
  )
  const canSaveAndAuditInEditor = canSaveAndAuditCurrentEditor
  const useFinanceEditorLayout = FINANCE_DOCUMENT_MODULES.has(moduleKey)
  const {
    clearSelectedItems,
    handleDragOver,
    itemColumns,
    itemColumnOrder,
    onItemColumnOrderChange,
    removeSelectedItems,
    selectedItemIds,
    toggleItemColumn,
    visibleItemColumnKeys,
  } = useModuleEditorItems({
    moduleKey,
    config,
    items,
    setItems,
    canManageItems: canManageCurrentItems,
    lineItemsLocked,
    canEditItemColumns,
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
        onClose={onClose}
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
              saving={saving}
              onCancel={onClose}
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
            const activeKey = editorTaskStore.getState().activeKey
            if (activeKey) {
              editorTaskStore.getState().updateStatus(activeKey, 'dirty')
            }
            handleFormValuesChange(changedValues)
          }}
        >
          <ModuleEditorFormSection
            config={config}
            moduleKey={moduleKey}
            canSave={canSave}
            canAudit={canSaveAndAuditInEditor}
            saving={saving}
            showActions={!useFinanceEditorLayout && !config.itemColumns?.length}
            lineItemsLocked={lineItemsLocked}
            lockedLineItemsNotice={lockedLineItemsNotice}
            authoritativePrimaryNo={authoritativePrimaryNo}
            isEdit={isEdit}
            layoutVariant={useFinanceEditorLayout ? 'finance' : 'default'}
            onCancel={onClose}
            onSave={(audit) => {
              void handleSave(audit)
            }}
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
          itemColumnOrder={itemColumnOrder}
          visibleItemColumnKeys={visibleItemColumnKeys}
          capabilities={{
            addManualItems: canAddManualItemsForCurrentRecord,
            importParentItems: canImportParentItems,
            save: canSave,
            audit: canSaveAndAuditInEditor,
          }}
          saving={saving}
          showFooterActions={!useFinanceEditorLayout}
          onAddItem={addItem}
          onCancel={onClose}
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
          resolvingConflict={saving}
          onClear={() => {
            clearSaveResult()
            if (saveResult.status !== 'error') onClose()
          }}
          onResolveConflict={() => {
            void reloadAfterConflict()
          }}
        />
      ) : null}
    </>
  )
}

interface SaveResultOverlayProps {
  saveResult: {
    status: 'success' | 'error' | 'warning'
    message: string
    traceId?: string
    errorCode?: number
    record?: ModuleRecord
  }
  config: ModulePageConfig
  moduleKey: string
  resolvingConflict: boolean
  onClear: () => void
  onResolveConflict: () => void
}

function SaveResultOverlay({
  saveResult,
  config,
  moduleKey,
  resolvingConflict,
  onClear,
  onResolveConflict,
}: SaveResultOverlayProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const items: ModuleRecord[] = Array.isArray(saveResult.record?.items)
    ? saveResult.record.items
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
              const val = saveResult.record?.[field.key]
              if (val == null || val === '') return null
              const suffix =
                (field as unknown as Record<string, unknown>).type === 'weight'
                  ? ` ${t('modules.itemColumns.weightTon').replace(/\(.*\)/, '')}`
                  : (field as unknown as Record<string, unknown>).type ===
                      'amount'
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
        <div className="mt-16 flex justify-center">
          <Table
            rowKey={(_, i) => String(i)}
            dataSource={items}
            columns={itemColumns}
            size="small"
            pagination={false}
          />
        </div>
      ) : null}
    </WorkspaceOverlay>
  )
}
