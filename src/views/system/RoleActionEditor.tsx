import { useState } from 'react'
import { Card, Table, Button, Modal, Tree, Input, Form, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

interface RoleRecord { id: number | string; roleName: string; description: string }
interface DataNode { key: string; title: string; children?: DataNode[] }

export function RoleActionEditor() {
  const queryClient = useQueryClient()
  const [permOpen, setPermOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null)
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [form] = Form.useForm()

  const { data: roles, isLoading } = useQuery({
    queryKey: ['role-settings'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<{ rows: RoleRecord[] }>>(ENDPOINTS.ROLE_SETTINGS)
      return res.data?.rows || []
    },
  })

  const { data: permTree } = useQuery({
    queryKey: ['role-settings', selectedRole?.id, 'permissions'],
    queryFn: async () => {
      if (!selectedRole) return []
      const res = await http.get<ApiResponse<DataNode[]>>(`${ENDPOINTS.ROLE_SETTINGS}/${selectedRole.id}/permissions`)
      return res.data || []
    },
    enabled: permOpen && !!selectedRole,
  })

  const savePermMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return
      await http.put(`${ENDPOINTS.ROLE_SETTINGS}/${selectedRole.id}/permissions`, { permissions: checkedKeys })
    },
    onSuccess: () => { message.success('权限已保存'); setPermOpen(false); queryClient.invalidateQueries({ queryKey: ['role-settings'] }) },
    onError: (err: Error) => message.error(err.message),
  })

  const createRoleMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => http.post(ENDPOINTS.ROLE_SETTINGS, values),
    onSuccess: () => {
      message.success('角色已创建')
      queryClient.invalidateQueries({ queryKey: ['role-settings'] })
      setCreateOpen(false)
      form.resetFields()
    },
    onError: (err: Error) => message.error(err.message),
  })

  const columns = [
    { dataIndex: 'roleName', title: '角色名称' },
    { dataIndex: 'description', title: '描述' },
    { title: '操作', key: 'actions', render: (_: unknown, record: RoleRecord) => (
      <Button type="link" size="small" onClick={() => { setSelectedRole(record); setPermOpen(true) }}>配置权限</Button>
    )},
  ]

  return (
    <div className="page-stack">
      <Card title="角色权限配置" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建角色</Button>
      }>
        <Table rowKey="id" columns={columns} dataSource={roles} loading={isLoading} size="small" />
      </Card>
      <Modal title={`权限配置 — ${selectedRole?.roleName || ''}`} open={permOpen} onCancel={() => setPermOpen(false)} onOk={() => savePermMutation.mutate()} confirmLoading={savePermMutation.isPending} width={640}>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Tree checkable defaultExpandAll checkedKeys={checkedKeys} onCheck={(keys) => setCheckedKeys(keys as string[])} treeData={permTree} />
        </div>
      </Modal>
      <Modal title="新建角色" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={createRoleMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => createRoleMutation.mutate(v)}>
          <Form.Item name="roleName" label="角色名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
