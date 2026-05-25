import { useQuery } from '@tanstack/react-query'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import { listAllBusinessModuleRows } from '@/api/business'
import { QUERY_KEYS } from '@/constants/query-keys'
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
    queryKey: QUERY_KEYS.freightPickup(moduleKey),
    queryFn: () => listAllBusinessModuleRows('freight-bill', {}),
    enabled: open,
  })

  const columns = [
    { dataIndex: 'billNo', title: '运单号', width: 160 },
    { dataIndex: 'carrierName', title: '物流方', width: 120 },
    { dataIndex: 'vehiclePlate', title: '车牌号', width: 100 },
    { dataIndex: 'customerName', title: '客户', width: 140, ellipsis: true },
    { dataIndex: 'projectName', title: '项目', width: 160, ellipsis: true },
    { dataIndex: 'totalWeight', title: '总重(吨)', width: 90, align: 'right' as const },
    { dataIndex: 'totalFreight', title: '总运费', width: 100, align: 'right' as const },
    {
      dataIndex: 'status',
      title: '状态',
      width: 80,
      render: (v: string) => (
        <Tag color={v === '已送达' ? 'green' : 'processing'}>{v}</Tag>
      ),
    },
  ]

  return (
    <WorkspaceOverlay
      title="提货清单 — 物流单"
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
        scroll={{ x: 960 }}
        pagination={{ pageSize: 20 }}
      />
    </WorkspaceOverlay>
  )
}
