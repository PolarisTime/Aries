import { useState } from 'react'
import { Card, Button, Table, Tag, Modal, Form, Input, Select, message, Space } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

interface UserRecord {
  id: number | string
  loginName: string
  userName: string
  mobile: string
  status: string
  roleName: string
  departmentName: string
  totpEnabled: boolean
}

export function UserAccountManagementView() {
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<UserRecord | null>(null)
  const [form] = Form.useForm()

  const { data: users, isLoading } = useQuery({
    queryKey: ['user-accounts'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<{ rows: UserRecord[]; total: number }>>(ENDPOINTS.USER_ACCOUNTS)
      return res.data?.rows || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (editRecord?.id) {
        return http.put(`${ENDPOINTS.USER_ACCOUNTS}/${editRecord.id}`, values)
      }
      return http.post(ENDPOINTS.USER_ACCOUNTS, values)
    },
    onSuccess: () => {
      message.success('保存成功')
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] })
      setEditOpen(false)
    },
    onError: (err: Error) => message.error(err.message || '保存失败'),
  })

  const openEdit = (record?: UserRecord) => {
    setEditRecord(record || null)
    if (record) form.setFieldsValue(record)
    else form.resetFields()
    setEditOpen(true)
  }

  const columns = [
    { dataIndex: 'loginName', title: '登录名' },
    { dataIndex: 'userName', title: '姓名' },
    { dataIndex: 'departmentName', title: '部门' },
    { dataIndex: 'mobile', title: '手机' },
    { dataIndex: 'roleName', title: '角色' },
    {
      dataIndex: 'totpEnabled', title: '2FA',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '已启用' : '未启用'}</Tag>,
    },
    {
      dataIndex: 'status', title: '状态',
      render: (v: string) => <Tag color={v === 'active' ? 'green' : 'red'}>{v}</Tag>,
    },
    {
      title: '操作', key: 'actions',
      render: (_: unknown, record: UserRecord) => (
        <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
      ),
    },
  ]

  return (
    <div className="page-stack">
      <Card
        title="用户账户管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['user-accounts'] })} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新建用户</Button>
          </Space>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={users} loading={isLoading} size="small" />
      </Card>

      <Modal
        title={editRecord ? '编辑用户' : '新建用户'}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item name="loginName" label="登录名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="userName" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label={editRecord ? '新密码（留空不修改）' : '密码'} rules={editRecord ? [] : [{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="mobile" label="手机">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ label: '启用', value: 'active' }, { label: '禁用', value: 'disabled' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
