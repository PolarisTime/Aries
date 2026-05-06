import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Form, Button, Col, Row, Space, Table, Typography, Input, InputNumber, Select, Checkbox,
} from 'antd'
import { PlusOutlined, DeleteOutlined, MenuOutlined } from '@ant-design/icons'
import { message } from '@/utils/antd-app'
import { FormFieldRenderer } from './FormFieldRenderer'
import { EditorItemsSummary } from './EditorItemsSummary'
import { EditorFooterActions } from './EditorFooterActions'
import { WorkspaceOverlay } from './WorkspaceOverlay'
import { saveBusinessModule } from '@/api/business'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import {
  buildDefaultEditorLineItem,
  recalculateEditorLineItem,
  moveEditorLineItemByDrag,
  trimEditorItemsForModule,
  normalizeDraftRecordForModule,
  isNumberEditorColumn,
  getEditorItemPrecision,
  getEditorItemMin,
  isEditorItemColumnEditableForModule,
  type EditorItemDragPosition,
} from '@/views/modules/module-adapter-editor'
import { applyModuleDefaultEditorDraft } from '@/views/modules/module-adapter-editor'
import type { ModulePageConfig, ModuleRecord, ModuleFormFieldDefinition, ModuleLineItem } from '@/types/module-page'
import type { TableColumnsType } from 'antd'

interface Props {
  open: boolean
  config: ModulePageConfig
  record: ModuleRecord | null
  moduleKey: string
  onClose: () => void
  onSaved: () => void
}

