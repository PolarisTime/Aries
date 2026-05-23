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
import { useMemo } from 'react'
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
  const formOptionRequirements = useMemo(
    () => resolveMasterOptionRequirements(formFields),
    [formFields],
  )
  useMasterOptions(formOptionRequirements, open)
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
    clearSaveResult,
    closeParentSelector,
    handleImportParentRecord,
    handleSave,
    isEdit,
    items,
    openParentSelector,
    parentImporting,
    parentSelectorOpen,
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
  const canSaveAndAuditInEditor = canSaveAndAuditCurrentEditor && !isEdit
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
  })

  return (
    <>
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
            onSave={(audit) => {
              void handleSave(audit)
            }}
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
          itemColumnOrder={itemColumnOrder}
          visibleItemColumnKeys={visibleItemColumnKeys}
          canSave={canSave}
          canAudit={canSaveAndAuditInEditor}
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

const BASE_ITEM_COLUMNS = [
  { title: '品牌', dataIndex: 'brand', ellipsis: true, align: 'center' as const },
  { title: '材质', dataIndex: 'material', ellipsis: true, align: 'center' as const },
  { title: '规格', dataIndex: 'spec', ellipsis: true, align: 'center' as const },
  { title: '长度', dataIndex: 'length', ellipsis: true, align: 'center' as const },
  { title: '数量', dataIndex: 'quantity', align: 'center' as const },
  {
    title: '总重(吨)',
    dataIndex: 'weightTon',
    align: 'center' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-'),
  },
]
const FINANCE_ITEM_COLUMNS = [
  {
    title: '单价',
    dataIndex: 'unitPrice',
    align: 'right' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(2) : '-'),
  },
  {
    title: '金额',
    dataIndex: 'amount',
    align: 'right' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(2) : '-'),
  },
]
function isFinanceModule(key: string) {
  return (
    key === 'receipt' ||
    key === 'payment' ||
    key === 'invoice-issue' ||
    key === 'invoice-receipt' ||
    key === 'customer-statement' ||
    key === 'supplier-statement' ||
    key === 'freight-statement'
  )
}
const FREIGHT_ITEM_COLUMNS = [
  { title: '码头', dataIndex: 'warehouseName', ellipsis: true },
  { title: '材质', dataIndex: 'material', ellipsis: true },
  { title: '规格', dataIndex: 'spec', ellipsis: true },
  { title: '长度', dataIndex: 'length', ellipsis: true },
  { title: '数量', dataIndex: 'quantity', align: 'center' as const },
  {
    title: '总重(吨)',
    dataIndex: 'weightTon',
    align: 'center' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-'),
  },
]
function buildItemColumns(moduleKey: string) {
  if (moduleKey === 'freight-bill') return FREIGHT_ITEM_COLUMNS
  return isFinanceModule(moduleKey)
    ? [...BASE_ITEM_COLUMNS, ...FINANCE_ITEM_COLUMNS]
    : BASE_ITEM_COLUMNS
}

function SaveResultOverlay({
  saveResult,
  config,
  moduleKey,
  onClear,
}: SaveResultOverlayProps) {
  const navigate = useNavigate()
  const items: ModuleRecord[] = Array.isArray(saveResult.record?.items)
    ? (saveResult.record.items as ModuleRecord[])
    : []
  const isSuccess =
    saveResult.status === 'success' || saveResult.status === 'warning'

  const statusIcon =
    saveResult.status === 'success' ? (
      <CheckCircleFilled
        className="text-4xl"
        style={{ color: 'var(--ant-color-success, #52c41a)' }}
      />
    ) : saveResult.status === 'warning' ? (
      <WarningFilled
        className="text-4xl"
        style={{ color: 'var(--ant-color-warning, #faad14)' }}
      />
    ) : (
      <CloseCircleFilled
        className="text-4xl"
        style={{ color: 'var(--ant-color-error, #ff4d4f)' }}
      />
    )

  const NEXT_MODULE: Record<string, { label: string; path: string }> = {
    'purchase-order': { label: '创建采购入库', path: '/purchase-inbound' },
    'sales-order': { label: '创建销售出库', path: '/sales-outbound' },
    'sales-outbound': { label: '创建物流单', path: '/freight-bill' },
  }

  const nextModule = isSuccess ? NEXT_MODULE[moduleKey] : null

  const handleCreateNext = () => {
    onClear()
    navigate({
      to: nextModule!.path,
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

  const headerTitle = (
    <span className="flex items-center gap-8">
      {statusIcon}
      <span>{isSuccess ? '保存成功' : '保存失败'}</span>
    </span>
  )

  return (
    <WorkspaceOverlay
      open
      title={headerTitle}
      onClose={onClear}
      footer={
        <div className="flex justify-end gap-8">
          {quickActions}
          <Button type="primary" onClick={onClear}>
            {saveResult.status === 'error' ? '返回编辑' : '关闭'}
          </Button>
        </div>
      }
    >
      {saveResult.record ? (
        <Card size="small" className="mb-16">
          <Space direction="vertical" size={4}>
            {(config.formFields || []).map((field) => {
              const val = saveResult.record?.[field.key]
              if (val == null || val === '') return null
              const suffix =
                (field as Record<string, unknown>).type === 'weight' ? ' 吨'
                : (field as Record<string, unknown>).type === 'amount' ? ' 元'
                : ''
              return (
                <div key={field.key}>
                  <Typography.Text type="secondary">
                    {field.label}：
                  </Typography.Text>
                  <Typography.Text>{String(val)}{suffix}</Typography.Text>
                </div>
              )
            })}
          </Space>
        </Card>
      ) : null}

      {items.length > 0 ? (
        <div className="flex justify-center">
          <Table
            rowKey={(_, i) => String(i)}
            dataSource={items}
            columns={buildItemColumns(moduleKey)}
            size="small"
            pagination={false}
          />
        </div>
      ) : null}
    </WorkspaceOverlay>
  )
}
