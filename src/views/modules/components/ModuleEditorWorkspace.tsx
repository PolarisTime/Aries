import { useState, useEffect } from 'react'
import { Drawer, Form, Button, message } from 'antd'
import { SaveOutlined, AuditOutlined } from '@ant-design/icons'
import { FormFieldRenderer } from './FormFieldRenderer'
import { EditorItemsSummary } from './EditorItemsSummary'
import { DataTable } from '@/components/DataTable'
import { useDataTable } from '@/hooks/useDataTable'
import { saveBusinessModule } from '@/api/business'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import type { ModulePageConfig, ModuleRecord, ModuleFormFieldDefinition } from '@/types/module-page'
import type { ColumnDef } from '@tanstack/react-table'

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
  const [items, setItems] = useState<ModuleRecord[]>([])
  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)

  const isEdit = !!record

  useEffect(() => {
    if (open) {
      if (record) {
        form.setFieldsValue(record)
        setItems((record.items as ModuleRecord[]) || [])
      } else {
        form.resetFields()
        setItems([])
      }
    }
  }, [open, record, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload: ModuleRecord = { ...values, id: record?.id || '', items }
      await saveBusinessModule(moduleKey, payload)
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
  }

  const itemColumns: ColumnDef<ModuleRecord>[] = (config.itemColumns || []).map((col) => ({
    id: col.dataIndex,
    header: col.title,
    accessorKey: col.dataIndex,
    meta: { width: col.width ? `${col.width}px` : undefined, align: col.align || 'center' },
    cell: ({ getValue }) => String(getValue() || ''),
  }))

  const { table } = useDataTable({
    data: items,
    columns: itemColumns,
    manualPagination: false,
    enableSorting: false,
  })

  const addItem = () => {
    const newItem: ModuleRecord = { id: `item-${Date.now()}`, ...Object.fromEntries((config.itemColumns || []).map((c) => [c.dataIndex, ''])) }
    setItems([...items, newItem])
  }

  return (
    <Drawer
      title={`${isEdit ? '编辑' : '新建'} — ${config.title}`}
      open={open}
      onClose={onClose}
      width="min(90vw, 1100px)"
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => handleSave()}>
            保存
          </Button>
          {!isEdit && (
            <Button icon={<AuditOutlined />} loading={saving} onClick={() => handleSave()}>
              保存（审核）
            </Button>
          )}
        </div>
      }
    >
      <Form form={form} layout="vertical" className="editor-form-shell">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0">
          {(config.formFields || []).map((field: ModuleFormFieldDefinition) => (
            <FormFieldRenderer key={field.key} field={field} />
          ))}
        </div>
      </Form>

      {config.itemColumns && config.itemColumns.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="detail-section-title text-[#262626] text-[calc(var(--app-font-size)+2px)] font-medium">
              明细项目
            </h3>
            <Button onClick={addItem} size="small">添加行</Button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <DataTable table={table} bordered size="small" />
          </div>
          <EditorItemsSummary items={items} />
        </div>
      )}
    </Drawer>
  )
}