export function ModuleEditorWorkspace({ open, config, record, moduleKey, onClose, onSaved }: Props) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<ModuleLineItem[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<EditorItemDragPosition>('before')
  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const { formatCellValue } = useModuleDisplaySupport()
  const { warehouses } = useMasterOptions()

  const isEdit = !!record
  const canSave = isEdit ? true : true // TODO: permission check
  const canAudit = canSave
  const canManageItems = Boolean(config.itemColumns?.length)
  const canAddManualItems = canManageItems && moduleKey !== 'invoice-issues' && moduleKey !== 'freight-bills'

  useEffect(() => {
    if (open) {
      if (record) {
        form.setFieldsValue(record)
        setItems((record.items as ModuleLineItem[]) || [])
      } else {
        form.resetFields()
        const defaultDraft: Record<string, unknown> = {}
        applyModuleDefaultEditorDraft(moduleKey, defaultDraft, getCurrentOperatorName())
        form.setFieldsValue(defaultDraft)
        setItems([])
      }
      setSelectedItemIds([])
    }
  }, [open, record, form, moduleKey])

  const getCurrentOperatorName = useCallback(() => {
    try {
      const stored = localStorage.getItem('aries-user')
      if (stored) {
        const user = JSON.parse(stored)
        return String(user?.userName || user?.loginName || '当前用户')
      }
    } catch { /* ignore */ }
    return '当前用户'
  }, [])

  const handleSave = useCallback(async (audit = false) => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const trimmedItems = trimEditorItemsForModule(moduleKey, items)
      const draftRecord: ModuleRecord = {
        ...values,
        id: record?.id || '',
        items: trimmedItems,
      }

      normalizeDraftRecordForModule({
        moduleKey,
        record: draftRecord,
        items: trimmedItems,
        primaryNoKey: config.primaryNoKey,
        generatePrimaryNo: () => `TEMP-${Date.now()}`,
        currentOperatorName: getCurrentOperatorName(),
        sumLineItemsBy: (items, key) => items.reduce((sum, item) => sum + Number(item[key] || 0), 0),
      })

      if (audit) {
        // Apply audit status
        const statusField = config.formFields?.find((f) => f.key === 'status')
        if (statusField) {
          draftRecord.status = '已审核'
        }
      }

      await saveBusinessModule(moduleKey, draftRecord)
      message.success(isEdit ? '更新成功' : '创建成功')
      await refreshModuleQueries()
      onSaved()
      onClose()
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message || '保存失败')
      }
    } finally {
      setSaving(false)
    }
  }, [form, items, moduleKey, record, config, isEdit, refreshModuleQueries, onSaved, onClose, getCurrentOperatorName])

  const addItem = useCallback(() => {
    const newItem = buildDefaultEditorLineItem()
    setItems((prev) => [...prev, newItem])
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
    setSelectedItemIds((prev) => prev.filter((id) => id !== itemId))
  }, [])

  const removeSelectedItems = useCallback(() => {
    if (!selectedItemIds.length) return
    setItems((prev) => prev.filter((item) => !selectedItemIds.includes(item.id)))
    setSelectedItemIds([])
  }, [selectedItemIds])

  const handleItemNumberChange = useCallback((itemId: string, key: string, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const updated = { ...item, [key]: value === null || value === undefined ? 0 : value }
        return recalculateEditorLineItem(updated, key)
      }),
    )
  }, [])

  const handleItemInputChange = useCallback((itemId: string, key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
    )
  }, [])

  const handleMaterialSelect = useCallback((itemId: string, materialCode: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        return { ...item, materialCode }
      }),
    )
  }, [])

  const handleWarehouseSelect = useCallback((itemId: string, warehouseName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, warehouseName } : item)),
    )
  }, [])

  const handleSettlementModeChange = useCallback((itemId: string, settlementMode: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const updated = { ...item, settlementMode }
        return recalculateEditorLineItem(updated, 'settlementMode')
      }),
    )
  }, [])

  // Drag and drop
  const handleDragStart = useCallback((itemId: string, e: React.DragEvent) => {
    setDragSourceId(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
  }, [])

  const handleDragOver = useCallback((itemId: string, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragSourceId && dragSourceId !== itemId) {
      setDragTargetId(itemId)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      setDragPosition(e.clientY < midY ? 'before' : 'after')
    }
  }, [dragSourceId])

  const handleDragEnd = useCallback(() => {
    if (dragSourceId && dragTargetId && dragSourceId !== dragTargetId) {
      setItems((prev) => moveEditorLineItemByDrag(prev, dragSourceId, dragTargetId, dragPosition))
    }
    setDragSourceId(null)
    setDragTargetId(null)
  }, [dragSourceId, dragTargetId, dragPosition])

  // Item selection
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedItemIds(checked ? items.map((item) => item.id) : [])
  }, [items])

  const handleSelectItem = useCallback((itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) =>
      checked ? [...prev, itemId] : prev.filter((id) => id !== itemId),
    )
  }, [])

  const isItemColumnEditable = useCallback(
    (columnKey: string) =>
      isEditorItemColumnEditableForModule(moduleKey, columnKey, canManageItems, false),
    [moduleKey, canManageItems],
  )

  const settlementModeOptions = ['理算', '过磅']

  const itemColumns = useMemo<TableColumnsType<ModuleLineItem>>(() => {
    if (!config.itemColumns?.length) return []

    const cols: TableColumnsType<ModuleLineItem> = []

    // Selection column
    if (canManageItems) {
      cols.push({
        title: (
          <Checkbox
            checked={selectedItemIds.length === items.length && items.length > 0}
            indeterminate={selectedItemIds.length > 0 && selectedItemIds.length < items.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        ),
        dataIndex: 'id',
        key: 'selection',
        width: 48,
        fixed: 'left',
        align: 'center',
        render: (_: unknown, record: ModuleLineItem) => (
          <Checkbox
            checked={selectedItemIds.includes(record.id)}
            onChange={(e) => handleSelectItem(record.id, e.target.checked)}
          />
        ),
      })
    }

    // Index/drag column
    if (canManageItems) {
      cols.push({
        title: '#',
        key: '_index',
        width: 56,
        fixed: 'left',
        align: 'center',
        render: (_: unknown, record: ModuleLineItem, index: number) => (
          <span
            draggable
            onDragStart={(e) => handleDragStart(record.id, e)}
            onDragOver={(e) => handleDragOver(record.id, e)}
            onDragEnd={handleDragEnd}
            style={{ cursor: 'grab' }}
          >
            <MenuOutlined style={{ marginRight: 4, opacity: 0.45, fontSize: 12 }} />
            {index + 1}
          </span>
        ),
      })
    }

    // Data columns
    for (const colDef of config.itemColumns) {
      const key = colDef.dataIndex
      const editable = isItemColumnEditable(key)
      const isMaterial = key === 'materialCode'
      const isWarehouse = key === 'warehouseName'
      const isSettlement = key === 'settlementMode'
      const isNumber = isNumberEditorColumn(key)
      const isStatus = colDef.type === 'status'

      cols.push({
        title: colDef.title,
        dataIndex: key,
        key,
        width: colDef.width,
        align: colDef.align || 'center',
        ellipsis: true,
        render: (value: unknown, record: ModuleLineItem) => {
          if (!editable) {
            if (isStatus) {
              const statusMap = config.statusMap || {}
              const meta = statusMap[String(value || '')]
              return (
                <span className={`ant-tag ant-tag-${meta?.color || 'default'}`}>
                  {meta?.text || String(value || '--')}
                </span>
              )
            }
            return formatCellValue(value, colDef.type)
          }

          if (isMaterial) {
            return (
              <Input
                value={String(record.materialCode || '')}
                placeholder="输入商品编码"
                onChange={(e) => handleMaterialSelect(record.id, e.target.value)}
              />
            )
          }

          if (isWarehouse) {
            return (
              <Select
                value={record.warehouseName ? String(record.warehouseName) : undefined}
                showSearch
                allowClear
                style={{ width: '100%' }}
                placeholder="选择码头"
                filterOption={(input, option) =>
                  String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={(val: string) => handleWarehouseSelect(record.id, val)}
                options={warehouses.map((w) => ({
                  label: w.label,
                  value: w.value,
                }))}
              />
            )
          }

          if (isSettlement) {
            return (
              <Select
                value={record.settlementMode ? String(record.settlementMode) : undefined}
                style={{ width: '100%' }}
                placeholder="选择结算方式"
                onChange={(val: string) => handleSettlementModeChange(record.id, val)}
                options={settlementModeOptions.map((mode) => ({
                  label: mode,
                  value: mode,
                }))}
              />
            )
          }

          if (isNumber) {
            const precision = getEditorItemPrecision(key)
            const min = getEditorItemMin(key)
            const hideControls = ['quantity', 'unitPrice', 'weightTon'].includes(key)
            return (
              <InputNumber
                value={value as number}
                style={{ width: '100%' }}
                min={min}
                precision={precision}
                controls={!hideControls}
                onChange={(val) => handleItemNumberChange(record.id, key, val)}
              />
            )
          }

          return (
            <Input
              value={String(value || '')}
              onChange={(e) => handleItemInputChange(record.id, key, e)}
            />
          )
        },
      })
    }

    // Action column
    if (canManageItems) {
      cols.push({
        title: '操作',
        key: 'action',
        width: 64,
        fixed: 'right',
        align: 'center',
        render: (_: unknown, record: ModuleLineItem) => (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => removeItem(record.id)}
          />
        ),
      })
    }

    return cols
  }, [
    config.itemColumns,
    config.statusMap,
    canManageItems,
    selectedItemIds,
    items,
    warehouses,
    settlementModeOptions,
    isItemColumnEditable,
    formatCellValue,
    handleSelectAll,
    handleSelectItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleMaterialSelect,
    handleWarehouseSelect,
    handleSettlementModeChange,
    handleItemNumberChange,
    handleItemInputChange,
    removeItem,
  ])

  return (
    <WorkspaceOverlay
      open={open}
      title={`${isEdit ? '编辑' : '新建'} — ${config.title}`}
      onClose={onClose}
      width="min(90vw, 1100px)"
      footer={
        <EditorFooterActions
          canSave={canSave}
          canAudit={canAudit && !isEdit}
          saving={saving}
          onCancel={onClose}
          onSave={handleSave}
        />
      }
    >
      {/* Form section */}
      {config.formFields && config.formFields.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>单据信息</Typography.Title>
          </div>
          <Form form={form} layout="vertical">
            <Row gutter={[16, 0]}>
              {config.formFields.map((field: ModuleFormFieldDefinition) => (
                <Col key={field.key} xs={24} md={12} xl={field.type === 'textarea' ? 24 : 8}>
                  <FormFieldRenderer field={field} />
                </Col>
              ))}
            </Row>
          </Form>
        </>
      )}

      {/* Items section */}
      {config.itemColumns && config.itemColumns.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              明细列表
            </Typography.Title>
            <Space>
              {canAddManualItems && (
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={addItem}>
                  新增明细
                </Button>
              )}
              {selectedItemIds.length > 0 && (
                <Button danger size="small" icon={<DeleteOutlined />} onClick={removeSelectedItems}>
                  删除选中 ({selectedItemIds.length})
                </Button>
              )}
            </Space>
          </div>

          {config.parentImport && canManageItems && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
              <Typography.Text type="secondary">
                {config.parentImport.enforceUniqueRelation
                  ? '当前单据链按上级单据唯一占用控制；重复导入同单号会更新，选择不同单号会追加明细'
                  : '重复导入同单号会更新，选择不同单号会追加明细'}
              </Typography.Text>
            </div>
          )}

          <Table
            rowKey="id"
            size="small"
            bordered
            columns={itemColumns}
            dataSource={items}
            pagination={false}
            locale={{ emptyText: config.parentImport ? '当前没有明细，可手动新增或从上级单据导入' : '当前没有明细，可手动新增' }}
            scroll={{ x: 'max-content', y: 320 }}
            rowClassName={(record) =>
              selectedItemIds.includes(record.id) ? 'ant-table-row-selected' : ''
            }
            onRow={(record) => ({
              onDragOver: (e) => handleDragOver(record.id, e),
            })}
          />

          <EditorItemsSummary items={items} />
        </div>
      )}
    </WorkspaceOverlay>
  )
}
