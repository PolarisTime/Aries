import { useQuery } from '@tanstack/react-query'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import { listAllBusinessModuleRows } from '@/api/business'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  moduleKey: string
  onClose: () => void
}

export function ModuleFreightPickupListOverlay({
  open,
  moduleKey,
  onClose,
}: Props) {
  const { data: records, isLoading } = useQuery({
    queryKey: ['freight-pickup', moduleKey],
    queryFn: () => listAllBusinessModuleRows('freight-bill', {}),
    enabled: open,
  })

  const columns = [
    { dataIndex: 'freightBillNo', title: '运单号' },
    { dataIndex: 'carrierName', title: '物流方' },
    { dataIndex: 'vehiclePlate', title: '车牌号' },
    { dataIndex: 'totalWeight', title: '总重量(吨)' },
    {
      dataIndex: 'status',
      title: '状态',
      render: (v: string) => (
        <Tag color={v === 'delivered' ? 'green' : 'processing'}>{v}</Tag>
      ),
    },
  ]

  return (
    <WorkspaceOverlay
      title="提货清单"
      open={open}
      onClose={onClose}
      variant="workspace"
      width="min(94vw, 1120px)"
      height="min(84vh, 780px)"
      zIndex={1050}
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records || []}
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20 }}
      />
    </WorkspaceOverlay>
  )
}
