import { Drawer, Table, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { listAllBusinessModuleRows } from '@/api/business'

interface Props {
  open: boolean
  moduleKey: string
  onClose: () => void
}

export function ModuleFreightPickupListOverlay({ open, moduleKey, onClose }: Props) {
  const { data: records, isLoading } = useQuery({
    queryKey: ['freight-pickup', moduleKey],
    queryFn: () => listAllBusinessModuleRows('freight-bills', {}),
    enabled: open,
  })

  const columns = [
    { dataIndex: 'freightBillNo', title: '运单号' },
    { dataIndex: 'carrierName', title: '物流方' },
    { dataIndex: 'vehiclePlate', title: '车牌号' },
    { dataIndex: 'totalWeight', title: '总重量(吨)' },
    {
      dataIndex: 'status', title: '状态',
      render: (v: string) => <Tag color={v === 'delivered' ? 'green' : 'processing'}>{v}</Tag>,
    },
  ]

  return (
    <Drawer title="提货清单" open={open} onClose={onClose} width={800} destroyOnClose>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records || []}
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20 }}
      />
    </Drawer>
  )
}
