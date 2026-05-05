import { useQuery } from '@tanstack/react-query'
import { Card, Table, Tag } from 'antd'
import { http } from '@/api/client'
import type { ApiResponse } from '@/types/api'

interface NoRule {
  id: number | string
  moduleKey: string
  prefix: string
  dateFormat: string
  serialLength: number
  currentSerial: number
}

export function NumberRulesView() {
  const { data: rules, isLoading } = useQuery({
    queryKey: ['number-rules'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<{ rows: NoRule[] }>>('/general-settings/number-rules')
      return res.data?.rows || []
    },
  })

  const columns = [
    { dataIndex: 'moduleKey', title: '模块' },
    { dataIndex: 'prefix', title: '前缀' },
    { dataIndex: 'dateFormat', title: '日期格式' },
    { dataIndex: 'serialLength', title: '序列号长度' },
    {
      dataIndex: 'currentSerial', title: '当前序列号',
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
  ]

  return (
    <div className="page-stack">
      <Card title="单号规则">
        <Table rowKey="id" columns={columns} dataSource={rules} loading={isLoading} size="small" />
      </Card>
    </div>
  )
}
