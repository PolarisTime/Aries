import { useState } from 'react'
import { Card, Table, Button, Modal, Form, Input, message, Space } from 'antd'
import { PlusOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

interface Template {
  id: string
  templateName: string
  billType: string
  updatedAt: string
}

export function PrintTemplateView() {
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Template | null>(null)
  const [form] = Form.useForm()

  const { data: templates, isLoading } = useQuery({
    queryKey: ['print-templates'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<{ rows: Template[] }>>(ENDPOINTS.PRINT_TEMPLATES)
      return res.data?.rows || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      editRecord?.id
        ? http.put(`${ENDPOINTS.PRINT_TEMPLATES}/${editRecord.id}`, values)
        : http.post(ENDPOINTS.PRINT_TEMPLATES, values),
    onSuccess: () => {
      message.success('保存成功')
      queryClient.invalidateQueries({ queryKey: ['print-templates'] })
      setEditOpen(false)
    },
    onError: (err: Error) => message.error(err.message),
  })

  const openEdit = (record?: Template) => {
    setEditRecord(record || null)
    if (record) form.setFieldsValue(record)
    else form.resetFields()
    setEditOpen(true)
  }

  const columns = [
    { dataIndex: 'templateName', title: '模板名称' },
    { dataIndex: 'billType', title: '单据类型' },
    { dataIndex: 'updatedAt', title: '更新时间' },
    { title: '操作', key: 'actions', render: (_: unknown, r: Template) => (
      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
    )},
  ]

  return (
    <div className="page-stack">
      <Card title="打印模板" extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['print-templates'] })} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新建模板</Button>
        </Space>
      }>
        <Table rowKey="id" columns={columns} dataSource={templates} loading={isLoading} size="small" />
      </Card>
      <Modal title={editRecord ? '编辑模板' : '新建模板'} open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => form.submit()} confirmLoading={saveMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item name="templateName" label="模板名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="billType" label="单据类型"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
