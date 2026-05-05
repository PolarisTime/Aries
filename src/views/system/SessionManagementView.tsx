import { Card, Table, Button, Tag, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

interface SessionRecord {
  id: string
  loginName: string
  userName: string
  ipAddress: string
  loginTime: string
  lastAccessTime: string
  status: string
}

export function SessionManagementView() {
  const queryClient = useQueryClient()

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['refresh-tokens'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<{ rows: SessionRecord[] }>>(ENDPOINTS.REFRESH_TOKENS)
      return res.data?.rows || []
    },
  })

  const handleRevoke = async (id: string) => {
    try {
      await http.post(`${ENDPOINTS.REFRESH_TOKENS}/${id}/revoke`, {})
      message.success('已吊销')
      queryClient.invalidateQueries({ queryKey: ['refresh-tokens'] })
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败')
    }
  }

  const columns = [
    { dataIndex: 'loginName', title: '登录名' },
    { dataIndex: 'userName', title: '用户' },
    { dataIndex: 'ipAddress', title: 'IP 地址' },
    { dataIndex: 'loginTime', title: '登录时间' },
    { dataIndex: 'lastAccessTime', title: '最后访问' },
    {
      dataIndex: 'status', title: '状态',
      render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: '操作', key: 'actions',
      render: (_: unknown, record: SessionRecord) => (
        <Button type="link" size="small" danger onClick={() => handleRevoke(record.id)}>吊销</Button>
      ),
    },
  ]

  return (
    <div className="page-stack">
      <Card
        title="会话管理"
        extra={<Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['refresh-tokens'] })} />}
      >
        <Table rowKey="id" columns={columns} dataSource={sessions} loading={isLoading} size="small" />
      </Card>
    </div>
  )
}
