import { useQuery } from '@tanstack/react-query'
import Card from 'antd/es/card'
import Spin from 'antd/es/spin'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import { getBusinessModuleDetail } from '@/api/business'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleRecord } from '@/types/module-page'
import { asId } from '@/utils/type-narrowing'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  moduleKey: string
  records: ModuleRecord[]
  onClose: () => void
}

const ITEM_COLUMNS = [
  { title: '出库单号', dataIndex: 'sourceNo', width: 140 },
  { title: '品牌', dataIndex: 'brand', ellipsis: true, align: 'center' as const },
  { title: '材质', dataIndex: 'material', ellipsis: true, align: 'center' as const },
  { title: '规格', dataIndex: 'spec', ellipsis: true, align: 'center' as const },
  { title: '长度', dataIndex: 'length', ellipsis: true, align: 'center' as const },
  { title: '数量', dataIndex: 'quantity', align: 'center' as const },
  {
    title: '总重(吨)', dataIndex: 'weightTon', align: 'center' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-'),
  },
]

function DetailCard({ record }: { record: ModuleRecord }) {
  const items = (Array.isArray(record.items) ? record.items : []) as ModuleRecord[]

  return (
    <Card size="small" className="mb-3">
      <div className={items.length > 0 ? 'mb-3' : ''}>
        <div className="mb-1">
          <Typography.Text type="secondary">运单号：</Typography.Text>
          <Typography.Text strong>{String(record.billNo ?? '-')}</Typography.Text>
        </div>
        <div className="mb-1">
          <Typography.Text type="secondary">客户：</Typography.Text>
          <Typography.Text strong>{String(record.customerName ?? '-')}</Typography.Text>
          <span className="ml-6">
            <Typography.Text type="secondary">项目：</Typography.Text>
            <Typography.Text strong>{String(record.projectName ?? '-')}</Typography.Text>
          </span>
        </div>
        <div>
          <Typography.Text type="secondary">物流方：</Typography.Text>
          <Typography.Text strong>{String(record.carrierName ?? '-')}</Typography.Text>
          <span className="ml-6">
            <Typography.Text type="secondary">车牌号：</Typography.Text>
            <Typography.Text strong>{String(record.vehiclePlate ?? '-')}</Typography.Text>
          </span>
          <span className="ml-6">
            <Typography.Text type="secondary">总重(吨)：</Typography.Text>
            <Typography.Text strong>
              {record.totalWeight != null ? Number(record.totalWeight).toFixed(3) : '-'}
            </Typography.Text>
          </span>
          <span className="ml-6">
            <Typography.Text type="secondary">总运费：</Typography.Text>
            <Typography.Text strong>
              {record.totalFreight != null ? Number(record.totalFreight).toFixed(2) : '-'}
            </Typography.Text>
          </span>
        </div>
      </div>
      {items.length > 0 ? (
        <Table rowKey="id" columns={ITEM_COLUMNS} dataSource={items} size="small" pagination={false} />
      ) : null}
    </Card>
  )
}

export function ModuleFreightPickupListOverlay({ open, moduleKey, records, onClose }: Props) {
  const recordIds = records.map((r) => String(r.id))

  const { data: fullRecords, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.freightPickup(moduleKey), ...recordIds],
    queryFn: async () => {
      const results = await Promise.all(
        recordIds.map((id) => getBusinessModuleDetail(moduleKey, id)),
      )
      return results.map((r) => r.data)
    },
    enabled: open && recordIds.length > 0,
  })

  const displayRecords = fullRecords ?? records

  return (
    <WorkspaceOverlay
      title={`提货清单 — 物流单（${records.length} 条）`}
      open={open}
      onClose={onClose}
      variant="workspace"
      width="min(94vw, 1120px)"
      className="workspace-overlay-panel--fit-content"
      zIndex={1050}
    >
      <Spin spinning={isLoading}>
        {displayRecords.map((record) => (
          <DetailCard key={asId(record.id)} record={record} />
        ))}
      </Spin>
    </WorkspaceOverlay>
  )
}
