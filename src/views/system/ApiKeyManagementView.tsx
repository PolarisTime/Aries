import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, Table, Button, Tag, Modal, Form, Input, message, Space } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

interface ApiKey {
  id: string
  keyName: string
  keyPrefix: string
  status: string
  createdAt: string
  expiresAt: string
}

export function ApiKeyManagementView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<{ rows: ApiKey[] }>>(ENDPOINTS.API_KEYS)
      return res.data?.rows || []
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => http.post(ENDPOINTS.API_KEYS, values),
    onSuccess: () => {
      message.success('API Key 已创建')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setCreateOpen(false)
      form.resetFields()
    },
    onError: (err: Error) => message.error(err.message),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => http.post(`${ENDPOINTS.API_KEYS}/${id}/revoke`, {}),
    onSuccess: () => {
      message.success('已吊销')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (err: Error) => message.error(err.message),
  })

  const columns = [
    { dataIndex: 'keyName', title: '名称' },
    { dataIndex: 'keyPrefix', title: 'Key 前缀' },
    { dataIndex: 'createdAt', title: '创建时间' },
    { dataIndex: 'expiresAt', title: '过期时间' },
    { dataIndex: 'status', title: '状态', render: (v: string) => <Tag color={v === 'active' || v === '有效' ? 'green' : 'red'}>{v}</Tag> },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, r: ApiKey) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            onClick={() => navigate({ to: `/api-key-management/${r.id}` as '/' })}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            danger
            loading={revokeMutation.isPending}
            onClick={() => revokeMutation.mutate(r.id)}
          >
            吊销
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-stack">
      <Card title="API Key 管理" extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['api-keys'] })} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建 Key</Button>
        </Space>
      }>
        <Table rowKey="id" columns={columns} dataSource={keys} loading={isLoading} size="small" />
      </Card>
      <Modal title="创建 API Key" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="keyName" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="expiresInDays" label="过期天数"><Input type="number" placeholder="留空为永不过期" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
