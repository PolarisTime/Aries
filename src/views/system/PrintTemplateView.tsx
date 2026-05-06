import { useState, useCallback, useMemo } from 'react'
import {
  Card, Button, Table, Modal, Form, Input, Space, Select, Tag,
  Typography, message, Row, Col,
} from 'antd'
import {
  PlusOutlined, EditOutlined, ReloadOutlined, DeleteOutlined,
  CopyOutlined, EyeOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listPrintTemplates, savePrintTemplate, deletePrintTemplate,
} from '@/api/print-template'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import { usePermissionStore } from '@/stores/permissionStore'
import { useRequestError } from '@/hooks/useRequestError'
import type { PrintTemplateRecord } from '@/types/print-template'

export function PrintTemplateView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canCreate = permissionStore.can('print-template', 'create')
  const canEdit = permissionStore.can('print-template', 'update')
  const canDelete = permissionStore.can('print-template', 'delete')

  const [selectedBillType, setSelectedBillType] = useState(printTemplateTargetOptions[0]?.value || 'purchase-orders')
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>(undefined)
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<PrintTemplateRecord | null>(null)
  const [form] = Form.useForm()
  const [templateHtml, setTemplateHtml] = useState('')

  const { data: templatesResponse, isLoading } = useQuery({
    queryKey: ['print-templates', selectedBillType],
    queryFn: () => listPrintTemplates(selectedBillType),
  })
  const templates = templatesResponse?.data || []

  const saveMutation = useMutation({
    mutationFn: savePrintTemplate,
    onSuccess: () => {
      message.success('保存成功')
      queryClient.invalidateQueries({ queryKey: ['print-templates'] })
      setEditorOpen(false)
    },
    onError: (err: Error) => showError(err, '保存失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePrintTemplate,
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['print-templates'] })
    },
    onError: (err: Error) => showError(err, '删除失败'),
  })

  const openCreate = useCallback(() => {
    if (!canCreate) { message.warning('暂无创建权限'); return }
    form.resetFields()
    form.setFieldsValue({ billType: selectedBillType, templateName: '', isDefault: false })
    setTemplateHtml('')
    setActiveTemplateId(undefined)
    setEditorOpen(true)
  }, [canCreate, form, selectedBillType])

  const openEdit = useCallback((record: PrintTemplateRecord) => {
    if (!canEdit) { message.warning('暂无编辑权限'); return }
    form.setFieldsValue({
      id: record.id, billType: record.billType || selectedBillType,
      templateName: record.templateName, isDefault: record.isDefault ?? false,
    })
    setTemplateHtml(record.templateHtml || '')
    setActiveTemplateId(record.id)
    setEditorOpen(true)
  }, [canEdit, form, selectedBillType])

  const openPreview = useCallback((record: PrintTemplateRecord) => {
    setPreviewTemplate(record)
    setPreviewOpen(true)
  }, [])

  const handleCopy = useCallback((record: PrintTemplateRecord) => {
    if (!canCreate) { message.warning('暂无创建权限'); return }
    form.setFieldsValue({
      billType: record.billType || selectedBillType,
      templateName: `${record.templateName} (副本)`,
      isDefault: false,
    })
    setTemplateHtml(record.templateHtml || '')
    setActiveTemplateId(undefined)
    setEditorOpen(true)
  }, [canCreate, form, selectedBillType])

  const handleDelete = useCallback((record: PrintTemplateRecord) => {
    if (!canDelete) { message.warning('暂无删除权限'); return }
    Modal.confirm({
      title: '删除打印模板',
      content: `确定删除模板「${record.templateName}」吗？`,
      okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(record.id),
    })
  }, [canDelete, deleteMutation])

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      if (!templateHtml.trim()) { message.warning('请输入模板内容'); return }
      saveMutation.mutate({
        id: activeTemplateId || undefined,
        billType: values.billType,
        templateName: values.templateName.trim(),
        templateHtml: templateHtml.trim(),
        isDefault: values.isDefault ?? false,
      })
    } catch { /* validation failed */ }
  }, [form, templateHtml, activeTemplateId, saveMutation])

  const columns = useMemo(() => [
    { dataIndex: 'templateName', title: '模板名称', width: 200 },
    { dataIndex: 'billType', title: '单据类型', width: 150, render: (v: string) => printTemplateTargetOptions.find((o) => o.value === v)?.label || v },
    {
      dataIndex: 'isDefault', title: '默认', width: 80, align: 'center' as const,
      render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
    { dataIndex: 'updateTime', title: '更新时间', width: 180, render: (v: string) => v || '--' },
    {
      title: '操作', key: 'action', width: 280, fixed: 'right' as const,
      render: (_: unknown, record: PrintTemplateRecord) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openPreview(record)}>预览</Button>
          {canEdit && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>}
          {canCreate && <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(record)}>复制</Button>}
          {canDelete && <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>}
        </Space>
      ),
    },
  ], [canEdit, canCreate, canDelete, openPreview, openEdit, handleCopy, handleDelete])

  return (
    <div className="page-stack">
      <Card
        title="打印模板"
        extra={
          <Space>
            <Select
              value={selectedBillType}
              onChange={setSelectedBillType}
              style={{ width: 200 }}
              options={printTemplateTargetOptions}
            />
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['print-templates'] })}>刷新</Button>
            {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建模板</Button>}
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={templates}
          loading={isLoading}
          size="small"
          scroll={{ x: 900 }}
          onRow={(record) => ({ onClick: () => setActiveTemplateId(record.id), style: { cursor: 'pointer', background: activeTemplateId === record.id ? '#e6f7ff' : undefined } })}
        />
      </Card>

      <Modal
        title={activeTemplateId ? '编辑模板' : '新建模板'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={handleSave}
        confirmLoading={saveMutation.isPending}
        width={900}
        maskClosable={false}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="billType" label="单据类型" required>
                <Select options={printTemplateTargetOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="templateName" label="模板名称" required>
                <Input placeholder="请输入模板名称" maxLength={64} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="isDefault" label="默认模板" valuePropName="checked">
                <Select options={[{ label: '是', value: true }, { label: '否', value: false }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="模板内容" required>
            <Input.TextArea
              value={templateHtml}
              onChange={(e) => setTemplateHtml(e.target.value)}
              rows={16}
              placeholder="请输入 HTML 模板内容"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
          <Typography.Text type="secondary">
            支持 HTML 模板和 LODOP 指令。使用 {'{{字段名}}'} 语法插入动态数据。
          </Typography.Text>
        </Form>
      </Modal>

      <Modal
        title="模板预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={800}
      >
        {previewTemplate && (
          <div>
            <Typography.Title level={5}>{previewTemplate.templateName}</Typography.Title>
            <Typography.Paragraph type="secondary">单据类型：{printTemplateTargetOptions.find((o) => o.value === previewTemplate.billType)?.label || previewTemplate.billType}</Typography.Paragraph>
            <div style={{ background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 6, padding: 16, maxHeight: 400, overflow: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, fontSize: 12 }}>
                {previewTemplate.templateHtml || '（空模板）'}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
