import {
  ArrowRightOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  WarningFilled,
} from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import Space from 'antd/es/space'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { DISPLAY_WEIGHT_PRECISION } from '@/constants/precision'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
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

const NEXT_MODULE_PATHS: Record<string, { labelKey: string; path: string }> = {
  'purchase-order': {
    labelKey: 'modules.nextModule.createPurchaseInbound',
    path: '/purchase-inbound',
  },
  'sales-order': {
    labelKey: 'modules.nextModule.createSalesOutbound',
    path: '/sales-outbound',
  },
  'sales-outbound': {
    labelKey: 'modules.nextModule.createFreightBill',
    path: '/freight-bill',
  },
}

function isFinanceOrTradeModule(key: string) {
  return (
    key === 'purchase-order' ||
    key === 'purchase-inbound' ||
    key === 'sales-order' ||
    key === 'sales-outbound' ||
    key === 'receipt' ||
    key === 'payment' ||
    key === 'invoice-issue' ||
    key === 'invoice-receipt' ||
    key === 'customer-statement' ||
    key === 'supplier-statement' ||
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
  const formFields = config.formFields || []
  const formOptionRequirements = resolveMasterOptionRequirements(formFields)
  useMasterOptions(formOptionRequirements, open)
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
  const canImportParentItems = Boolean(config.parentImport && canManageItems)
  const {
    addItem,
    clearSaveResult,
    closeParentSelector,
    handleImportParentRecord,
    handleSave,
    isEdit,
    items,
    openParentSelector,
    parentImporting,
    parentSelectorFilters,
    parentSelectorOpen,
    authoritativePrimaryNo,
    saveResult,
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
  const canSaveAndAuditInEditor = canSaveAndAuditCurrentEditor
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
    canManageItems,
    lineItemsLocked,
    canEditItemColumns,
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
            authoritativePrimaryNo={authoritativePrimaryNo}
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
          parentImporting={parentImporting}
          parentSelectorFilters={parentSelectorFilters}
          parentSelectorOpen={parentSelectorOpen}
          itemColumns={itemColumns}
          itemColumnOrder={itemColumnOrder}
          visibleItemColumnKeys={visibleItemColumnKeys}
          permissions={{
            addManualItems: canAddManualItems,
            importParentItems: canImportParentItems,
            save: canSave,
            audit: canSaveAndAuditInEditor,
          }}
          saving={saving}
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
          onClear={() => {
            clearSaveResult()
            if (saveResult.status !== 'error') onClose()
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
    record?: ModuleRecord
  }
  config: ModulePageConfig
  moduleKey: string
  onClear: () => void
}

function SaveResultOverlay({
  saveResult,
  config,
  moduleKey,
  onClear,
}: SaveResultOverlayProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const items: ModuleRecord[] = Array.isArray(saveResult.record?.items)
    ? saveResult.record.items
    : []

  const isSuccess =
    saveResult.status === 'success' || saveResult.status === 'warning'

  const statusIcon =
    saveResult.status === 'success' ? (
      <CheckCircleFilled className="text-4xl text-[var(--ant-color-success,#52c41a)]" />
    ) : saveResult.status === 'warning' ? (
      <WarningFilled className="text-4xl text-[var(--ant-color-warning,#faad14)]" />
    ) : (
      <CloseCircleFilled className="text-4xl text-[var(--ant-color-error,#ff4d4f)]" />
    )

  const NEXT_MODULE: Record<string, { label: string; path: string }> =
    Object.fromEntries(
      Object.entries(NEXT_MODULE_PATHS).map(([key, { labelKey, path }]) => [
        key,
        { label: t(labelKey), path },
      ]),
    )

  const nextModule = isSuccess ? NEXT_MODULE[moduleKey] : null

  const handleCreateNext = () => {
    if (!nextModule) return
    onClear()
    void navigate({
      to: nextModule.path,
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
      onClick={handleCreateNext}
    >
      {nextModule.label}
    </Button>
  ) : null

  const resultTitle = isSuccess
    ? t('modules.saveResult.pageSuccess', { title: config.title })
    : t('modules.saveResult.error')

  const actionBar = (
    <div className="mt-16 flex flex-wrap justify-center gap-8">
      {quickActions}
      <Button type="primary" onClick={onClear}>
        {saveResult.status === 'error'
          ? t('modules.saveResult.backToEdit')
          : t('modules.saveResult.close')}
      </Button>
    </div>
  )

  const headerTitle = (
    <span className="flex items-center gap-8">
      {statusIcon}
      <span>{resultTitle}</span>
    </span>
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
    <WorkspaceOverlay open title={headerTitle} onClose={onClear}>
      {saveResult.status === 'error' && saveResult.traceId ? (
        <Card size="small" className="mb-16">
          <Typography.Text
            type="secondary"
            copyable={{ text: saveResult.traceId }}
            className="font-mono text-[11px]"
          >
            Trace ID: {saveResult.traceId}
          </Typography.Text>
        </Card>
      ) : null}

      {saveResult.record ? (
        <Card size="small" className="mb-16">
          <Space direction="vertical" size={4}>
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

      {actionBar}

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
